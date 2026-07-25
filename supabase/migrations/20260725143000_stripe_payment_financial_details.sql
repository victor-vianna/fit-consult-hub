ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_balance_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_type TEXT,
  ADD COLUMN IF NOT EXISTS stripe_processing_fee_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS stripe_net_amount NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_charge
  ON public.payment_history(stripe_charge_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_payment_method_type
  ON public.payment_history(stripe_payment_method_type);

CREATE INDEX IF NOT EXISTS idx_payment_history_platform_invoice
  ON public.payment_history(stripe_invoice_id)
  WHERE stripe_account_id IS NULL AND stripe_invoice_id IS NOT NULL;
