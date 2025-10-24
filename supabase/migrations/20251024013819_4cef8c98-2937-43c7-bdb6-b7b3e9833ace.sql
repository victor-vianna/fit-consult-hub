-- Permitir que admins vejam todas as roles do sistema
CREATE POLICY "Admins podem ver todas as roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));