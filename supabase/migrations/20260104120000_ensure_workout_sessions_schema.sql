-- Ensures workout sessions exist in reproducible environments and are protected by RLS.

CREATE TABLE IF NOT EXISTS public.treino_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treino_semanal_id uuid,
  profile_id uuid,
  personal_id uuid,
  inicio timestamptz,
  fim timestamptz,
  duracao_segundos integer DEFAULT 0,
  status text DEFAULT 'em_andamento',
  observacoes text,
  pausado_em timestamptz,
  tempo_descanso_total integer DEFAULT 0,
  tempo_pausado_total integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.treino_sessoes
  ADD COLUMN IF NOT EXISTS treino_semanal_id uuid,
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS personal_id uuid,
  ADD COLUMN IF NOT EXISTS inicio timestamptz,
  ADD COLUMN IF NOT EXISTS fim timestamptz,
  ADD COLUMN IF NOT EXISTS duracao_segundos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'em_andamento',
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS pausado_em timestamptz,
  ADD COLUMN IF NOT EXISTS tempo_descanso_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tempo_pausado_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'treino_sessoes_profile_id_fkey'
      AND conrelid = 'public.treino_sessoes'::regclass
  ) THEN
    ALTER TABLE public.treino_sessoes
      ADD CONSTRAINT treino_sessoes_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'treino_sessoes_treino_semanal_id_fkey'
      AND conrelid = 'public.treino_sessoes'::regclass
  ) THEN
    ALTER TABLE public.treino_sessoes
      ADD CONSTRAINT treino_sessoes_treino_semanal_id_fkey
      FOREIGN KEY (treino_semanal_id) REFERENCES public.treinos_semanais(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_treino_sessoes_treino_id
  ON public.treino_sessoes(treino_semanal_id);
CREATE INDEX IF NOT EXISTS idx_treino_sessoes_personal_status
  ON public.treino_sessoes(personal_id, status);
CREATE INDEX IF NOT EXISTS idx_treino_sessoes_profile_created
  ON public.treino_sessoes(profile_id, created_at DESC);

ALTER TABLE public.treino_sessoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participantes veem sessoes de treino" ON public.treino_sessoes;
CREATE POLICY "Participantes veem sessoes de treino"
ON public.treino_sessoes
FOR SELECT
TO authenticated
USING (
  profile_id = auth.uid()
  OR personal_id = auth.uid()
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Aluno cria sua propria sessao de treino" ON public.treino_sessoes;
CREATE POLICY "Aluno cria sua propria sessao de treino"
ON public.treino_sessoes
FOR INSERT
TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.treinos_semanais treino
    WHERE treino.id = treino_semanal_id
      AND treino.profile_id = auth.uid()
      AND treino.personal_id = treino_sessoes.personal_id
  )
);

DROP POLICY IF EXISTS "Aluno atualiza sua propria sessao de treino" ON public.treino_sessoes;
CREATE POLICY "Aluno atualiza sua propria sessao de treino"
ON public.treino_sessoes
FOR UPDATE
TO authenticated
USING (
  profile_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.treinos_semanais treino
    WHERE treino.id = treino_semanal_id
      AND treino.profile_id = auth.uid()
      AND treino.personal_id = treino_sessoes.personal_id
  )
)
WITH CHECK (
  profile_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.treinos_semanais treino
    WHERE treino.id = treino_semanal_id
      AND treino.profile_id = auth.uid()
      AND treino.personal_id = treino_sessoes.personal_id
  )
);

DROP POLICY IF EXISTS "Admin gerencia sessoes de treino" ON public.treino_sessoes;
CREATE POLICY "Admin gerencia sessoes de treino"
ON public.treino_sessoes
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
