-- Keep the provider origin attached to each payment row. A subscription can be
-- linked to Stripe and still receive an external/manual payment, so subscription
-- identifiers must never be used to charge Stripe fees on that payment.

ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS payment_origin text;

CREATE OR REPLACE FUNCTION public.classify_payment_history_origin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_method text := lower(btrim(coalesce(NEW.metodo_pagamento, '')));
  v_has_stripe_evidence boolean;
BEGIN
  v_has_stripe_evidence :=
    nullif(NEW.stripe_account_id, '') IS NOT NULL
    OR nullif(NEW.stripe_invoice_id, '') IS NOT NULL
    OR nullif(NEW.stripe_payment_intent_id, '') IS NOT NULL
    OR nullif(NEW.stripe_charge_id, '') IS NOT NULL
    OR nullif(NEW.stripe_balance_transaction_id, '') IS NOT NULL
    OR nullif(NEW.stripe_application_fee_id, '') IS NOT NULL
    OR NEW.stripe_application_fee_amount IS NOT NULL
    OR nullif(NEW.stripe_payment_method_type, '') IS NOT NULL
    OR NEW.stripe_processing_fee_amount IS NOT NULL
    OR NEW.stripe_net_amount IS NOT NULL
    OR v_method IN ('stripe', 'connect', 'stripe_connect')
    OR left(v_method, 7) = 'stripe_';

  NEW.payment_origin := CASE
    WHEN v_has_stripe_evidence THEN 'stripe'
    ELSE 'manual'
  END;

  IF nullif(btrim(NEW.metodo_pagamento), '') IS NULL THEN
    NEW.metodo_pagamento := CASE
      WHEN NEW.payment_origin = 'stripe'
        AND nullif(btrim(NEW.stripe_payment_method_type), '') IS NOT NULL
        THEN 'stripe_' || lower(btrim(NEW.stripe_payment_method_type))
      WHEN NEW.payment_origin = 'stripe' THEN 'stripe'
      ELSE 'nao_informado'
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_classify_payment_history_origin
  ON public.payment_history;
CREATE TRIGGER trg_classify_payment_history_origin
BEFORE INSERT OR UPDATE ON public.payment_history
FOR EACH ROW
EXECUTE FUNCTION public.classify_payment_history_origin();

-- Normalize historical rows using evidence stored in the payment itself. This
-- deliberately does not inspect subscriptions, avoiding false Stripe fees on a
-- manual receipt associated with a Stripe-linked student.
UPDATE public.payment_history
SET payment_origin = payment_origin;

ALTER TABLE public.payment_history
  ALTER COLUMN payment_origin SET DEFAULT 'manual',
  ALTER COLUMN payment_origin SET NOT NULL,
  ALTER COLUMN metodo_pagamento SET NOT NULL;

ALTER TABLE public.payment_history
  DROP CONSTRAINT IF EXISTS payment_history_payment_origin_check;
ALTER TABLE public.payment_history
  ADD CONSTRAINT payment_history_payment_origin_check
  CHECK (payment_origin IN ('stripe', 'manual'));

COMMENT ON COLUMN public.payment_history.payment_origin IS
  'Origin of this payment row. Manual payments have no Stripe/platform fees.';

NOTIFY pgrst, 'reload schema';
