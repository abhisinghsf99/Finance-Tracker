-- ============================================================================
-- LOCK DOWN PAGE_VISITS
-- ============================================================================
-- The visit log is owner-only telemetry, unlike the shared sandbox data.
-- Three layers:
--   1. execute_readonly_query (the AI chat's SQL tool, SECURITY DEFINER so it
--      bypasses RLS) now rejects any query that references page_visits.
--   2. The permissive RLS policy is dropped. RLS stays enabled with no
--      policies, which denies anon/authenticated; the service role used by
--      the middleware bypasses RLS and is unaffected.
--   3. Explicit REVOKEs so even a future permissive policy wouldn't be
--      enough on its own.

CREATE OR REPLACE FUNCTION execute_readonly_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Only allow SELECT queries (tolerate leading whitespace of any kind)
  IF query_text !~* '^\s*select\M' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Block dangerous keywords as whole words only
  IF query_text ~* '\m(drop|delete|insert|update|alter|create|truncate|grant|revoke)\M' THEN
    RAISE EXCEPTION 'Query contains disallowed keywords';
  END IF;

  -- The visit log is not part of the demo dataset
  IF query_text ~* '\mpage_visits\M' THEN
    RAISE EXCEPTION 'Table page_visits is not accessible';
  END IF;

  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query_text || ') t'
  INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

DROP POLICY IF EXISTS "Allow service role full access" ON page_visits;
REVOKE ALL ON page_visits FROM anon, authenticated;
