-- Fix validar_ordem_no_grupo: do not overwrite valid tipo_agrupamento on UPDATE,
-- and align fallback values with the CHECK constraint
-- (allowed: 'normal','bi-set','tri-set','drop-set','superset')
CREATE OR REPLACE FUNCTION public.validar_ordem_no_grupo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.grupo_id IS NULL THEN
    IF NEW.tipo_agrupamento IS NULL OR NEW.tipo_agrupamento NOT IN ('normal','bi-set','tri-set','drop-set','superset') THEN
      NEW.tipo_agrupamento := 'normal';
    END IF;
    IF NEW.ordem_no_grupo IS NULL OR NEW.ordem_no_grupo < 1 THEN
      NEW.ordem_no_grupo := 1;
    END IF;
  ELSE
    -- Belongs to a group: only fix invalid/missing values, preserve valid ones
    IF NEW.tipo_agrupamento IS NULL OR NEW.tipo_agrupamento NOT IN ('normal','bi-set','tri-set','drop-set','superset') THEN
      NEW.tipo_agrupamento := 'bi-set';
    END IF;
    IF NEW.ordem_no_grupo IS NULL OR NEW.ordem_no_grupo < 1 THEN
      SELECT COALESCE(MAX(ordem_no_grupo), 0) + 1 INTO NEW.ordem_no_grupo
      FROM exercicios WHERE grupo_id = NEW.grupo_id AND deleted_at IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;