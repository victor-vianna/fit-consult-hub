
ALTER TABLE public.planilhas_treino
  ADD COLUMN IF NOT EXISTS ciclo_genero text,
  ADD COLUMN IF NOT EXISTS ciclo_modalidade text,
  ADD COLUMN IF NOT EXISTS ciclo_nivel text,
  ADD COLUMN IF NOT EXISTS ciclo_numero integer;
