
-- 1. Data da foto (independente do created_at)
ALTER TABLE public.fotos_evolucao 
ADD COLUMN IF NOT EXISTS data_foto DATE;

-- 2. Campos de flexibilidade na avaliacao
ALTER TABLE public.avaliacoes_fisicas 
ADD COLUMN IF NOT EXISTS flexibilidade_sentar_alcancar NUMERIC,
ADD COLUMN IF NOT EXISTS flexibilidade_ombro TEXT,
ADD COLUMN IF NOT EXISTS flexibilidade_quadril TEXT,
ADD COLUMN IF NOT EXISTS flexibilidade_tornozelo TEXT;

-- 3. Campos posturais
ALTER TABLE public.avaliacoes_fisicas 
ADD COLUMN IF NOT EXISTS postural_observacoes TEXT,
ADD COLUMN IF NOT EXISTS postural_desvios JSONB;

-- 4. Campos de triagem
ALTER TABLE public.avaliacoes_fisicas 
ADD COLUMN IF NOT EXISTS triagem_parq JSONB,
ADD COLUMN IF NOT EXISTS triagem_historico_lesoes TEXT,
ADD COLUMN IF NOT EXISTS triagem_restricoes TEXT,
ADD COLUMN IF NOT EXISTS triagem_liberacao_medica BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS triagem_observacoes TEXT;

-- 5. Permitir fotos independentes de avaliacao (tornar avaliacao_id nullable)
ALTER TABLE public.fotos_evolucao 
ALTER COLUMN avaliacao_id DROP NOT NULL;

-- 6. RLS para update de fotos (editar data)
CREATE POLICY "Personais podem atualizar fotos" ON public.fotos_evolucao
FOR UPDATE USING (personal_id = auth.uid());
