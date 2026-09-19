-- Atomic and ordered Stripe webhook application.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_provider_event_priority integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.upsert_stripe_subscription_command(
  _command jsonb,
  _event_id text,
  _event_created_at timestamptz,
  _event_priority integer,
  _stripe_account_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.subscriptions%ROWTYPE;
  v_saved public.subscriptions%ROWTYPE;
  v_stripe_subscription_id text := nullif(_command ->> 'stripe_subscription_id', '');
  v_student_id uuid := nullif(_command ->> 'student_id', '')::uuid;
  v_personal_id uuid := nullif(_command ->> 'personal_id', '')::uuid;
  v_status text := coalesce(nullif(_command ->> 'status_pagamento', ''), 'pendente');
  v_expiration timestamptz := nullif(_command ->> 'data_expiracao', '')::timestamptz;
  v_clear_revocation boolean := coalesce((_command ->> 'clear_revocation')::boolean, false);
  v_revoke_reason text := nullif(_command ->> 'access_revoked_reason', '');
  v_preserve_grace boolean := coalesce((_command ->> 'preserve_paid_grace')::boolean, false);
  v_stale boolean := false;
BEGIN
  IF v_stripe_subscription_id IS NULL THEN
    RAISE EXCEPTION 'stripe_subscription_id obrigatorio no comando'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('stripe-subscription:' || coalesce(_stripe_account_id, 'platform') || ':' || v_stripe_subscription_id, 0)
  );

  SELECT s.*
  INTO v_existing
  FROM public.subscriptions s
  WHERE s.stripe_subscription_id = v_stripe_subscription_id
    AND (
      (_stripe_account_id IS NULL AND s.stripe_account_id IS NULL)
      OR s.stripe_account_id = _stripe_account_id
    )
  ORDER BY s.created_at DESC NULLS LAST, s.id DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    v_stale :=
      v_existing.last_provider_event_created_at > _event_created_at
      OR (
        v_existing.last_provider_event_created_at = _event_created_at
        AND v_existing.last_provider_event_priority > _event_priority
      )
      OR (
        v_existing.last_provider_event_created_at = _event_created_at
        AND v_existing.last_provider_event_priority = _event_priority
        AND coalesce(v_existing.last_provider_event_id, '') >= _event_id
      );

    IF v_stale THEN
      RETURN jsonb_build_object(
        'stale', true,
        'subscription_id', v_existing.id,
        'student_id', v_existing.student_id,
        'personal_id', v_existing.personal_id
      );
    END IF;

    IF v_preserve_grace
      AND v_existing.status_pagamento = 'pago'
      AND v_existing.data_pagamento IS NOT NULL
      AND v_existing.data_expiracao + interval '24 hours' > _event_created_at
    THEN
      v_status := 'pago';
    END IF;

    UPDATE public.subscriptions s
    SET
      student_id = coalesce(v_student_id, s.student_id),
      personal_id = coalesce(v_personal_id, s.personal_id),
      plano = coalesce(nullif(_command ->> 'plano', ''), s.plano),
      valor = coalesce(nullif(_command ->> 'valor', '')::numeric, s.valor),
      status_pagamento = v_status,
      data_pagamento = coalesce(nullif(_command ->> 'data_pagamento', '')::timestamptz, s.data_pagamento),
      data_expiracao = coalesce(v_expiration, s.data_expiracao),
      stripe_customer_id = coalesce(nullif(_command ->> 'stripe_customer_id', ''), s.stripe_customer_id),
      stripe_checkout_session_id = coalesce(nullif(_command ->> 'stripe_checkout_session_id', ''), s.stripe_checkout_session_id),
      stripe_account_id = coalesce(_stripe_account_id, s.stripe_account_id),
      cancela_no_fim_do_ciclo = coalesce((_command ->> 'cancela_no_fim_do_ciclo')::boolean, s.cancela_no_fim_do_ciclo),
      cancelado_em = CASE
        WHEN _command ? 'cancelado_em' THEN nullif(_command ->> 'cancelado_em', '')::timestamptz
        ELSE s.cancelado_em
      END,
      access_revoked_at = CASE
        WHEN v_clear_revocation THEN NULL
        WHEN v_revoke_reason IS NOT NULL THEN _event_created_at
        ELSE s.access_revoked_at
      END,
      access_revoked_reason = CASE
        WHEN v_clear_revocation THEN NULL
        WHEN v_revoke_reason IS NOT NULL THEN v_revoke_reason
        ELSE s.access_revoked_reason
      END,
      access_revoked_event_id = CASE
        WHEN v_clear_revocation THEN NULL
        WHEN v_revoke_reason IS NOT NULL THEN _event_id
        ELSE s.access_revoked_event_id
      END,
      last_provider_event_created_at = _event_created_at,
      last_provider_event_priority = _event_priority,
      last_provider_event_id = _event_id,
      provider_state_updated_at = transaction_timestamp(),
      updated_at = transaction_timestamp()
    WHERE s.id = v_existing.id
    RETURNING s.* INTO v_saved;
  ELSE
    IF v_student_id IS NULL OR v_personal_id IS NULL OR v_expiration IS NULL
      OR nullif(_command ->> 'plano', '') IS NULL
    THEN
      RAISE EXCEPTION 'Comando Stripe sem vinculo completo para criar assinatura'
        USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'aluno'
      WHERE p.id = v_student_id
        AND p.personal_id = v_personal_id
    ) THEN
      RAISE EXCEPTION 'Vinculo aluno-personal invalido no evento Stripe'
        USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.subscriptions (
      student_id,
      personal_id,
      plano,
      valor,
      status_pagamento,
      data_pagamento,
      data_expiracao,
      stripe_subscription_id,
      stripe_customer_id,
      stripe_account_id,
      stripe_checkout_session_id,
      cancela_no_fim_do_ciclo,
      cancelado_em,
      access_revoked_at,
      access_revoked_reason,
      access_revoked_event_id,
      last_provider_event_created_at,
      last_provider_event_priority,
      last_provider_event_id,
      provider_state_updated_at
    ) VALUES (
      v_student_id,
      v_personal_id,
      _command ->> 'plano',
      coalesce(nullif(_command ->> 'valor', '')::numeric, 0),
      v_status,
      nullif(_command ->> 'data_pagamento', '')::timestamptz,
      v_expiration,
      v_stripe_subscription_id,
      nullif(_command ->> 'stripe_customer_id', ''),
      _stripe_account_id,
      nullif(_command ->> 'stripe_checkout_session_id', ''),
      coalesce((_command ->> 'cancela_no_fim_do_ciclo')::boolean, false),
      nullif(_command ->> 'cancelado_em', '')::timestamptz,
      CASE WHEN v_revoke_reason IS NOT NULL THEN _event_created_at ELSE NULL END,
      v_revoke_reason,
      CASE WHEN v_revoke_reason IS NOT NULL THEN _event_id ELSE NULL END,
      _event_created_at,
      _event_priority,
      _event_id,
      transaction_timestamp()
    )
    RETURNING * INTO v_saved;
  END IF;

  RETURN jsonb_build_object(
    'stale', false,
    'subscription_id', v_saved.id,
    'student_id', v_saved.student_id,
    'personal_id', v_saved.personal_id,
    'plano', v_saved.plano,
    'status_pagamento', v_saved.status_pagamento,
    'data_expiracao', v_saved.data_expiracao
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_stripe_webhook_event(
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
  v_existing public.stripe_webhook_events%ROWTYPE;
  v_kind text := coalesce(_command ->> 'kind', 'ignored');
  v_priority integer := coalesce((_command ->> 'priority')::integer, 0);
  v_subscription jsonb;
  v_student_id uuid;
  v_personal_id uuid;
  v_subscription_id uuid;
  v_personal_account_id uuid;
  v_error text;
BEGIN
  IF _event_id IS NULL OR _event_type IS NULL OR _event_created_at IS NULL THEN
    RAISE EXCEPTION 'Evento Stripe invalido'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('stripe-event:' || _event_id, 0));

  SELECT e.*
  INTO v_existing
  FROM public.stripe_webhook_events e
  WHERE e.id = _event_id
  FOR UPDATE;

  IF FOUND AND v_existing.processing_status = 'processed' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'event_id', _event_id,
      'outcome', v_existing.outcome
    );
  END IF;

  IF NOT FOUND THEN
    INSERT INTO public.stripe_webhook_events (
      id,
      stripe_account_id,
      event_type,
      livemode,
      processing_status,
      processing_attempts,
      last_attempt_at,
      event_created_at,
      payload,
      payload_sha256,
      stripe_api_version,
      request_id,
      processing_started_at,
      error_message
    ) VALUES (
      _event_id,
      _stripe_account_id,
      _event_type,
      coalesce(_livemode, false),
      'processing',
      1,
      transaction_timestamp(),
      _event_created_at,
      _payload,
      _payload_sha256,
      _api_version,
      _request_id,
      transaction_timestamp(),
      NULL
    );
  ELSE
    UPDATE public.stripe_webhook_events
    SET
      processing_status = 'processing',
      processing_attempts = coalesce(processing_attempts, 0) + 1,
      last_attempt_at = transaction_timestamp(),
      processing_started_at = transaction_timestamp(),
      processing_completed_at = NULL,
      event_created_at = _event_created_at,
      payload = _payload,
      payload_sha256 = _payload_sha256,
      stripe_api_version = _api_version,
      request_id = _request_id,
      error_message = NULL
    WHERE id = _event_id;
  END IF;

  BEGIN
    IF v_kind = 'normalization_failed' THEN
      RAISE EXCEPTION 'Falha ao normalizar evento Stripe: %',
        coalesce(_command ->> 'error', 'erro desconhecido');
    ELSIF v_kind = 'account_updated' THEN
      SELECT a.personal_id
      INTO v_personal_account_id
      FROM public.personal_stripe_accounts a
      WHERE a.stripe_account_id = coalesce(_command ->> 'stripe_account_id', _stripe_account_id)
      LIMIT 1;

      v_personal_account_id := coalesce(
        nullif(_command ->> 'personal_id', '')::uuid,
        v_personal_account_id
      );

      IF v_personal_account_id IS NOT NULL THEN
        INSERT INTO public.personal_stripe_accounts (
          personal_id,
          stripe_account_id,
          account_type,
          country,
          default_currency,
          charges_enabled,
          payouts_enabled,
          details_submitted,
          card_payments_active,
          transfers_active,
          requirements_currently_due,
          requirements_past_due,
          disabled_reason,
          last_synced_at
        ) VALUES (
          v_personal_account_id,
          coalesce(_command ->> 'stripe_account_id', _stripe_account_id),
          coalesce(_command ->> 'account_type', 'standard'),
          _command ->> 'country',
          _command ->> 'default_currency',
          coalesce((_command ->> 'charges_enabled')::boolean, false),
          coalesce((_command ->> 'payouts_enabled')::boolean, false),
          coalesce((_command ->> 'details_submitted')::boolean, false),
          coalesce((_command ->> 'card_payments_active')::boolean, false),
          coalesce((_command ->> 'transfers_active')::boolean, false),
          ARRAY(SELECT jsonb_array_elements_text(coalesce(_command -> 'requirements_currently_due', '[]'::jsonb))),
          ARRAY(SELECT jsonb_array_elements_text(coalesce(_command -> 'requirements_past_due', '[]'::jsonb))),
          _command ->> 'disabled_reason',
          transaction_timestamp()
        )
        ON CONFLICT (stripe_account_id) DO UPDATE SET
          personal_id = excluded.personal_id,
          account_type = excluded.account_type,
          country = excluded.country,
          default_currency = excluded.default_currency,
          charges_enabled = excluded.charges_enabled,
          payouts_enabled = excluded.payouts_enabled,
          details_submitted = excluded.details_submitted,
          card_payments_active = excluded.card_payments_active,
          transfers_active = excluded.transfers_active,
          requirements_currently_due = excluded.requirements_currently_due,
          requirements_past_due = excluded.requirements_past_due,
          disabled_reason = excluded.disabled_reason,
          last_synced_at = excluded.last_synced_at,
          updated_at = transaction_timestamp();
      END IF;
    ELSIF v_kind IN ('subscription_sync', 'payment_succeeded', 'payment_failed', 'access_revoked') THEN
      v_subscription := public.upsert_stripe_subscription_command(
        _command,
        _event_id,
        _event_created_at,
        v_priority,
        _stripe_account_id
      );

      IF NOT coalesce((v_subscription ->> 'stale')::boolean, false) THEN
        v_subscription_id := nullif(v_subscription ->> 'subscription_id', '')::uuid;
        v_student_id := nullif(v_subscription ->> 'student_id', '')::uuid;
        v_personal_id := nullif(v_subscription ->> 'personal_id', '')::uuid;

        IF v_kind = 'payment_succeeded' THEN
          IF nullif(_command ->> 'stripe_invoice_id', '') IS NOT NULL THEN
            INSERT INTO public.payment_history (
              subscription_id,
              student_id,
              personal_id,
              valor,
              data_pagamento,
              metodo_pagamento,
              stripe_account_id,
              stripe_invoice_id,
              stripe_application_fee_id,
              stripe_application_fee_amount,
              stripe_payment_intent_id,
              stripe_charge_id,
              stripe_balance_transaction_id,
              stripe_payment_method_type,
              stripe_processing_fee_amount,
              stripe_net_amount,
              stripe_currency,
              observacoes
            ) VALUES (
              v_subscription_id,
              v_student_id,
              v_personal_id,
              coalesce(nullif(_command ->> 'paid_value', '')::numeric, nullif(_command ->> 'valor', '')::numeric, 0),
              coalesce(nullif(_command ->> 'data_pagamento', '')::timestamptz, _event_created_at),
              coalesce(nullif(_command ->> 'metodo_pagamento', ''), 'stripe'),
              _stripe_account_id,
              _command ->> 'stripe_invoice_id',
              _command ->> 'stripe_application_fee_id',
              nullif(_command ->> 'stripe_application_fee_amount', '')::numeric,
              _command ->> 'stripe_payment_intent_id',
              _command ->> 'stripe_charge_id',
              _command ->> 'stripe_balance_transaction_id',
              _command ->> 'stripe_payment_method_type',
              nullif(_command ->> 'stripe_processing_fee_amount', '')::numeric,
              nullif(_command ->> 'stripe_net_amount', '')::numeric,
              _command ->> 'stripe_currency',
              CASE WHEN _stripe_account_id IS NULL THEN 'Pagamento via Stripe' ELSE 'Pagamento via Stripe Connect' END
            )
            ON CONFLICT DO NOTHING;
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
            v_subscription_id,
            v_student_id,
            v_personal_id,
            'stripe',
            _event_id,
            _event_created_at,
            _event_type,
            'allow',
            coalesce(nullif(_command ->> 'paid_value', '')::numeric, nullif(_command ->> 'valor', '')::numeric),
            _command ->> 'stripe_currency',
            jsonb_build_object('stripe_account_id', _stripe_account_id)
          ) ON CONFLICT (provider, provider_event_id) DO NOTHING;
        ELSIF v_kind IN ('payment_failed', 'access_revoked') THEN
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
            v_subscription_id,
            v_student_id,
            v_personal_id,
            'stripe',
            _event_id,
            _event_created_at,
            _event_type,
            'block',
            nullif(_command ->> 'revoked_amount', '')::numeric,
            _command ->> 'stripe_currency',
            jsonb_build_object(
              'stripe_account_id', _stripe_account_id,
              'reason', _command ->> 'access_revoked_reason'
            )
          ) ON CONFLICT (provider, provider_event_id) DO NOTHING;
        ELSE
          INSERT INTO public.subscription_financial_events (
            subscription_id,
            student_id,
            personal_id,
            provider,
            provider_event_id,
            provider_event_created_at,
            event_type,
            effect,
            metadata
          ) VALUES (
            v_subscription_id,
            v_student_id,
            v_personal_id,
            'stripe',
            _event_id,
            _event_created_at,
            _event_type,
            'neutral',
            jsonb_build_object('stripe_account_id', _stripe_account_id)
          ) ON CONFLICT (provider, provider_event_id) DO NOTHING;
        END IF;

        PERFORM public.recalculate_student_access(v_student_id);
      END IF;
    END IF;

    UPDATE public.stripe_webhook_events
    SET
      processing_status = 'processed',
      error_message = NULL,
      processed_at = transaction_timestamp(),
      processing_completed_at = transaction_timestamp(),
      outcome = jsonb_build_object(
        'kind', v_kind,
        'subscription', v_subscription,
        'ignored', v_kind = 'ignored',
        'stale', coalesce((v_subscription ->> 'stale')::boolean, false)
      )
    WHERE id = _event_id;

    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', false,
      'event_id', _event_id,
      'kind', v_kind,
      'subscription', v_subscription
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;

    UPDATE public.stripe_webhook_events
    SET
      processing_status = 'failed',
      error_message = left(coalesce(v_error, 'Erro desconhecido'), 2000),
      last_error_at = transaction_timestamp(),
      processing_completed_at = transaction_timestamp(),
      outcome = jsonb_build_object('kind', v_kind, 'failed', true)
    WHERE id = _event_id;

    RETURN jsonb_build_object(
      'ok', false,
      'event_id', _event_id,
      'kind', v_kind,
      'error', coalesce(v_error, 'Erro desconhecido')
    );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_stripe_subscription_command(jsonb, text, timestamptz, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_stripe_subscription_command(jsonb, text, timestamptz, integer, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.apply_stripe_webhook_event(text, text, timestamptz, text, boolean, text, jsonb, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stripe_webhook_event(text, text, timestamptz, text, boolean, text, jsonb, text, text, jsonb)
  TO service_role;

NOTIFY pgrst, 'reload schema';
