
-- Reordena exercícios respeitando o padrão de múltiplos de 10 (compatível com drag-and-drop)
CREATE OR REPLACE FUNCTION public.reordenar_exercicios(
  p_treino_semanal_id uuid,
  p_ordem_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_idx integer;
BEGIN
  -- Validação de permissão: somente o personal dono ou o aluno do treino podem reordenar
  IF NOT EXISTS (
    SELECT 1 FROM treinos_semanais ts
    WHERE ts.id = p_treino_semanal_id
      AND (ts.personal_id = auth.uid() OR ts.profile_id = auth.uid() OR is_admin(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'sem permissao para reordenar este treino';
  END IF;

  FOR v_idx IN 1..array_length(p_ordem_ids, 1)
  LOOP
    v_id := p_ordem_ids[v_idx];
    UPDATE exercicios
    SET ordem = v_idx * 10,
        updated_at = NOW()
    WHERE id = v_id
      AND treino_semanal_id = p_treino_semanal_id
      AND deleted_at IS NULL;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reordenar_exercicios(uuid, uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reordenar_exercicios(uuid, uuid[]) TO authenticated;

-- Reforça validação do trigger validar_ordem_no_grupo: garantir tipo válido
CREATE OR REPLACE FUNCTION public.validar_ordem_no_grupo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.grupo_id IS NULL THEN
    NEW.ordem_no_grupo := 1;
    NEW.tipo_agrupamento := 'normal';
  ELSE
    -- Se faz parte de grupo, garantir tipo válido
    IF NEW.tipo_agrupamento IS NULL OR NEW.tipo_agrupamento NOT IN ('biset','triset','circuito','superset','conjugado') THEN
      NEW.tipo_agrupamento := 'circuito';
    END IF;
    IF NEW.ordem_no_grupo IS NULL OR NEW.ordem_no_grupo < 1 THEN
      SELECT COALESCE(MAX(ordem_no_grupo), 0) + 1 INTO NEW.ordem_no_grupo
      FROM exercicios WHERE grupo_id = NEW.grupo_id AND deleted_at IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
