CREATE TABLE IF NOT EXISTS public.workout_edit_not_found_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treino_id text NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  personal_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  semana date,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_edit_not_found_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_workout_edit_not_found_logs_treino_id
  ON public.workout_edit_not_found_logs(treino_id);

CREATE INDEX IF NOT EXISTS idx_workout_edit_not_found_logs_profile_personal_created
  ON public.workout_edit_not_found_logs(profile_id, personal_id, created_at DESC);

DROP POLICY IF EXISTS "Admins veem logs de edicao de treino nao encontrado"
  ON public.workout_edit_not_found_logs;

CREATE POLICY "Admins veem logs de edicao de treino nao encontrado"
  ON public.workout_edit_not_found_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Personals veem seus logs de edicao de treino nao encontrado"
  ON public.workout_edit_not_found_logs;

CREATE POLICY "Personals veem seus logs de edicao de treino nao encontrado"
  ON public.workout_edit_not_found_logs
  FOR SELECT
  USING (personal_id = auth.uid() OR actor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_workout_edit_not_found(
  p_treino_id text,
  p_profile_id uuid,
  p_personal_id uuid,
  p_semana date DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_log_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Sessao nao encontrada';
  END IF;

  IF NOT (
    public.has_role(v_actor_id, 'admin')
    OR v_actor_id = p_personal_id
  ) THEN
    RAISE EXCEPTION 'Sem permissao para registrar log deste treino';
  END IF;

  INSERT INTO public.workout_edit_not_found_logs (
    treino_id,
    profile_id,
    personal_id,
    actor_id,
    semana,
    context
  )
  VALUES (
    p_treino_id,
    p_profile_id,
    p_personal_id,
    v_actor_id,
    p_semana,
    COALESCE(p_context, '{}'::jsonb)
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

REVOKE ALL ON public.workout_edit_not_found_logs FROM anon, authenticated;
GRANT SELECT ON public.workout_edit_not_found_logs TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_workout_edit_not_found(text, uuid, uuid, date, jsonb)
  FROM anon;
GRANT EXECUTE ON FUNCTION public.log_workout_edit_not_found(text, uuid, uuid, date, jsonb)
  TO authenticated;
