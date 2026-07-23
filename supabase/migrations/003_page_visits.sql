-- ============================================================================
-- PAGE VISITS TABLE
-- ============================================================================
-- Lightweight visit log for the public demo: where (city-level, from Vercel's
-- geo headers) and when each page was loaded. No identity, no IPs stored.

CREATE TABLE page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  city TEXT,
  region TEXT,
  country TEXT,
  referrer TEXT,
  user_agent TEXT,
  visited_at TIMESTAMPTZ DEFAULT now()
);

-- Most queries are "latest visits first"
CREATE INDEX idx_page_visits_visited_at ON page_visits(visited_at DESC);

-- RLS Policies
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON page_visits
  FOR ALL USING (true) WITH CHECK (true);
