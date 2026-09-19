-- Rollback for 20260918121000_centralize_student_access_decision.sql.

DROP TRIGGER IF EXISTS trg_subscription_access_event ON public.subscriptions;

DROP FUNCTION IF EXISTS public.get_student_access_state(uuid);
DROP FUNCTION IF EXISTS public.get_students_access_states(uuid);
DROP FUNCTION IF EXISTS public.register_student_access_event(uuid, text, text, text, text, timestamptz);
DROP FUNCTION IF EXISTS public.pode_acessar_plataforma(uuid);
DROP FUNCTION IF EXISTS public.handle_subscription_access_event();
DROP FUNCTION IF EXISTS public.recalculate_student_access(uuid);
DROP FUNCTION IF EXISTS public.calculate_student_access_decision(uuid, timestamptz);

DO $$
BEGIN
  IF to_regprocedure('public.recalculate_student_access_legacy_20260918(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.recalculate_student_access_legacy_20260918(uuid)
      RENAME TO recalculate_student_access;
  END IF;
  IF to_regprocedure('public.get_student_access_state_legacy_20260918(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.get_student_access_state_legacy_20260918(uuid)
      RENAME TO get_student_access_state;
  END IF;
  IF to_regprocedure('public.get_students_access_states_legacy_20260918(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.get_students_access_states_legacy_20260918(uuid)
      RENAME TO get_students_access_states;
  END IF;
  IF to_regprocedure('public.register_student_access_event_legacy_20260918(uuid,text,text,text,text,timestamp with time zone)') IS NOT NULL THEN
    ALTER FUNCTION public.register_student_access_event_legacy_20260918(uuid, text, text, text, text, timestamptz)
      RENAME TO register_student_access_event;
  END IF;
  IF to_regprocedure('public.pode_acessar_plataforma_legacy_20260918(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.pode_acessar_plataforma_legacy_20260918(uuid)
      RENAME TO pode_acessar_plataforma;
  END IF;
  IF to_regprocedure('public.handle_subscription_access_event_legacy_20260918()') IS NOT NULL THEN
    ALTER FUNCTION public.handle_subscription_access_event_legacy_20260918()
      RENAME TO handle_subscription_access_event;
  END IF;
END;
$$;

CREATE TRIGGER trg_subscription_access_event
AFTER INSERT OR UPDATE OF status_pagamento, data_expiracao OR DELETE
ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_subscription_access_event();

ALTER TABLE public.student_access_events
  DROP CONSTRAINT IF EXISTS student_access_manual_release_must_expire;

ALTER TABLE public.student_access_state
  DROP COLUMN IF EXISTS decision,
  DROP COLUMN IF EXISTS plans_path,
  DROP COLUMN IF EXISTS grace_ends_at,
  DROP COLUMN IF EXISTS expires_at;

NOTIFY pgrst, 'reload schema';
