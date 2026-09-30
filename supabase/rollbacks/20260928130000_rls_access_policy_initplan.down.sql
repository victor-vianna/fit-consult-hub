-- Rollback for 20260928130000_rls_access_policy_initplan.sql.
-- Restores the direct helper calls used before the InitPlan optimization.

DO $$
DECLARE
  v_table text;
BEGIN
  FOR v_table IN
    SELECT p.tablename
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.policyname = 'Active subscription required'
    ORDER BY p.tablename
  LOOP
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
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Active subscription required for profile insert"
  ON public.profiles;
CREATE POLICY "Active subscription required for profile insert"
ON public.profiles AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (public.enforce_current_user_platform_access());

DROP POLICY IF EXISTS "Active subscription required for profile update"
  ON public.profiles;
CREATE POLICY "Active subscription required for profile update"
ON public.profiles AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (public.enforce_current_user_platform_access())
WITH CHECK (public.enforce_current_user_platform_access());

DROP POLICY IF EXISTS "Active subscription required for profile delete"
  ON public.profiles;
CREATE POLICY "Active subscription required for profile delete"
ON public.profiles AS RESTRICTIVE
FOR DELETE TO authenticated
USING (public.enforce_current_user_platform_access());

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

-- Restore the exact definitions captured by the forward migration.
DO $$
DECLARE
  v_policy record;
  v_backup jsonb;
  v_roles text;
  v_create_sql text;
  v_original_comment text;
BEGIN
  FOR v_policy IN
    SELECT
      p.schemaname,
      p.tablename,
      p.policyname,
      obj_description(pol.oid, 'pg_policy') AS backup_comment
    FROM pg_policies p
    JOIN pg_namespace n
      ON n.nspname = p.schemaname
    JOIN pg_class c
      ON c.relnamespace = n.oid
     AND c.relname = p.tablename
    JOIN pg_policy pol
      ON pol.polrelid = c.oid
     AND pol.polname = p.policyname
    WHERE p.schemaname = 'public'
      AND p.tablename IN (
        'treinos_semanais',
        'exercicios',
        'blocos_treino',
        'treino_semana_ativa',
        'treino_sessoes',
        'treino_descansos'
      )
      AND obj_description(pol.oid, 'pg_policy') IS NOT NULL
    ORDER BY p.tablename, p.policyname
  LOOP
    BEGIN
      v_backup := v_policy.backup_comment::jsonb;
    EXCEPTION WHEN invalid_text_representation THEN
      CONTINUE;
    END;

    IF v_backup ->> 'migration' <> '20260928130000_rls_access_policy_initplan' THEN
      CONTINUE;
    END IF;

    SELECT string_agg(
      CASE
        WHEN role_name = 'public' THEN 'PUBLIC'
        ELSE quote_ident(role_name)
      END,
      ', '
    )
    INTO v_roles
    FROM jsonb_array_elements_text(v_backup -> 'roles') AS policy_roles(role_name);

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      v_policy.policyname,
      v_policy.tablename
    );

    v_create_sql := format(
      'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s',
      v_policy.policyname,
      v_policy.tablename,
      v_backup ->> 'permissive',
      v_backup ->> 'cmd',
      v_roles
    );
    IF v_backup ->> 'qual' IS NOT NULL THEN
      v_create_sql := v_create_sql || format(' USING (%s)', v_backup ->> 'qual');
    END IF;
    IF v_backup ->> 'with_check' IS NOT NULL THEN
      v_create_sql := v_create_sql || format(' WITH CHECK (%s)', v_backup ->> 'with_check');
    END IF;
    EXECUTE v_create_sql;

    v_original_comment := v_backup ->> 'comment';
    EXECUTE format(
      'COMMENT ON POLICY %I ON public.%I IS %L',
      v_policy.policyname,
      v_policy.tablename,
      v_original_comment
    );
  END LOOP;
END;
$$;

DROP INDEX IF EXISTS public.idx_exercicios_treino_ordem_active;

-- idx_blocos_treino_semanal predates this migration in current environments,
-- so the rollback deliberately does not remove it.

NOTIFY pgrst, 'reload schema';
