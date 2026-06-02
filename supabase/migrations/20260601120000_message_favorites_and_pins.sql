-- Adiciona marcacoes por usuario para mensagens favoritas e fixadas.
ALTER TABLE public.mensagens_chat
  ADD COLUMN IF NOT EXISTS favorited_by uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS pinned_by uuid[] DEFAULT '{}'::uuid[];

UPDATE public.mensagens_chat
SET favorited_by = '{}'::uuid[]
WHERE favorited_by IS NULL;

UPDATE public.mensagens_chat
SET pinned_by = '{}'::uuid[]
WHERE pinned_by IS NULL;

ALTER TABLE public.mensagens_chat
  ALTER COLUMN favorited_by SET DEFAULT '{}'::uuid[],
  ALTER COLUMN favorited_by SET NOT NULL,
  ALTER COLUMN pinned_by SET DEFAULT '{}'::uuid[],
  ALTER COLUMN pinned_by SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mensagens_chat_favorited_by
  ON public.mensagens_chat USING gin (favorited_by);

CREATE INDEX IF NOT EXISTS idx_mensagens_chat_pinned_by
  ON public.mensagens_chat USING gin (pinned_by);

NOTIFY pgrst, 'reload schema';
