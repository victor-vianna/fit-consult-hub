
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_email text;
  v_nome text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT email, nome INTO v_email, v_nome
  FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.activity_logs (
    user_id, user_email, user_nome, action, resource_type, resource_id, metadata
  ) VALUES (
    auth.uid(), v_email, v_nome, p_action, p_resource_type, p_resource_id, p_metadata
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, text, jsonb) TO authenticated;

DROP POLICY IF EXISTS "Logos são públicas" ON storage.objects;
CREATE POLICY "Logos visíveis para autenticados"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'personal-logos');

DROP POLICY IF EXISTS "Letterheads are publicly accessible" ON storage.objects;
CREATE POLICY "Letterheads visíveis para autenticados"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'personal-letterheads');

DROP POLICY IF EXISTS "Todos veem thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem ver thumbnails" ON storage.objects;
CREATE POLICY "Thumbnails visíveis para autenticados"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exercise-thumbnails');
