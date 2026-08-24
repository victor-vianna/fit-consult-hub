CREATE TABLE IF NOT EXISTS public.feedback_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('weekly_feedback', 'workout_feedback')),
  source_id text NOT NULL,
  feedback_item_type text NOT NULL DEFAULT 'general',
  feedback_item_label text NOT NULL DEFAULT 'Feedback geral',
  feedback_original_preview text NOT NULL DEFAULT '',
  remetente_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mensagem text NOT NULL,
  parent_id uuid REFERENCES public.feedback_respostas(id) ON DELETE SET NULL,
  lida_por_aluno boolean NOT NULL DEFAULT false,
  lida_por_personal boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_respostas_context
ON public.feedback_respostas (source_type, source_id, feedback_item_type, created_at);

CREATE INDEX IF NOT EXISTS idx_feedback_respostas_aluno_unread
ON public.feedback_respostas (aluno_id, lida_por_aluno, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_respostas_personal_unread
ON public.feedback_respostas (personal_id, lida_por_personal, created_at DESC);

ALTER TABLE public.feedback_respostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participantes veem respostas de feedback" ON public.feedback_respostas;
CREATE POLICY "Participantes veem respostas de feedback"
ON public.feedback_respostas
FOR SELECT
TO authenticated
USING (
  auth.uid() = personal_id
  OR auth.uid() = aluno_id
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Participantes criam respostas de feedback" ON public.feedback_respostas;
CREATE POLICY "Participantes criam respostas de feedback"
ON public.feedback_respostas
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = remetente_id
  AND remetente_id IN (personal_id, aluno_id)
  AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.profiles aluno
      WHERE aluno.id = aluno_id
        AND aluno.personal_id = personal_id
    )
  )
);

DROP POLICY IF EXISTS "Participantes atualizam leitura de respostas" ON public.feedback_respostas;
CREATE POLICY "Participantes atualizam leitura de respostas"
ON public.feedback_respostas
FOR UPDATE
TO authenticated
USING (
  auth.uid() = personal_id
  OR auth.uid() = aluno_id
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = personal_id
  OR auth.uid() = aluno_id
  OR public.is_admin(auth.uid())
);
