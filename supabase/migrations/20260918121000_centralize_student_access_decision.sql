-- Central, deterministic student-access decision.
-- Source of truth: current personal relationship + payment rule + subscription + grace + manual command.

-- Keep the previous implementations available for an explicit rollback.
DO $$
BEGIN
  IF to_regprocedure('public.recalculate_student_access_legacy_20260918(uuid)') IS NULL
    AND to_regprocedure('public.recalculate_student_access(uuid)') IS NOT NULL
  THEN
    ALTER FUNCTION public.recalculate_student_access(uuid)
      RENAME TO recalculate_student_access_legacy_20260918;
  END IF;

  IF to_regprocedure('public.get_student_access_state_legacy_20260918(uuid)') IS NULL
    AND to_regprocedure('public.get_student_access_state(uuid)') IS NOT NULL
  THEN
    ALTER FUNCTION public.get_student_access_state(uuid)
      RENAME TO get_student_access_state_legacy_20260918;
  END IF;

  IF to_regprocedure('public.get_students_access_states_legacy_20260918(uuid)') IS NULL
    AND to_regprocedure('public.get_students_access_states(uuid)') IS NOT NULL
  THEN
    ALTER FUNCTION public.get_students_access_states(uuid)
      RENAME TO get_students_access_states_legacy_20260918;
  END IF;

  IF to_regprocedure('public.register_student_access_event_legacy_20260918(uuid,text,text,text,text,timestamp with time zone)') IS NULL
    AND to_regprocedure('public.register_student_access_event(uuid,text,text,text,text,timestamp with time zone)') IS NOT NULL
  THEN
    ALTER FUNCTION public.register_student_access_event(uuid, text, text, text, text, timestamptz)
      RENAME TO register_student_access_event_legacy_20260918;
  END IF;

  IF to_regprocedure('public.pode_acessar_plataforma_legacy_20260918(uuid)') IS NULL
    AND to_regprocedure('public.pode_acessar_plataforma(uuid)') IS NOT NULL
  THEN
    ALTER FUNCTION public.pode_acessar_plataforma(uuid)
      RENAME TO pode_acessar_plataforma_legacy_20260918;
  END IF;

  IF to_regprocedure('public.handle_subscription_access_event_legacy_20260918()') IS NULL
    AND to_regprocedure('public.handle_subscription_access_event()') IS NOT NULL
  THEN
    ALTER FUNCTION public.handle_subscription_access_event()
      RENAME TO handle_subscription_access_event_legacy_20260918;
  END IF;
END;
$$;

ALTER TABLE public.student_access_state
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS grace_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS plans_path text,
  ADD COLUMN IF NOT EXISTS decision jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.student_access_events'::regclass
      AND conname = 'student_access_manual_release_must_expire'
  ) THEN
    ALTER TABLE public.student_access_events
      ADD CONSTRAINT student_access_manual_release_must_expire
      CHECK (
        source <> 'manual'
        OR event_type <> 'manual_release'
        OR manual_release_until IS NOT NULL
        OR reason_code LIKE 'manual_indefinite_%'
      ) NOT VALID;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_student_access_decision(
  _student_id uuid,
  _at timestamptz DEFAULT statement_timestamp()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_manual public.student_access_events%ROWTYPE;
  v_active public.subscriptions%ROWTYPE;
  v_revoked public.subscriptions%ROWTYPE;
  v_latest public.subscriptions%ROWTYPE;
  v_is_student boolean := false;
  v_has_manual boolean := false;
  v_has_active boolean := false;
  v_has_revocation boolean := false;
  v_has_latest boolean := false;
  v_payment_supersedes_revocation boolean := false;
  v_payment_required boolean := false;
  v_control_enabled_at timestamptz := NULL;
  v_activation_grace_ends_at timestamptz := NULL;
  v_has_any_subscription boolean := false;
  v_allowed boolean := false;
  v_status text := 'pagamento_pendente';
  v_reason_code text := 'access_denied';
  v_reason text := 'Acesso indisponivel.';
  v_message text := NULL;
  v_source text := 'system';
  v_priority integer := 0;
  v_effective_event_id uuid := NULL;
  v_active_subscription_id uuid := NULL;
  v_manual_release_until timestamptz := NULL;
  v_expires_at timestamptz := NULL;
  v_grace_ends_at timestamptz := NULL;
  v_in_grace boolean := false;
  v_plans_path text := NULL;
BEGIN
  IF _student_id IS NULL OR _at IS NULL THEN
    RETURN jsonb_build_object(
      'student_id', _student_id,
      'allowed', false,
      'status', 'suspenso',
      'reason_code', 'invalid_request',
      'reason', 'Nao foi possivel determinar o acesso.',
      'payment_required', true,
      'has_active_payment', false,
      'checked_at', _at
    );
  END IF;

  SELECT
    p.id,
    p.personal_id,
    p.created_at,
    p.controle_acesso_por_pagamento AS student_payment_override,
    p.payment_control_enabled_at AS student_control_enabled_at,
    ps.controle_acesso_por_pagamento AS personal_payment_control,
    ps.payment_control_enabled_at AS personal_control_enabled_at,
    personal.public_slug AS personal_slug
  INTO v_profile
  FROM public.profiles p
  LEFT JOIN public.personal_settings ps ON ps.personal_id = p.personal_id
  LEFT JOIN public.profiles personal ON personal.id = p.personal_id
  WHERE p.id = _student_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'student_id', _student_id,
      'allowed', false,
      'status', 'suspenso',
      'reason_code', 'student_not_found',
      'reason', 'Aluno nao encontrado.',
      'payment_required', true,
      'has_active_payment', false,
      'checked_at', _at
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _student_id
      AND ur.role = 'aluno'
  ) INTO v_is_student;

  IF NOT v_is_student THEN
    RETURN jsonb_build_object(
      'student_id', _student_id,
      'personal_id', v_profile.personal_id,
      'allowed', false,
      'status', 'suspenso',
      'reason_code', 'not_a_student',
      'reason', 'O perfil informado nao e um aluno.',
      'payment_required', true,
      'has_active_payment', false,
      'checked_at', _at
    );
  END IF;

  IF v_profile.personal_slug IS NOT NULL THEN
    v_plans_path := format('/planos/%s', v_profile.personal_slug);
  END IF;

  IF v_profile.student_payment_override IS NOT NULL THEN
    v_payment_required := v_profile.student_payment_override;
    v_control_enabled_at := CASE
      WHEN v_profile.student_payment_override
        THEN v_profile.student_control_enabled_at
      ELSE NULL
    END;
  ELSE
    v_payment_required := coalesce(v_profile.personal_payment_control, false);
    v_control_enabled_at := CASE
      WHEN coalesce(v_profile.personal_payment_control, false)
        THEN v_profile.personal_control_enabled_at
      ELSE NULL
    END;
  END IF;

  SELECT e.*
  INTO v_manual
  FROM public.student_access_events e
  WHERE e.student_id = _student_id
    AND e.source = 'manual'
    AND e.event_type IN ('manual_pause', 'manual_suspend', 'manual_release')
  ORDER BY e.created_at DESC, e.id DESC
  LIMIT 1;
  v_has_manual := FOUND;

  -- An explicit suspension is independent from the financial state and lasts
  -- until a later release command is registered.
  -- Legacy suspensions explicitly created for delinquency are financial, not
  -- human relationship blocks. The payment decision below supersedes them so
  -- a later successful payment restores access without manual intervention.
  IF v_has_manual
    AND v_manual.effect = 'block'
    AND coalesce(v_manual.reason_code, '') <> 'inadimplencia'
  THEN
    v_allowed := false;
    v_status := CASE
      WHEN v_manual.event_type = 'manual_pause' THEN 'pausado'
      ELSE 'suspenso'
    END;
    v_reason_code := v_manual.event_type;
    v_reason := 'Acesso bloqueado manualmente pelo personal trainer.';
    v_message := v_manual.message_aluno;
    v_source := 'manual';
    v_priority := 100;
    v_effective_event_id := v_manual.id;
  ELSIF v_profile.personal_id IS NULL THEN
    v_allowed := false;
    v_status := 'suspenso';
    v_reason_code := 'missing_personal';
    v_reason := 'Aluno sem personal trainer vinculado.';
    v_source := 'relationship';
    v_priority := 90;
  ELSIF NOT v_payment_required THEN
    v_allowed := true;
    v_status := 'ativo';
    v_reason_code := 'payment_control_disabled';
    v_reason := 'O personal trainer nao exige pagamento para acesso.';
    v_source := 'settings';
    v_priority := 10;
  ELSE
    SELECT s.*
    INTO v_active
    FROM public.subscriptions s
    WHERE s.student_id = _student_id
      AND s.personal_id = v_profile.personal_id
      AND s.status_pagamento IN ('pago', 'cancelado', 'canceled')
      AND s.access_revoked_at IS NULL
      AND s.data_expiracao + interval '24 hours' > _at
    ORDER BY
      coalesce(s.data_pagamento, s.created_at) DESC NULLS LAST,
      s.data_expiracao DESC,
      s.id DESC
    LIMIT 1;
    v_has_active := FOUND;

    SELECT s.*
    INTO v_revoked
    FROM public.subscriptions s
    WHERE s.student_id = _student_id
      AND s.personal_id = v_profile.personal_id
      AND s.access_revoked_at IS NOT NULL
    ORDER BY s.access_revoked_at DESC, s.id DESC
    LIMIT 1;
    v_has_revocation := FOUND;

    SELECT s.*
    INTO v_latest
    FROM public.subscriptions s
    WHERE s.student_id = _student_id
      AND s.personal_id = v_profile.personal_id
    ORDER BY
      coalesce(s.last_provider_event_created_at, s.updated_at, s.created_at) DESC NULLS LAST,
      s.data_expiracao DESC,
      s.id DESC
    LIMIT 1;
    v_has_latest := FOUND;

    SELECT EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.student_id = _student_id
        AND s.personal_id = v_profile.personal_id
    ) INTO v_has_any_subscription;

    IF v_has_active AND v_has_revocation THEN
      v_payment_supersedes_revocation :=
        coalesce(v_active.data_pagamento, v_active.created_at, '-infinity'::timestamptz)
          > v_revoked.access_revoked_at;
    ELSE
      v_payment_supersedes_revocation := v_has_active;
    END IF;

    IF v_has_active AND (NOT v_has_revocation OR v_payment_supersedes_revocation) THEN
      v_allowed := true;
      v_status := 'ativo';
      v_source := 'payment';
      v_priority := 50;
      v_active_subscription_id := v_active.id;
      v_grace_ends_at := v_active.data_expiracao + interval '24 hours';
      v_expires_at := v_grace_ends_at;
      v_in_grace := _at >= v_active.data_expiracao;

      IF v_in_grace THEN
        v_reason_code := 'payment_grace';
        v_reason := 'Pagamento vencido dentro da carencia fixa de 24 horas.';
      ELSIF v_active.status_pagamento IN ('cancelado', 'canceled')
        OR v_active.cancela_no_fim_do_ciclo
      THEN
        v_reason_code := 'subscription_canceled_paid_period';
        v_reason := 'Assinatura cancelada, com periodo pago ainda vigente.';
      ELSE
        v_reason_code := 'payment_active';
        v_reason := 'Pagamento aprovado e vigente.';
      END IF;
    ELSIF v_has_revocation THEN
      -- Refunds (including partial) and chargebacks cannot be bypassed by a
      -- temporary manual release. A newer successful payment is required.
      v_allowed := false;
      v_status := 'pagamento_pendente';
      v_reason_code := coalesce(v_revoked.access_revoked_reason, 'payment_revoked');
      v_reason := 'Acesso revogado imediatamente por estorno ou chargeback.';
      v_source := 'payment';
      v_priority := 95;
      v_active_subscription_id := v_revoked.id;
    ELSIF v_has_manual
      AND v_manual.effect = 'allow'
      AND (
        v_manual.manual_release_until IS NULL
        OR v_manual.manual_release_until > _at
      )
    THEN
      v_allowed := true;
      v_status := 'ativo';
      v_reason_code := coalesce(
        v_manual.reason_code,
        CASE
          WHEN v_manual.manual_release_until IS NULL THEN 'manual_indefinite_release'
          ELSE 'manual_temporary_release'
        END
      );
      v_reason := CASE
        WHEN v_manual.manual_release_until IS NULL
          THEN 'Acesso liberado manualmente sem prazo pelo personal trainer.'
        ELSE 'Acesso liberado temporariamente pelo personal trainer.'
      END;
      v_message := v_manual.message_aluno;
      v_source := 'manual';
      v_priority := 100;
      v_effective_event_id := v_manual.id;
      v_manual_release_until := v_manual.manual_release_until;
      v_expires_at := v_manual.manual_release_until;
    ELSIF v_control_enabled_at IS NOT NULL
      AND v_profile.created_at <= v_control_enabled_at
      AND NOT v_has_any_subscription
      AND v_control_enabled_at + interval '24 hours' > _at
    THEN
      v_activation_grace_ends_at := v_control_enabled_at + interval '24 hours';
      v_allowed := true;
      v_status := 'carencia';
      v_reason_code := 'payment_control_activation_grace';
      v_reason := 'Carencia inicial de 24 horas apos ativacao do controle por pagamento.';
      v_source := 'settings';
      v_priority := 40;
      v_grace_ends_at := v_activation_grace_ends_at;
      v_expires_at := v_activation_grace_ends_at;
      v_in_grace := true;
    ELSE
      v_allowed := false;
      v_status := 'pagamento_pendente';
      v_source := 'payment';
      v_priority := 50;

      IF v_has_latest
        AND v_latest.status_pagamento IN ('pendente', 'atrasado')
      THEN
        v_reason_code := 'payment_pending';
        v_reason := 'Pagamento pendente ou atrasado.';
      ELSIF v_has_latest
        AND v_latest.data_expiracao + interval '24 hours' <= _at
      THEN
        v_reason_code := 'payment_expired';
        v_reason := 'Pagamento vencido e carencia de 24 horas encerrada.';
        v_grace_ends_at := v_latest.data_expiracao + interval '24 hours';
      ELSE
        v_reason_code := 'payment_required';
        v_reason := 'O acesso exige um pagamento confirmado.';
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'student_id', _student_id,
    'personal_id', v_profile.personal_id,
    'allowed', v_allowed,
    'status', v_status,
    'status_label', public.student_access_status_label(v_status),
    'reason_code', v_reason_code,
    'reason', v_reason,
    'message_aluno', v_message,
    'source', v_source,
    'priority', v_priority,
    'effective_event_id', v_effective_event_id,
    'payment_required', v_payment_required,
    'has_active_payment', v_allowed AND v_active_subscription_id IS NOT NULL AND v_source = 'payment',
    'active_subscription_id', v_active_subscription_id,
    'manual_release_until', v_manual_release_until,
    'expires_at', v_expires_at,
    'grace_ends_at', v_grace_ends_at,
    'in_grace', v_in_grace,
    'plans_path', v_plans_path,
    'checked_at', _at
  );
END;
$$;

COMMENT ON FUNCTION public.calculate_student_access_decision(uuid, timestamptz) IS
  'Pure access decision. Never writes state and never uses profiles.is_active.';

CREATE OR REPLACE FUNCTION public.recalculate_student_access(_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision jsonb;
  v_previous jsonb;
  v_previous_normalized jsonb;
  v_current_normalized jsonb;
  v_allowed boolean;
  v_student uuid;
  v_personal uuid;
BEGIN
  IF _student_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_student_id::text, 0));
  v_decision := public.calculate_student_access_decision(_student_id, statement_timestamp());
  v_student := nullif(v_decision ->> 'student_id', '')::uuid;

  IF v_student IS NULL OR (v_decision ->> 'reason_code') = 'student_not_found' THEN
    RETURN v_decision;
  END IF;

  v_personal := nullif(v_decision ->> 'personal_id', '')::uuid;
  v_allowed := coalesce((v_decision ->> 'allowed')::boolean, false);

  SELECT s.decision
  INTO v_previous
  FROM public.student_access_state s
  WHERE s.student_id = _student_id
  FOR UPDATE;

  v_previous_normalized := coalesce(v_previous, '{}'::jsonb) - 'checked_at';
  v_current_normalized := v_decision - 'checked_at';

  INSERT INTO public.student_access_state (
    student_id,
    personal_id,
    allowed,
    status,
    reason_code,
    reason,
    message_aluno,
    source,
    priority,
    effective_event_id,
    payment_required,
    has_active_payment,
    active_subscription_id,
    manual_release_until,
    expires_at,
    grace_ends_at,
    plans_path,
    decision,
    calculated_at,
    updated_at
  ) VALUES (
    v_student,
    v_personal,
    v_allowed,
    v_decision ->> 'status',
    v_decision ->> 'reason_code',
    v_decision ->> 'reason',
    v_decision ->> 'message_aluno',
    coalesce(v_decision ->> 'source', 'system'),
    coalesce((v_decision ->> 'priority')::integer, 0),
    nullif(v_decision ->> 'effective_event_id', '')::uuid,
    coalesce((v_decision ->> 'payment_required')::boolean, true),
    coalesce((v_decision ->> 'has_active_payment')::boolean, false),
    nullif(v_decision ->> 'active_subscription_id', '')::uuid,
    nullif(v_decision ->> 'manual_release_until', '')::timestamptz,
    nullif(v_decision ->> 'expires_at', '')::timestamptz,
    nullif(v_decision ->> 'grace_ends_at', '')::timestamptz,
    v_decision ->> 'plans_path',
    v_decision,
    statement_timestamp(),
    statement_timestamp()
  )
  ON CONFLICT (student_id) DO UPDATE SET
    personal_id = excluded.personal_id,
    allowed = excluded.allowed,
    status = excluded.status,
    reason_code = excluded.reason_code,
    reason = excluded.reason,
    message_aluno = excluded.message_aluno,
    source = excluded.source,
    priority = excluded.priority,
    effective_event_id = excluded.effective_event_id,
    payment_required = excluded.payment_required,
    has_active_payment = excluded.has_active_payment,
    active_subscription_id = excluded.active_subscription_id,
    manual_release_until = excluded.manual_release_until,
    expires_at = excluded.expires_at,
    grace_ends_at = excluded.grace_ends_at,
    plans_path = excluded.plans_path,
    decision = excluded.decision,
    calculated_at = excluded.calculated_at,
    updated_at = excluded.updated_at;

  IF v_previous IS NULL OR v_previous_normalized IS DISTINCT FROM v_current_normalized THEN
    INSERT INTO public.student_access_audit (
      student_id,
      personal_id,
      actor_id,
      source,
      previous_allowed,
      new_allowed,
      reason_code,
      previous_decision,
      new_decision,
      metadata
    ) VALUES (
      v_student,
      v_personal,
      auth.uid(),
      coalesce(v_decision ->> 'source', 'system'),
      CASE WHEN v_previous IS NULL THEN NULL ELSE (v_previous ->> 'allowed')::boolean END,
      v_allowed,
      coalesce(v_decision ->> 'reason_code', 'unknown'),
      v_previous,
      v_decision,
      jsonb_build_object('generated_by', 'recalculate_student_access')
    );
  END IF;

  RETURN v_decision;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_access_state(_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_read_student_access(_student_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para consultar acesso deste aluno'
      USING ERRCODE = '42501';
  END IF;

  RETURN public.calculate_student_access_decision(_student_id, statement_timestamp());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_students_access_states(_personal_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  student_id uuid,
  personal_id uuid,
  allowed boolean,
  status text,
  status_label text,
  reason_code text,
  reason text,
  message_aluno text,
  source text,
  priority integer,
  effective_event_id uuid,
  payment_required boolean,
  has_active_payment boolean,
  active_subscription_id uuid,
  manual_release_until timestamptz,
  calculated_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL
    OR (_personal_id IS DISTINCT FROM v_actor AND NOT public.is_admin(v_actor))
  THEN
    RAISE EXCEPTION 'Sem permissao para consultar acessos destes alunos'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.personal_id,
    coalesce((d.value ->> 'allowed')::boolean, false),
    d.value ->> 'status',
    d.value ->> 'status_label',
    d.value ->> 'reason_code',
    d.value ->> 'reason',
    d.value ->> 'message_aluno',
    d.value ->> 'source',
    coalesce((d.value ->> 'priority')::integer, 0),
    nullif(d.value ->> 'effective_event_id', '')::uuid,
    coalesce((d.value ->> 'payment_required')::boolean, true),
    coalesce((d.value ->> 'has_active_payment')::boolean, false),
    nullif(d.value ->> 'active_subscription_id', '')::uuid,
    nullif(d.value ->> 'manual_release_until', '')::timestamptz,
    statement_timestamp(),
    statement_timestamp()
  FROM public.profiles p
  CROSS JOIN LATERAL (
    SELECT public.calculate_student_access_decision(p.id, statement_timestamp()) AS value
  ) d
  WHERE p.personal_id = _personal_id
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = p.id
        AND ur.role = 'aluno'
    )
  ORDER BY p.nome, p.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_student_access_event(
  _student_id uuid,
  _event_type text,
  _reason_code text DEFAULT NULL,
  _message_aluno text DEFAULT NULL,
  _observation text DEFAULT NULL,
  _manual_release_until timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_personal_id uuid;
  v_effect text;
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF NOT public.can_manage_student_access(_student_id, v_actor_id) THEN
    RAISE EXCEPTION 'Sem permissao para alterar acesso deste aluno'
      USING ERRCODE = '42501';
  END IF;

  IF _event_type NOT IN ('manual_pause', 'manual_suspend', 'manual_release') THEN
    RAISE EXCEPTION 'Tipo de evento de acesso invalido: %', _event_type
      USING ERRCODE = '22023';
  END IF;

  SELECT p.personal_id
  INTO v_personal_id
  FROM public.profiles p
  WHERE p.id = _student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno nao encontrado'
      USING ERRCODE = 'P0002';
  END IF;

  IF _event_type = 'manual_release' THEN
    IF coalesce(_reason_code, '') LIKE 'manual_indefinite_%' THEN
      _manual_release_until := NULL;
    ELSE
      _manual_release_until := coalesce(
        _manual_release_until,
        statement_timestamp() + interval '7 days'
      );
    END IF;

    IF _manual_release_until IS NOT NULL
      AND _manual_release_until <= statement_timestamp()
    THEN
      RAISE EXCEPTION 'A data de liberacao temporaria precisa ser futura'
        USING ERRCODE = '22023';
    END IF;
  ELSE
    _manual_release_until := NULL;
  END IF;

  v_effect := CASE WHEN _event_type = 'manual_release' THEN 'allow' ELSE 'block' END;
  v_before := public.calculate_student_access_decision(_student_id, statement_timestamp());

  INSERT INTO public.student_access_events (
    student_id,
    personal_id,
    actor_id,
    source,
    event_type,
    effect,
    priority,
    reason_code,
    message_aluno,
    observation,
    manual_release_until,
    metadata
  ) VALUES (
    _student_id,
    v_personal_id,
    v_actor_id,
    'manual',
    _event_type,
    v_effect,
    100,
    coalesce(_reason_code, _event_type),
    nullif(btrim(coalesce(_message_aluno, '')), ''),
    nullif(btrim(coalesce(_observation, '')), ''),
    _manual_release_until,
    jsonb_build_object(
      'manual_release_until', _manual_release_until,
      'indefinite', _event_type = 'manual_release' AND _manual_release_until IS NULL,
      'default_release_days', CASE
        WHEN _event_type = 'manual_release' AND _manual_release_until IS NOT NULL THEN 7
        ELSE NULL
      END
    )
  );

  v_after := public.recalculate_student_access(_student_id);

  INSERT INTO public.student_access_logs (
    student_id,
    changed_by,
    from_active,
    to_active,
    motivo,
    mensagem_aluno,
    observacao_personal
  ) VALUES (
    _student_id,
    v_actor_id,
    coalesce((v_before ->> 'allowed')::boolean, false),
    coalesce((v_after ->> 'allowed')::boolean, false),
    coalesce(_reason_code, _event_type),
    nullif(btrim(coalesce(_message_aluno, '')), ''),
    nullif(btrim(coalesce(_observation, '')), '')
  );

  RETURN v_after;
END;
$$;

CREATE OR REPLACE FUNCTION public.pode_acessar_plataforma(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role user_role;
  v_admin_flag boolean;
  v_has_pago boolean;
  v_decision jsonb;
BEGIN
  IF _user_id IS NULL OR v_actor IS NULL THEN
    RETURN false;
  END IF;

  IF _user_id IS DISTINCT FROM v_actor AND NOT public.is_admin(v_actor) THEN
    RETURN false;
  END IF;

  SELECT ur.role
  INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  ORDER BY CASE ur.role WHEN 'admin' THEN 1 WHEN 'personal' THEN 2 ELSE 3 END
  LIMIT 1;

  IF v_role = 'admin' THEN
    RETURN true;
  ELSIF v_role = 'personal' THEN
    SELECT a.controle_acesso_personal_por_pagamento
    INTO v_admin_flag
    FROM public.admin_settings a
    LIMIT 1;

    IF NOT coalesce(v_admin_flag, false) THEN
      RETURN true;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.assinaturas a
      WHERE a.personal_id = _user_id
        AND (
          (a.status IN ('ativo', 'ativa') AND (a.data_fim IS NULL OR a.data_fim >= CURRENT_DATE))
          OR
          (a.status = 'trial' AND coalesce(a.trial, true) AND (a.trial_fim IS NULL OR a.trial_fim >= CURRENT_DATE))
        )
    ) INTO v_has_pago;
    RETURN v_has_pago;
  ELSIF v_role = 'aluno' THEN
    v_decision := public.calculate_student_access_decision(_user_id, statement_timestamp());
    RETURN coalesce((v_decision ->> 'allowed')::boolean, false);
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_subscription_access_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  v_student_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.student_id ELSE NEW.student_id END;

  IF v_student_id IS NOT NULL THEN
    PERFORM public.recalculate_student_access(v_student_id);
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_access_event ON public.subscriptions;
CREATE TRIGGER trg_subscription_access_event
AFTER INSERT OR UPDATE OF
  status_pagamento,
  data_expiracao,
  personal_id,
  access_revoked_at,
  access_revoked_reason
OR DELETE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_subscription_access_event();

CREATE OR REPLACE FUNCTION public.student_access_status_label(_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _status
    WHEN 'ativo' THEN 'Ativo'
    WHEN 'carencia' THEN 'Em carencia'
    WHEN 'pausado' THEN 'Pausado'
    WHEN 'suspenso' THEN 'Suspenso'
    WHEN 'pagamento_pendente' THEN 'Pagamento pendente'
    ELSE coalesce(_status, 'Desconhecido')
  END
$$;

REVOKE ALL ON FUNCTION public.calculate_student_access_decision(uuid, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_student_access_decision(uuid, timestamptz)
  TO service_role;

REVOKE ALL ON FUNCTION public.recalculate_student_access(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_student_access(uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.get_student_access_state(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_access_state(uuid)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_students_access_states(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_students_access_states(uuid)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.register_student_access_event(uuid, text, text, text, text, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_student_access_event(uuid, text, text, text, text, timestamptz)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.pode_acessar_plataforma(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_acessar_plataforma(uuid)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
