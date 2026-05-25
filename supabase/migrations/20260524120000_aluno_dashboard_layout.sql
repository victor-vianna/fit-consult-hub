ALTER TABLE public.personal_settings
  ALTER COLUMN cards_visiveis SET DEFAULT
    '["treinos","chat","avaliacao","historico","materiais","plano","biblioteca"]'::jsonb,
  ADD COLUMN IF NOT EXISTS aluno_dashboard_componentes JSONB DEFAULT
    '["frequencia","mensagens","boas_vindas","cards","jornada"]'::jsonb;

UPDATE public.personal_settings
SET aluno_dashboard_componentes = '["frequencia","mensagens","boas_vindas","cards","jornada"]'::jsonb
WHERE aluno_dashboard_componentes IS NULL;

UPDATE public.personal_settings
SET cards_visiveis = '["treinos","chat","avaliacao","historico","materiais","plano","biblioteca"]'::jsonb
WHERE cards_visiveis = '["treinos","historico","avaliacao","materiais","plano","biblioteca","chat"]'::jsonb;
