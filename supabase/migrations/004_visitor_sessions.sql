-- ============================================================================
-- VISITOR SESSIONS + UTM ATTRIBUTION
-- ============================================================================
-- session_id: anonymous cookie-issued UUID, so page views group into distinct
-- visitors (returning visitors keep the same id for up to a year).
-- utm_source / query_params: which shared link brought them here
-- (?utm_source=linkedin vs dm vs resume).

ALTER TABLE page_visits
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS query_params TEXT;

-- "group by session" is the primary query shape now
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
