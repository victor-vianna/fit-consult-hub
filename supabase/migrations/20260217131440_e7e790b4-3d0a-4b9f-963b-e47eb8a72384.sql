
-- Allow students to update concluido and peso_executado on their own exercises
CREATE POLICY "Aluno atualiza concluido e peso dos seus exercicios"
ON public.exercicios
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM treinos_semanais ts
    WHERE ts.id = exercicios.treino_semanal_id
    AND ts.profile_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM treinos_semanais ts
    WHERE ts.id = exercicios.treino_semanal_id
    AND ts.profile_id = auth.uid()
  )
);
