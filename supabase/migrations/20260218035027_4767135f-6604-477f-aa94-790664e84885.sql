
-- Tabela de mensagens do chat
CREATE TABLE public.mensagens_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_key TEXT NOT NULL,
  remetente_id UUID NOT NULL,
  destinatario_id UUID NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto',
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para performance
CREATE INDEX idx_mensagens_conversa ON public.mensagens_chat(conversa_key, created_at DESC);
CREATE INDEX idx_mensagens_destinatario ON public.mensagens_chat(destinatario_id, lida);

-- RLS
ALTER TABLE public.mensagens_chat ENABLE ROW LEVEL SECURITY;

-- Participantes da conversa podem ver mensagens
CREATE POLICY "Participantes podem ver mensagens"
  ON public.mensagens_chat FOR SELECT
  USING (remetente_id = auth.uid() OR destinatario_id = auth.uid());

-- Usuarios autenticados podem enviar mensagens
CREATE POLICY "Usuarios podem enviar mensagens"
  ON public.mensagens_chat FOR INSERT
  WITH CHECK (remetente_id = auth.uid());

-- Destinatario pode marcar como lida
CREATE POLICY "Destinatario pode atualizar lida"
  ON public.mensagens_chat FOR UPDATE
  USING (destinatario_id = auth.uid());

-- Remetente pode deletar suas mensagens
CREATE POLICY "Remetente pode deletar"
  ON public.mensagens_chat FOR DELETE
  USING (remetente_id = auth.uid());

-- Habilitar realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens_chat;
