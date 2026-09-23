-- Correct an existing manual receipt in place while keeping an immutable
-- financial event that records who changed it and the before/after values.

CREATE OR REPLACE FUNCTION public.correct_manual_subscription_payment(
  _subscription_id uuid,
  _plan public.plano_tipo,
  _value numeric,
  _payment_date date,
  _expiration_date date,
  _notes text,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_subscription public.subscriptions%ROWTYPE;
  v_existing_event public.subscription_financial_events%ROWTYPE;
  v_before jsonb;
  v_payment_at timestamptz;
  v_expiration_at timestamptz;
  v_history_count integer := 0;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF _value IS NULL OR round(_value, 2) <= 0 THEN
    RAISE EXCEPTION 'Payment value must be greater than zero'
      USING ERRCODE = '22023';
  END IF;

  IF _payment_date IS NULL OR _expiration_date IS NULL THEN
    RAISE EXCEPTION 'Payment and expiration dates are required'
      USING ERRCODE = '22023';
  END IF;

  IF _expiration_date < _payment_date THEN
    RAISE EXCEPTION 'Expiration date cannot precede payment date'
      USING ERRCODE = '22023';
  END IF;

  IF nullif(btrim(_idempotency_key), '') IS NULL THEN
    RAISE EXCEPTION 'Idempotency key is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('manual-payment-correction:' || _subscription_id::text, 0)
  );
  PERFORM pg_advisory_xact_lock(hashtextextended(_idempotency_key, 0));

  SELECT *
  INTO v_existing_event
  FROM public.subscription_financial_events sfe
  WHERE sfe.provider = 'manual_correction'
    AND sfe.provider_event_id = _idempotency_key
  LIMIT 1;

  IF FOUND THEN
    SELECT *
    INTO v_subscription
    FROM public.subscriptions s
    WHERE s.id = v_existing_event.subscription_id;

    RETURN jsonb_build_object(
      'duplicate', true,
      'subscription', to_jsonb(v_subscription)
    );
  END IF;

  SELECT *
  INTO v_subscription
  FROM public.subscriptions s
  WHERE s.id = _subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_admin(v_actor_id)
    AND v_subscription.personal_id <> v_actor_id
  THEN
    RAISE EXCEPTION 'Only the linked personal can correct this payment'
      USING ERRCODE = '42501';
  END IF;

  IF v_subscription.stripe_subscription_id IS NOT NULL
    OR v_subscription.stripe_checkout_session_id IS NOT NULL
    OR v_subscription.stripe_account_id IS NOT NULL
  THEN
    RAISE EXCEPTION 'Stripe payments must be corrected by Stripe events'
      USING ERRCODE = '22023';
  END IF;

  v_before := to_jsonb(v_subscription);
  v_payment_at := _payment_date::timestamp AT TIME ZONE 'America/Sao_Paulo';
  v_expiration_at := _expiration_date::timestamp AT TIME ZONE 'America/Sao_Paulo';

  UPDATE public.subscriptions
  SET plano = _plan,
      valor = round(_value, 2),
      status_pagamento = 'pago',
      data_pagamento = v_payment_at,
      data_expiracao = v_expiration_at,
      observacoes = nullif(btrim(_notes), ''),
      access_revoked_at = NULL,
      access_revoked_reason = NULL,
      access_revoked_event_id = NULL,
      updated_at = transaction_timestamp()
  WHERE id = v_subscription.id
  RETURNING * INTO v_subscription;

  SELECT count(*)::integer
  INTO v_history_count
  FROM public.payment_history ph
  WHERE ph.subscription_id = v_subscription.id
    AND ph.stripe_invoice_id IS NULL
    AND ph.stripe_account_id IS NULL;

  IF v_history_count = 0 THEN
    INSERT INTO public.payment_history (
      subscription_id,
      student_id,
      personal_id,
      valor,
      data_pagamento,
      metodo_pagamento,
      observacoes,
      idempotency_key
    ) VALUES (
      v_subscription.id,
      v_subscription.student_id,
      v_subscription.personal_id,
      round(_value, 2),
      v_payment_at,
      'outro',
      nullif(btrim(_notes), ''),
      _idempotency_key || ':history:1'
    );
  ELSE
    WITH target AS (
      SELECT
        ph.id,
        row_number() OVER (ORDER BY ph.data_pagamento, ph.created_at, ph.id) AS installment_number,
        count(*) OVER () AS installment_count
      FROM public.payment_history ph
      WHERE ph.subscription_id = v_subscription.id
        AND ph.stripe_invoice_id IS NULL
        AND ph.stripe_account_id IS NULL
    )
    UPDATE public.payment_history ph
    SET valor = CASE
          WHEN target.installment_number = target.installment_count
            THEN round(
              _value
              - round(_value / target.installment_count, 2)
                * (target.installment_count - 1),
              2
            )
          ELSE round(_value / target.installment_count, 2)
        END,
        data_pagamento = (
          _payment_date
          + make_interval(months => target.installment_number::integer - 1)
        )::timestamp AT TIME ZONE 'America/Sao_Paulo',
        observacoes = CASE
          WHEN target.installment_count > 1 THEN concat_ws(
            ' ',
            nullif(btrim(_notes), ''),
            format(
              '(Parcela %s/%s)',
              target.installment_number,
              target.installment_count
            )
          )
          ELSE nullif(btrim(_notes), '')
        END
    FROM target
    WHERE ph.id = target.id;
  END IF;

  INSERT INTO public.subscription_financial_events (
    subscription_id,
    student_id,
    personal_id,
    provider,
    provider_event_id,
    provider_event_created_at,
    event_type,
    effect,
    amount,
    currency,
    metadata
  ) VALUES (
    v_subscription.id,
    v_subscription.student_id,
    v_subscription.personal_id,
    'manual_correction',
    _idempotency_key,
    transaction_timestamp(),
    'manual.payment_corrected',
    'allow',
    round(_value, 2),
    'brl',
    jsonb_build_object(
      'actor_id', v_actor_id,
      'before', v_before,
      'after', to_jsonb(v_subscription),
      'history_rows_updated', v_history_count,
      'reason', 'manual_payment_edit'
    )
  );

  PERFORM public.recalculate_student_access(v_subscription.student_id);

  RETURN jsonb_build_object(
    'duplicate', false,
    'subscription', to_jsonb(v_subscription),
    'history_rows_updated', v_history_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.correct_manual_subscription_payment(
  uuid, public.plano_tipo, numeric, date, date, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.correct_manual_subscription_payment(
  uuid, public.plano_tipo, numeric, date, date, text, text
) TO authenticated;

NOTIFY pgrst, 'reload schema';
