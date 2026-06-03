-- ============================================================
-- ZAWADI — Migration 005: RLS for unprotected tables, storage ownership, plan enforcement
-- ============================================================

-- 1. Enable RLS on tables that are missing it
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bot_ingestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pipeline_runs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. RLS POLICIES
-- ============================================================

-- 2a. Payments: users see own, service_role full access
DROP POLICY IF EXISTS payments_select_own ON payments;
CREATE POLICY payments_select_own ON payments
  FOR SELECT USING (auth.email() = user_email OR auth.role() = 'service_role');

DROP POLICY IF EXISTS payments_insert_own ON payments;
CREATE POLICY payments_insert_own ON payments
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');

DROP POLICY IF EXISTS payments_update_own ON payments;
CREATE POLICY payments_update_own ON payments
  FOR UPDATE USING (auth.email() = user_email OR auth.role() = 'service_role');

-- 2b. Audit logs: service_role only (admin via Edge Functions)
DROP POLICY IF EXISTS audit_logs_service_only ON audit_logs;
CREATE POLICY audit_logs_service_only ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 2c. Bot ingestions: service_role only
DROP POLICY IF EXISTS bot_ingestions_service_only ON bot_ingestions;
CREATE POLICY bot_ingestions_service_only ON bot_ingestions
  FOR ALL USING (auth.role() = 'service_role');

-- 2d. Contact submissions: service_role only (insert by anon?)
-- Allow anon insert so contact form works, but restrict read to service_role
DROP POLICY IF EXISTS contact_submissions_insert_anon ON contact_submissions;
CREATE POLICY contact_submissions_insert_anon ON contact_submissions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS contact_submissions_select_service ON contact_submissions;
CREATE POLICY contact_submissions_select_service ON contact_submissions
  FOR SELECT USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS contact_submissions_update_service ON contact_submissions;
CREATE POLICY contact_submissions_update_service ON contact_submissions
  FOR UPDATE USING (auth.role() = 'service_role');

-- 2e. Recommendation feedback: users manage own, service_role full access
DROP POLICY IF EXISTS rec_feedback_select_own ON recommendation_feedback;
CREATE POLICY rec_feedback_select_own ON recommendation_feedback
  FOR SELECT USING (auth.email() = user_email OR auth.role() = 'service_role');

DROP POLICY IF EXISTS rec_feedback_insert_own ON recommendation_feedback;
CREATE POLICY rec_feedback_insert_own ON recommendation_feedback
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');

DROP POLICY IF EXISTS rec_feedback_delete_own ON recommendation_feedback;
CREATE POLICY rec_feedback_delete_own ON recommendation_feedback
  FOR DELETE USING (auth.email() = user_email OR auth.role() = 'service_role');

-- 2f. Pipeline runs: service_role only
DROP POLICY IF EXISTS pipeline_runs_service_only ON pipeline_runs;
CREATE POLICY pipeline_runs_service_only ON pipeline_runs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 3. Ensure RLS policies exist for tables created in database.sql
--    (safe re-runs: DROP IF EXISTS then CREATE)
-- ============================================================

-- 3a. Essay Soul Profiles
DROP POLICY IF EXISTS soul_profiles_select_own ON essay_soul_profiles;
CREATE POLICY soul_profiles_select_own ON essay_soul_profiles
  FOR SELECT USING (auth.email() = user_email OR auth.role() = 'service_role');

DROP POLICY IF EXISTS soul_profiles_insert_own ON essay_soul_profiles;
CREATE POLICY soul_profiles_insert_own ON essay_soul_profiles
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');

DROP POLICY IF EXISTS soul_profiles_update_own ON essay_soul_profiles;
CREATE POLICY soul_profiles_update_own ON essay_soul_profiles
  FOR UPDATE USING (auth.email() = user_email OR auth.role() = 'service_role');

-- 3b. Mentor Review Requests
DROP POLICY IF EXISTS mrr_select ON mentor_review_requests;
CREATE POLICY mrr_select ON mentor_review_requests
  FOR SELECT USING (
    auth.email() = user_email
    OR auth.email() = assigned_mentor_email
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS mrr_insert ON mentor_review_requests;
CREATE POLICY mrr_insert ON mentor_review_requests
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');

DROP POLICY IF EXISTS mrr_update ON mentor_review_requests;
CREATE POLICY mrr_update ON mentor_review_requests
  FOR UPDATE USING (
    auth.email() = user_email
    OR auth.email() = assigned_mentor_email
    OR auth.role() = 'service_role'
  );

-- 3c. Mentor Profiles
DROP POLICY IF EXISTS mp_select ON mentor_profiles;
CREATE POLICY mp_select ON mentor_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS mp_insert ON mentor_profiles;
CREATE POLICY mp_insert ON mentor_profiles
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS mp_update ON mentor_profiles;
CREATE POLICY mp_update ON mentor_profiles
  FOR UPDATE USING (auth.role() = 'service_role');

-- 3d. Mentor Feedback Ratings
DROP POLICY IF EXISTS mfr_select ON mentor_feedback_ratings;
CREATE POLICY mfr_select ON mentor_feedback_ratings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS mfr_insert ON mentor_feedback_ratings;
CREATE POLICY mfr_insert ON mentor_feedback_ratings
  FOR INSERT WITH CHECK (auth.email() = rated_by_email OR auth.role() = 'service_role');

-- 3e. Notifications
DROP POLICY IF EXISTS notif_select ON notifications;
CREATE POLICY notif_select ON notifications
  FOR SELECT USING (auth.email() = user_email OR auth.role() = 'service_role');

DROP POLICY IF EXISTS notif_insert ON notifications;
CREATE POLICY notif_insert ON notifications
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');

DROP POLICY IF EXISTS notif_update ON notifications;
CREATE POLICY notif_update ON notifications
  FOR UPDATE USING (auth.email() = user_email OR auth.role() = 'service_role');

-- ============================================================
-- 4. Fix storage bucket RLS: add ownership check
--    Files stored under: {user_email}/{filename}
-- ============================================================

DROP POLICY IF EXISTS "storage_documents_select" ON storage.objects;
CREATE POLICY "storage_documents_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'scholarship-docs'
    AND (
      auth.role() = 'service_role'
      OR (storage.foldername(name))[1] = auth.email()
    )
  );

DROP POLICY IF EXISTS "storage_documents_insert" ON storage.objects;
CREATE POLICY "storage_documents_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'scholarship-docs'
    AND (
      auth.role() = 'service_role'
      OR (storage.foldername(name))[1] = auth.email()
    )
  );

DROP POLICY IF EXISTS "storage_documents_delete" ON storage.objects;
CREATE POLICY "storage_documents_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'scholarship-docs'
    AND (
      auth.role() = 'service_role'
      OR (storage.foldername(name))[1] = auth.email()
    )
  );

-- ============================================================
-- 5. Document upload plan limit enforcement (server-side trigger)
--    Explorer = 15, Plus = 50, Pro/Institutional = unlimited
-- ============================================================

CREATE OR REPLACE FUNCTION check_document_plan_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_plan TEXT;
  doc_count INTEGER;
  max_docs INTEGER;
BEGIN
  -- Get the user's current plan
  SELECT plan INTO user_plan FROM profiles WHERE email = NEW.user_email;
  user_plan := COALESCE(user_plan, 'explorer');

  -- Determine max allowed documents
  CASE user_plan
    WHEN 'explorer' THEN max_docs := 15;
    WHEN 'plus' THEN max_docs := 50;
    ELSE max_docs := 999999; -- pro, institutional, etc.
  END CASE;

  -- Count existing documents for this user (excluding the current insert)
  SELECT COUNT(*) INTO doc_count FROM documents WHERE user_email = NEW.user_email;

  IF doc_count >= max_docs THEN
    RAISE EXCEPTION 'Document vault limit reached (%) for plan %. Upgrade to increase storage.', max_docs, user_plan
      USING HINT = 'Upgrade your plan to store more documents.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_document_plan_limit ON documents;
CREATE TRIGGER trg_check_document_plan_limit
  BEFORE INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION check_document_plan_limit();
