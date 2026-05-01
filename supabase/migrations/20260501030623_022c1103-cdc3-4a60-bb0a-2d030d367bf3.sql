ALTER TABLE public.student_access_logs
  ADD COLUMN IF NOT EXISTS motivo text,
  ADD COLUMN IF NOT EXISTS mensagem_aluno text,
  ADD COLUMN IF NOT EXISTS observacao_personal text;