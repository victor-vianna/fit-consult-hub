-- Hardens cross-tenant permissions for profiles and chat messages.

CREATE OR REPLACE FUNCTION public.can_chat_between(
  _sender_id uuid,
  _recipient_id uuid,
  _conversa_key text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _sender_id IS NOT NULL
    AND _recipient_id IS NOT NULL
    AND _sender_id IS DISTINCT FROM _recipient_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles student
      WHERE (
          student.id = _sender_id
          AND student.personal_id = _recipient_id
          AND (
            _conversa_key IS NULL
            OR _conversa_key = _recipient_id::text || '::' || _sender_id::text
          )
        )
        OR (
          student.id = _recipient_id
          AND student.personal_id = _sender_id
          AND (
            _conversa_key IS NULL
            OR _conversa_key = _sender_id::text || '::' || _recipient_id::text
          )
        )
    );
$$;

DROP POLICY IF EXISTS "Usuarios podem enviar mensagens" ON public.mensagens_chat;
DROP POLICY IF EXISTS "Usuarios podem enviar mensagens em relacoes legitimas" ON public.mensagens_chat;
DROP POLICY IF EXISTS "Participantes podem ver mensagens" ON public.mensagens_chat;
DROP POLICY IF EXISTS "Participantes podem ver mensagens legitimas" ON public.mensagens_chat;
CREATE POLICY "Participantes podem ver mensagens legitimas"
ON public.mensagens_chat
FOR SELECT
TO authenticated
USING (
  (remetente_id = auth.uid() OR destinatario_id = auth.uid())
  AND public.can_chat_between(remetente_id, destinatario_id, conversa_key)
);

CREATE POLICY "Usuarios podem enviar mensagens em relacoes legitimas"
ON public.mensagens_chat
FOR INSERT
TO authenticated
WITH CHECK (
  remetente_id = auth.uid()
  AND public.can_chat_between(remetente_id, destinatario_id, conversa_key)
);

DROP POLICY IF EXISTS "Destinatario pode atualizar lida" ON public.mensagens_chat;
DROP POLICY IF EXISTS "Remetente pode editar/excluir suas mensagens" ON public.mensagens_chat;
DROP POLICY IF EXISTS "Participantes podem atualizar mensagens legitimas" ON public.mensagens_chat;
CREATE POLICY "Participantes podem atualizar mensagens legitimas"
ON public.mensagens_chat
FOR UPDATE
TO authenticated
USING (
  (remetente_id = auth.uid() OR destinatario_id = auth.uid())
  AND public.can_chat_between(remetente_id, destinatario_id, conversa_key)
)
WITH CHECK (
  (remetente_id = auth.uid() OR destinatario_id = auth.uid())
  AND public.can_chat_between(remetente_id, destinatario_id, conversa_key)
);

DROP POLICY IF EXISTS "Remetente pode deletar" ON public.mensagens_chat;
DROP POLICY IF EXISTS "Remetente pode deletar mensagens legitimas" ON public.mensagens_chat;
CREATE POLICY "Remetente pode deletar mensagens legitimas"
ON public.mensagens_chat
FOR DELETE
TO authenticated
USING (
  remetente_id = auth.uid()
  AND public.can_chat_between(remetente_id, destinatario_id, conversa_key)
);

CREATE OR REPLACE FUNCTION public.protect_mensagens_chat_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_allowed public.mensagens_chat%ROWTYPE := OLD;
  v_participants uuid[] := ARRAY[OLD.remetente_id, OLD.destinatario_id];
BEGIN
  IF v_actor_id IS NULL OR public.is_admin(v_actor_id) THEN
    RETURN NEW;
  END IF;

  IF v_actor_id <> OLD.remetente_id AND v_actor_id <> OLD.destinatario_id THEN
    RAISE EXCEPTION 'Sem permissao para alterar esta mensagem';
  END IF;

  IF NOT public.can_chat_between(OLD.remetente_id, OLD.destinatario_id, OLD.conversa_key) THEN
    RAISE EXCEPTION 'Conversa invalida para alteracao';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.conversa_key IS DISTINCT FROM OLD.conversa_key
    OR NEW.remetente_id IS DISTINCT FROM OLD.remetente_id
    OR NEW.destinatario_id IS DISTINCT FROM OLD.destinatario_id
    OR NEW.tipo IS DISTINCT FROM OLD.tipo
    OR NEW.reply_to IS DISTINCT FROM OLD.reply_to
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Campos imutaveis da mensagem nao podem ser alterados';
  END IF;

  IF NOT coalesce(NEW.deleted_for, '{}'::uuid[]) <@ v_participants
    OR NOT coalesce(NEW.favorited_by, '{}'::uuid[]) <@ v_participants
    OR NOT coalesce(NEW.pinned_by, '{}'::uuid[]) <@ v_participants THEN
    RAISE EXCEPTION 'Marcacoes da mensagem devem pertencer aos participantes';
  END IF;

  IF array_remove(coalesce(NEW.deleted_for, '{}'::uuid[]), v_actor_id)
    IS DISTINCT FROM array_remove(coalesce(OLD.deleted_for, '{}'::uuid[]), v_actor_id)
    OR array_remove(coalesce(NEW.favorited_by, '{}'::uuid[]), v_actor_id)
      IS DISTINCT FROM array_remove(coalesce(OLD.favorited_by, '{}'::uuid[]), v_actor_id)
    OR array_remove(coalesce(NEW.pinned_by, '{}'::uuid[]), v_actor_id)
      IS DISTINCT FROM array_remove(coalesce(OLD.pinned_by, '{}'::uuid[]), v_actor_id) THEN
    RAISE EXCEPTION 'Usuario so pode alterar suas proprias marcacoes da mensagem';
  END IF;

  v_allowed.deleted_for := NEW.deleted_for;
  v_allowed.favorited_by := NEW.favorited_by;
  v_allowed.pinned_by := NEW.pinned_by;

  IF v_actor_id = OLD.destinatario_id THEN
    v_allowed.lida := NEW.lida;
  END IF;

  IF v_actor_id = OLD.remetente_id THEN
    v_allowed.conteudo := NEW.conteudo;
    v_allowed.edited_at := NEW.edited_at;
    v_allowed.deleted_for_all := NEW.deleted_for_all;
  END IF;

  IF NEW IS DISTINCT FROM v_allowed THEN
    RAISE EXCEPTION 'Alteracao nao permitida para esta mensagem';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_mensagens_chat_update_before_update ON public.mensagens_chat;
CREATE TRIGGER protect_mensagens_chat_update_before_update
BEFORE UPDATE ON public.mensagens_chat
FOR EACH ROW
EXECUTE FUNCTION public.protect_mensagens_chat_update();

DROP POLICY IF EXISTS "Admin atualiza qualquer profile" ON public.profiles;
CREATE POLICY "Admin atualiza qualquer profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.protect_profiles_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_is_personal boolean;
  v_allowed_public_personal boolean;
BEGIN
  IF v_actor_id IS NULL OR public.is_admin(v_actor_id) THEN
    RETURN NEW;
  END IF;

  v_actor_is_personal := public.is_personal(v_actor_id);

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Campos imutaveis do perfil nao podem ser alterados';
  END IF;

  IF v_actor_id = OLD.id THEN
    IF NEW.is_active IS DISTINCT FROM OLD.is_active
      OR NEW.controle_acesso_por_pagamento IS DISTINCT FROM OLD.controle_acesso_por_pagamento
      OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
      OR NEW.aluno_card_color IS DISTINCT FROM OLD.aluno_card_color THEN
      RAISE EXCEPTION 'Campos de gerenciamento do perfil nao podem ser alterados pelo proprio usuario';
    END IF;

    IF NOT v_actor_is_personal
      AND (
        NEW.public_slug IS DISTINCT FROM OLD.public_slug
        OR NEW.public_profile_enabled IS DISTINCT FROM OLD.public_profile_enabled
      ) THEN
      RAISE EXCEPTION 'Somente personal pode alterar pagina publica';
    END IF;

    IF NEW.personal_id IS DISTINCT FROM OLD.personal_id THEN
      IF v_actor_is_personal THEN
        RAISE EXCEPTION 'Personal nao pode alterar o proprio vinculo de personal';
      END IF;

      IF OLD.personal_id IS NOT NULL OR NEW.personal_id IS NULL THEN
        RAISE EXCEPTION 'Vinculo com personal nao pode ser alterado pelo aluno';
      END IF;

      SELECT EXISTS (
        SELECT 1
        FROM public.profiles personal
        JOIN public.user_roles role
          ON role.user_id = personal.id
         AND role.role = 'personal'
        WHERE personal.id = NEW.personal_id
          AND personal.public_profile_enabled = true
          AND personal.is_active = true
      ) INTO v_allowed_public_personal;

      IF NOT coalesce(v_allowed_public_personal, false) THEN
        RAISE EXCEPTION 'Personal publico invalido para vinculo';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF v_actor_is_personal AND OLD.personal_id = v_actor_id THEN
    IF NEW.personal_id IS DISTINCT FROM OLD.personal_id
      OR NEW.email IS DISTINCT FROM OLD.email
      OR NEW.public_slug IS DISTINCT FROM OLD.public_slug
      OR NEW.public_profile_enabled IS DISTINCT FROM OLD.public_profile_enabled THEN
      RAISE EXCEPTION 'Personal nao pode alterar campos restritos do aluno';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Sem permissao para alterar este perfil';
END;
$$;

DROP TRIGGER IF EXISTS protect_profiles_update_before_update ON public.profiles;
CREATE TRIGGER protect_profiles_update_before_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profiles_update();

REVOKE EXECUTE ON FUNCTION public.can_chat_between(uuid, uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.protect_mensagens_chat_update() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.protect_profiles_update() FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.can_chat_between(uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
