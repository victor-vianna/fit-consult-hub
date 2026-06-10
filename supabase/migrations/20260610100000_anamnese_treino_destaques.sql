CREATE TABLE IF NOT EXISTS public.anamnese_treino_destaques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT anamnese_treino_destaques_unique UNIQUE (profile_id, personal_id),
  CONSTRAINT anamnese_treino_destaques_selected_fields_array
    CHECK (jsonb_typeof(selected_fields) = 'array')
);

ALTER TABLE public.anamnese_treino_destaques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal gerencia destaques de anamnese dos seus alunos"
  ON public.anamnese_treino_destaques;
CREATE POLICY "Personal gerencia destaques de anamnese dos seus alunos"
ON public.anamnese_treino_destaques
FOR ALL
TO authenticated
USING (
  personal_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = anamnese_treino_destaques.profile_id
      AND p.personal_id = auth.uid()
  )
)
WITH CHECK (
  personal_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = anamnese_treino_destaques.profile_id
      AND p.personal_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admin gerencia destaques de anamnese"
  ON public.anamnese_treino_destaques;
CREATE POLICY "Admin gerencia destaques de anamnese"
ON public.anamnese_treino_destaques
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_anamnese_treino_destaques_profile
  ON public.anamnese_treino_destaques(profile_id);

CREATE INDEX IF NOT EXISTS idx_anamnese_treino_destaques_personal
  ON public.anamnese_treino_destaques(personal_id);

DROP TRIGGER IF EXISTS update_anamnese_treino_destaques_updated_at
  ON public.anamnese_treino_destaques;
CREATE TRIGGER update_anamnese_treino_destaques_updated_at
BEFORE UPDATE ON public.anamnese_treino_destaques
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
