-- Operational monitoring fields for admin support.

DO $$
BEGIN
  IF to_regclass('public.stripe_webhook_events') IS NOT NULL THEN
    ALTER TABLE public.stripe_webhook_events
      ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'processed',
      ADD COLUMN IF NOT EXISTS error_message text,
      ADD COLUMN IF NOT EXISTS processing_attempts integer NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS last_error_at timestamptz;

    CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
      ON public.stripe_webhook_events(processing_status, last_error_at DESC);
  END IF;
END;
$$;
