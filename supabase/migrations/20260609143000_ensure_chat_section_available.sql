ALTER TABLE public.personal_settings
  ALTER COLUMN cards_visiveis SET DEFAULT
    '["treinos","chat","avaliacao","historico","materiais","plano","biblioteca"]'::jsonb;

UPDATE public.personal_settings
SET cards_visiveis =
  '["treinos","chat","avaliacao","historico","materiais","plano","biblioteca"]'::jsonb
WHERE cards_visiveis IS NULL
  OR jsonb_typeof(cards_visiveis) <> 'array';

UPDATE public.personal_settings
SET cards_visiveis = cards_visiveis || '["chat"]'::jsonb
WHERE jsonb_typeof(cards_visiveis) = 'array'
  AND NOT (cards_visiveis ? 'chat');

NOTIFY pgrst, 'reload schema';
