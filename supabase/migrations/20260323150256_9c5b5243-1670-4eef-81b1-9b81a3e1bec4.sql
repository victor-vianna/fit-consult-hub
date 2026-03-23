ALTER TABLE public.blocos_treino ADD COLUMN links jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.bloco_templates ADD COLUMN links jsonb DEFAULT '[]'::jsonb;