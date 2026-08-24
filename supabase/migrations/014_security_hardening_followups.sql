-- 014_security_hardening_followups.sql
-- Remaining items from the 2026-08-24 pre-launch security audit.
-- Apply in Supabase SQL editor after 013. Idempotent.

-- ── F7b: waitlist table (api/waitlist.js inserts here; table was missing).
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors may join; nobody reads the list via client APIs.
DROP POLICY IF EXISTS "anon can join waitlist" ON waitlist;
CREATE POLICY "anon can join waitlist"
  ON waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ── F9: SECURITY DEFINER functions must not be callable by clients.
REVOKE EXECUTE ON FUNCTION increment_view_count(TEXT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION auto_unpublish_expired_scholarships() FROM anon, authenticated;
