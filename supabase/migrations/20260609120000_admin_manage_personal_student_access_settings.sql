-- Permite que administradores controlem, por personal, se os alunos acessam
-- por pagamento ativo ou apenas por login/senha liberados pelo personal.
DROP POLICY IF EXISTS "Admin gerencia configuracoes dos personal trainers" ON public.personal_settings;

CREATE POLICY "Admin gerencia configuracoes dos personal trainers"
ON public.personal_settings
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
