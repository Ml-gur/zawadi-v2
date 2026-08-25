-- ═══════════════════════════════════════════════════════════════
-- RLS HARDENING — 2026-08-22
-- Enables row-level security on tables that were exposed per the
-- 2026 audit (payments, audit_logs, bot_ingestions,
-- contact_submissions, recommendation_feedback, pipeline_runs)
-- and locks storage bucket scholarship-docs to object owners.
--
-- Apply with:  supabase db execute --file <this file>
-- (or paste into Supabase SQL editor as service role).
--
-- Service-role connections bypass RLS entirely, so admin/edge-function
-- write paths keep working unchanged.
-- Verify at the bottom of this file.
-- ═══════════════════════════════════════════════════════════════

-- ── payments ────────────────────────────────────────────────────
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_owner_read ON payments;
CREATE POLICY payments_owner_read ON payments
  FOR SELECT TO authenticated
  USING (user_email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- No client-side INSERT/UPDATE/DELETE: writes happen via Paystack
-- webhook / service role only.

-- ── audit_logs ──────────────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_admin_read ON audit_logs;
CREATE POLICY audit_logs_admin_read ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- Append-only: no client INSERT/UPDATE/DELETE policies. Writes are
-- service-role only.

-- ── bot_ingestions ──────────────────────────────────────────────
ALTER TABLE bot_ingestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bot_ingestions_admin_all ON bot_ingestions;
CREATE POLICY bot_ingestions_admin_all ON bot_ingestions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'content_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'content_manager')
    )
  );

-- Crawler writes arrive via service role (pipeline runner), not clients.

-- ── contact_submissions ─────────────────────────────────────────
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Public contact form needs an insert path; anonymous inserts allowed,
-- reads restricted to admins.
DROP POLICY IF EXISTS contact_submissions_public_insert ON contact_submissions;
CREATE POLICY contact_submissions_public_insert ON contact_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS contact_submissions_admin_read ON contact_submissions;
CREATE POLICY contact_submissions_admin_read ON contact_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- ── recommendation_feedback ─────────────────────────────────────
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recommendation_feedback_owner_write ON recommendation_feedback;
CREATE POLICY recommendation_feedback_owner_write ON recommendation_feedback
  FOR ALL TO authenticated
  USING (user_email = (SELECT email FROM profiles WHERE id = auth.uid()))
  WITH CHECK (user_email = (SELECT email FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS recommendation_feedback_admin_read ON recommendation_feedback;
CREATE POLICY recommendation_feedback_admin_read ON recommendation_feedback
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- ── pipeline_runs ───────────────────────────────────────────────
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipeline_runs_admin_read ON pipeline_runs;
CREATE POLICY pipeline_runs_admin_read ON pipeline_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'content_manager')
    )
  );

-- Pipeline writes are service-role only.

-- ── Storage: scholarship-docs owner-only access ─────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('scholarship-docs', 'scholarship-docs', false)
ON CONFLICT (id) DO NOTHING;

-- owner_id is TEXT in newer storage schemas (uuid in older ones); compare
-- both sides as text so this policy applies on any project vintage.
DROP POLICY IF EXISTS "docs_owner_select" ON storage.objects;
CREATE POLICY "docs_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'scholarship-docs'
    AND owner_id::text = auth.uid()::text
  );

DROP POLICY IF EXISTS "docs_owner_insert" ON storage.objects;
CREATE POLICY "docs_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'scholarship-docs'
    AND owner_id::text = auth.uid()::text
  );

DROP POLICY IF EXISTS "docs_owner_delete" ON storage.objects;
CREATE POLICY "docs_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'scholarship-docs'
    AND owner_id::text = auth.uid()::text
  );

-- ── Verification queries (run after applying) ───────────────────
-- Every row below must return relrowsecurity = true:
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('payments','audit_logs','bot_ingestions',
--     'contact_submissions','recommendation_feedback','pipeline_runs');
--
-- Policies in force:
--   SELECT schemaname, tablename, policyname, cmd
--   FROM pg_policies
--   WHERE tablename IN ('payments','audit_logs','bot_ingestions',
--     'contact_submissions','recommendation_feedback','pipeline_runs')
--   ORDER BY tablename, policyname;
--
-- As a normal authenticated user, these should now error or return 0 rows:
--   SELECT count(*) FROM payments;            -- own rows only
--   SELECT count(*) FROM audit_logs;          -- non-admin => permission denied
