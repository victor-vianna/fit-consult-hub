-- Adicionar coluna peso_executado à tabela exercicios
ALTER TABLE exercicios
ADD COLUMN IF NOT EXISTS peso_executado VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN exercicios.peso_executado IS 
'Peso real executado pelo aluno (pode diferir do peso recomendado em carga)';