-- Archiving is an organizational/human decision and no longer participates in
-- financial access. Restore only legacy archives whose latest manual command
-- explicitly says they were created for delinquency; unrelated archives stay
-- untouched.

WITH candidates AS (
  SELECT
    p.id AS student_id,
    p.personal_id,
    p.archived_at AS previous_archived_at
  FROM public.profiles p
  JOIN LATERAL (
    SELECT e.reason_code
    FROM public.student_access_events e
    WHERE e.student_id = p.id
      AND e.source = 'manual'
      AND e.event_type IN ('manual_pause', 'manual_suspend', 'manual_release')
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT 1
  ) latest_manual ON true
  WHERE p.archived_at IS NOT NULL
    AND latest_manual.reason_code = 'inadimplencia'
), restored AS (
  UPDATE public.profiles p
  SET archived_at = NULL,
      updated_at = transaction_timestamp()
  FROM candidates c
  WHERE p.id = c.student_id
  RETURNING p.id, p.personal_id, c.previous_archived_at
)
INSERT INTO public.student_access_events (
  student_id,
  personal_id,
  actor_id,
  source,
  event_type,
  effect,
  priority,
  reason_code,
  observation,
  metadata
)
SELECT
  r.id,
  r.personal_id,
  NULL,
  'system',
  'legacy_delinquency_archive_removed',
  'neutral',
  0,
  'legacy_delinquency_archive_removed',
  'Arquivamento legado por inadimplencia removido; acesso passa a seguir somente a regra financeira.',
  jsonb_build_object(
    'migration', '20260918124100',
    'previous_archived_at', r.previous_archived_at
  )
FROM restored r;

NOTIFY pgrst, 'reload schema';
