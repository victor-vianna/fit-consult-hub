ALTER TABLE public.treino_sessoes
  DROP CONSTRAINT IF EXISTS treino_sessoes_treino_semanal_id_fkey;

ALTER TABLE public.treino_sessoes
  ADD CONSTRAINT treino_sessoes_treino_semanal_id_fkey
  FOREIGN KEY (treino_semanal_id)
  REFERENCES public.treinos_semanais(id)
  ON DELETE CASCADE;