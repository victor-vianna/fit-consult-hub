-- Criar tabela de pastas para modelos de treino
CREATE TABLE public.modelo_pastas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#3b82f6',
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar coluna pasta_id na tabela treino_modelos
ALTER TABLE public.treino_modelos 
ADD COLUMN pasta_id UUID REFERENCES public.modelo_pastas(id) ON DELETE SET NULL;

-- Habilitar RLS
ALTER TABLE public.modelo_pastas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pastas
CREATE POLICY "Personal pode gerenciar suas pastas"
ON public.modelo_pastas
FOR ALL
USING (personal_id = auth.uid())
WITH CHECK (personal_id = auth.uid());

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_modelo_pastas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_modelo_pastas_updated_at
BEFORE UPDATE ON public.modelo_pastas
FOR EACH ROW
EXECUTE FUNCTION public.update_modelo_pastas_updated_at();

-- Índice para performance
CREATE INDEX idx_modelo_pastas_personal_id ON public.modelo_pastas(personal_id);
CREATE INDEX idx_treino_modelos_pasta_id ON public.treino_modelos(pasta_id);