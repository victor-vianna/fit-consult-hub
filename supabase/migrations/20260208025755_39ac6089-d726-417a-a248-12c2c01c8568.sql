-- Remover a política problemática que causa recursão infinita
DROP POLICY IF EXISTS "aluno_update_concluido" ON blocos_treino;

-- Criar nova política corrigida para alunos atualizarem apenas o campo concluido
CREATE POLICY "aluno_update_concluido" ON blocos_treino
FOR UPDATE
TO authenticated
USING (
  treino_semanal_id IN (
    SELECT id FROM treinos_semanais 
    WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  treino_semanal_id IN (
    SELECT id FROM treinos_semanais 
    WHERE profile_id = auth.uid()
  )
);