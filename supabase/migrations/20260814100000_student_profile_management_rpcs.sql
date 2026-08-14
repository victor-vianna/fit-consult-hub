CREATE OR REPLACE FUNCTION public.set_student_card_color(
  _student_id uuid,
  _color text
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_color text := nullif(btrim(_color), '');
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Sessao nao encontrada';
  END IF;

  SELECT *
    INTO v_profile
  FROM public.profiles
  WHERE id = _student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno nao encontrado';
  END IF;

  IF NOT public.is_personal(v_actor_id)
    OR v_profile.personal_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION 'Sem permissao para editar este aluno';
  END IF;

  IF v_color IS NOT NULL AND v_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Cor invalida';
  END IF;

  UPDATE public.profiles
  SET aluno_card_color = lower(v_color),
      updated_at = now()
  WHERE id = _student_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_student_basic_info(
  _student_id uuid,
  _nome text,
  _telefone text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_nome text := nullif(btrim(_nome), '');
  v_telefone text := nullif(btrim(_telefone), '');
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Sessao nao encontrada';
  END IF;

  IF v_nome IS NULL THEN
    RAISE EXCEPTION 'Nome obrigatorio';
  END IF;

  SELECT *
    INTO v_profile
  FROM public.profiles
  WHERE id = _student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno nao encontrado';
  END IF;

  IF NOT public.is_personal(v_actor_id)
    OR v_profile.personal_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION 'Sem permissao para editar este aluno';
  END IF;

  UPDATE public.profiles
  SET nome = v_nome,
      telefone = v_telefone,
      updated_at = now()
  WHERE id = _student_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_student_card_color(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_student_basic_info(uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
