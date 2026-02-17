
CREATE POLICY "aluno_update_concluido_treino"
ON treinos_semanais
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());
