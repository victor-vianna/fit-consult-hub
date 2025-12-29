-- Tabela para gerenciar planilhas de treino com duração
CREATE TABLE public.planilhas_treino (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  personal_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Planilha de Treino',
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  duracao_semanas INTEGER NOT NULL DEFAULT 4,
  data_prevista_fim DATE GENERATED ALWAYS AS (data_inicio + (duracao_semanas * 7)) STORED,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'encerrada', 'renovada')),
  lembrete_enviado_7dias BOOLEAN DEFAULT FALSE,
  lembrete_enviado_3dias BOOLEAN DEFAULT FALSE,
  lembrete_enviado_expirou BOOLEAN DEFAULT FALSE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_planilhas_treino_profile ON planilhas_treino(profile_id);
CREATE INDEX idx_planilhas_treino_personal ON planilhas_treino(personal_id);
CREATE INDEX idx_planilhas_treino_status ON planilhas_treino(status);
CREATE INDEX idx_planilhas_treino_data_fim ON planilhas_treino(data_prevista_fim);

-- Enable RLS
ALTER TABLE public.planilhas_treino ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Personal pode gerenciar planilhas de seus alunos"
ON public.planilhas_treino
FOR ALL
USING (personal_id = auth.uid())
WITH CHECK (personal_id = auth.uid());

CREATE POLICY "Aluno pode ver suas planilhas"
ON public.planilhas_treino
FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "Admin pode ver todas planilhas"
ON public.planilhas_treino
FOR SELECT
USING (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_planilhas_treino_updated_at
BEFORE UPDATE ON public.planilhas_treino
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();