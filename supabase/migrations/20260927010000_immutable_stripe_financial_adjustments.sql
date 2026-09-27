-- Keep refund and dispute accounting immutable, idempotent and atomic with
-- Stripe webhook processing. Also allows a replayed invoice event to enrich an
-- existing payment with the exact Stripe fee and net amounts.

CREATE TABLE IF NOT EXISTS public.stripe_financial_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Deliberately no FK: financial audit must survive account/subscription deletion.
  subscription_id uuid,
  student_id uuid NOT NULL,
  personal_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'stripe',
  provider_event_id text NOT NULL,
  provider_event_created_at timestamptz NOT NULL,
  accounting_key text NOT NULL,
  event_type text NOT NULL,
  financial_effect text NOT NULL CHECK (financial_effect IN ('debit', 'credit')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text,
  stripe_account_id text,
  stripe_invoice_id text,
  stripe_charge_id text,
  stripe_refund_id text,
  stripe_dispute_id text,
  stripe_payment_method_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  UNIQUE (provider, accounting_key)
);

CREATE INDEX IF NOT EXISTS idx_stripe_financial_adjustments_personal_created
  ON public.stripe_financial_adjustments(personal_id, provider_event_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_financial_adjustments_student_created
  ON public.stripe_financial_adjustments(student_id, provider_event_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_financial_adjustments_invoice
  ON public.stripe_financial_adjustments(stripe_account_id, stripe_invoice_id);

DROP TRIGGER IF EXISTS trg_stripe_financial_adjustments_immutable
  ON public.stripe_financial_adjustments;
CREATE TRIGGER trg_stripe_financial_adjustments_immutable
BEFORE UPDATE OR DELETE ON public.stripe_financial_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_audit_mutation();

ALTER TABLE public.stripe_financial_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read Stripe financial adjustments"
  ON public.stripe_financial_adjustments;
CREATE POLICY "Participants read Stripe financial adjustments"
ON public.stripe_financial_adjustments
FOR SELECT
TO authenticated
USING (public.can_read_student_access(student_id));

GRANT SELECT ON public.stripe_financial_adjustments TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.stripe_financial_adjustments
  FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_stripe_webhook_event_v2(
  _event_id text,
  _event_type text,
  _event_created_at timestamptz,
  _stripe_account_id text,
  _livemode boolean,
  _api_version text,
  _payload jsonb,
  _payload_sha256 text,
  _request_id text,
  _command jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_subscription jsonb;
  v_subscription_id uuid;
  v_student_id uuid;
  v_personal_id uuid;
  v_financial_effect text := nullif(_command ->> 'accounting_effect', '');
  v_accounting_key text := nullif(_command ->> 'accounting_key', '');
  v_adjustment_amount numeric := nullif(_command ->> 'adjustment_amount', '')::numeric;
BEGIN
  v_result := public.apply_stripe_webhook_event(
    _event_id,
    _event_type,
    _event_created_at,
    _stripe_account_id,
    _livemode,
    _api_version,
    _payload,
    _payload_sha256,
    _request_id,
    _command
  );

  IF NOT coalesce((v_result ->> 'ok')::boolean, false) THEN
    RETURN v_result;
  END IF;

  -- A replay of an already processed invoice can safely fill fields that were
  -- absent in the original Dahlia webhook payload. This operational record is
  -- mutable; the original webhook and audit ledgers remain immutable.
  IF (_command ->> 'kind') = 'payment_succeeded'
    AND nullif(_command ->> 'stripe_invoice_id', '') IS NOT NULL
  THEN
    UPDATE public.payment_history ph
    SET
      stripe_application_fee_id = coalesce(
        nullif(_command ->> 'stripe_application_fee_id', ''),
        ph.stripe_application_fee_id
      ),
      stripe_application_fee_amount = coalesce(
        nullif(_command ->> 'stripe_application_fee_amount', '')::numeric,
        ph.stripe_application_fee_amount
      ),
      stripe_payment_intent_id = coalesce(
        nullif(_command ->> 'stripe_payment_intent_id', ''),
        ph.stripe_payment_intent_id
      ),
      stripe_charge_id = coalesce(
        nullif(_command ->> 'stripe_charge_id', ''),
        ph.stripe_charge_id
      ),
      stripe_balance_transaction_id = coalesce(
        nullif(_command ->> 'stripe_balance_transaction_id', ''),
        ph.stripe_balance_transaction_id
      ),
      stripe_payment_method_type = coalesce(
        nullif(_command ->> 'stripe_payment_method_type', ''),
        ph.stripe_payment_method_type
      ),
      stripe_processing_fee_amount = coalesce(
        nullif(_command ->> 'stripe_processing_fee_amount', '')::numeric,
        ph.stripe_processing_fee_amount
      ),
      stripe_net_amount = coalesce(
        nullif(_command ->> 'stripe_net_amount', '')::numeric,
        ph.stripe_net_amount
      ),
      stripe_currency = coalesce(
        nullif(_command ->> 'stripe_currency', ''),
        ph.stripe_currency
      ),
      metodo_pagamento = coalesce(
        nullif(_command ->> 'metodo_pagamento', ''),
        ph.metodo_pagamento
      )
    WHERE ph.stripe_invoice_id = _command ->> 'stripe_invoice_id'
      AND (
        ph.stripe_account_id = _stripe_account_id
        OR (ph.stripe_account_id IS NULL AND _stripe_account_id IS NULL)
      );
  END IF;

  IF v_financial_effect IN ('debit', 'credit')
    AND v_accounting_key IS NOT NULL
    AND v_adjustment_amount > 0
  THEN
    v_subscription := coalesce(
      v_result -> 'subscription',
      v_result -> 'outcome' -> 'subscription'
    );
    v_subscription_id := nullif(v_subscription ->> 'subscription_id', '')::uuid;
    v_student_id := coalesce(
      nullif(v_subscription ->> 'student_id', '')::uuid,
      nullif(_command ->> 'student_id', '')::uuid
    );
    v_personal_id := coalesce(
      nullif(v_subscription ->> 'personal_id', '')::uuid,
      nullif(_command ->> 'personal_id', '')::uuid
    );

    IF v_student_id IS NULL OR v_personal_id IS NULL THEN
      SELECT s.id, s.student_id, s.personal_id
      INTO v_subscription_id, v_student_id, v_personal_id
      FROM public.subscriptions s
      WHERE s.stripe_subscription_id = nullif(_command ->> 'stripe_subscription_id', '')
        AND (
          s.stripe_account_id = _stripe_account_id
          OR (s.stripe_account_id IS NULL AND _stripe_account_id IS NULL)
        )
      ORDER BY s.created_at DESC NULLS LAST, s.id DESC
      LIMIT 1;
    END IF;

    IF v_student_id IS NULL OR v_personal_id IS NULL THEN
      RAISE EXCEPTION 'Ajuste financeiro Stripe sem vinculo aluno-personal'
        USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.stripe_financial_adjustments (
      subscription_id,
      student_id,
      personal_id,
      provider,
      provider_event_id,
      provider_event_created_at,
      accounting_key,
      event_type,
      financial_effect,
      amount,
      currency,
      stripe_account_id,
      stripe_invoice_id,
      stripe_charge_id,
      stripe_refund_id,
      stripe_dispute_id,
      stripe_payment_method_type,
      metadata
    ) VALUES (
      v_subscription_id,
      v_student_id,
      v_personal_id,
      'stripe',
      _event_id,
      _event_created_at,
      v_accounting_key,
      _event_type,
      v_financial_effect,
      v_adjustment_amount,
      _command ->> 'stripe_currency',
      _stripe_account_id,
      _command ->> 'stripe_invoice_id',
      _command ->> 'stripe_charge_id',
      _command ->> 'stripe_refund_id',
      _command ->> 'stripe_dispute_id',
      _command ->> 'stripe_payment_method_type',
      jsonb_build_object(
        'access_reason', _command ->> 'access_revoked_reason',
        'normalized_command', _command
      )
    )
    ON CONFLICT (provider, accounting_key) DO NOTHING;
  END IF;

  RETURN v_result || jsonb_build_object(
    'financial_adjustment_recorded',
    v_financial_effect IN ('debit', 'credit')
      AND v_accounting_key IS NOT NULL
      AND v_adjustment_amount > 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_stripe_webhook_event_v2(
  text, text, timestamptz, text, boolean, text, jsonb, text, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stripe_webhook_event_v2(
  text, text, timestamptz, text, boolean, text, jsonb, text, text, jsonb
) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'stripe_financial_adjustments'
    )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stripe_financial_adjustments;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
