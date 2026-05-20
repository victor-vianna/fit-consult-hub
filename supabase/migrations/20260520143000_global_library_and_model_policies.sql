-- Add global exercise library and workout model support.
-- Idempotent because production/local schemas in this project may differ.

DO $$
BEGIN
  IF to_regclass('public.exercises_library') IS NOT NULL THEN
    ALTER TABLE public.exercises_library
      ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;

    UPDATE public.exercises_library
    SET is_global = false
    WHERE is_global IS NULL;

    ALTER TABLE public.exercises_library
      ALTER COLUMN is_global SET DEFAULT false,
      ALTER COLUMN is_global SET NOT NULL;

    ALTER TABLE public.exercises_library ENABLE ROW LEVEL SECURITY;

    CREATE INDEX IF NOT EXISTS idx_exercises_library_is_global
      ON public.exercises_library(is_global)
      WHERE is_global = true;
  END IF;

  IF to_regclass('public.treino_modelos') IS NOT NULL THEN
    ALTER TABLE public.treino_modelos
      ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;

    UPDATE public.treino_modelos
    SET is_global = false
    WHERE is_global IS NULL;

    ALTER TABLE public.treino_modelos
      ALTER COLUMN is_global SET DEFAULT false,
      ALTER COLUMN is_global SET NOT NULL;

    ALTER TABLE public.treino_modelos ENABLE ROW LEVEL SECURITY;

    CREATE INDEX IF NOT EXISTS idx_treino_modelos_is_global
      ON public.treino_modelos(is_global)
      WHERE is_global = true;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_global_treino_modelo(_modelo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT tm.is_global
    FROM public.treino_modelos tm
    WHERE tm.id = _modelo_id
  ), false)
$$;

DO $$
BEGIN
  IF to_regclass('public.exercises_library') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Personals veem exercicios globais" ON public.exercises_library;
    DROP POLICY IF EXISTS "Somente admin grava exercicios globais" ON public.exercises_library;
    DROP POLICY IF EXISTS "Somente admin atualiza exercicios globais" ON public.exercises_library;
    DROP POLICY IF EXISTS "Somente admin remove exercicios globais" ON public.exercises_library;

    CREATE POLICY "Personals veem exercicios globais"
      ON public.exercises_library
      FOR SELECT
      TO authenticated
      USING (is_global = true AND public.is_personal(auth.uid()));

    CREATE POLICY "Somente admin grava exercicios globais"
      ON public.exercises_library
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (is_global = false OR public.is_admin(auth.uid()));

    CREATE POLICY "Somente admin atualiza exercicios globais"
      ON public.exercises_library
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (is_global = false OR public.is_admin(auth.uid()))
      WITH CHECK (is_global = false OR public.is_admin(auth.uid()));

    CREATE POLICY "Somente admin remove exercicios globais"
      ON public.exercises_library
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING (is_global = false OR public.is_admin(auth.uid()));
  END IF;

  IF to_regclass('public.treino_modelos') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Personals veem modelos globais" ON public.treino_modelos;
    DROP POLICY IF EXISTS "Somente admin grava modelos globais" ON public.treino_modelos;
    DROP POLICY IF EXISTS "Somente admin atualiza modelos globais" ON public.treino_modelos;
    DROP POLICY IF EXISTS "Somente admin remove modelos globais" ON public.treino_modelos;

    CREATE POLICY "Personals veem modelos globais"
      ON public.treino_modelos
      FOR SELECT
      TO authenticated
      USING (is_global = true AND public.is_personal(auth.uid()));

    CREATE POLICY "Somente admin grava modelos globais"
      ON public.treino_modelos
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (is_global = false OR public.is_admin(auth.uid()));

    CREATE POLICY "Somente admin atualiza modelos globais"
      ON public.treino_modelos
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (is_global = false OR public.is_admin(auth.uid()))
      WITH CHECK (is_global = false OR public.is_admin(auth.uid()));

    CREATE POLICY "Somente admin remove modelos globais"
      ON public.treino_modelos
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING (is_global = false OR public.is_admin(auth.uid()));
  END IF;

  IF to_regclass('public.treino_modelo_exercicios') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Personals veem exercicios de modelos globais" ON public.treino_modelo_exercicios;
    CREATE POLICY "Personals veem exercicios de modelos globais"
      ON public.treino_modelo_exercicios
      FOR SELECT
      TO authenticated
      USING (
        public.is_personal(auth.uid())
        AND public.is_global_treino_modelo(modelo_id)
      );
  END IF;

  IF to_regclass('public.treino_modelo_blocos') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Personals veem blocos de modelos globais" ON public.treino_modelo_blocos;
    CREATE POLICY "Personals veem blocos de modelos globais"
      ON public.treino_modelo_blocos
      FOR SELECT
      TO authenticated
      USING (
        public.is_personal(auth.uid())
        AND public.is_global_treino_modelo(modelo_id)
      );
  END IF;
END;
$$;

-- Accept both legacy and current Portuguese status names for personal access.
CREATE OR REPLACE FUNCTION public.pode_acessar_plataforma(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role user_role;
  v_is_active boolean;
  v_personal_id uuid;
  v_override boolean;
  v_personal_flag boolean;
  v_admin_flag boolean;
  v_has_pago boolean;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;

  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  SELECT is_active, personal_id, controle_acesso_por_pagamento
    INTO v_is_active, v_personal_id, v_override
  FROM public.profiles WHERE id = _user_id;

  IF v_is_active = false THEN
    RETURN false;
  END IF;

  IF v_role = 'personal' THEN
    SELECT controle_acesso_personal_por_pagamento INTO v_admin_flag
      FROM public.admin_settings LIMIT 1;
    IF COALESCE(v_admin_flag, false) = false THEN
      RETURN true;
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.assinaturas
      WHERE personal_id = _user_id
        AND status IN ('ativo', 'ativa', 'trial')
        AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
    ) INTO v_has_pago;
    RETURN v_has_pago;
  END IF;

  IF v_role = 'aluno' THEN
    IF v_override IS NOT NULL THEN
      v_personal_flag := v_override;
    ELSE
      SELECT controle_acesso_por_pagamento INTO v_personal_flag
        FROM public.personal_settings WHERE personal_id = v_personal_id LIMIT 1;
      v_personal_flag := COALESCE(v_personal_flag, false);
    END IF;

    IF v_personal_flag = false THEN
      RETURN true;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE student_id = _user_id
        AND status_pagamento = 'pago'
        AND data_expiracao > now()
    ) INTO v_has_pago;
    RETURN v_has_pago;
  END IF;

  RETURN true;
END;
$$;
