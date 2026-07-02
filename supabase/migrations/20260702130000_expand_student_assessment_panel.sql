-- Expanded assessment panel.
-- Keeps historical records in avaliacoes_fisicas and adds raw/calculated fields
-- used by composition, cardio, posture and evolution views.

ALTER TABLE public.avaliacoes_fisicas
  ADD COLUMN IF NOT EXISTS fase text,
  ADD COLUMN IF NOT EXISTS etnia text,
  ADD COLUMN IF NOT EXISTS sexo_avaliacao text,
  ADD COLUMN IF NOT EXISTS idade integer,
  ADD COLUMN IF NOT EXISTS massa_gorda numeric,
  ADD COLUMN IF NOT EXISTS massa_muscular numeric,
  ADD COLUMN IF NOT EXISTS massa_ossos_orgaos numeric,
  ADD COLUMN IF NOT EXISTS densidade_corporal numeric,
  ADD COLUMN IF NOT EXISTS distribuicao_gordura jsonb,
  ADD COLUMN IF NOT EXISTS dobras_medidas jsonb,
  ADD COLUMN IF NOT EXISTS dobras_medias jsonb,
  ADD COLUMN IF NOT EXISTS avaliacao_incompleta boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS campos_pendentes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cardio_tipo text,
  ADD COLUMN IF NOT EXISTS cardio_distancia_m numeric,
  ADD COLUMN IF NOT EXISTS cardio_tempo_segundos integer,
  ADD COLUMN IF NOT EXISTS cardio_velocidade_kmh numeric,
  ADD COLUMN IF NOT EXISTS cardio_vo2_pico numeric,
  ADD COLUMN IF NOT EXISTS cardio_mssl_m_min numeric,
  ADD COLUMN IF NOT EXISTS cardio_mssl_kmh numeric,
  ADD COLUMN IF NOT EXISTS cardio_observacoes text;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_fisicas_profile_data
  ON public.avaliacoes_fisicas(profile_id, data_avaliacao DESC);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_fisicas_cardio
  ON public.avaliacoes_fisicas(profile_id, data_avaliacao DESC)
  WHERE cardio_tipo IS NOT NULL;

-- New product rule: students can view their assessment history, but only the
-- personal records/edits assessments.
DROP POLICY IF EXISTS "Aluno pode criar suas avaliações" ON public.avaliacoes_fisicas;
DROP POLICY IF EXISTS "Aluno pode atualizar suas avaliações" ON public.avaliacoes_fisicas;
