-- Criar tabela para templates de blocos de treino
CREATE TABLE public.bloco_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  posicao TEXT NOT NULL DEFAULT 'fim',
  duracao_estimada_minutos INTEGER,
  descricao TEXT,
  config_cardio JSONB,
  config_alongamento JSONB,
  config_aquecimento JSONB,
  config_outro JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.bloco_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Personal pode gerenciar seus templates
CREATE POLICY "Personal pode gerenciar seus templates" 
ON public.bloco_templates 
FOR ALL 
USING (personal_id = auth.uid())
WITH CHECK (personal_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER update_bloco_templates_updated_at
BEFORE UPDATE ON public.bloco_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();