
-- Enum para os 4 planos (caso ainda não exista)
DO $$ BEGIN
  CREATE TYPE public.plano_tipo AS ENUM ('mensal', 'trimestral', 'semestral', 'anual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tabela personal_plan_prices
CREATE TABLE IF NOT EXISTS public.personal_plan_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plano public.plano_tipo NOT NULL,
  valor NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (personal_id, plano)
);

CREATE INDEX IF NOT EXISTS idx_personal_plan_prices_personal ON public.personal_plan_prices(personal_id);

ALTER TABLE public.personal_plan_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal manages own prices" ON public.personal_plan_prices;
CREATE POLICY "Personal manages own prices"
ON public.personal_plan_prices
FOR ALL
TO authenticated
USING (personal_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (personal_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Aluno reads prices of own personal" ON public.personal_plan_prices;
CREATE POLICY "Aluno reads prices of own personal"
ON public.personal_plan_prices
FOR SELECT
TO authenticated
USING (
  ativo = true
  AND personal_id = public.get_user_personal_id()
);

CREATE TRIGGER update_personal_plan_prices_updated_at
BEFORE UPDATE ON public.personal_plan_prices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campos extras em subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancela_no_fim_do_ciclo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);

-- Campos extras em payment_history
ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_invoice ON public.payment_history(stripe_invoice_id);
