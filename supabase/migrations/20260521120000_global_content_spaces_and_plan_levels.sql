-- Global content spaces for admins and plan-aware access metadata.
-- This migration is idempotent and keeps personal folders/models private.

DO $$
BEGIN
  IF to_regclass('public.planos') IS NOT NULL THEN
    ALTER TABLE public.planos
      ADD COLUMN IF NOT EXISTS nivel integer DEFAULT 1;

    UPDATE public.planos
    SET nivel = CASE
      WHEN translate(lower(nome), U&'\00E1\00E0\00E3\00E2\00E4\00E9\00E8\00EA\00EB\00ED\00EC\00EE\00EF\00F3\00F2\00F5\00F4\00F6\00FA\00F9\00FB\00FC\00E7', 'aaaaaeeeeiiiiooooouuuuc') LIKE '%premium%' THEN 4
      WHEN translate(lower(nome), U&'\00E1\00E0\00E3\00E2\00E4\00E9\00E8\00EA\00EB\00ED\00EC\00EE\00EF\00F3\00F2\00F5\00F4\00F6\00FA\00F9\00FB\00FC\00E7', 'aaaaaeeeeiiiiooooouuuuc') LIKE '%profissional%'
        OR translate(lower(nome), U&'\00E1\00E0\00E3\00E2\00E4\00E9\00E8\00EA\00EB\00ED\00EC\00EE\00EF\00F3\00F2\00F5\00F4\00F6\00FA\00F9\00FB\00FC\00E7', 'aaaaaeeeeiiiiooooouuuuc') LIKE '%pro%' THEN 3
      WHEN translate(lower(nome), U&'\00E1\00E0\00E3\00E2\00E4\00E9\00E8\00EA\00EB\00ED\00EC\00EE\00EF\00F3\00F2\00F5\00F4\00F6\00FA\00F9\00FB\00FC\00E7', 'aaaaaeeeeiiiiooooouuuuc') LIKE '%basico%' THEN 2
      WHEN translate(lower(nome), U&'\00E1\00E0\00E3\00E2\00E4\00E9\00E8\00EA\00EB\00ED\00EC\00EE\00EF\00F3\00F2\00F5\00F4\00F6\00FA\00F9\00FB\00FC\00E7', 'aaaaaeeeeiiiiooooouuuuc') LIKE '%gratuito%'
        OR translate(lower(nome), U&'\00E1\00E0\00E3\00E2\00E4\00E9\00E8\00EA\00EB\00ED\00EC\00EE\00EF\00F3\00F2\00F5\00F4\00F6\00FA\00F9\00FB\00FC\00E7', 'aaaaaeeeeiiiiooooouuuuc') LIKE '%free%' THEN 1
      ELSE COALESCE(nivel, 1)
    END;

    ALTER TABLE public.planos
      ALTER COLUMN nivel SET DEFAULT 1,
      ALTER COLUMN nivel SET NOT NULL;

    ALTER TABLE public.planos
      DROP CONSTRAINT IF EXISTS planos_nivel_check;

    ALTER TABLE public.planos
      ADD CONSTRAINT planos_nivel_check CHECK (nivel BETWEEN 1 AND 4);

    UPDATE public.planos
    SET features = jsonb_set(
      jsonb_set(
        CASE
          WHEN jsonb_typeof(COALESCE(features::jsonb, '{}'::jsonb)) = 'object'
            THEN COALESCE(features::jsonb, '{}'::jsonb)
          ELSE '{}'::jsonb
        END,
        '{recursos,biblioteca_global}',
        to_jsonb(nivel >= 3),
        true
      ),
      '{recursos,modelos_globais}',
      to_jsonb(nivel >= 3),
      true
    );
  END IF;
END;
$$;

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

    CREATE INDEX IF NOT EXISTS idx_exercises_library_is_global
      ON public.exercises_library(is_global)
      WHERE is_global = true;
  END IF;

  IF to_regclass('public.modelo_pastas') IS NOT NULL THEN
    ALTER TABLE public.modelo_pastas
      ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS min_plan_level integer DEFAULT 1;

    UPDATE public.modelo_pastas
    SET is_global = false
    WHERE is_global IS NULL;

    UPDATE public.modelo_pastas
    SET min_plan_level = 1
    WHERE min_plan_level IS NULL;

    ALTER TABLE public.modelo_pastas
      ALTER COLUMN is_global SET DEFAULT false,
      ALTER COLUMN is_global SET NOT NULL,
      ALTER COLUMN min_plan_level SET DEFAULT 1,
      ALTER COLUMN min_plan_level SET NOT NULL;

    ALTER TABLE public.modelo_pastas
      DROP CONSTRAINT IF EXISTS modelo_pastas_min_plan_level_check;

    ALTER TABLE public.modelo_pastas
      ADD CONSTRAINT modelo_pastas_min_plan_level_check
      CHECK (min_plan_level BETWEEN 1 AND 4);

    CREATE INDEX IF NOT EXISTS idx_modelo_pastas_global_parent
      ON public.modelo_pastas(is_global, parent_id, ordem)
      WHERE is_global = true;
  END IF;

  IF to_regclass('public.treino_modelos') IS NOT NULL THEN
    ALTER TABLE public.treino_modelos
      ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS min_plan_level integer DEFAULT 1,
      ADD COLUMN IF NOT EXISTS source_modelo_id uuid NULL;

    UPDATE public.treino_modelos
    SET is_global = false
    WHERE is_global IS NULL;

    UPDATE public.treino_modelos
    SET min_plan_level = 1
    WHERE min_plan_level IS NULL;

    ALTER TABLE public.treino_modelos
      ALTER COLUMN is_global SET DEFAULT false,
      ALTER COLUMN is_global SET NOT NULL,
      ALTER COLUMN min_plan_level SET DEFAULT 1,
      ALTER COLUMN min_plan_level SET NOT NULL;

    ALTER TABLE public.treino_modelos
      DROP CONSTRAINT IF EXISTS treino_modelos_min_plan_level_check;

    ALTER TABLE public.treino_modelos
      ADD CONSTRAINT treino_modelos_min_plan_level_check
      CHECK (min_plan_level BETWEEN 1 AND 4);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'treino_modelos_source_modelo_id_fkey'
    ) THEN
      ALTER TABLE public.treino_modelos
        ADD CONSTRAINT treino_modelos_source_modelo_id_fkey
        FOREIGN KEY (source_modelo_id)
        REFERENCES public.treino_modelos(id)
        ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_treino_modelos_global_folder
      ON public.treino_modelos(is_global, pasta_id, min_plan_level)
      WHERE is_global = true;

    CREATE INDEX IF NOT EXISTS idx_treino_modelos_source_modelo
      ON public.treino_modelos(source_modelo_id)
      WHERE source_modelo_id IS NOT NULL;
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
    ALTER TABLE public.exercises_library ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins veem todos exercicios da biblioteca" ON public.exercises_library;
    CREATE POLICY "Admins veem todos exercicios da biblioteca"
      ON public.exercises_library
      FOR SELECT
      TO authenticated
      USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Personals veem exercicios globais" ON public.exercises_library;
    CREATE POLICY "Personals veem exercicios globais"
      ON public.exercises_library
      FOR SELECT
      TO authenticated
      USING (is_global = true AND public.is_personal(auth.uid()));

    DROP POLICY IF EXISTS "Somente admin grava exercicios globais" ON public.exercises_library;
    CREATE POLICY "Somente admin grava exercicios globais"
      ON public.exercises_library
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (is_global = false OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Somente admin atualiza exercicios globais" ON public.exercises_library;
    CREATE POLICY "Somente admin atualiza exercicios globais"
      ON public.exercises_library
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (is_global = false OR public.is_admin(auth.uid()))
      WITH CHECK (is_global = false OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Somente admin remove exercicios globais" ON public.exercises_library;
    CREATE POLICY "Somente admin remove exercicios globais"
      ON public.exercises_library
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING (is_global = false OR public.is_admin(auth.uid()));
  END IF;

  IF to_regclass('public.modelo_pastas') IS NOT NULL THEN
    ALTER TABLE public.modelo_pastas ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins veem todas pastas de modelos" ON public.modelo_pastas;
    CREATE POLICY "Admins veem todas pastas de modelos"
      ON public.modelo_pastas
      FOR SELECT
      TO authenticated
      USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Personals veem pastas globais de modelos" ON public.modelo_pastas;
    CREATE POLICY "Personals veem pastas globais de modelos"
      ON public.modelo_pastas
      FOR SELECT
      TO authenticated
      USING (is_global = true AND public.is_personal(auth.uid()));

    DROP POLICY IF EXISTS "Somente admin grava pastas globais de modelos" ON public.modelo_pastas;
    CREATE POLICY "Somente admin grava pastas globais de modelos"
      ON public.modelo_pastas
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (is_global = false OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Somente admin atualiza pastas globais de modelos" ON public.modelo_pastas;
    CREATE POLICY "Somente admin atualiza pastas globais de modelos"
      ON public.modelo_pastas
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (is_global = false OR public.is_admin(auth.uid()))
      WITH CHECK (is_global = false OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Somente admin remove pastas globais de modelos" ON public.modelo_pastas;
    CREATE POLICY "Somente admin remove pastas globais de modelos"
      ON public.modelo_pastas
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING (is_global = false OR public.is_admin(auth.uid()));
  END IF;

  IF to_regclass('public.treino_modelos') IS NOT NULL THEN
    ALTER TABLE public.treino_modelos ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins veem todos modelos de treino" ON public.treino_modelos;
    CREATE POLICY "Admins veem todos modelos de treino"
      ON public.treino_modelos
      FOR SELECT
      TO authenticated
      USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Personals veem modelos globais" ON public.treino_modelos;
    CREATE POLICY "Personals veem modelos globais"
      ON public.treino_modelos
      FOR SELECT
      TO authenticated
      USING (is_global = true AND public.is_personal(auth.uid()));

    DROP POLICY IF EXISTS "Somente admin grava modelos globais" ON public.treino_modelos;
    CREATE POLICY "Somente admin grava modelos globais"
      ON public.treino_modelos
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (is_global = false OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Somente admin atualiza modelos globais" ON public.treino_modelos;
    CREATE POLICY "Somente admin atualiza modelos globais"
      ON public.treino_modelos
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (is_global = false OR public.is_admin(auth.uid()))
      WITH CHECK (is_global = false OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Somente admin remove modelos globais" ON public.treino_modelos;
    CREATE POLICY "Somente admin remove modelos globais"
      ON public.treino_modelos
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING (is_global = false OR public.is_admin(auth.uid()));
  END IF;

  IF to_regclass('public.treino_modelo_exercicios') IS NOT NULL THEN
    ALTER TABLE public.treino_modelo_exercicios ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins gerenciam exercicios de modelos" ON public.treino_modelo_exercicios;
    CREATE POLICY "Admins gerenciam exercicios de modelos"
      ON public.treino_modelo_exercicios
      FOR ALL
      TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));

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
    ALTER TABLE public.treino_modelo_blocos ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins gerenciam blocos de modelos" ON public.treino_modelo_blocos;
    CREATE POLICY "Admins gerenciam blocos de modelos"
      ON public.treino_modelo_blocos
      FOR ALL
      TO authenticated
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));

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
