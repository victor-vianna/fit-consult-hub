DROP FUNCTION IF EXISTS public.record_manual_subscription_payment(
  uuid, uuid, public.plano_tipo, numeric, date, text, text, integer, text
);

DROP INDEX IF EXISTS public.idx_payment_history_idempotency_key;

ALTER TABLE public.payment_history
  DROP COLUMN IF EXISTS idempotency_key;

NOTIFY pgrst, 'reload schema';
