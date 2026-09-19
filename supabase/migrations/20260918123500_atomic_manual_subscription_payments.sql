-- Register manual payments, their history and the resulting access decision in
-- one transaction. The payment date is interpreted at midnight in Sao Paulo.

ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_history_idempotency_key
  ON public.payment_history(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_manual_subscription_payment(
  _student_id uuid,
  _subscription_id uuid,
  _plan public.plano_tipo,
  _value numeric,
  _payment_date date,
  _payment_method text,
  _notes text,
  _installments integer,
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
  v_plan_months integer;
  v_installments integer := coalesce(_installments, 1);
  v_payment_at timestamptz;
  v_expiration_at timestamptz;
  v_installment_at timestamptz;
  v_installment_value numeric(12,2);
  v_current_value numeric(12,2);
  v_index integer;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin(v_actor_id) AND v_actor_id <> (
    SELECT p.personal_id
    FROM public.profiles p
    WHERE p.id = _student_id
  ) THEN
    RAISE EXCEPTION 'Only the linked personal can register this payment'
      USING ERRCODE = '42501';
  END IF;

  IF _value IS NULL OR round(_value, 2) <= 0 THEN
    RAISE EXCEPTION 'Payment value must be greater than zero'
      USING ERRCODE = '22023';
  END IF;

  IF _payment_date IS NULL THEN
    RAISE EXCEPTION 'Payment date is required' USING ERRCODE = '22023';
  END IF;

  IF v_installments < 1 OR v_installments > 120 THEN
    RAISE EXCEPTION 'Installments must be between 1 and 120'
      USING ERRCODE = '22023';
  END IF;

  IF nullif(btrim(_idempotency_key), '') IS NULL THEN
    RAISE EXCEPTION 'Idempotency key is required' USING ERRCODE = '22023';
  END IF;

  v_plan_months := CASE _plan
    WHEN 'mensal'::public.plano_tipo THEN 1
    WHEN 'trimestral'::public.plano_tipo THEN 3
    WHEN 'semestral'::public.plano_tipo THEN 6
    WHEN 'anual'::public.plano_tipo THEN 12
    ELSE NULL
  END;

  IF v_plan_months IS NULL THEN
    RAISE EXCEPTION 'Unsupported subscription plan' USING ERRCODE = '22023';
  END IF;

  -- Serialize retries and concurrent clicks that represent the same payment.
  PERFORM pg_advisory_xact_lock(hashtextextended(_idempotency_key, 0));

  SELECT *
  INTO v_existing_event
  FROM public.subscription_financial_events sfe
  WHERE sfe.provider = 'manual'
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

  v_payment_at := _payment_date::timestamp AT TIME ZONE 'America/Sao_Paulo';
  v_expiration_at :=
    (_payment_date + make_interval(months => v_plan_months))::timestamp
    AT TIME ZONE 'America/Sao_Paulo';

  IF _subscription_id IS NULL THEN
    INSERT INTO public.subscriptions (
      student_id,
      personal_id,
      plano,
      valor,
      status_pagamento,
      data_pagamento,
      data_expiracao,
      observacoes,
      parcelas,
      access_revoked_at,
      access_revoked_reason,
      access_revoked_event_id
    ) VALUES (
      _student_id,
      CASE WHEN public.is_admin(v_actor_id) THEN (
        SELECT p.personal_id FROM public.profiles p WHERE p.id = _student_id
      ) ELSE v_actor_id END,
      _plan,
      round(_value, 2),
      'pago',
      v_payment_at,
      v_expiration_at,
      nullif(btrim(_notes), ''),
      v_installments,
      NULL,
      NULL,
      NULL
    )
    RETURNING * INTO v_subscription;
  ELSE
    SELECT *
    INTO v_subscription
    FROM public.subscriptions s
    WHERE s.id = _subscription_id
      AND s.student_id = _student_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Subscription not found for student' USING ERRCODE = 'P0002';
    END IF;

    IF NOT public.is_admin(v_actor_id) AND v_subscription.personal_id <> v_actor_id THEN
      RAISE EXCEPTION 'Subscription does not belong to the linked personal'
        USING ERRCODE = '42501';
    END IF;

    UPDATE public.subscriptions
    SET plano = _plan,
        valor = round(_value, 2),
        status_pagamento = 'pago',
        data_pagamento = v_payment_at,
        data_expiracao = v_expiration_at,
        observacoes = coalesce(nullif(btrim(_notes), ''), observacoes),
        parcelas = v_installments,
        access_revoked_at = NULL,
        access_revoked_reason = NULL,
        access_revoked_event_id = NULL,
        updated_at = transaction_timestamp()
    WHERE id = v_subscription.id
    RETURNING * INTO v_subscription;
  END IF;

  v_installment_value := round(_value / v_installments, 2);

  FOR v_index IN 1..v_installments LOOP
    v_installment_at :=
      (_payment_date + make_interval(months => v_index - 1))::timestamp
      AT TIME ZONE 'America/Sao_Paulo';
    v_current_value := CASE
      WHEN v_index = v_installments
        THEN round(_value - (v_installment_value * (v_installments - 1)), 2)
      ELSE v_installment_value
    END;

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
      v_current_value,
      v_installment_at,
      nullif(btrim(_payment_method), ''),
      CASE
        WHEN v_installments > 1 THEN concat_ws(
          ' ',
          nullif(btrim(_notes), ''),
          format('(Parcela %s/%s)', v_index, v_installments)
        )
        ELSE nullif(btrim(_notes), '')
      END,
      format('%s:%s', _idempotency_key, v_index)
    );
  END LOOP;

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
    'manual',
    _idempotency_key,
    transaction_timestamp(),
    'manual.payment_recorded',
    'allow',
    round(_value, 2),
    'brl',
    jsonb_build_object(
      'actor_id', v_actor_id,
      'payment_date', _payment_date,
      'payment_method', _payment_method,
      'installments', v_installments
    )
  );

  PERFORM public.recalculate_student_access_state(
    v_subscription.student_id,
    'manual_payment'
  );

  RETURN jsonb_build_object(
    'duplicate', false,
    'subscription', to_jsonb(v_subscription)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_manual_subscription_payment(
  uuid, uuid, public.plano_tipo, numeric, date, text, text, integer, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_manual_subscription_payment(
  uuid, uuid, public.plano_tipo, numeric, date, text, text, integer, text
) TO authenticated;

NOTIFY pgrst, 'reload schema';
