-- Expected result after 20260928130000_rls_access_policy_initplan.sql: zero rows.
-- Scalar InitPlan wrappers are stripped first; any remaining guard call is a
-- per-row expression that still needs migration.
WITH policy_expressions AS (
  SELECT
    p.schemaname,
    p.tablename,
    p.policyname,
    expression_kind,
    expression
  FROM pg_policies p
  CROSS JOIN LATERAL (
    VALUES
      ('USING', p.qual),
      ('WITH CHECK', p.with_check)
  ) AS expressions(expression_kind, expression)
  WHERE expression IS NOT NULL
    AND expression ~* '(public\.)?enforce_current_user_platform_access\(\)'
), without_initplans AS (
  SELECT
    *,
    regexp_replace(
      expression,
      '\([[:space:]]*SELECT[[:space:]]+(public\.)?enforce_current_user_platform_access\(\)([[:space:]]+AS[[:space:]]+[a-zA-Z_][a-zA-Z0-9_]*)?[[:space:]]*\)',
      '',
      'gi'
    ) AS remaining_expression
  FROM policy_expressions
)
SELECT
  schemaname,
  tablename,
  policyname,
  expression_kind,
  expression
FROM without_initplans
WHERE remaining_expression ~* '(public\.)?enforce_current_user_platform_access\(\)'
ORDER BY schemaname, tablename, policyname, expression_kind;
