-- 1. Duracao total no modelo
ALTER TABLE public.treino_modelos 
ADD COLUMN duracao_total_minutos INTEGER;

-- 2. Links multiplos por exercicio do modelo
ALTER TABLE public.treino_modelo_exercicios 
ADD COLUMN links_demonstracao JSONB;

-- 3. Tag para pastas (Masculino/Feminino/custom)
ALTER TABLE public.modelo_pastas 
ADD COLUMN tag TEXT;