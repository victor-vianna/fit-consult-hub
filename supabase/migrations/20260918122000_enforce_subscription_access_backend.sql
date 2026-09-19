-- Deny-by-default financial enforcement for authenticated data access.
-- Existing ownership/tenant policies remain in place and are combined with
-- these restrictive policies.

CREATE OR REPLACE FUNCTION public.enforce_current_user_platform_access()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_is_student boolean := false;
  v_decision jsonb;
  v_code text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED'
      USING ERRCODE = '28000',
            DETAIL = '{"code":"AUTHENTICATION_REQUIRED"}';
  END IF;

  -- Payment enforcement in this migration concerns students. Existing
  -- personal/admin platform rules continue through pode_acessar_plataforma.
  IF public.is_admin(v_actor) OR public.is_personal(v_actor) THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_actor
      AND ur.role = 'aluno'
  ) INTO v_is_student;

  IF NOT v_is_student THEN
    RAISE EXCEPTION 'ACCESS_DENIED'
      USING ERRCODE = '42501',
            DETAIL = '{"code":"ACCESS_DENIED","reason_code":"unknown_role"}';
  END IF;

  v_decision := public.calculate_student_access_decision(v_actor, statement_timestamp());
  IF coalesce((v_decision ->> 'allowed')::boolean, false) THEN
    RETURN true;
  END IF;

  v_code := CASE
    WHEN v_decision ->> 'source' IN ('payment', 'settings')
      THEN 'SUBSCRIPTION_EXPIRED'
    ELSE 'ACCESS_SUSPENDED'
  END;

  RAISE EXCEPTION '%', v_code
    USING ERRCODE = '42501',
          DETAIL = jsonb_build_object(
            'code', v_code,
            'reason_code', v_decision ->> 'reason_code',
            'reason', v_decision ->> 'reason',
            'plans_path', v_decision ->> 'plans_path',
            'expires_at', v_decision ->> 'expires_at'
          )::text,
          HINT = coalesce(v_decision ->> 'plans_path', '/acesso-suspenso');
END;
$$;

COMMENT ON FUNCTION public.enforce_current_user_platform_access() IS
  'RLS guard. Returns true for allowed actors and raises a structured 403 for blocked students.';

REVOKE ALL ON FUNCTION public.enforce_current_user_platform_access()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_current_user_platform_access()
  TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.subscription_access_route_registry (
  route_kind text NOT NULL,
  schema_name text NOT NULL,
  route_name text NOT NULL,
  access_class text NOT NULL CHECK (access_class IN ('protected', 'allowlisted', 'partial_allowlist')),
  reason text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (route_kind, schema_name, route_name)
);

ALTER TABLE public.subscription_access_route_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read subscription access route registry"
  ON public.subscription_access_route_registry;
CREATE POLICY "Admins read subscription access route registry"
ON public.subscription_access_route_registry
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.subscription_access_route_registry
  FROM anon, authenticated;

DO $$
DECLARE
  v_table text;
  v_allowlist constant text[] := ARRAY[
    'personal_plan_prices',
    'profiles',
    'user_roles',
    'student_access_events',
    'student_access_logs',
    'student_access_state',
    'student_access_audit',
    'subscriptions',
    'payment_history',
    'subscription_financial_events',
    'subscription_access_route_registry'
  ];
BEGIN
  FOR v_table IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity
    ORDER BY c.relname
  LOOP
    INSERT INTO public.subscription_access_route_registry (
      route_kind,
      schema_name,
      route_name,
      access_class,
      reason
    ) VALUES (
      'table',
      'public',
      v_table,
      CASE
        WHEN v_table = 'profiles' THEN 'partial_allowlist'
        WHEN v_table = ANY(v_allowlist) THEN 'allowlisted'
        ELSE 'protected'
      END,
      CASE
        WHEN v_table = 'profiles' THEN 'Own profile SELECT is required to bootstrap authentication; writes require active access.'
        WHEN v_table IN ('user_roles', 'student_access_state', 'student_access_events', 'student_access_logs', 'student_access_audit')
          THEN 'Authentication and access-status recovery.'
        WHEN v_table IN ('personal_plan_prices', 'subscriptions', 'payment_history', 'subscription_financial_events')
          THEN 'Payment recovery and billing self-service.'
        WHEN v_table = 'subscription_access_route_registry' THEN 'Internal route classification registry.'
        ELSE 'Student application data requires active access.'
      END
    )
    ON CONFLICT (route_kind, schema_name, route_name) DO UPDATE SET
      access_class = excluded.access_class,
      reason = excluded.reason,
      registered_at = transaction_timestamp();

    IF NOT (v_table = ANY(v_allowlist)) THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        'Active subscription required',
        v_table
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.enforce_current_user_platform_access()) WITH CHECK (public.enforce_current_user_platform_access())',
        'Active subscription required',
        v_table
      );
    END IF;
  END LOOP;
END;
$$;

-- A blocked student may read the minimum profile context needed by auth and
-- the recovery screen, but cannot mutate profile data through PostgREST.
DROP POLICY IF EXISTS "Active subscription required for profile insert" ON public.profiles;
CREATE POLICY "Active subscription required for profile insert"
ON public.profiles AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (public.enforce_current_user_platform_access());

DROP POLICY IF EXISTS "Active subscription required for profile update" ON public.profiles;
CREATE POLICY "Active subscription required for profile update"
ON public.profiles AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (public.enforce_current_user_platform_access())
WITH CHECK (public.enforce_current_user_platform_access());

DROP POLICY IF EXISTS "Active subscription required for profile delete" ON public.profiles;
CREATE POLICY "Active subscription required for profile delete"
ON public.profiles AS RESTRICTIVE
FOR DELETE TO authenticated
USING (public.enforce_current_user_platform_access());

-- Private workout/material storage follows the same server-side decision.
DROP POLICY IF EXISTS "Active subscription required for protected student files"
  ON storage.objects;
CREATE POLICY "Active subscription required for protected student files"
ON storage.objects AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  bucket_id NOT IN ('materiais', 'fotos-evolucao', 'exercise-thumbnails')
  OR public.enforce_current_user_platform_access()
)
WITH CHECK (
  bucket_id NOT IN ('materiais', 'fotos-evolucao', 'exercise-thumbnails')
  OR public.enforce_current_user_platform_access()
);

INSERT INTO public.subscription_access_route_registry (
  route_kind,
  schema_name,
  route_name,
  access_class,
  reason
) VALUES
  ('storage_bucket', 'storage', 'materiais', 'protected', 'Student materials require active access.'),
  ('storage_bucket', 'storage', 'fotos-evolucao', 'protected', 'Student assessment photos require active access.'),
  ('storage_bucket', 'storage', 'exercise-thumbnails', 'protected', 'Workout exercise media requires active access.')
ON CONFLICT (route_kind, schema_name, route_name) DO UPDATE SET
  access_class = excluded.access_class,
  reason = excluded.reason,
  registered_at = transaction_timestamp();

NOTIFY pgrst, 'reload schema';
