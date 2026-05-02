
DROP POLICY IF EXISTS "Sistema insere logs" ON public.student_access_logs;

CREATE POLICY "Usuario autenticado insere logs"
ON public.student_access_logs
FOR INSERT
TO authenticated
WITH CHECK (changed_by = auth.uid());
