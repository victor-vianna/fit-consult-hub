-- Rollback for 20260918123000_atomic_stripe_webhook_processing.sql.

DROP FUNCTION IF EXISTS public.apply_stripe_webhook_event(
  text, text, timestamptz, text, boolean, text, jsonb, text, text, jsonb
);
DROP FUNCTION IF EXISTS public.upsert_stripe_subscription_command(
  jsonb, text, timestamptz, integer, text
);

ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS last_provider_event_priority;

NOTIFY pgrst, 'reload schema';
