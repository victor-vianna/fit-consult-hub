-- Criar tabela de exercícios
CREATE TABLE public.exercicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treino_semanal_id uuid REFERENCES public.treinos_semanais(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  link_video text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.exercicios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para alunos (visualização dos próprios exercícios)
CREATE POLICY "Aluno vê próprios exercícios"
ON public.exercicios
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.treinos_semanais ts
    WHERE ts.id = exercicios.treino_semanal_id
    AND ts.profile_id = auth.uid()
  )
);

-- Políticas RLS para personal (CRUD dos exercícios de seus alunos)
CREATE POLICY "Personal cria exercícios para seus alunos"
ON public.exercicios
FOR INSERT
WITH CHECK (
  is_personal(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.treinos_semanais ts
    WHERE ts.id = exercicios.treino_semanal_id
    AND ts.personal_id = auth.uid()
  )
);

CREATE POLICY "Personal atualiza exercícios de seus alunos"
ON public.exercicios
FOR UPDATE
USING (
  is_personal(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.treinos_semanais ts
    WHERE ts.id = exercicios.treino_semanal_id
    AND ts.personal_id = auth.uid()
  )
);

CREATE POLICY "Personal deleta exercícios de seus alunos"
ON public.exercicios
FOR DELETE
USING (
  is_personal(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.treinos_semanais ts
    WHERE ts.id = exercicios.treino_semanal_id
    AND ts.personal_id = auth.uid()
  )
);

-- Política RLS para admin (acesso total)
CREATE POLICY "Admin vê todos exercícios"
ON public.exercicios
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admin gerencia todos exercícios"
ON public.exercicios
FOR ALL
USING (is_admin(auth.uid()));

-- Criar índice para melhor performance
CREATE INDEX idx_exercicios_treino_semanal ON public.exercicios(treino_semanal_id);
CREATE INDEX idx_exercicios_ordem ON public.exercicios(ordem);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_exercicios_updated_at
BEFORE UPDATE ON public.exercicios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();