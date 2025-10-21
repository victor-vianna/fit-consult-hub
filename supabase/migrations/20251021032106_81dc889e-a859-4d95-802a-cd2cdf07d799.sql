-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela para treinos semanais (calendário)
CREATE TABLE public.treinos_semanais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  personal_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  semana DATE NOT NULL,
  concluido BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.treinos_semanais ENABLE ROW LEVEL SECURITY;

-- Políticas para alunos
CREATE POLICY "Aluno vê próprios treinos"
ON public.treinos_semanais
FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "Aluno atualiza próprios treinos"
ON public.treinos_semanais
FOR UPDATE
USING (profile_id = auth.uid());

-- Políticas para personal
CREATE POLICY "Personal vê treinos de seus alunos"
ON public.treinos_semanais
FOR SELECT
USING (is_personal(auth.uid()) AND personal_id = auth.uid());

CREATE POLICY "Personal cria treinos para seus alunos"
ON public.treinos_semanais
FOR INSERT
WITH CHECK (is_personal(auth.uid()) AND personal_id = auth.uid());

CREATE POLICY "Personal atualiza treinos de seus alunos"
ON public.treinos_semanais
FOR UPDATE
USING (is_personal(auth.uid()) AND personal_id = auth.uid());

CREATE POLICY "Personal deleta treinos de seus alunos"
ON public.treinos_semanais
FOR DELETE
USING (is_personal(auth.uid()) AND personal_id = auth.uid());

-- Políticas para admin
CREATE POLICY "Admin vê todos treinos"
ON public.treinos_semanais
FOR SELECT
USING (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_treinos_semanais_updated_at
BEFORE UPDATE ON public.treinos_semanais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_treinos_semanais_profile_id ON public.treinos_semanais(profile_id);
CREATE INDEX idx_treinos_semanais_personal_id ON public.treinos_semanais(personal_id);
CREATE INDEX idx_treinos_semanais_semana ON public.treinos_semanais(semana);