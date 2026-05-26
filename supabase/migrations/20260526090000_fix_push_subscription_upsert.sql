CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
  _endpoint TEXT,
  _p256dh TEXT,
  _auth TEXT,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_subscription_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado para ativar notificacoes push.'
      USING ERRCODE = '28000';
  END IF;

  IF COALESCE(_endpoint, '') = '' OR COALESCE(_p256dh, '') = '' OR COALESCE(_auth, '') = '' THEN
    RAISE EXCEPTION 'Subscription push incompleta.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    user_agent,
    revoked_at,
    updated_at,
    last_used_at
  )
  VALUES (
    v_user_id,
    _endpoint,
    _p256dh,
    _auth,
    _user_agent,
    NULL,
    now(),
    now()
  )
  ON CONFLICT (endpoint) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    user_agent = EXCLUDED.user_agent,
    revoked_at = NULL,
    updated_at = now(),
    last_used_at = now()
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(TEXT, TEXT, TEXT, TEXT) TO authenticated;
