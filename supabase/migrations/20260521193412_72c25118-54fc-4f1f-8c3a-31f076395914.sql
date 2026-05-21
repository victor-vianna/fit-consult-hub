
ALTER TABLE public.personal_settings
  ADD COLUMN IF NOT EXISTS chat_welcome_message text;

CREATE OR REPLACE FUNCTION public.enviar_mensagem_boas_vindas_chat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno_id uuid := auth.uid();
  v_personal_id uuid;
  v_aluno_nome text;
  v_template text;
  v_conteudo text;
  v_conversa_key text;
  v_existe boolean;
BEGIN
  IF v_aluno_id IS NULL THEN
    RETURN;
  END IF;

  SELECT personal_id, nome INTO v_personal_id, v_aluno_nome
  FROM public.profiles WHERE id = v_aluno_id;

  IF v_personal_id IS NULL THEN
    RETURN;
  END IF;

  SELECT chat_welcome_message INTO v_template
  FROM public.personal_settings
  WHERE personal_id = v_personal_id;

  IF v_template IS NULL OR length(trim(v_template)) = 0 THEN
    RETURN;
  END IF;

  v_conversa_key := v_personal_id::text || '::' || v_aluno_id::text;

  SELECT EXISTS (
    SELECT 1 FROM public.mensagens_chat WHERE conversa_key = v_conversa_key
  ) INTO v_existe;

  IF v_existe THEN
    RETURN;
  END IF;

  v_conteudo := replace(v_template, '{nome}', COALESCE(split_part(v_aluno_nome, ' ', 1), ''));

  INSERT INTO public.mensagens_chat (
    conversa_key, remetente_id, destinatario_id, conteudo, tipo, lida
  ) VALUES (
    v_conversa_key, v_personal_id, v_aluno_id, v_conteudo, 'texto', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.enviar_mensagem_boas_vindas_chat() TO authenticated;
