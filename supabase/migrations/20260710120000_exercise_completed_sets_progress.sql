-- Persists per-set progress for each workout exercise.
ALTER TABLE public.exercicios
  ADD COLUMN IF NOT EXISTS series_concluidas integer NOT NULL DEFAULT 0;

ALTER TABLE public.exercicios
  DROP CONSTRAINT IF EXISTS exercicios_series_concluidas_non_negative;

ALTER TABLE public.exercicios
  ADD CONSTRAINT exercicios_series_concluidas_non_negative
  CHECK (series_concluidas >= 0);

CREATE INDEX IF NOT EXISTS idx_exercicios_series_progress
  ON public.exercicios(treino_semanal_id, concluido, series_concluidas)
  WHERE deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
