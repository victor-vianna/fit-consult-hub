-- Rollback for 20260918122000_enforce_subscription_access_backend.sql.

DROP POLICY IF EXISTS "Active subscription required for protected student files"
  ON storage.objects;

DROP POLICY IF EXISTS "Active subscription required for profile insert" ON public.profiles;
DROP POLICY IF EXISTS "Active subscription required for profile update" ON public.profiles;
DROP POLICY IF EXISTS "Active subscription required for profile delete" ON public.profiles;

DO $$
DECLARE
  v_table text;
BEGIN
  IF to_regclass('public.subscription_access_route_registry') IS NOT NULL THEN
    FOR v_table IN
      SELECT route_name
      FROM public.subscription_access_route_registry
      WHERE route_kind = 'table'
        AND schema_name = 'public'
        AND access_class = 'protected'
    LOOP
      IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
        EXECUTE format(
          'DROP POLICY IF EXISTS %I ON public.%I',
          'Active subscription required',
          v_table
        );
      END IF;
    END LOOP;
  END IF;
END;
$$;

DROP TABLE IF EXISTS public.subscription_access_route_registry;
DROP FUNCTION IF EXISTS public.enforce_current_user_platform_access();

NOTIFY pgrst, 'reload schema';
