-- Evaluate stable access/auth helpers once per statement through InitPlans.
-- Access rules are unchanged; only the expression shape is optimized.

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
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.enforce_current_user_platform_access())) WITH CHECK ((SELECT public.enforce_current_user_platform_access()))',
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
WITH CHECK ((SELECT public.enforce_current_user_platform_access()));

DROP POLICY IF EXISTS "Active subscription required for profile update"
  ON public.profiles;
CREATE POLICY "Active subscription required for profile update"
ON public.profiles AS RESTRICTIVE
FOR UPDATE TO authenticated
USING ((SELECT public.enforce_current_user_platform_access()))
WITH CHECK ((SELECT public.enforce_current_user_platform_access()));

DROP POLICY IF EXISTS "Active subscription required for profile delete"
  ON public.profiles;
CREATE POLICY "Active subscription required for profile delete"
ON public.profiles AS RESTRICTIVE
FOR DELETE TO authenticated
USING ((SELECT public.enforce_current_user_platform_access()));

DROP POLICY IF EXISTS "Active subscription required for protected student files"
  ON storage.objects;
CREATE POLICY "Active subscription required for protected student files"
ON storage.objects AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  bucket_id NOT IN ('materiais', 'fotos-evolucao', 'exercise-thumbnails')
  OR (SELECT public.enforce_current_user_platform_access())
)
WITH CHECK (
  bucket_id NOT IN ('materiais', 'fotos-evolucao', 'exercise-thumbnails')
  OR (SELECT public.enforce_current_user_platform_access())
);

-- The list below is intentionally explicit: only workout-path policies whose
-- direct helper calls are statement-stable are rewritten. Their original
-- definitions are stored in the recreated policy comment for exact rollback.
DO $$
DECLARE
  v_policy record;
  v_using text;
  v_check text;
  v_roles text;
  v_create_sql text;
  v_backup jsonb;
BEGIN
  FOR v_policy IN
    SELECT
      p.*,
      obj_description(pol.oid, 'pg_policy') AS original_comment
    FROM pg_policies p
    JOIN (
      VALUES
        ('blocos_treino', 'aluno_read_blocos'),
        ('blocos_treino', 'aluno_update_concluido'),
        ('blocos_treino', 'blocos_treino_delete_policy'),
        ('blocos_treino', 'blocos_treino_insert_policy'),
        ('blocos_treino', 'blocos_treino_select_policy'),
        ('blocos_treino', 'blocos_treino_update_policy'),
        ('blocos_treino', 'personal_full_access_blocos'),
        ('exercicios', 'Admin gerencia todos exercícios'),
        ('exercicios', 'Aluno atualiza concluido e peso dos seus exercicios'),
        ('exercicios', 'Personal atualiza exercícios de seus alunos'),
        ('exercicios', 'Personal cria exercícios para seus alunos'),
        ('exercicios', 'Personal deleta exercícios de seus alunos'),
        ('exercicios', 'Personal e aluno veem exercícios'),
        ('treino_descansos', 'Alunos podem atualizar seus próprios descansos'),
        ('treino_descansos', 'Alunos podem criar seus próprios descansos'),
        ('treino_descansos', 'Alunos podem ver seus próprios descansos'),
        ('treino_descansos', 'Personals podem ver descansos dos seus alunos'),
        ('treino_semana_ativa', 'Admin vê todas semanas ativas'),
        ('treino_semana_ativa', 'Aluno vê sua semana ativa'),
        ('treino_semana_ativa', 'Personal gerencia semanas ativas de seus alunos'),
        ('treino_sessoes', 'Admin gerencia sessoes de treino'),
        ('treino_sessoes', 'Aluno atualiza sua propria sessao de treino'),
        ('treino_sessoes', 'Aluno cria sua propria sessao de treino'),
        ('treino_sessoes', 'Aluno pode atualizar sua sessão de treino'),
        ('treino_sessoes', 'Aluno pode criar sua sessão de treino'),
        ('treino_sessoes', 'Aluno pode deletar sua sessão de treino'),
        ('treino_sessoes', 'Participantes veem sessoes de treino'),
        ('treino_sessoes', 'Usuários podem ver suas sessões de treino'),
        ('treinos_semanais', 'Admin vê todos treinos'),
        ('treinos_semanais', 'Aluno atualiza próprios treinos'),
        ('treinos_semanais', 'Aluno cria próprios treinos'),
        ('treinos_semanais', 'Aluno vê próprios treinos'),
        ('treinos_semanais', 'Personal atualiza treinos de seus alunos'),
        ('treinos_semanais', 'Personal cria treinos para seus alunos'),
        ('treinos_semanais', 'Personal deleta treinos de seus alunos'),
        ('treinos_semanais', 'Personal vê treinos de seus alunos'),
        ('treinos_semanais', 'aluno_update_concluido_treino')
    ) AS target(tablename, policyname)
      ON target.tablename = p.tablename
     AND target.policyname = p.policyname
    JOIN pg_namespace n
      ON n.nspname = p.schemaname
    JOIN pg_class c
      ON c.relnamespace = n.oid
     AND c.relname = p.tablename
    JOIN pg_policy pol
      ON pol.polrelid = c.oid
     AND pol.polname = p.policyname
    WHERE p.schemaname = 'public'
    ORDER BY p.tablename, p.policyname
  LOOP
    v_using := v_policy.qual;
    v_check := v_policy.with_check;

    IF v_using IS NOT NULL THEN
      v_using := replace(v_using, 'public.is_admin(auth.uid())', '__FITCONSULT_IS_ADMIN__');
      v_using := replace(v_using, 'is_admin(auth.uid())', '__FITCONSULT_IS_ADMIN__');
      v_using := replace(v_using, 'public.is_personal(auth.uid())', '__FITCONSULT_IS_PERSONAL__');
      v_using := replace(v_using, 'is_personal(auth.uid())', '__FITCONSULT_IS_PERSONAL__');
      v_using := replace(v_using, 'auth.uid()', '(SELECT auth.uid())');
      v_using := replace(v_using, '__FITCONSULT_IS_ADMIN__', '(SELECT public.is_admin((SELECT auth.uid())))');
      v_using := replace(v_using, '__FITCONSULT_IS_PERSONAL__', '(SELECT public.is_personal((SELECT auth.uid())))');
    END IF;

    IF v_check IS NOT NULL THEN
      v_check := replace(v_check, 'public.is_admin(auth.uid())', '__FITCONSULT_IS_ADMIN__');
      v_check := replace(v_check, 'is_admin(auth.uid())', '__FITCONSULT_IS_ADMIN__');
      v_check := replace(v_check, 'public.is_personal(auth.uid())', '__FITCONSULT_IS_PERSONAL__');
      v_check := replace(v_check, 'is_personal(auth.uid())', '__FITCONSULT_IS_PERSONAL__');
      v_check := replace(v_check, 'auth.uid()', '(SELECT auth.uid())');
      v_check := replace(v_check, '__FITCONSULT_IS_ADMIN__', '(SELECT public.is_admin((SELECT auth.uid())))');
      v_check := replace(v_check, '__FITCONSULT_IS_PERSONAL__', '(SELECT public.is_personal((SELECT auth.uid())))');
    END IF;

    SELECT string_agg(
      CASE
        WHEN role_name = 'public' THEN 'PUBLIC'
        ELSE quote_ident(role_name)
      END,
      ', '
    )
    INTO v_roles
    FROM unnest(v_policy.roles) AS policy_roles(role_name);

    v_backup := jsonb_build_object(
      'migration', '20260928130000_rls_access_policy_initplan',
      'permissive', v_policy.permissive,
      'roles', to_jsonb(v_policy.roles),
      'cmd', v_policy.cmd,
      'qual', v_policy.qual,
      'with_check', v_policy.with_check,
      'comment', v_policy.original_comment
    );

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      v_policy.policyname,
      v_policy.tablename
    );

    v_create_sql := format(
      'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s',
      v_policy.policyname,
      v_policy.tablename,
      v_policy.permissive,
      v_policy.cmd,
      v_roles
    );
    IF v_using IS NOT NULL THEN
      v_create_sql := v_create_sql || format(' USING (%s)', v_using);
    END IF;
    IF v_check IS NOT NULL THEN
      v_create_sql := v_create_sql || format(' WITH CHECK (%s)', v_check);
    END IF;
    EXECUTE v_create_sql;

    EXECUTE format(
      'COMMENT ON POLICY %I ON public.%I IS %L',
      v_policy.policyname,
      v_policy.tablename,
      v_backup::text
    );
  END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_blocos_treino_semanal
  ON public.blocos_treino(treino_semanal_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_exercicios_treino_ordem_active
  ON public.exercicios(treino_semanal_id, ordem)
  WHERE deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
