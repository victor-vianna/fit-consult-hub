-- Released before/after photo comparisons for the student area.
-- Stores only the chosen pair of dates; photos remain in fotos_evolucao.

CREATE TABLE IF NOT EXISTS public.foto_comparativos_liberados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  personal_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data_antes date NOT NULL,
  data_depois date NOT NULL,
  titulo text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT foto_comparativos_datas_ordem CHECK (data_antes <= data_depois),
  CONSTRAINT foto_comparativos_unico UNIQUE (profile_id, personal_id, data_antes, data_depois)
);

ALTER TABLE public.foto_comparativos_liberados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal gerencia comparativos de fotos" ON public.foto_comparativos_liberados;
CREATE POLICY "Personal gerencia comparativos de fotos"
ON public.foto_comparativos_liberados
FOR ALL
TO authenticated
USING (personal_id = auth.uid())
WITH CHECK (personal_id = auth.uid());

DROP POLICY IF EXISTS "Aluno ve comparativos liberados" ON public.foto_comparativos_liberados;
CREATE POLICY "Aluno ve comparativos liberados"
ON public.foto_comparativos_liberados
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_foto_comparativos_liberados_profile
  ON public.foto_comparativos_liberados(profile_id, created_at DESC);
