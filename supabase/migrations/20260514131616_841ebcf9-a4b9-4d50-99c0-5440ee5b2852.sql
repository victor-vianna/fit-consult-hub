-- Adiciona suporte a responder, editar, excluir (para mim / para todos) em mensagens_chat
ALTER TABLE public.mensagens_chat
  ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.mensagens_chat(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_for_all boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_for uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_mensagens_chat_reply_to ON public.mensagens_chat(reply_to);

-- Política: garantir que apenas o remetente pode atualizar/editar/excluir suas mensagens
-- (políticas existentes de SELECT/INSERT permanecem inalteradas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='mensagens_chat' AND policyname='Remetente pode editar/excluir suas mensagens'
  ) THEN
    CREATE POLICY "Remetente pode editar/excluir suas mensagens"
      ON public.mensagens_chat
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = remetente_id OR auth.uid() = destinatario_id)
      WITH CHECK (auth.uid() = remetente_id OR auth.uid() = destinatario_id);
  END IF;
END$$;
