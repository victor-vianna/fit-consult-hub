
-- 1) Make fotos-evolucao bucket private
UPDATE storage.buckets SET public = false WHERE id = 'fotos-evolucao';

-- 2) Replace overly permissive SELECT policy on fotos-evolucao with ownership-based
DROP POLICY IF EXISTS "Visualizar fotos de evolução" ON storage.objects;

CREATE POLICY "Personal e aluno veem suas fotos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'fotos-evolucao'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR (auth.uid())::text = (storage.foldername(name))[2]
    OR public.is_admin(auth.uid())
  )
);

-- 3) Restrict materiais DELETE to file owner (personal who uploaded it)
DROP POLICY IF EXISTS "Personal deleta arquivos" ON storage.objects;

CREATE POLICY "Personal deleta seus arquivos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'materiais'
  AND auth.uid() IN (
    SELECT m.personal_id FROM public.materiais m
    WHERE m.arquivo_url LIKE '%' || objects.name
  )
);

-- 4) Fix function search_path mutable on all SECURITY DEFINER + plpgsql functions
ALTER FUNCTION public.calcular_churn_mensal(date) SET search_path = public;
ALTER FUNCTION public.get_user_personal_id() SET search_path = public;
ALTER FUNCTION public.log_student_active_change() SET search_path = public;
ALTER FUNCTION public.update_subscription_status() SET search_path = public;
ALTER FUNCTION public.verificar_anamnese_preenchida(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.verificar_checkin_semanal(uuid, uuid) SET search_path = public;

-- Also harden non-definer functions to be safe
ALTER FUNCTION public.atualizar_caminho_pasta() SET search_path = public;
ALTER FUNCTION public.calcular_duracao_treino(uuid) SET search_path = public;
ALTER FUNCTION public.criar_bloco_de_template(uuid, text, text) SET search_path = public;
ALTER FUNCTION public.criar_grupo_exercicios(uuid, text, jsonb, integer) SET search_path = public;
ALTER FUNCTION public.deletar_grupo_exercicios(uuid) SET search_path = public;
ALTER FUNCTION public.marcar_bloco_concluido(uuid, boolean) SET search_path = public;
ALTER FUNCTION public.obter_blocos_organizados(uuid) SET search_path = public;
ALTER FUNCTION public.obter_exercicios_com_grupos(uuid) SET search_path = public;
ALTER FUNCTION public.reordenar_blocos(uuid, text, uuid[]) SET search_path = public;
ALTER FUNCTION public.update_blocos_treino_updated_at() SET search_path = public;
ALTER FUNCTION public.update_modelo_pastas_updated_at() SET search_path = public;
ALTER FUNCTION public.update_personal_settings_updated_at() SET search_path = public;
ALTER FUNCTION public.update_subscriptions_updated_at() SET search_path = public;
ALTER FUNCTION public.update_treino_modelos_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.validar_ordem_no_grupo() SET search_path = public;

-- 5) Revoke EXECUTE on internal SECURITY DEFINER triggers/utility functions from public roles
-- (Trigger functions don't need to be callable by clients)
REVOKE EXECUTE ON FUNCTION public.log_student_active_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_subscription_status() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.calcular_churn_mensal(date) FROM anon, public;
