ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS aluno_card_color text;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_aluno_card_color_hex_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_aluno_card_color_hex_check
CHECK (
  aluno_card_color IS NULL
  OR aluno_card_color ~ '^#[0-9A-Fa-f]{6}$'
);
