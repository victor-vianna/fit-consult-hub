CREATE TABLE IF NOT EXISTS public.subscription_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  personal_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (
    action IN (
      'cancel_at_period_end',
      'resume_renewal',
      'cancel_now',
      'change_plan',
      'customer_portal'
    )
  ),
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'failed')),
  motivo TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_actions_subscription
  ON public.subscription_actions(subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_actions_personal
  ON public.subscription_actions(personal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_actions_student
  ON public.subscription_actions(student_id, created_at DESC);

ALTER TABLE public.subscription_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal reads own subscription actions" ON public.subscription_actions;
CREATE POLICY "Personal reads own subscription actions"
ON public.subscription_actions
FOR SELECT
TO authenticated
USING (personal_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage subscription actions" ON public.subscription_actions;
CREATE POLICY "Admins manage subscription actions"
ON public.subscription_actions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
