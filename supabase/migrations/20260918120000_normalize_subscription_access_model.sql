-- Normalizes the data required by the subscription-access decision.
-- This migration intentionally does not change existing access decisions or data.

ALTER TABLE public.personal_settings
  ADD COLUMN IF NOT EXISTS payment_control_enabled_at timestamptz;

COMMENT ON COLUMN public.personal_settings.payment_control_enabled_at IS
  'When payment enforcement last changed from disabled to enabled. Null means it was not observed by the normalized model.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payment_control_enabled_at timestamptz;

COMMENT ON COLUMN public.profiles.payment_control_enabled_at IS
  'When the per-student payment override last changed to true. The legacy is_active flag is not an access input.';

CREATE OR REPLACE FUNCTION public.stamp_payment_control_enabled_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.controle_acesso_por_pagamento IS TRUE THEN
      NEW.payment_control_enabled_at := transaction_timestamp();
    ELSE
      NEW.payment_control_enabled_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.controle_acesso_por_pagamento IS TRUE
    AND OLD.controle_acesso_por_pagamento IS DISTINCT FROM TRUE
  THEN
    NEW.payment_control_enabled_at := transaction_timestamp();
  ELSIF NEW.controle_acesso_por_pagamento IS DISTINCT FROM TRUE THEN
    NEW.payment_control_enabled_at := NULL;
  ELSIF NEW.payment_control_enabled_at IS DISTINCT FROM OLD.payment_control_enabled_at THEN
    -- Prevent clients from moving the initial grace window.
    NEW.payment_control_enabled_at := OLD.payment_control_enabled_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_personal_settings_payment_control_enabled_at
  ON public.personal_settings;
CREATE TRIGGER trg_personal_settings_payment_control_enabled_at
BEFORE INSERT OR UPDATE OF controle_acesso_por_pagamento, payment_control_enabled_at
ON public.personal_settings
FOR EACH ROW
EXECUTE FUNCTION public.stamp_payment_control_enabled_at();

DROP TRIGGER IF EXISTS trg_profiles_payment_control_enabled_at
  ON public.profiles;
CREATE TRIGGER trg_profiles_payment_control_enabled_at
BEFORE INSERT OR UPDATE OF controle_acesso_por_pagamento, payment_control_enabled_at
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.stamp_payment_control_enabled_at();

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS access_revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_revoked_reason text,
  ADD COLUMN IF NOT EXISTS access_revoked_event_id text,
  ADD COLUMN IF NOT EXISTS last_provider_event_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_provider_event_id text,
  ADD COLUMN IF NOT EXISTS provider_state_updated_at timestamptz;

COMMENT ON COLUMN public.subscriptions.access_revoked_at IS
  'Immediate access revocation caused by any refund or chargeback, independent of the paid-through date.';
COMMENT ON COLUMN public.subscriptions.last_provider_event_created_at IS
  'Provider event time used to reject out-of-order state transitions.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass
      AND conname = 'subscriptions_access_revocation_reason_check'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_access_revocation_reason_check
      CHECK (
        access_revoked_at IS NULL
        OR access_revoked_reason IN (
          'refund_full',
          'refund_partial',
          'chargeback',
          'dispute',
          'reconciliation'
        )
      ) NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_student_personal_access
  ON public.subscriptions(student_id, personal_id, status_pagamento, data_expiracao DESC)
  WHERE access_revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_event_order
  ON public.subscriptions(stripe_account_id, stripe_subscription_id, last_provider_event_created_at DESC)
  WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS event_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS payload_sha256 text,
  ADD COLUMN IF NOT EXISTS stripe_api_version text,
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS outcome jsonb;

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_replay
  ON public.stripe_webhook_events(processing_status, event_created_at, last_attempt_at);

CREATE TABLE IF NOT EXISTS public.subscription_financial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Deliberately no FK: immutable audit records must survive account/subscription deletion.
  subscription_id uuid,
  student_id uuid NOT NULL,
  personal_id uuid,
  provider text NOT NULL DEFAULT 'stripe',
  provider_event_id text,
  provider_event_created_at timestamptz,
  event_type text NOT NULL,
  effect text NOT NULL CHECK (effect IN ('allow', 'block', 'neutral')),
  amount numeric(12,2),
  currency text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_financial_events_student_created
  ON public.subscription_financial_events(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_financial_events_subscription_created
  ON public.subscription_financial_events(subscription_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.student_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  personal_id uuid,
  actor_id uuid,
  source text NOT NULL,
  previous_allowed boolean,
  new_allowed boolean NOT NULL,
  reason_code text NOT NULL,
  previous_decision jsonb,
  new_decision jsonb NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_student_access_audit_student_created
  ON public.student_access_audit(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_access_audit_personal_created
  ON public.student_access_audit(personal_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_immutable_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit records are immutable'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_financial_events_immutable
  ON public.subscription_financial_events;
CREATE TRIGGER trg_subscription_financial_events_immutable
BEFORE UPDATE OR DELETE ON public.subscription_financial_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_audit_mutation();

DROP TRIGGER IF EXISTS trg_student_access_audit_immutable
  ON public.student_access_audit;
CREATE TRIGGER trg_student_access_audit_immutable
BEFORE UPDATE OR DELETE ON public.student_access_audit
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_audit_mutation();

ALTER TABLE public.subscription_financial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_access_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read subscription financial events"
  ON public.subscription_financial_events;
CREATE POLICY "Participants read subscription financial events"
ON public.subscription_financial_events
FOR SELECT
TO authenticated
USING (public.can_read_student_access(student_id));

DROP POLICY IF EXISTS "Participants read student access audit"
  ON public.student_access_audit;
CREATE POLICY "Participants read student access audit"
ON public.student_access_audit
FOR SELECT
TO authenticated
USING (public.can_read_student_access(student_id));

REVOKE INSERT, UPDATE, DELETE ON public.subscription_financial_events
  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.student_access_audit
  FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
