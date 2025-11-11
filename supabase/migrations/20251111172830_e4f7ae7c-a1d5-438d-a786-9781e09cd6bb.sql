-- Criar tabela para controle de semana ativa por aluno
CREATE TABLE IF NOT EXISTS treino_semana_ativa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  personal_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  semana_inicio DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, personal_id)
);

-- Habilitar RLS
ALTER TABLE treino_semana_ativa ENABLE ROW LEVEL SECURITY;

-- Personal pode gerenciar semanas ativas de seus alunos
CREATE POLICY "Personal gerencia semanas ativas de seus alunos"
ON treino_semana_ativa
FOR ALL
TO authenticated
USING (personal_id = auth.uid())
WITH CHECK (personal_id = auth.uid());

-- Aluno pode ver sua semana ativa
CREATE POLICY "Aluno vê sua semana ativa"
ON treino_semana_ativa
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Admin pode ver todas semanas ativas
CREATE POLICY "Admin vê todas semanas ativas"
ON treino_semana_ativa
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_treino_semana_ativa_updated_at
  BEFORE UPDATE ON treino_semana_ativa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();