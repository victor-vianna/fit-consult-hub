-- Progress inside exercicios/blocos_treino is transient while a workout session
-- is active. Completed history lives in treino_sessoes and treinos_semanais.
-- This repairs older rows that stayed checked after the session had ended.
UPDATE public.exercicios e
SET concluido = false,
    series_concluidas = 0,
    updated_at = now()
WHERE (e.concluido = true OR e.series_concluidas > 0)
  AND e.treino_semanal_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.treino_sessoes s
    WHERE s.treino_semanal_id = e.treino_semanal_id
      AND s.status IN ('em_andamento', 'pausado')
  );

UPDATE public.blocos_treino b
SET concluido = false,
    concluido_em = null,
    updated_at = now()
WHERE b.concluido = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.treino_sessoes s
    WHERE s.treino_semanal_id = b.treino_semanal_id
      AND s.status IN ('em_andamento', 'pausado')
  );
