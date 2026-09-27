-- Keep payment facts independent from the rule that currently allows or blocks
-- access. A valid payment must remain visible when payment control is disabled
-- or when a manual suspension has higher access priority.

DO $$
BEGIN
  IF to_regprocedure(
    'public.calculate_student_access_decision_base_20260927(uuid,timestamp with time zone)'
  ) IS NULL
    AND to_regprocedure(
      'public.calculate_student_access_decision(uuid,timestamp with time zone)'
    ) IS NOT NULL
  THEN
    ALTER FUNCTION public.calculate_student_access_decision(uuid, timestamptz)
      RENAME TO calculate_student_access_decision_base_20260927;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_student_access_decision(
  _student_id uuid,
  _at timestamptz DEFAULT statement_timestamp()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision jsonb;
  v_personal_id uuid;
  v_active_subscription_id uuid;
BEGIN
  v_decision := public.calculate_student_access_decision_base_20260927(
    _student_id,
    _at
  );
  v_personal_id := nullif(v_decision ->> 'personal_id', '')::uuid;

  SELECT s.id
  INTO v_active_subscription_id
  FROM public.subscriptions s
  WHERE s.student_id = _student_id
    AND s.personal_id = v_personal_id
    AND s.status_pagamento IN ('pago', 'cancelado', 'canceled')
    AND s.access_revoked_at IS NULL
    AND s.data_expiracao + interval '24 hours' > _at
  ORDER BY
    coalesce(s.data_pagamento, s.created_at) DESC NULLS LAST,
    s.data_expiracao DESC,
    s.id DESC
  LIMIT 1;

  v_decision := jsonb_set(
    v_decision,
    '{has_active_payment}',
    to_jsonb(v_active_subscription_id IS NOT NULL),
    true
  );

  IF v_active_subscription_id IS NOT NULL THEN
    v_decision := jsonb_set(
      v_decision,
      '{active_subscription_id}',
      to_jsonb(v_active_subscription_id),
      true
    );
  END IF;

  RETURN v_decision;
END;
$$;

COMMENT ON FUNCTION public.calculate_student_access_decision(uuid, timestamptz) IS
  'Central access decision enriched with payment state independent from access source.';

REVOKE ALL ON FUNCTION public.calculate_student_access_decision_base_20260927(
  uuid, timestamptz
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calculate_student_access_decision(
  uuid, timestamptz
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_student_access_decision(
  uuid, timestamptz
) TO authenticated;

NOTIFY pgrst, 'reload schema';
