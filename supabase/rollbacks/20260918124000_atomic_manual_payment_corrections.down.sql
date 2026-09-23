DROP FUNCTION IF EXISTS public.correct_manual_subscription_payment(
  uuid, public.plano_tipo, numeric, date, date, text, text
);

NOTIFY pgrst, 'reload schema';
