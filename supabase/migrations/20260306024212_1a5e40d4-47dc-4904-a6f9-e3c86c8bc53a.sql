
-- Allow students to INSERT their own evaluation records
CREATE POLICY "Aluno pode criar suas avaliações"
ON public.avaliacoes_fisicas
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Allow students to UPDATE their own evaluation records
CREATE POLICY "Aluno pode atualizar suas avaliações"
ON public.avaliacoes_fisicas
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());
