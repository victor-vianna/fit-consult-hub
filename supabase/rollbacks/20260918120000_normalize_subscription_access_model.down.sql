-- Rollback for 20260918120000_normalize_subscription_access_model.sql.
-- Run only after deploying an earlier application version. New audit data will be lost.

DROP TRIGGER IF EXISTS trg_student_access_audit_immutable
  ON public.student_access_audit;
DROP TRIGGER IF EXISTS trg_subscription_financial_events_immutable
  ON public.subscription_financial_events;
DROP TABLE IF EXISTS public.student_access_audit;
DROP TABLE IF EXISTS public.subscription_financial_events;
DROP FUNCTION IF EXISTS public.prevent_immutable_audit_mutation();

DROP INDEX IF EXISTS public.idx_stripe_webhook_events_replay;
ALTER TABLE public.stripe_webhook_events
  DROP COLUMN IF EXISTS outcome,
  DROP COLUMN IF EXISTS processing_completed_at,
  DROP COLUMN IF EXISTS processing_started_at,
  DROP COLUMN IF EXISTS request_id,
  DROP COLUMN IF EXISTS stripe_api_version,
  DROP COLUMN IF EXISTS payload_sha256,
  DROP COLUMN IF EXISTS payload,
  DROP COLUMN IF EXISTS event_created_at;

DROP INDEX IF EXISTS public.idx_subscriptions_provider_event_order;
DROP INDEX IF EXISTS public.idx_subscriptions_student_personal_access;
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_access_revocation_reason_check,
  DROP COLUMN IF EXISTS provider_state_updated_at,
  DROP COLUMN IF EXISTS last_provider_event_id,
  DROP COLUMN IF EXISTS last_provider_event_created_at,
  DROP COLUMN IF EXISTS access_revoked_event_id,
  DROP COLUMN IF EXISTS access_revoked_reason,
  DROP COLUMN IF EXISTS access_revoked_at;

DROP TRIGGER IF EXISTS trg_profiles_payment_control_enabled_at
  ON public.profiles;
DROP TRIGGER IF EXISTS trg_personal_settings_payment_control_enabled_at
  ON public.personal_settings;
DROP FUNCTION IF EXISTS public.stamp_payment_control_enabled_at();

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS payment_control_enabled_at;
ALTER TABLE public.personal_settings
  DROP COLUMN IF EXISTS payment_control_enabled_at;

NOTIFY pgrst, 'reload schema';
