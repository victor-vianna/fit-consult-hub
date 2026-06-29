-- Unified student access control.
-- student_access_events is the immutable audit trail.
-- student_access_state is the single current source of truth used by UI and login guards.

CREATE TABLE IF NOT EXISTS public.student_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  personal_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'system',
  event_type text NOT NULL,
  effect text NOT NULL CHECK (effect IN ('allow', 'block', 'neutral')),
  priority integer NOT NULL DEFAULT 0,
  reason_code text,
  message_aluno text,
  observation text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_access_events_student_created
  ON public.student_access_events(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_access_events_personal_created
  ON public.student_access_events(personal_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_access_events_legacy_log_unique
  ON public.student_access_events((metadata ->> 'legacy_log_id'))
  WHERE metadata ? 'legacy_log_id';

CREATE TABLE IF NOT EXISTS public.student_access_state (
  student_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  personal_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  allowed boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'ativo',
  reason_code text,
  reason text,
  message_aluno text,
  source text NOT NULL DEFAULT 'system',
  priority integer NOT NULL DEFAULT 0,
  effective_event_id uuid REFERENCES public.student_access_events(id) ON DELETE SET NULL,
  payment_required boolean NOT NULL DEFAULT false,
  has_active_payment boolean NOT NULL DEFAULT false,
  active_subscription_id uuid,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_access_state_personal_allowed
  ON public.student_access_state(personal_id, allowed);

ALTER TABLE public.student_access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_access_state ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_read_student_access(_student_id uuid, _actor_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _actor_id IS NOT NULL
    AND (
      public.is_admin(_actor_id)
      OR _student_id = _actor_id
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = _student_id
          AND p.personal_id = _actor_id
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_student_access(_student_id uuid, _actor_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _actor_id IS NOT NULL
    AND (
      public.is_admin(_actor_id)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = _student_id
          AND p.personal_id = _actor_id
      )
    )
$$;

DROP POLICY IF EXISTS "Participantes leem eventos de acesso" ON public.student_access_events;
CREATE POLICY "Participantes leem eventos de acesso"
ON public.student_access_events
FOR SELECT
TO authenticated
USING (public.can_read_student_access(student_id));

DROP POLICY IF EXISTS "Participantes leem estado de acesso" ON public.student_access_state;
CREATE POLICY "Participantes leem estado de acesso"
ON public.student_access_state
FOR SELECT
TO authenticated
USING (public.can_read_student_access(student_id));

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
    ELSE coalesce(_status, 'Indefinido')
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
  v_payment_required boolean := false;
  v_has_active_payment boolean := false;
  v_allowed boolean := true;
  v_status text := 'ativo';
  v_reason_code text := 'active';
  v_reason text := 'Aluno liberado para acessar a plataforma.';
  v_message text := null;
  v_source text := 'system';
  v_priority integer := 0;
  v_effective_event_id uuid := null;
  v_previous record;
  v_transition_event_id uuid := null;
BEGIN
  IF _student_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.id, p.nome, p.personal_id, p.is_active, p.controle_acesso_por_pagamento
    INTO v_profile
  FROM public.profiles p
  WHERE p.id = _student_id;

  IF v_profile.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT *
    INTO v_manual
  FROM public.student_access_events e
  WHERE e.student_id = _student_id
    AND e.source = 'manual'
    AND e.event_type IN ('manual_pause', 'manual_suspend', 'manual_release')
  ORDER BY e.created_at DESC, e.id DESC
  LIMIT 1;

  IF v_manual.effect = 'block' THEN
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
  ELSE
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

    v_has_active_payment := v_subscription.id IS NOT NULL;

    IF v_payment_required AND NOT v_has_active_payment THEN
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

      IF v_subscription.id IS NOT NULL
        AND v_subscription.status_pagamento = 'pago'
        AND v_subscription.data_expiracao <= now()
      THEN
        v_status := 'pagamento_pendente';
        v_reason_code := 'payment_expired';
        v_reason := 'Bloqueado porque o ultimo pagamento venceu.';
      ELSIF v_subscription.id IS NOT NULL
        AND v_subscription.status_pagamento IN ('pendente', 'atrasado')
      THEN
        v_reason_code := 'payment_pending';
        v_reason := 'Bloqueado por pagamento pendente ou atrasado.';
      END IF;
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
      observation,
      metadata
    )
    VALUES (
      _student_id,
      v_profile.personal_id,
      null,
      'payment',
      v_reason_code,
      CASE WHEN v_allowed THEN 'allow' ELSE 'block' END,
      50,
      v_reason_code,
      v_reason,
      jsonb_build_object('generated_by', 'recalculate_student_access')
    )
    RETURNING id INTO v_transition_event_id;

    v_effective_event_id := coalesce(v_effective_event_id, v_transition_event_id);
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
    CASE WHEN v_has_active_payment THEN v_subscription.id ELSE NULL END,
    now(),
    now()
  )
  ON CONFLICT (student_id) DO UPDATE
  SET
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
  created_at timestamptz
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
    e.created_at
  FROM public.student_access_events e
  LEFT JOIN public.profiles p ON p.id = e.actor_id
  WHERE e.student_id = _student_id
  ORDER BY e.created_at DESC, e.id DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_student_access_event(
  _student_id uuid,
  _event_type text,
  _reason_code text DEFAULT NULL,
  _message_aluno text DEFAULT NULL,
  _observation text DEFAULT NULL
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
    observation
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
    nullif(btrim(coalesce(_observation, '')), '')
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

CREATE OR REPLACE FUNCTION public.pode_acessar_plataforma(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_admin_flag boolean;
  v_has_pago boolean;
  v_state jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;

  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  IF v_role = 'personal' THEN
    SELECT controle_acesso_personal_por_pagamento INTO v_admin_flag
    FROM public.admin_settings
    LIMIT 1;

    IF coalesce(v_admin_flag, false) = false THEN
      RETURN true;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.assinaturas
      WHERE personal_id = _user_id
        AND status = 'ativo'
        AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
    ) INTO v_has_pago;

    RETURN v_has_pago;
  END IF;

  IF v_role = 'aluno' THEN
    v_state := public.recalculate_student_access(_user_id);
    RETURN coalesce((v_state ->> 'allowed')::boolean, false);
  END IF;

  RETURN true;
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
  v_personal_id uuid;
  v_subscription_id uuid;
  v_status_pagamento text;
  v_data_expiracao timestamptz;
  v_effect text;
  v_event_type text;
  v_reason text;
  v_should_log boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_student_id := OLD.student_id;
    v_personal_id := OLD.personal_id;
    v_subscription_id := OLD.id;
    v_status_pagamento := OLD.status_pagamento;
    v_data_expiracao := OLD.data_expiracao;
  ELSE
    v_student_id := NEW.student_id;
    v_personal_id := NEW.personal_id;
    v_subscription_id := NEW.id;
    v_status_pagamento := NEW.status_pagamento;
    v_data_expiracao := NEW.data_expiracao;
  END IF;

  IF v_student_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_effect := 'block';
    v_event_type := 'payment_removed';
    v_reason := 'Assinatura removida.';
  ELSIF v_status_pagamento = 'pago' AND v_data_expiracao > now() THEN
    v_effect := 'allow';
    v_event_type := 'payment_active';
    v_reason := 'Pagamento aprovado e vigente.';
  ELSIF v_status_pagamento = 'pago' AND v_data_expiracao <= now() THEN
    v_effect := 'block';
    v_event_type := 'payment_expired';
    v_reason := 'Pagamento vencido.';
  ELSE
    v_effect := 'block';
    v_event_type := 'payment_' || coalesce(v_status_pagamento, 'unknown');
    v_reason := 'Status de pagamento alterado.';
  END IF;

  IF TG_OP IN ('INSERT', 'DELETE') THEN
    v_should_log := true;
  ELSIF NEW.status_pagamento IS DISTINCT FROM OLD.status_pagamento
    OR NEW.data_expiracao IS DISTINCT FROM OLD.data_expiracao
  THEN
    v_should_log := true;
  END IF;

  IF v_should_log THEN
    INSERT INTO public.student_access_events (
      student_id,
      personal_id,
      actor_id,
      source,
      event_type,
      effect,
      priority,
      reason_code,
      observation,
      metadata
    )
    VALUES (
      v_student_id,
      v_personal_id,
      auth.uid(),
      'payment',
      v_event_type,
      v_effect,
      50,
      v_event_type,
      v_reason,
      jsonb_build_object(
        'subscription_id', v_subscription_id,
        'status_pagamento', v_status_pagamento,
        'data_expiracao', v_data_expiracao
      )
    );

    PERFORM public.recalculate_student_access(v_student_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_access_event ON public.subscriptions;
CREATE TRIGGER trg_subscription_access_event
AFTER INSERT OR UPDATE OF status_pagamento, data_expiracao OR DELETE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_subscription_access_event();

CREATE OR REPLACE FUNCTION public.handle_student_payment_override_access_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  IF NEW.controle_acesso_por_pagamento IS NOT DISTINCT FROM OLD.controle_acesso_por_pagamento THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = NEW.id
  LIMIT 1;

  IF v_role = 'aluno' THEN
    INSERT INTO public.student_access_events (
      student_id,
      personal_id,
      actor_id,
      source,
      event_type,
      effect,
      priority,
      reason_code,
      observation,
      metadata
    )
    VALUES (
      NEW.id,
      NEW.personal_id,
      auth.uid(),
      'settings',
      'student_payment_rule_changed',
      'neutral',
      10,
      'payment_rule_changed',
      'Regra individual de acesso por pagamento alterada.',
      jsonb_build_object(
        'from', OLD.controle_acesso_por_pagamento,
        'to', NEW.controle_acesso_por_pagamento
      )
    );

    PERFORM public.recalculate_student_access(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_payment_override_access_event ON public.profiles;
CREATE TRIGGER trg_student_payment_override_access_event
AFTER UPDATE OF controle_acesso_por_pagamento ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_student_payment_override_access_event();

CREATE OR REPLACE FUNCTION public.handle_personal_payment_setting_access_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student record;
BEGIN
  IF NEW.controle_acesso_por_pagamento IS NOT DISTINCT FROM OLD.controle_acesso_por_pagamento THEN
    RETURN NEW;
  END IF;

  FOR v_student IN
    SELECT id, personal_id
    FROM public.profiles
    WHERE personal_id = NEW.personal_id
  LOOP
    INSERT INTO public.student_access_events (
      student_id,
      personal_id,
      actor_id,
      source,
      event_type,
      effect,
      priority,
      reason_code,
      observation,
      metadata
    )
    VALUES (
      v_student.id,
      v_student.personal_id,
      auth.uid(),
      'settings',
      'personal_payment_rule_changed',
      'neutral',
      10,
      'payment_rule_changed',
      'Regra geral de acesso por pagamento alterada pelo personal trainer.',
      jsonb_build_object(
        'from', OLD.controle_acesso_por_pagamento,
        'to', NEW.controle_acesso_por_pagamento
      )
    );

    PERFORM public.recalculate_student_access(v_student.id);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_personal_payment_setting_access_event ON public.personal_settings;
CREATE TRIGGER trg_personal_payment_setting_access_event
AFTER UPDATE OF controle_acesso_por_pagamento ON public.personal_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_personal_payment_setting_access_event();

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
  metadata,
  created_at
)
SELECT
  l.student_id,
  p.personal_id,
  l.changed_by,
  'manual',
  CASE
    WHEN l.to_active = true THEN 'manual_release'
    WHEN l.motivo IN ('ferias', 'lesao', 'viagem') THEN 'manual_pause'
    ELSE 'manual_suspend'
  END,
  CASE WHEN l.to_active = true THEN 'allow' ELSE 'block' END,
  100,
  l.motivo,
  l.mensagem_aluno,
  l.observacao_personal,
  jsonb_build_object('legacy_log_id', l.id),
  coalesce(l.created_at, now())
FROM public.student_access_logs l
JOIN public.profiles p ON p.id = l.student_id
ON CONFLICT DO NOTHING;

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
SELECT
  p.id,
  p.personal_id,
  null,
  'manual',
  'manual_suspend',
  'block',
  100,
  'legacy_profile_inactive',
  'Seu acesso esta temporariamente suspenso. Entre em contato com seu personal trainer.',
  'Estado herdado de profiles.is_active = false durante a migracao.',
  jsonb_build_object('legacy_profile_inactive', true)
FROM public.profiles p
WHERE p.is_active = false
  AND NOT EXISTS (
    SELECT 1
    FROM public.student_access_events e
    WHERE e.student_id = p.id
      AND e.source = 'manual'
      AND e.effect = 'block'
  );

DO $$
DECLARE
  v_student record;
BEGIN
  FOR v_student IN
    SELECT p.id
    FROM public.profiles p
    WHERE EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = p.id
        AND ur.role = 'aluno'
    )
  LOOP
    PERFORM public.recalculate_student_access(v_student.id);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_access_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_access_events(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_student_access_event(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_student_access(uuid) TO authenticated;
