ALTER TABLE public.personal_settings
  ADD COLUMN IF NOT EXISTS mensagem_conclusao_treino TEXT,
  ADD COLUMN IF NOT EXISTS welcome_title TEXT,
  ADD COLUMN IF NOT EXISTS welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS jornada_title TEXT,
  ADD COLUMN IF NOT EXISTS jornada_message TEXT,
  ADD COLUMN IF NOT EXISTS cards_visiveis JSONB DEFAULT
    '["treinos","historico","avaliacao","materiais","plano","biblioteca","chat"]'::jsonb;