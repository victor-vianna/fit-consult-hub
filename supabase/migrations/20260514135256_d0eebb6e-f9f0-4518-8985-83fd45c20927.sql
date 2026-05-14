ALTER TABLE public.exercicios DROP CONSTRAINT IF EXISTS exercicios_tipo_agrupamento_check;
ALTER TABLE public.exercicios ADD CONSTRAINT exercicios_tipo_agrupamento_check
  CHECK (tipo_agrupamento = ANY (ARRAY['normal'::text, 'bi-set'::text, 'tri-set'::text, 'drop-set'::text, 'superset'::text, 'circuito'::text]));

CREATE OR REPLACE FUNCTION public.validar_ordem_no_grupo()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.grupo_id IS NULL THEN
    IF NEW.tipo_agrupamento IS NULL OR NEW.tipo_agrupamento NOT IN ('normal','bi-set','tri-set','drop-set','superset','circuito') THEN
      NEW.tipo_agrupamento := 'normal';
    END IF;
    IF NEW.ordem_no_grupo IS NULL OR NEW.ordem_no_grupo < 1 THEN
      NEW.ordem_no_grupo := 1;
    END IF;
  ELSE
    IF NEW.tipo_agrupamento IS NULL OR NEW.tipo_agrupamento NOT IN ('normal','bi-set','tri-set','drop-set','superset','circuito') THEN
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