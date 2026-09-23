WITH recovery_events AS (
  SELECT DISTINCT ON (e.student_id)
    e.id,
    e.student_id,
    nullif(e.metadata ->> 'previous_archived_at', '')::timestamptz AS previous_archived_at
  FROM public.student_access_events e
  WHERE e.source = 'system'
    AND e.event_type = 'legacy_delinquency_archive_removed'
    AND e.metadata ->> 'migration' = '20260918124100'
  ORDER BY e.student_id, e.created_at DESC, e.id DESC
)
UPDATE public.profiles p
SET archived_at = recovery_events.previous_archived_at,
    updated_at = transaction_timestamp()
FROM recovery_events
WHERE p.id = recovery_events.student_id
  AND p.archived_at IS NULL;

DELETE FROM public.student_access_events e
WHERE e.source = 'system'
  AND e.event_type = 'legacy_delinquency_archive_removed'
  AND e.metadata ->> 'migration' = '20260918124100';

NOTIFY pgrst, 'reload schema';
