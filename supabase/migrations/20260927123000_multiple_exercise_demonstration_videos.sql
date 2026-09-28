-- Preserve every demonstration video when a workout model is applied to a student.
ALTER TABLE public.exercicios
  ADD COLUMN IF NOT EXISTS links_demonstracao jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.exercicios
  DROP CONSTRAINT IF EXISTS exercicios_links_demonstracao_array_check;

ALTER TABLE public.exercicios
  ADD CONSTRAINT exercicios_links_demonstracao_array_check
  CHECK (jsonb_typeof(links_demonstracao) = 'array');

-- Keep existing single-video workouts compatible with the new selector.
UPDATE public.exercicios
SET links_demonstracao = jsonb_build_array(
  jsonb_build_object(
    'label', 'Vídeo 1',
    'url', btrim(link_video)
  )
)
WHERE NULLIF(btrim(link_video), '') IS NOT NULL
  AND links_demonstracao = '[]'::jsonb;

COMMENT ON COLUMN public.exercicios.links_demonstracao IS
  'Ordered demonstration references as [{"label":"...","url":"..."}]. link_video remains the legacy first-video fallback.';
