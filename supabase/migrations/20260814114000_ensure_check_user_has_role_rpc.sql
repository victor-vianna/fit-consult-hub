-- Runtime helper used by Edge Functions to validate caller roles.

CREATE OR REPLACE FUNCTION public.check_user_has_role(
  _user_id uuid,
  required_role public.user_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, required_role);
$$;

REVOKE EXECUTE ON FUNCTION public.check_user_has_role(uuid, public.user_role)
  FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.check_user_has_role(uuid, public.user_role)
  TO service_role;

NOTIFY pgrst, 'reload schema';
