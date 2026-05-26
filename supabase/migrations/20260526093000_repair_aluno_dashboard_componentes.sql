ALTER TABLE public.personal_settings
  ADD COLUMN IF NOT EXISTS aluno_dashboard_componentes JSONB DEFAULT
    '["frequencia","mensagens","boas_vindas","cards","jornada"]'::jsonb;

UPDATE public.personal_settings
SET aluno_dashboard_componentes = '["frequencia","mensagens","boas_vindas","cards","jornada"]'::jsonb
WHERE aluno_dashboard_componentes IS NULL;

ALTER TABLE public.personal_settings
  ALTER COLUMN aluno_dashboard_componentes SET DEFAULT
    '["frequencia","mensagens","boas_vindas","cards","jornada"]'::jsonb;

NOTIFY pgrst, 'reload schema';
