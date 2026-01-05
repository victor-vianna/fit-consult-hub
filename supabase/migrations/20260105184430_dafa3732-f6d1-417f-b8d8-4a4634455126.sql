-- Adicionar colunas para tracking de pausa e descanso na tabela treino_sessoes
ALTER TABLE public.treino_sessoes 
ADD COLUMN IF NOT EXISTS tempo_descanso_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pausado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tempo_pausado_total INTEGER DEFAULT 0;

-- Criar tabela para registrar descansos individuais
CREATE TABLE public.treino_descansos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID NOT NULL REFERENCES public.treino_sessoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('serie', 'exercicio')),
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim TIMESTAMPTZ,
  duracao_segundos INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.treino_descansos ENABLE ROW LEVEL SECURITY;

-- Policies para treino_descansos
CREATE POLICY "Alunos podem ver seus próprios descansos"
ON public.treino_descansos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.treino_sessoes ts
    WHERE ts.id = sessao_id AND ts.profile_id = auth.uid()
  )
);

CREATE POLICY "Alunos podem criar seus próprios descansos"
ON public.treino_descansos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.treino_sessoes ts
    WHERE ts.id = sessao_id AND ts.profile_id = auth.uid()
  )
);

CREATE POLICY "Alunos podem atualizar seus próprios descansos"
ON public.treino_descansos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.treino_sessoes ts
    WHERE ts.id = sessao_id AND ts.profile_id = auth.uid()
  )
);

CREATE POLICY "Personals podem ver descansos dos seus alunos"
ON public.treino_descansos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.treino_sessoes ts
    WHERE ts.id = sessao_id AND ts.personal_id = auth.uid()
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_treino_descansos_sessao_id ON public.treino_descansos(sessao_id);
CREATE INDEX IF NOT EXISTS idx_treino_sessoes_status ON public.treino_sessoes(status);
CREATE INDEX IF NOT EXISTS idx_treino_sessoes_profile_status ON public.treino_sessoes(profile_id, status);