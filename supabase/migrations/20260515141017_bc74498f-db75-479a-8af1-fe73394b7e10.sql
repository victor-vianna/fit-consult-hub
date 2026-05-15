CREATE POLICY "Aluno ve seus proprios logs"
ON public.student_access_logs
FOR SELECT
TO authenticated
USING (student_id = auth.uid());