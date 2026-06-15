CREATE TABLE IF NOT EXISTS public.personal_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'standard',
  country TEXT,
  default_currency TEXT,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  card_payments_active BOOLEAN NOT NULL DEFAULT false,
  transfers_active BOOLEAN NOT NULL DEFAULT false,
  requirements_currently_due TEXT[] NOT NULL DEFAULT '{}',
  requirements_past_due TEXT[] NOT NULL DEFAULT '{}',
  disabled_reason TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (personal_id),
  UNIQUE (stripe_account_id)
);

CREATE INDEX IF NOT EXISTS idx_personal_stripe_accounts_personal
  ON public.personal_stripe_accounts(personal_id);

CREATE INDEX IF NOT EXISTS idx_personal_stripe_accounts_stripe_account
  ON public.personal_stripe_accounts(stripe_account_id);

ALTER TABLE public.personal_stripe_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal reads own Stripe account" ON public.personal_stripe_accounts;
CREATE POLICY "Personal reads own Stripe account"
ON public.personal_stripe_accounts
FOR SELECT
TO authenticated
USING (personal_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage Stripe accounts" ON public.personal_stripe_accounts;
CREATE POLICY "Admins manage Stripe accounts"
ON public.personal_stripe_accounts
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_personal_stripe_accounts_updated_at ON public.personal_stripe_accounts;
CREATE TRIGGER update_personal_stripe_accounts_updated_at
BEFORE UPDATE ON public.personal_stripe_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.personal_plan_prices
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

CREATE INDEX IF NOT EXISTS idx_personal_plan_prices_stripe_account
  ON public.personal_plan_prices(stripe_account_id);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_account
  ON public.subscriptions(stripe_account_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_checkout_session
  ON public.subscriptions(stripe_checkout_session_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_account_sub_unique
  ON public.subscriptions(stripe_account_id, stripe_subscription_id)
  WHERE stripe_account_id IS NOT NULL AND stripe_subscription_id IS NOT NULL;

ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_application_fee_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_application_fee_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS stripe_currency TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_account
  ON public.payment_history(stripe_account_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_history_stripe_account_invoice_unique
  ON public.payment_history(stripe_account_id, stripe_invoice_id)
  WHERE stripe_account_id IS NOT NULL AND stripe_invoice_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  stripe_account_id TEXT,
  event_type TEXT NOT NULL,
  livemode BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_account
  ON public.stripe_webhook_events(stripe_account_id);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read Stripe webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Admins read Stripe webhook events"
ON public.stripe_webhook_events
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
