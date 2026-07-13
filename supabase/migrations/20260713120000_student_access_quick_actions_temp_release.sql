-- Adds temporary manual access releases and a batch status RPC for quick student actions.

ALTER TABLE public.student_access_events
  ADD COLUMN IF NOT EXISTS manual_release_until timestamptz;

ALTER TABLE public.student_access_state
  ADD COLUMN IF NOT EXISTS manual_release_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_student_access_events_manual_release_until
  ON public.student_access_events(student_id, manual_release_until DESC)
  WHERE source = 'manual'
    AND event_type = 'manual_release'
    AND manual_release_until IS NOT NULL;

CREATE OR REPLACE FUNCTION public.student_access_status_label(_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _status
    WHEN 'ativo' THEN 'Ativo'
    WHEN 'pausado' THEN 'Pausado'
    WHEN 'suspenso' THEN 'Suspenso'
    WHEN 'pagamento_pendente' THEN 'Pagamento pendente'
    ELSE coalesce(_status, 'Desconhecido')
  END
$$;

CREATE OR REPLACE FUNCTION public.recalculate_student_access(_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_manual record;
  v_subscription record;
  v_previous record;
  v_payment_required boolean := false;
  v_has_active_payment boolean := false;
  v_active_subscription_id uuid := NULL;
  v_allowed boolean := true;
  v_status text := 'ativo';
  v_reason_code text := 'active';
  v_reason text := 'Aluno liberado para acessar a plataforma.';
  v_message text := NULL;
  v_source text := 'system';
  v_priority integer := 0;
  v_effective_event_id uuid := NULL;
  v_manual_release_until timestamptz := NULL;
BEGIN
  IF _student_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.id, p.nome, p.personal_id, p.is_active, p.controle_acesso_por_pagamento
    INTO v_profile
  FROM public.profiles p
  WHERE p.id = _student_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_profile.controle_acesso_por_pagamento IS NOT NULL THEN
    v_payment_required := v_profile.controle_acesso_por_pagamento;
  ELSE
    SELECT coalesce(ps.controle_acesso_por_pagamento, false)
      INTO v_payment_required
    FROM public.personal_settings ps
    WHERE ps.personal_id = v_profile.personal_id;
    v_payment_required := coalesce(v_payment_required, false);
  END IF;

  SELECT s.*
    INTO v_subscription
  FROM public.subscriptions s
  WHERE s.student_id = _student_id
    AND s.status_pagamento = 'pago'
    AND s.data_expiracao > now()
  ORDER BY s.data_expiracao DESC
  LIMIT 1;

  IF FOUND THEN
    v_has_active_payment := true;
    v_active_subscription_id := v_subscription.id;
  END IF;

  SELECT *
    INTO v_manual
  FROM public.student_access_events e
  WHERE e.student_id = _student_id
    AND e.source = 'manual'
    AND e.event_type IN ('manual_pause', 'manual_suspend', 'manual_release')
    AND NOT (
      e.event_type = 'manual_release'
      AND e.manual_release_until IS NOT NULL
      AND e.manual_release_until <= now()
    )
  ORDER BY e.created_at DESC, e.id DESC
  LIMIT 1;

  IF FOUND AND v_manual.effect = 'block' THEN
    v_allowed := false;
    v_status := CASE WHEN v_manual.event_type = 'manual_pause' THEN 'pausado' ELSE 'suspenso' END;
    v_reason_code := v_manual.event_type;
    v_reason := CASE
      WHEN v_manual.event_type = 'manual_pause' THEN 'Bloqueado por pausa manual.'
      ELSE 'Bloqueado por suspensao manual.'
    END;
    v_message := v_manual.message_aluno;
    v_source := 'manual';
    v_priority := v_manual.priority;
    v_effective_event_id := v_manual.id;
  ELSIF FOUND
    AND v_manual.effect = 'allow'
    AND (
      v_manual.manual_release_until IS NOT NULL
      OR v_manual.reason_code = 'manual_release'
    )
  THEN
    v_allowed := true;
    v_status := 'ativo';
    v_reason_code := CASE
      WHEN v_manual.manual_release_until IS NOT NULL THEN 'manual_temporary_release'
      ELSE 'manual_release'
    END;
    v_reason := CASE
      WHEN v_manual.manual_release_until IS NOT NULL
        THEN 'Liberado temporariamente pelo personal trainer.'
      ELSE 'Liberado manualmente pelo personal trainer.'
    END;
    v_message := v_manual.message_aluno;
    v_source := 'manual';
    v_priority := v_manual.priority;
    v_effective_event_id := v_manual.id;
    v_manual_release_until := v_manual.manual_release_until;
  ELSIF v_payment_required AND NOT v_has_active_payment THEN
    v_allowed := false;
    v_status := 'pagamento_pendente';
    v_reason_code := 'payment_required';
    v_reason := 'Bloqueado porque o controle por pagamento esta ativo e nao ha pagamento vigente.';
    v_source := 'payment';
    v_priority := 50;

    SELECT s.*
      INTO v_subscription
    FROM public.subscriptions s
    WHERE s.student_id = _student_id
    ORDER BY s.data_expiracao DESC NULLS LAST, s.created_at DESC NULLS LAST
    LIMIT 1;

    IF FOUND
      AND v_subscription.status_pagamento = 'pago'
      AND v_subscription.data_expiracao <= now()
    THEN
      v_status := 'pagamento_pendente';
      v_reason_code := 'payment_expired';
      v_reason := 'Bloqueado porque o ultimo pagamento venceu.';
    ELSIF FOUND
      AND v_subscription.status_pagamento IN ('pendente', 'atrasado')
    THEN
      v_reason_code := 'payment_pending';
      v_reason := 'Bloqueado por pagamento pendente ou atrasado.';
    END IF;
  END IF;

  SELECT allowed, reason_code
    INTO v_previous
  FROM public.student_access_state
  WHERE student_id = _student_id;

  IF v_source = 'payment'
    AND (v_previous.allowed IS DISTINCT FROM v_allowed OR v_previous.reason_code IS DISTINCT FROM v_reason_code)
  THEN
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
      metadata
    )
    VALUES (
      _student_id,
      v_profile.personal_id,
      NULL,
      'payment',
      'payment_block',
      'block',
      50,
      v_reason_code,
      CASE v_reason_code
        WHEN 'payment_expired' THEN 'Seu ultimo pagamento venceu. Regularize seu plano para voltar a acessar.'
        WHEN 'payment_pending' THEN 'Existe um pagamento pendente ou atrasado. Regularize seu plano para voltar a acessar.'
        ELSE 'Seu acesso depende de um pagamento ativo. Regularize seu plano para voltar a acessar.'
      END,
      v_reason,
      jsonb_build_object('automatic', true)
    );
  END IF;

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
    calculated_at,
    updated_at
  )
  VALUES (
    _student_id,
    v_profile.personal_id,
    v_allowed,
    v_status,
    v_reason_code,
    v_reason,
    v_message,
    v_source,
    v_priority,
    v_effective_event_id,
    v_payment_required,
    v_has_active_payment,
    v_active_subscription_id,
    v_manual_release_until,
    now(),
    now()
  )
  ON CONFLICT (student_id)
  DO UPDATE SET
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
    calculated_at = excluded.calculated_at,
    updated_at = excluded.updated_at;

  RETURN (
    SELECT jsonb_build_object(
      'student_id', s.student_id,
      'personal_id', s.personal_id,
      'allowed', s.allowed,
      'status', s.status,
      'status_label', public.student_access_status_label(s.status),
      'reason_code', s.reason_code,
      'reason', s.reason,
      'message_aluno', s.message_aluno,
      'source', s.source,
      'priority', s.priority,
      'effective_event_id', s.effective_event_id,
      'payment_required', s.payment_required,
      'has_active_payment', s.has_active_payment,
      'active_subscription_id', s.active_subscription_id,
      'manual_release_until', s.manual_release_until,
      'calculated_at', s.calculated_at,
      'updated_at', s.updated_at
    )
    FROM public.student_access_state s
    WHERE s.student_id = _student_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_access_state(_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_read_student_access(_student_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para consultar acesso deste aluno';
  END IF;

  RETURN public.recalculate_student_access(_student_id);
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_student record;
BEGIN
  IF v_actor IS NULL OR (_personal_id IS DISTINCT FROM v_actor AND NOT public.is_admin(v_actor)) THEN
    RAISE EXCEPTION 'Sem permissao para consultar acessos destes alunos';
  END IF;

  FOR v_student IN
    SELECT id
    FROM public.profiles
    WHERE personal_id = _personal_id
  LOOP
    PERFORM public.recalculate_student_access(v_student.id);
  END LOOP;

  RETURN QUERY
  SELECT
    s.student_id,
    s.personal_id,
    s.allowed,
    s.status,
    public.student_access_status_label(s.status) AS status_label,
    s.reason_code,
    s.reason,
    s.message_aluno,
    s.source,
    s.priority,
    s.effective_event_id,
    s.payment_required,
    s.has_active_payment,
    s.active_subscription_id,
    s.manual_release_until,
    s.calculated_at,
    s.updated_at
  FROM public.student_access_state s
  WHERE s.personal_id = _personal_id
  ORDER BY s.updated_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.get_student_access_events(uuid);

CREATE OR REPLACE FUNCTION public.get_student_access_events(_student_id uuid)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  personal_id uuid,
  actor_id uuid,
  actor_name text,
  source text,
  event_type text,
  effect text,
  priority integer,
  reason_code text,
  message_aluno text,
  observation text,
  metadata jsonb,
  created_at timestamptz,
  manual_release_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_read_student_access(_student_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para consultar historico de acesso deste aluno';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.student_id,
    e.personal_id,
    e.actor_id,
    p.nome AS actor_name,
    e.source,
    e.event_type,
    e.effect,
    e.priority,
    e.reason_code,
    e.message_aluno,
    e.observation,
    e.metadata,
    e.created_at,
    e.manual_release_until
  FROM public.student_access_events e
  LEFT JOIN public.profiles p ON p.id = e.actor_id
  WHERE e.student_id = _student_id
  ORDER BY e.created_at DESC, e.id DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.register_student_access_event(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.register_student_access_event(uuid, text, text, text, text, timestamptz);

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
  v_profile record;
  v_effect text;
  v_from_active boolean;
  v_to_active boolean;
BEGIN
  IF NOT public.can_manage_student_access(_student_id, v_actor_id) THEN
    RAISE EXCEPTION 'Sem permissao para alterar acesso deste aluno';
  END IF;

  IF _event_type NOT IN ('manual_pause', 'manual_suspend', 'manual_release') THEN
    RAISE EXCEPTION 'Tipo de evento de acesso invalido: %', _event_type;
  END IF;

  IF _event_type <> 'manual_release' THEN
    _manual_release_until := NULL;
  ELSIF _manual_release_until IS NOT NULL AND _manual_release_until <= now() THEN
    RAISE EXCEPTION 'A data de liberacao temporaria precisa ser futura';
  END IF;

  SELECT id, personal_id, is_active
    INTO v_profile
  FROM public.profiles
  WHERE id = _student_id;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'Aluno nao encontrado';
  END IF;

  v_effect := CASE WHEN _event_type = 'manual_release' THEN 'allow' ELSE 'block' END;
  v_from_active := coalesce(v_profile.is_active, true);
  v_to_active := v_effect = 'allow';

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
  )
  VALUES (
    _student_id,
    v_profile.personal_id,
    v_actor_id,
    'manual',
    _event_type,
    v_effect,
    100,
    _reason_code,
    nullif(btrim(coalesce(_message_aluno, '')), ''),
    nullif(btrim(coalesce(_observation, '')), ''),
    _manual_release_until,
    CASE
      WHEN _manual_release_until IS NOT NULL
        THEN jsonb_build_object('manual_release_until', _manual_release_until)
      ELSE '{}'::jsonb
    END
  );

  UPDATE public.profiles
  SET is_active = v_to_active,
      updated_at = now()
  WHERE id = _student_id;

  INSERT INTO public.student_access_logs (
    student_id,
    changed_by,
    from_active,
    to_active,
    motivo,
    mensagem_aluno,
    observacao_personal
  )
  VALUES (
    _student_id,
    v_actor_id,
    v_from_active,
    v_to_active,
    _reason_code,
    nullif(btrim(coalesce(_message_aluno, '')), ''),
    nullif(btrim(coalesce(_observation, '')), '')
  );

  RETURN public.recalculate_student_access(_student_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_students_access_states(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_student_access_event(uuid, text, text, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_access_events(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_access_state(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
