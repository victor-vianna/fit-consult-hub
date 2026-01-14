-- =============================================================
-- 1. MÚLTIPLOS TREINOS POR DIA - Adicionar campo nome_treino
-- =============================================================

-- Adicionar coluna nome_treino para identificar cada treino do dia
ALTER TABLE public.treinos_semanais 
ADD COLUMN IF NOT EXISTS nome_treino TEXT DEFAULT 'Treino Principal';

-- Adicionar coluna ordem_no_dia para ordenar múltiplos treinos do mesmo dia
ALTER TABLE public.treinos_semanais 
ADD COLUMN IF NOT EXISTS ordem_no_dia INTEGER DEFAULT 1;

-- Remover constraint única existente que impedia múltiplos treinos no mesmo dia
-- (se existir)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'treinos_semanais_profile_id_personal_id_semana_dia_semana_key'
  ) THEN
    ALTER TABLE public.treinos_semanais 
    DROP CONSTRAINT treinos_semanais_profile_id_personal_id_semana_dia_semana_key;
  END IF;
END $$;

-- Criar índice para buscas eficientes por dia
CREATE INDEX IF NOT EXISTS idx_treinos_semanais_dia 
ON public.treinos_semanais(profile_id, personal_id, semana, dia_semana);

-- =============================================================
-- 2. SUBPASTAS ILIMITADAS - Adicionar hierarquia nas pastas
-- =============================================================

-- Adicionar coluna parent_id para criar hierarquia de pastas
ALTER TABLE public.modelo_pastas 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.modelo_pastas(id) ON DELETE CASCADE;

-- Adicionar coluna nivel para facilitar consultas
ALTER TABLE public.modelo_pastas 
ADD COLUMN IF NOT EXISTS nivel INTEGER DEFAULT 0;

-- Adicionar coluna caminho para navegação (ex: "pasta1/pasta2/pasta3")
ALTER TABLE public.modelo_pastas 
ADD COLUMN IF NOT EXISTS caminho TEXT;

-- Índice para buscas hierárquicas
CREATE INDEX IF NOT EXISTS idx_modelo_pastas_parent 
ON public.modelo_pastas(parent_id);

CREATE INDEX IF NOT EXISTS idx_modelo_pastas_nivel 
ON public.modelo_pastas(personal_id, nivel);

-- =============================================================
-- 3. FUNÇÃO PARA ATUALIZAR CAMINHO DA PASTA
-- =============================================================

CREATE OR REPLACE FUNCTION public.atualizar_caminho_pasta()
RETURNS TRIGGER AS $$
DECLARE
  v_caminho_pai TEXT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.nivel := 0;
    NEW.caminho := NEW.nome;
  ELSE
    SELECT caminho, nivel INTO v_caminho_pai, NEW.nivel
    FROM modelo_pastas 
    WHERE id = NEW.parent_id;
    
    NEW.nivel := COALESCE(NEW.nivel, 0) + 1;
    NEW.caminho := COALESCE(v_caminho_pai, '') || '/' || NEW.nome;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar caminho automaticamente
DROP TRIGGER IF EXISTS trigger_atualizar_caminho_pasta ON public.modelo_pastas;
CREATE TRIGGER trigger_atualizar_caminho_pasta
BEFORE INSERT OR UPDATE OF nome, parent_id ON public.modelo_pastas
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_caminho_pasta();

-- =============================================================
-- 4. LOJA DO PERSONAL - Tabela para produtos
-- =============================================================

CREATE TABLE IF NOT EXISTS public.produtos_personal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'ebook', -- 'ebook', 'programa', 'desafio', 'plano', 'outro'
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  preco_promocional DECIMAL(10,2),
  imagem_url TEXT,
  arquivo_url TEXT,
  ativo BOOLEAN DEFAULT false,
  destaque BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para produtos
ALTER TABLE public.produtos_personal ENABLE ROW LEVEL SECURITY;

-- Personals podem ver e gerenciar seus produtos
CREATE POLICY "Personals podem gerenciar seus produtos"
ON public.produtos_personal
FOR ALL
USING (personal_id = auth.uid());

-- Alunos podem ver produtos ativos do seu personal
CREATE POLICY "Alunos podem ver produtos do personal"
ON public.produtos_personal
FOR SELECT
USING (
  ativo = true 
  AND personal_id IN (
    SELECT personal_id FROM profiles WHERE id = auth.uid()
  )
);

-- Índices para produtos
CREATE INDEX IF NOT EXISTS idx_produtos_personal_id 
ON public.produtos_personal(personal_id);

CREATE INDEX IF NOT EXISTS idx_produtos_ativo 
ON public.produtos_personal(personal_id, ativo);

-- Trigger para updated_at
CREATE TRIGGER update_produtos_personal_updated_at
BEFORE UPDATE ON public.produtos_personal
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();