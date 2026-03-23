
-- Create folder table for block templates
CREATE TABLE public.bloco_template_pastas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#3b82f6',
  ordem INTEGER DEFAULT 0,
  parent_id UUID REFERENCES public.bloco_template_pastas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bloco_template_pastas ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Personal pode gerenciar suas pastas de templates"
  ON public.bloco_template_pastas
  FOR ALL
  TO public
  USING (personal_id = auth.uid())
  WITH CHECK (personal_id = auth.uid());

-- Add pasta_id to bloco_templates
ALTER TABLE public.bloco_templates
  ADD COLUMN pasta_id UUID REFERENCES public.bloco_template_pastas(id) ON DELETE SET NULL;

-- Updated_at trigger
CREATE TRIGGER update_bloco_template_pastas_updated_at
  BEFORE UPDATE ON public.bloco_template_pastas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
