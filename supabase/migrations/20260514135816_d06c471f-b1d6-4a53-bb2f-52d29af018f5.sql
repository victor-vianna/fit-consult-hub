-- Bloqueia INSERT, UPDATE e DELETE em user_roles, permitindo apenas admins
DROP POLICY IF EXISTS "Admins gerenciam papeis" ON public.user_roles;
DROP POLICY IF EXISTS "Admins inserem papeis" ON public.user_roles;
DROP POLICY IF EXISTS "Admins atualizam papeis" ON public.user_roles;
DROP POLICY IF EXISTS "Admins removem papeis" ON public.user_roles;

CREATE POLICY "Admins inserem papeis"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins atualizam papeis"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins removem papeis"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));