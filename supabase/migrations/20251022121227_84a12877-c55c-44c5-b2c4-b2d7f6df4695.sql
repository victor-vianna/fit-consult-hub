-- Adiciona coluna descricao à tabela treinos_semanais
ALTER TABLE public.treinos_semanais 
ADD COLUMN IF NOT EXISTS descricao text;

-- Remove as políticas RLS duplicadas de SELECT para exercicios
DROP POLICY IF EXISTS "Admin vê todos exercícios" ON public.exercicios;
DROP POLICY IF EXISTS "Aluno vê próprios exercícios" ON public.exercicios;

-- Recria as políticas de SELECT de forma mais simples
CREATE POLICY "Personal e aluno veem exercícios"
ON public.exercicios
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM treinos_semanais ts
    WHERE ts.id = exercicios.treino_semanal_id
    AND (
      ts.personal_id = auth.uid() OR 
      ts.profile_id = auth.uid() OR
      is_admin(auth.uid())
    )
  )
);