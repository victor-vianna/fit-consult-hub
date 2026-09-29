-- Make student notification deduplication authoritative in PostgreSQL.
-- Existing duplicate groups are collapsed before the unique constraint is added.

ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE OR REPLACE FUNCTION public.sync_notification_dedupe_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.dedupe_key := NULLIF(
    BTRIM(COALESCE(NEW.dedupe_key, NEW.dados ->> 'dedupe_key')),
    ''
  );

  IF NEW.dedupe_key IS NOT NULL THEN
    NEW.dados := jsonb_set(
      COALESCE(NEW.dados, '{}'::jsonb),
      '{dedupe_key}',
      to_jsonb(NEW.dedupe_key),
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_notification_dedupe_key
  ON public.notificacoes;
CREATE TRIGGER trg_sync_notification_dedupe_key
BEFORE INSERT OR UPDATE OF dados, dedupe_key
ON public.notificacoes
FOR EACH ROW
EXECUTE FUNCTION public.sync_notification_dedupe_key();

UPDATE public.notificacoes
SET dedupe_key = NULLIF(BTRIM(dados ->> 'dedupe_key'), '')
WHERE dedupe_key IS NULL
  AND NULLIF(BTRIM(dados ->> 'dedupe_key'), '') IS NOT NULL;

-- Keep the first notification as the canonical event. It remains unread if at
-- least one copy was unread, so consolidation never hides pending information.
WITH canonical AS (
  SELECT
    destinatario_id,
    tipo,
    dedupe_key,
    (ARRAY_AGG(id ORDER BY created_at ASC NULLS LAST, id ASC))[1] AS keep_id,
    BOOL_AND(COALESCE(lida, false)) AS all_read
  FROM public.notificacoes
  WHERE destinatario_id IS NOT NULL
    AND dedupe_key IS NOT NULL
  GROUP BY destinatario_id, tipo, dedupe_key
  HAVING COUNT(*) > 1
)
UPDATE public.notificacoes AS notification
SET lida = canonical.all_read
FROM canonical
WHERE notification.id = canonical.keep_id
  AND notification.lida IS DISTINCT FROM canonical.all_read;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY destinatario_id, tipo, dedupe_key
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS duplicate_number
  FROM public.notificacoes
  WHERE destinatario_id IS NOT NULL
    AND dedupe_key IS NOT NULL
)
DELETE FROM public.notificacoes AS notification
USING ranked
WHERE notification.id = ranked.id
  AND ranked.duplicate_number > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notificacoes_recipient_type_dedupe_key_key'
      AND conrelid = 'public.notificacoes'::regclass
  ) THEN
    ALTER TABLE public.notificacoes
      ADD CONSTRAINT notificacoes_recipient_type_dedupe_key_key
      UNIQUE (destinatario_id, tipo, dedupe_key);
  END IF;
END;
$$;

COMMENT ON COLUMN public.notificacoes.dedupe_key IS
  'Stable event key used to make notification creation idempotent.';
