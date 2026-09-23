-- A blocked student cannot update profiles through RLS. This narrowly scoped
-- recovery RPC only permits linking the current student to an active public
-- personal and never permits switching an existing relationship.

CREATE OR REPLACE FUNCTION public.link_current_student_to_public_personal(
  _slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_personal public.profiles%ROWTYPE;
  v_student public.profiles%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = v_actor_id
      AND ur.role = 'aluno'
  ) THEN
    RAISE EXCEPTION 'Only students can use a public plan link'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.*
  INTO v_personal
  FROM public.profiles p
  JOIN public.user_roles ur
    ON ur.user_id = p.id
   AND ur.role = 'personal'
  WHERE p.public_slug = public.normalize_public_slug(_slug)
    AND p.public_profile_enabled IS TRUE
    AND p.is_active IS TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Public personal page not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_student
  FROM public.profiles p
  WHERE p.id = v_actor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student profile not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_student.personal_id IS NOT NULL
    AND v_student.personal_id <> v_personal.id
  THEN
    RAISE EXCEPTION 'Student is already linked to another personal'
      USING ERRCODE = '23505';
  END IF;

  IF v_student.personal_id IS NULL THEN
    UPDATE public.profiles
    SET personal_id = v_personal.id,
        updated_at = transaction_timestamp()
    WHERE id = v_actor_id;
  END IF;

  PERFORM public.recalculate_student_access(v_actor_id);

  RETURN jsonb_build_object(
    'student_id', v_actor_id,
    'personal_id', v_personal.id,
    'personal_slug', v_personal.public_slug
  );
END;
$$;

REVOKE ALL ON FUNCTION public.link_current_student_to_public_personal(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_current_student_to_public_personal(text)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
