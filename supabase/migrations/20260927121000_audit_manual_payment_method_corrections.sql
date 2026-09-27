-- Add an atomic, audited correction path that also updates the payment method.
-- The previous RPC is kept for compatibility with already published clients.

CREATE OR REPLACE FUNCTION public.correct_manual_subscription_payment_with_method(
  _subscription_id uuid,
  _plan public.plano_tipo,
  _value numeric,
  _payment_date date,
  _expiration_date date,
  _payment_method text,
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
  v_result jsonb;
  v_subscription jsonb;
  v_before_methods jsonb := '[]'::jsonb;
  v_history_count integer := 0;
  v_method text := lower(btrim(coalesce(_payment_method, '')));
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF v_method NOT IN (
    'pix',
    'dinheiro',
    'transferencia',
    'cartao_externo',
    'boleto_externo',
    'outro'
  ) THEN
    RAISE EXCEPTION 'Unsupported manual payment method'
      USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'payment_id', ph.id,
        'payment_method', ph.metodo_pagamento,
        'payment_origin', ph.payment_origin
      )
      ORDER BY ph.data_pagamento, ph.created_at, ph.id
    ),
    '[]'::jsonb
  )
  INTO v_before_methods
  FROM public.payment_history ph
  WHERE ph.subscription_id = _subscription_id
    AND ph.payment_origin = 'manual';

  v_result := public.correct_manual_subscription_payment(
    _subscription_id,
    _plan,
    _value,
    _payment_date,
    _expiration_date,
    _notes,
    _idempotency_key
  );

  IF coalesce((v_result ->> 'duplicate')::boolean, false) THEN
    RETURN v_result;
  END IF;

  v_subscription := v_result -> 'subscription';

  UPDATE public.payment_history ph
  SET metodo_pagamento = v_method
  WHERE ph.subscription_id = _subscription_id
    AND ph.payment_origin = 'manual';

  GET DIAGNOSTICS v_history_count = ROW_COUNT;

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
    _subscription_id,
    nullif(v_subscription ->> 'student_id', '')::uuid,
    nullif(v_subscription ->> 'personal_id', '')::uuid,
    'manual_method_correction',
    _idempotency_key,
    transaction_timestamp(),
    'manual.payment_method_corrected',
    'neutral',
    round(_value, 2),
    'brl',
    jsonb_build_object(
      'actor_id', v_actor_id,
      'before_payment_methods', v_before_methods,
      'after_payment_method', v_method,
      'history_rows_updated', v_history_count,
      'reason', 'manual_payment_edit'
    )
  );

  RETURN v_result || jsonb_build_object(
    'payment_method', v_method,
    'history_rows_updated', v_history_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.correct_manual_subscription_payment_with_method(
  uuid, public.plano_tipo, numeric, date, date, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.correct_manual_subscription_payment_with_method(
  uuid, public.plano_tipo, numeric, date, date, text, text, text
) TO authenticated;

NOTIFY pgrst, 'reload schema';
