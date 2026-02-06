-- Adicionar campos de configuração aos blocos de modelo de treino
-- para manter as especificações completas (ex: Esteira 20min, 10km/h, inclinação 2%)

ALTER TABLE treino_modelo_blocos 
ADD COLUMN IF NOT EXISTS descricao text,
ADD COLUMN IF NOT EXISTS config_cardio jsonb,
ADD COLUMN IF NOT EXISTS config_alongamento jsonb,
ADD COLUMN IF NOT EXISTS config_aquecimento jsonb,
ADD COLUMN IF NOT EXISTS config_outro jsonb;