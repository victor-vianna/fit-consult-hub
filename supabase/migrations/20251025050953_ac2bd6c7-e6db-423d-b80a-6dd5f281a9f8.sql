-- Adicionar política para aluno visualizar dados públicos do seu personal
CREATE POLICY "Aluno vê dados públicos do seu personal"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Permite ver o registro do personal vinculado ao aluno logado
  id IN (
    SELECT personal_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND personal_id IS NOT NULL
  )
);