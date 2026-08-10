ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_personal_archived_at
ON public.profiles(personal_id, archived_at);

CREATE OR REPLACE FUNCTION public.set_student_archived(
  _student_id uuid,
  _archived boolean
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
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
    RAISE EXCEPTION 'Sem permissao para arquivar este aluno';
  END IF;

  UPDATE public.profiles
  SET archived_at = CASE
      WHEN _archived THEN coalesce(archived_at, now())
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = _student_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_student_archived(uuid, boolean) TO authenticated;
