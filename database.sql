-- ============================================================
-- ZAWADI PLATFORM — Fresh Database Schema + Seed Data
-- ============================================================
-- Paste this entire file into Supabase Dashboard SQL Editor
-- and run it once. No migrations, no imports — fresh start.
-- ============================================================
-- AUDITED 2026-05-29 — covers every field used across:
--   AuthScreen, ProfileSetupWizard, StudentProfile(5 steps),
--   Dashboard, App routing, matching-engine(795 lines),
--   DocumentVault, SubscriptionPlans, AdminPortal,
--   UserManagement, EssayStudio, server.ts endpoints
-- ============================================================

-- ============================================================
-- 1. HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION exec_sql(sql_text TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_view_count(schol_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE scholarships SET view_count = COALESCE(view_count, 0) + 1 WHERE id = schol_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. TABLES
-- ============================================================

-- 2a. User Profiles
-- Every field below is read or written by at least one
-- component (StudentProfile, ProfileSetupWizard, matching-engine, Dashboard, admin, etc.)
CREATE TABLE IF NOT EXISTS profiles (
  -- Core identity
  email                    TEXT PRIMARY KEY,
  name                     TEXT,
  country                  TEXT DEFAULT '',
  date_of_birth            TEXT,
  gender                   TEXT,
  country_income_group     TEXT,
  is_rural_origin          BOOLEAN DEFAULT false,

  -- Academic
  degree_level             TEXT,
  field_of_study           TEXT,
  target_fields            JSONB DEFAULT '[]'::jsonb,
  target_degree            TEXT,
  gpa                      NUMERIC(4,2),
  gpa_system               TEXT,
  gpa_scale                TEXT DEFAULT '4.0',
  degree_class             TEXT,
  institution              TEXT,

  -- Destination
  study_country_preference TEXT,
  willing_intra_africa     BOOLEAN DEFAULT false,

  -- Languages
  native_language          TEXT DEFAULT 'English',
  additional_languages     JSONB DEFAULT '[]'::jsonb,
  english_test_type        TEXT,
  english_score            TEXT,
  french_level             TEXT,
  french_test_type         TEXT,
  arabic_level             TEXT,
  arabic_test_type         TEXT,
  portuguese_level         TEXT,
  portuguese_test_type     TEXT,

  -- Background & experience
  work_experience_years    NUMERIC(4,1) DEFAULT 0,
  has_research             BOOLEAN DEFAULT false,
  publications             INTEGER DEFAULT 0,
  has_leadership           BOOLEAN DEFAULT false,
  has_community_service    BOOLEAN DEFAULT false,
  is_first_generation      BOOLEAN DEFAULT false,
  financial_need_level     TEXT,
  verified_via_doc         BOOLEAN DEFAULT false,

  -- Document-extracted overrides (AI)
  doc_gpa_normalised_extracted     NUMERIC(5,3),
  doc_has_research_extracted       BOOLEAN DEFAULT false,
  doc_publication_count_extracted  INTEGER,
  doc_work_years_extracted         NUMERIC(4,1),
  doc_has_leadership_extracted     BOOLEAN DEFAULT false,

  -- Account
  plan                     TEXT DEFAULT 'explorer',
  role                     TEXT DEFAULT 'user',
  status                   TEXT DEFAULT 'active',
  confirmed_fields         JSONB DEFAULT '[]'::jsonb,
  avatar_url               TEXT,
  password_hash            TEXT,
  joined_at                TEXT,
  updated_at               TEXT,
  auth_user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- 2b. Scholarships
-- All columns are used by matching-engine.ts (795 lines) or the admin UI.
CREATE TABLE IF NOT EXISTS scholarships (
  id                       TEXT PRIMARY KEY,
  name                     TEXT NOT NULL,
  provider                 TEXT,
  host_institution         TEXT,
  countries                JSONB DEFAULT '[]'::jsonb,
  degree_levels            JSONB DEFAULT '[]'::jsonb,
  fields_of_study          JSONB DEFAULT '[]'::jsonb,
  funding_type             TEXT CHECK (funding_type IN ('Full', 'Partial', 'Tuition Only')),
  amount                   TEXT,
  deadline                 DATE,
  description              TEXT,
  eligibility              TEXT,
  required_documents       JSONB DEFAULT '[]'::jsonb,
  apply_url                TEXT,
  source_url               TEXT,
  published                BOOLEAN DEFAULT false,
  verified                 BOOLEAN DEFAULT false,
  verified_by              TEXT,
  verified_at              TIMESTAMPTZ,
  view_count               INTEGER DEFAULT 0,

  -- Language gates (checked by matching engine)
  instruction_language     TEXT DEFAULT 'English',
  no_ielts                 BOOLEAN DEFAULT false,
  min_english_score        NUMERIC(4,1),
  min_english_test_type    TEXT,
  min_french_level         TEXT,
  min_arabic_level         TEXT,
  min_portuguese_level     TEXT,

  -- Experience / age gates
  work_experience_required INTEGER,
  age_limit_masters        INTEGER,
  age_limit_phd            INTEGER,
  min_work_years           NUMERIC(4,1),
  max_work_years           NUMERIC(4,1),

  -- Academic gates
  min_gpa_normalised       NUMERIC(5,3),

  -- Research / publication gates
  requires_research        BOOLEAN DEFAULT false,
  requires_publications    BOOLEAN DEFAULT false,
  min_publication_count    INTEGER,

  -- Leadership / community gates
  requires_leadership      BOOLEAN DEFAULT false,
  requires_community       BOOLEAN DEFAULT false,

  -- Targeting flags
  targets_financial_need      BOOLEAN DEFAULT false,
  targets_first_generation    BOOLEAN DEFAULT false,
  targets_rural_origin        BOOLEAN DEFAULT false,
  targets_ldc_countries       BOOLEAN DEFAULT false,
  is_intra_african            BOOLEAN DEFAULT false,

  -- Field-focus flags (scored by matching engine)
  stem_focus                  BOOLEAN DEFAULT false,
  development_focus           BOOLEAN DEFAULT false,
  social_sciences_focus       BOOLEAN DEFAULT false,
  humanities_focus            BOOLEAN DEFAULT false,
  peace_conflict_focus        BOOLEAN DEFAULT false,

  -- Pipeline metadata
  quality_score               DECIMAL(3,2),
  scam_flags                  JSONB DEFAULT '[]'::jsonb,
  pipeline_source             TEXT DEFAULT 'manual',
  sponsor_type                TEXT,
  urgency                     TEXT DEFAULT 'Normal',

  -- Destination region mapping
  host_region                 TEXT,
  host_country                JSONB DEFAULT '[]'::jsonb,
  iso2                        TEXT,

  -- Auto-unpublish tracking
  auto_unpublished            BOOLEAN DEFAULT false,

  -- Categorization for admin organization
  category                    TEXT,

  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- 2c. Applications
CREATE TABLE IF NOT EXISTS applications (
  id              TEXT PRIMARY KEY,
  user_email      TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  scholarship_id  TEXT REFERENCES scholarships(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'Saved',
  priority        TEXT DEFAULT 'Medium',
  notes           TEXT,
  updated_at      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2d. Documents
CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  user_email  TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  name        TEXT,
  type        TEXT,
  size        TEXT,
  file_path   TEXT,
  uploaded_at TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2e. Essays
CREATE TABLE IF NOT EXISTS essays (
  id               TEXT PRIMARY KEY,
  user_email       TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  scholarship_name TEXT,
  essay_type       TEXT,
  prompt           TEXT,
  stage            TEXT DEFAULT 'draft',
  draft            TEXT,
  critique         TEXT,
  final            TEXT,
  created_at       TEXT
);

-- 2f. Bot Ingestions
CREATE TABLE IF NOT EXISTS bot_ingestions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extracted_data   JSONB NOT NULL,
  source_url       TEXT NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  scam_flags       JSONB DEFAULT '[]'::jsonb,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'duplicate')),
  reviewed_by      TEXT,
  reviewed_at      TIMESTAMPTZ,
  review_notes     TEXT,
  fingerprint      TEXT UNIQUE NOT NULL,
  pipeline_run_id  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  degree_levels    JSONB DEFAULT '[]'::jsonb,
  host_region      TEXT,
  countries        JSONB DEFAULT '[]'::jsonb,
  confidence_tier  TEXT GENERATED ALWAYS AS (
    CASE
      WHEN confidence_score >= 0.8 THEN 'high'
      WHEN confidence_score >= 0.5 THEN 'medium'
      ELSE 'low'
    END
  ) STORED
);

-- 2g. Payments / Subscriptions
CREATE TABLE IF NOT EXISTS payments (
  id                         TEXT PRIMARY KEY,
  user_email                 TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  paystack_reference         TEXT,
  paystack_subscription_code TEXT,
  amount                     NUMERIC(10,2),
  currency                   TEXT DEFAULT 'KES',
  plan                       TEXT,
  billing_period             TEXT DEFAULT 'monthly',
  status                     TEXT DEFAULT 'pending',
  webhook_event_id           TEXT,
  authorization_url          TEXT,
  paid_at                    TEXT,
  updated_at                 TEXT,
  failure_reason             TEXT,
  created_at                 TEXT
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS authorization_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- 2g2. Documents — add AI extraction result column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_extraction_result JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'pending';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS analysis_error TEXT;

-- Profile — add document-enrichment columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_reference_sentiment TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_certificate_type TEXT;

-- 2h. Essay Soul Profiles (voice learning)
CREATE TABLE IF NOT EXISTS essay_soul_profiles (
  user_email       TEXT PRIMARY KEY REFERENCES profiles(email) ON DELETE CASCADE,
  voice_profile    JSONB,
  writing_samples  JSONB DEFAULT '[]'::jsonb,
  style_notes      TEXT DEFAULT '',
  essays_analyzed  INTEGER DEFAULT 0,
  last_updated     TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2i. Mentor Review Requests (version 2 — full pipeline)
-- Drop old table if it exists (safe: we just created it)
DROP TABLE IF EXISTS mentor_review_requests CASCADE;
CREATE TABLE mentor_review_requests (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_reference               TEXT UNIQUE NOT NULL,
  user_email                      TEXT NOT NULL REFERENCES profiles(email),
  user_first_name                 TEXT NOT NULL,
  user_country                    TEXT NOT NULL,
  user_plan                       TEXT NOT NULL,
  essay_id                        TEXT NOT NULL,
  essay_version                   INTEGER NOT NULL DEFAULT 1,
  essay_content                   TEXT NOT NULL,
  scholarship_name                TEXT NOT NULL,
  scholarship_provider            TEXT,
  scholarship_deadline            DATE,
  scholarship_host_region         TEXT,
  student_notes                   TEXT,
  status                          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','under_review','submitted_by_mentor','pending_admin_approval','approved_by_admin','delivered_to_student','cancelled')),
  priority                        TEXT NOT NULL DEFAULT 'standard' CHECK (priority IN ('low','medium','high','urgent')),
  response_deadline               TIMESTAMPTZ NOT NULL,
  assigned_mentor_email           TEXT,
  assigned_mentor_name            TEXT,
  assigned_at                     TIMESTAMPTZ,
  mentor_started_review_at        TIMESTAMPTZ,
  mentor_submitted_at             TIMESTAMPTZ,
  admin_approved_by               TEXT,
  admin_approved_at               TIMESTAMPTZ,
  admin_approval_notes            TEXT,
  admin_rejection_reason          TEXT,
  delivered_at                    TIMESTAMPTZ,
  feedback_overall_assessment     TEXT CHECK (feedback_overall_assessment IN ('strong_proceed','good_minor_revisions','needs_work_major_revisions','not_ready_rewrite')),
  feedback_opening                TEXT,
  feedback_narrative              TEXT,
  feedback_evidence               TEXT,
  feedback_cultural_authenticity  TEXT,
  feedback_closing                TEXT,
  feedback_general_advice         TEXT,
  revised_sections                JSONB,
  mentor_confidence_score         INTEGER CHECK (mentor_confidence_score BETWEEN 1 AND 5),
  estimated_success_probability   TEXT CHECK (estimated_success_probability IN ('very_high','high','moderate','low')),
  mentor_private_notes            TEXT,
  feedback_type                   TEXT NOT NULL,
  includes_revised_sections       BOOLEAN NOT NULL DEFAULT false,
  includes_strategy_session       BOOLEAN NOT NULL DEFAULT false,
  strategy_session_scheduled_at   TIMESTAMPTZ,
  strategy_session_link           TEXT,
  requested_at                    TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate request_reference: MRR-YYYY-NNNN
CREATE SEQUENCE IF NOT EXISTS mrr_seq START 1;
CREATE OR REPLACE FUNCTION generate_mrr_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.request_reference := 'MRR-' || to_char(NOW(), 'YYYY') || '-' || LPAD(nextval('mrr_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_mrr_reference ON mentor_review_requests;
CREATE TRIGGER trg_mrr_reference
  BEFORE INSERT ON mentor_review_requests
  FOR EACH ROW EXECUTE FUNCTION generate_mrr_reference();

-- Auto-update updated_at (function set_updated_at is defined later in section 4a)
DROP TRIGGER IF EXISTS trg_mrr_updated_at ON mentor_review_requests;
CREATE TRIGGER trg_mrr_updated_at
  BEFORE UPDATE ON mentor_review_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mrr_user_email ON mentor_review_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_mrr_status ON mentor_review_requests(status);
CREATE INDEX IF NOT EXISTS idx_mrr_assigned_mentor ON mentor_review_requests(assigned_mentor_email);
CREATE INDEX IF NOT EXISTS idx_mrr_priority ON mentor_review_requests(priority);
CREATE INDEX IF NOT EXISTS idx_mrr_response_deadline ON mentor_review_requests(response_deadline);

-- 2j. Mentor Profiles
CREATE TABLE IF NOT EXISTS mentor_profiles (
  mentor_email            TEXT PRIMARY KEY REFERENCES profiles(email),
  display_name            TEXT NOT NULL,
  bio                     TEXT,
  specializations         JSONB DEFAULT '[]'::jsonb,
  max_concurrent_reviews  INTEGER DEFAULT 3,
  is_active               BOOLEAN DEFAULT true,
  total_reviews_completed INTEGER DEFAULT 0,
  average_response_hours  DECIMAL,
  average_mentor_score    DECIMAL,
  joined_at               TIMESTAMPTZ DEFAULT NOW()
);

-- 2k. Mentor Feedback Ratings
CREATE TABLE IF NOT EXISTS mentor_feedback_ratings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id         UUID REFERENCES mentor_review_requests(id),
  rated_by_email     TEXT,
  helpfulness_rating INTEGER CHECK (helpfulness_rating BETWEEN 1 AND 5),
  accuracy_rating    INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
  clarity_rating     INTEGER CHECK (clarity_rating BETWEEN 1 AND 5),
  would_recommend    BOOLEAN,
  student_comment    TEXT,
  rated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 2l. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info',
  related_id  TEXT,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2m. Contact Submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'responded')),
  created_at  TEXT
);

-- 2j2. Recommendation Feedback
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id          TEXT PRIMARY KEY,
  user_email  TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  scholarship_id TEXT,
  feedback    TEXT NOT NULL CHECK (feedback IN ('relevant', 'irrelevant')),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rec_feedback_user ON recommendation_feedback(user_email);
CREATE INDEX IF NOT EXISTS idx_rec_feedback_scholar ON recommendation_feedback(scholarship_id);

-- 2k. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  admin_email TEXT,
  action      TEXT,
  target_type TEXT,
  target_id   TEXT,
  details     TEXT,
  ip_address  TEXT,
  created_at  TEXT
);

-- 2i. Pipeline Runs
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     TEXT UNIQUE NOT NULL,
  summary    JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2j. MIGRATIONS — rename old columns to new schema
-- ============================================================
-- These run IF the old column exists, making re-runs safe.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scholarships' AND column_name='country') THEN
    ALTER TABLE scholarships RENAME COLUMN country TO countries;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scholarships' AND column_name='fields') THEN
    ALTER TABLE scholarships RENAME COLUMN fields TO fields_of_study;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scholarships' AND column_name='host') THEN
    ALTER TABLE scholarships RENAME COLUMN host TO host_institution;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bot_ingestions' AND column_name='scholarship_name') THEN
    -- Old bot_ingestions table exists with old schema; drop it so CREATE TABLE IF NOT EXISTS creates the new one
    DROP TABLE IF EXISTS bot_ingestions CASCADE;
  END IF;
  -- Add category column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scholarships' AND column_name='category') THEN
    ALTER TABLE scholarships ADD COLUMN category TEXT;
  END IF;
END $$;

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email      ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_plan        ON profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user   ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user    ON applications(user_email);
CREATE INDEX IF NOT EXISTS idx_applications_scholar ON applications(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_documents_user       ON documents(user_email);
CREATE INDEX IF NOT EXISTS idx_essays_user           ON essays(user_email);
CREATE INDEX IF NOT EXISTS idx_payments_user         ON payments(user_email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_paystack_reference ON payments(paystack_reference) WHERE paystack_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status       ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_webhook      ON payments(webhook_event_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_published         ON scholarships(published);
CREATE INDEX IF NOT EXISTS idx_scholarships_countries         ON scholarships USING gin(countries);
CREATE INDEX IF NOT EXISTS idx_scholarships_fields_of_study   ON scholarships USING gin(fields_of_study);
CREATE INDEX IF NOT EXISTS idx_scholarships_degree            ON scholarships USING gin(degree_levels);
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline          ON scholarships(deadline);
CREATE INDEX IF NOT EXISTS idx_scholarships_funding_type      ON scholarships(funding_type);
CREATE INDEX IF NOT EXISTS idx_scholarships_host_region       ON scholarships(host_region);
CREATE INDEX IF NOT EXISTS idx_scholarships_urgency           ON scholarships(urgency);
CREATE INDEX IF NOT EXISTS idx_scholarships_category          ON scholarships(category);
CREATE INDEX IF NOT EXISTS idx_scholarships_host_country      ON scholarships USING gin(host_country);

-- Bot ingestions indexes
CREATE INDEX IF NOT EXISTS idx_bot_ingestions_status           ON bot_ingestions(status);
CREATE INDEX IF NOT EXISTS idx_bot_ingestions_confidence_score ON bot_ingestions(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_bot_ingestions_confidence_tier  ON bot_ingestions(confidence_tier);
CREATE INDEX IF NOT EXISTS idx_bot_ingestions_created_at       ON bot_ingestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_ingestions_host_region      ON bot_ingestions(host_region);
CREATE INDEX IF NOT EXISTS idx_bot_ingestions_pipeline_run_id  ON bot_ingestions(pipeline_run_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_email, is_read);

-- Mentor feedback ratings index
CREATE INDEX IF NOT EXISTS idx_mfr_request ON mentor_feedback_ratings(request_id);

-- ============================================================
-- 4. TRIGGER FUNCTIONS
-- ============================================================

-- 4a. Set updated_at to NOW() on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scholarships_updated_at ON scholarships;
CREATE TRIGGER trg_scholarships_updated_at
  BEFORE UPDATE ON scholarships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4b. Compute urgency based on deadline
CREATE OR REPLACE FUNCTION compute_urgency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.deadline IS NULL THEN
    NEW.urgency = 'TBA';
  ELSIF NEW.deadline < CURRENT_DATE THEN
    NEW.urgency = 'Expired';
  ELSIF NEW.deadline <= CURRENT_DATE + INTERVAL '30 days' THEN
    NEW.urgency = 'Urgent';
  ELSIF NEW.deadline <= CURRENT_DATE + INTERVAL '60 days' THEN
    NEW.urgency = 'Warning';
  ELSE
    NEW.urgency = 'Normal';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scholarships_urgency ON scholarships;
CREATE TRIGGER trg_scholarships_urgency
  BEFORE INSERT OR UPDATE OF deadline ON scholarships
  FOR EACH ROW EXECUTE FUNCTION compute_urgency();

-- 4c. Auto-unpublish expired scholarships
CREATE OR REPLACE FUNCTION auto_unpublish_expired_scholarships()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE scholarships
  SET published = false, auto_unpublished = true, updated_at = NOW()
  WHERE deadline < CURRENT_DATE
    AND published = true
    AND auto_unpublished = false;
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarships            ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE essays                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE essay_soul_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_review_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_feedback_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;

-- Scholarships: public read
CREATE POLICY scholarships_select_all ON scholarships
  FOR SELECT USING (true);

-- Profiles: users read/write own
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.email() = email OR auth.role() = 'service_role');
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (auth.email() = email OR auth.role() = 'service_role');
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.email() = email OR auth.role() = 'service_role');

-- Applications: users manage own
CREATE POLICY applications_select_own ON applications
  FOR SELECT USING (auth.email() = user_email OR auth.role() = 'service_role');
CREATE POLICY applications_insert_own ON applications
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');
CREATE POLICY applications_update_own ON applications
  FOR UPDATE USING (auth.email() = user_email OR auth.role() = 'service_role');
CREATE POLICY applications_delete_own ON applications
  FOR DELETE USING (auth.email() = user_email OR auth.role() = 'service_role');

-- Documents: users manage own
CREATE POLICY documents_select_own ON documents
  FOR SELECT USING (auth.email() = user_email OR auth.role() = 'service_role');
CREATE POLICY documents_insert_own ON documents
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');
CREATE POLICY documents_delete_own ON documents
  FOR DELETE USING (auth.email() = user_email OR auth.role() = 'service_role');

-- Essays: users manage own
CREATE POLICY essays_select_own ON essays
  FOR SELECT USING (auth.email() = user_email OR auth.role() = 'service_role');
CREATE POLICY essays_insert_own ON essays
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');
CREATE POLICY essays_update_own ON essays
  FOR UPDATE USING (auth.email() = user_email OR auth.role() = 'service_role');
CREATE POLICY essays_delete_own ON essays
  FOR DELETE USING (auth.email() = user_email OR auth.role() = 'service_role');

-- Essay Soul Profiles: users read/write own
CREATE POLICY soul_profiles_select_own ON essay_soul_profiles
  FOR SELECT USING (auth.email() = user_email OR auth.role() = 'service_role');
CREATE POLICY soul_profiles_insert_own ON essay_soul_profiles
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');
CREATE POLICY soul_profiles_update_own ON essay_soul_profiles
  FOR UPDATE USING (auth.email() = user_email OR auth.role() = 'service_role');

-- Mentor Review Requests: students see own, mentors see assigned, admins see all
CREATE POLICY mrr_select ON mentor_review_requests
  FOR SELECT USING (
    auth.email() = user_email
    OR auth.email() = assigned_mentor_email
    OR auth.role() = 'service_role'
  );
CREATE POLICY mrr_insert ON mentor_review_requests
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');
CREATE POLICY mrr_update ON mentor_review_requests
  FOR UPDATE USING (
    auth.email() = user_email
    OR auth.email() = assigned_mentor_email
    OR auth.role() = 'service_role'
  );

-- Mentor Profiles: public read for assignment, admin write
CREATE POLICY mp_select ON mentor_profiles
  FOR SELECT USING (true);
CREATE POLICY mp_insert ON mentor_profiles
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY mp_update ON mentor_profiles
  FOR UPDATE USING (auth.role() = 'service_role');

-- Mentor Feedback Ratings: students insert own, all read for stats
CREATE POLICY mfr_select ON mentor_feedback_ratings
  FOR SELECT USING (true);
CREATE POLICY mfr_insert ON mentor_feedback_ratings
  FOR INSERT WITH CHECK (auth.email() = rated_by_email OR auth.role() = 'service_role');

-- Notifications: users read/write own
CREATE POLICY notif_select ON notifications
  FOR SELECT USING (auth.email() = user_email OR auth.role() = 'service_role');
CREATE POLICY notif_insert ON notifications
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');
CREATE POLICY notif_update ON notifications
  FOR UPDATE USING (auth.email() = user_email OR auth.role() = 'service_role');

-- ============================================================
-- 5. SEED DATA — SCHOLARSHIPS
-- ============================================================
-- All countries stored as full names. No ISO codes anywhere.
-- ============================================================

INSERT INTO scholarships (id, name, provider, host_institution, countries, degree_levels, fields_of_study, funding_type, amount, deadline, description, eligibility, required_documents, apply_url, source_url, published, verified, verified_at, view_count, no_ielts, work_experience_required, instruction_language, min_gpa_normalised, requires_research, requires_leadership, requires_community, targets_financial_need, targets_first_generation, targets_rural_origin, targets_ldc_countries,   is_intra_african, development_focus, peace_conflict_focus, host_region, host_country, iso2) VALUES
(
  'schol-1',
  'Mastercard Foundation Scholars Program',
  'Mastercard Foundation',
  'University of Oxford',
  '["Pan-African", "Kenya", "Nigeria", "Ghana", "South Africa", "Rwanda", "Uganda", "Ethiopia"]',
  '["Masters"]',
  '["Computer Science", "Engineering", "Business", "Public Health", "Environmental Science"]',
  'Full',
  'Full Tuition + Monthly Stipend + Flights + Visa',
  '2026-12-15',
  'The Mastercard Foundation Scholars Program at the University of Oxford supports bright, future leaders from Africa. It provides fully-funded scholarships to outstanding students who have demonstrated a commitment to giving back to their communities but face significant financial barriers to higher education. This prestigious program covers academic expenses, monthly stipends, laptop, return airfare, and visa costs, plus comprehensive leadership development and career mentorship.',
  'Be a citizen of a Sub-Saharan African country. Demonstrate academic excellence and leadership potential. Have a clear commitment to returning to Africa to contribute to the continent''s development. Require significant financial assistance. Have an unconditional offer for an eligible Masters course at Oxford.',
  '["CV / Resume", "Academic Transcript", "Motivation Letter", "Passport / ID", "Reference Letter"]',
  'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/oxford-funding/mastercard-foundation-scholars-program',
  'https://mastercardfdn.org/all/scholars/',
  true,
  false,
  '2026-05-26',
  142,
  false,
  NULL,
  'English',
  NULL,
  false,
  true,
  true,
  true,
  true,
  true,
  true,
  false,
  true,
  true,
  'East Africa hubs',
  '["ethiopia", "uganda"]',
  '["NG","GH","SN","KE","UG","ET","ZA","RW"]'
),
(
  'schol-2',
  'Chevening Scholarships',
  'UK Government',
  'UK Universities',
  '["Global", "Kenya", "Nigeria", "Ghana", "South Africa", "Uganda", "Ethiopia", "Egypt", "Tanzania"]',
  '["Masters"]',
  '["Engineering", "Business", "Public Health", "Law", "International Relations", "Computer Science"]',
  'Full',
  'Full tuition fees, monthly living allowance, return economy flights',
  '2026-11-07',
  'Chevening Scholarships are the UK Government''s global scholarship program, funded by the Foreign, Commonwealth & Development Office (FCDO) and partner organizations. The scholarships are awarded to outstanding individuals with leadership potential from around the world to study a one-year master''s degree in any subject at any UK university.',
  'Be a citizen of a Chevening-eligible country. Return to your country of citizenship for a minimum of two years after your scholarship has ended. Have completed an undergraduate degree. Have at least two years of work experience.',
  '["CV / Resume", "Academic Transcript", "Motivation Letter", "Reference Letter"]',
  'https://www.chevening.org/scholarship/',
  'https://www.chevening.org/',
  true,
  false,
  '2026-05-25',
  89,
  true,
  2,
  'English',
  NULL,
  false,
  true,
  false,
  false,
  false,
  false,
  false,
  false,
  NULL,
  NULL,
  'United Kingdom and Ireland',
  '["united kingdom"]',
  'GB'
),
(
  'schol-3',
  'Eiffel Excellence Scholarship',
  'French Ministry for Europe',
  'French Universities',
  '["Global", "Kenya", "Nigeria", "Ghana", "South Africa", "Senegal", "Cameroon"]',
  '["Masters", "PhD"]',
  '["STEM", "Engineering", "Economics", "Management", "Law", "Political Science"]',
  'Partial',
  'Monthly allowance €1,181 + return travel + health insurance',
  '2026-12-10',
  'The Eiffel Excellence Scholarship Program was established by the French Ministry for Europe and Foreign Affairs to enable French higher education institutions to attract top international students for master''s and PhD programs.',
  'Non-French nationality. Up to 25 years old for master''s level, up to 30 years old for PhD level. Applications must be submitted by French higher education institutions, not students directly.',
  '["CV / Resume", "Academic Transcript", "Language Certificate", "Reference Letter"]',
  'https://www.campusfrance.org/en/eiffel-scholarship-program-of-excellence',
  'https://www.campusfrance.org/',
  false,
  false,
  '2026-05-20',
  45,
  false,
  NULL,
  'French',
  NULL,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  NULL,
  NULL,
  'France and Belgium',
  '["france"]',
  'FR'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO scholarships (id, name, provider, host_institution, countries, degree_levels, fields_of_study, funding_type, amount, deadline, description, eligibility, required_documents, apply_url, source_url, published, verified, verified_at, view_count, no_ielts, instruction_language, min_gpa_normalised, requires_research, requires_publications, min_publication_count, development_focus, host_region, host_country, iso2) VALUES
(
  'schol-4',
  'DAAD EPOS Scholarships',
  'DAAD Germany',
  'German Universities',
  '["Global", "Kenya", "Nigeria", "Ghana", "South Africa", "Ethiopia", "Uganda"]',
  '["Masters", "PhD"]',
  '["Development Studies", "Engineering", "Environmental Science", "Public Health", "Agriculture"]',
  'Full',
  'Monthly allowance €934 + travel grant + insurance + tuition waiver',
  '2026-08-30',
  'The DAAD EPOS program offers scholarships for postgraduate courses in German universities for professionals from developing and newly industrialized countries.',
  'Graduated not more than 6 years ago. At least two years of professional experience in a relevant field. Living and working in a developing country.',
  '["CV / Resume", "Academic Transcript", "Motivation Letter", "Reference Letter", "Professional Experience Proof"]',
  'https://www.daad.de/en/study-and-research-in-germany/scholarships/',
  'https://www.daad.de/',
  true,
  false,
  '2026-05-18',
  72,
  true,
  'English',
  NULL,
  false,
  false,
  NULL,
  true,
  'Germany, Austria, Switzerland (German-speaking)',
  '["germany"]',
  'DE'
),
(
  'schol-5',
  'Fulbright Foreign Student Program',
  'US Dept of State',
  'US Universities',
  '["Global", "Kenya", "Nigeria", "Ghana", "South Africa", "Ethiopia", "Rwanda", "Zimbabwe"]',
  '["Masters", "PhD"]',
  '["All fields", "Computer Science", "Engineering", "Business", "Education", "Humanities"]',
  'Full',
  'Full Tuition + Monthly Stipend + Book Allowance + Health Cover',
  '2026-10-11',
  'The Fulbright Foreign Student Program enables graduate students, young professionals and artists from abroad to study and conduct research in the United States.',
  'Varies by country. Typically requires completion of undergraduate education, good academic standing, and English proficiency.',
  '["CV / Resume", "Academic Transcript", "Statement of Purpose", "Reference Letter", "Passport / ID"]',
  'https://foreign.fulbrightprogram.org/',
  'https://foreign.fulbrightprogram.org/',
  true,
  false,
  '2026-05-15',
  115,
  false,
  'English',
  0.75,
  false,
  false,
  NULL,
  NULL,
  'United States and Canada',
  '["united states"]',
  'US'
),
(
  'schol-6',
  'Rhodes Scholarship',
  'Rhodes Trust',
  'University of Oxford',
  '["Global", "Kenya", "Nigeria", "Ghana", "South Africa", "Zambia", "Zimbabwe"]',
  '["Masters", "PhD"]',
  '["All fields", "Computer Science", "Engineering", "Law", "Business", "Public Policy"]',
  'Full',
  'Full Tuition + Annual Stipend of £19,000 + Airfare',
  '2026-10-01',
  'The Rhodes Scholarship is a fully-funded, full-time postgraduate award which enables talented young people from around the world to study at the University of Oxford. It is the oldest and perhaps most prestigious international scholarship program in the world.',
  'Age limits (normally 18-24). Exceptional academic achievement. Leadership abilities and character traits. Return commitment.',
  '["CV / Resume", "Academic Transcript", "Personal Statement", "Reference Letter", "Passport / ID"]',
  'https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/',
  'https://www.rhodeshouse.ox.ac.uk/',
  true,
  false,
  '2026-05-24',
  136,
  false,
  'English',
  0.90,
  false,
  false,
  NULL,
  NULL,
  'United Kingdom and Ireland',
  '["united kingdom"]',
  'GB'
),
(
  'schol-7',
  'Gates Cambridge Scholarship',
  'Gates Cambridge',
  'University of Cambridge',
  '["Global", "Kenya", "Nigeria", "Ghana", "South Africa", "Tanzania", "Uganda"]',
  '["Masters", "PhD"]',
  '["All fields", "Computer Science", "Engineering", "Public Health", "Economics", "Education"]',
  'Full',
  'Full Tuition + Annual Maintenance Allowance ~£20,000 + Flight',
  '2026-12-05',
  'Gates Cambridge Scholarships are highly competitive and prestigious, fully funded postgraduate scholarships. They are awarded to outstanding applicants from countries outside the UK to pursue a full-time postgraduate degree in any subject available at the University of Cambridge.',
  'A citizen of any country outside the United Kingdom. Must apply to study one of the eligible full-time residential courses at Cambridge.',
  '["CV / Resume", "Academic Transcript", "Motivation Letter", "Reference Letter"]',
  'https://www.gatescambridge.org/programmes/the-scholarship/',
  'https://www.gatescambridge.org/',
  true,
  false,
  '2026-05-23',
  92,
  false,
  'English',
  NULL,
  false,
  false,
  NULL,
  NULL,
  'United Kingdom and Ireland',
  '["united kingdom"]',
  'GB'
) ON CONFLICT (id) DO NOTHING;

UPDATE scholarships SET age_limit_masters = 25, age_limit_phd = 30 WHERE id = 'schol-3';
UPDATE scholarships SET work_experience_required = 2, min_work_years = 2 WHERE id = 'schol-2';
UPDATE scholarships SET min_gpa_normalised = 0.75 WHERE id = 'schol-5';
UPDATE scholarships SET min_gpa_normalised = 0.90 WHERE id = 'schol-6';
UPDATE scholarships SET min_french_level = 'B2' WHERE id = 'schol-3';

-- ============================================================
-- 6. SEED DATA — PROFILES
-- ============================================================

INSERT INTO profiles (
  email, name, country, date_of_birth, gender, country_income_group, is_rural_origin,
  degree_level, field_of_study, target_fields, gpa, gpa_system, degree_class, institution,
  study_country_preference, willing_intra_africa,
  native_language, english_test_type, english_score, french_level,
  work_experience_years, has_research, publications, has_leadership, has_community_service,
  is_first_generation, financial_need_level,
  plan, role, status, confirmed_fields, joined_at, updated_at
) VALUES
(
  'amara.d@example.com',
  'Amara Diallo',
  'Kenya',
  '1998-04-12',
  'Female',
  'Developing',
  true,
  'Masters',
  'Computer Science',
  '["AI", "Data Science", "Public Health Technology"]',
  3.8,
  'us4',
  NULL,
  'University of Nairobi',
  'United Kingdom',
  false,
  'English',
  'IELTS',
  '7.5',
  NULL,
  2,
  true,
  1,
  true,
  true,
  true,
  'medium',
  'pro',
  'user',
  'active',
  '["email", "name", "country", "date_of_birth", "degree_level", "field_of_study", "gpa", "gpa_system", "degree_class", "institution", "study_country_preference", "native_language", "english_test_type", "english_score", "work_experience_years", "has_research", "publications", "has_leadership", "has_community_service", "is_first_generation", "financial_need_level", "target_fields", "willing_intra_africa"]',
  '2023-10-12',
  '2026-05-29T07:28:23.230Z'
),
(
  'kwame.o@example.edu',
  'Kwame Osei',
  'Ghana',
  '1997-08-23',
  'Male',
  'Developing',
  false,
  'Masters',
  'Engineering',
  '["Renewable Energy", "Infrastructure"]',
  3.8,
  'us4',
  NULL,
  'Kwame Nkrumah University of Science and Technology',
  'Germany',
  true,
  'English',
  'IELTS',
  '7.0',
  'A2',
  2,
  true,
  1,
  true,
  false,
  false,
  'medium',
  'plus',
  'user',
  'active',
  '["email", "name", "country", "date_of_birth", "degree_level", "field_of_study", "gpa", "gpa_system", "institution", "study_country_preference", "native_language", "english_test_type", "english_score", "french_level", "work_experience_years", "has_research", "publications", "has_leadership", "target_fields", "willing_intra_africa"]',
  '2023-08-15',
  '2026-05-29T05:42:41.057Z'
),
(
  'f.hassan99@gmail.com',
  'Fatima Hassan',
  'Nigeria',
  '2002-01-30',
  'Female',
  'LDC',
  true,
  'Bachelors',
  'Public Health',
  '[]',
  NULL,
  NULL,
  NULL,
  NULL,
  'USA',
  false,
  'English',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  'high',
  'explorer',
  'user',
  'active',
  '[]',
  '2023-11-20',
  NULL
),
(
  'admin@zawadi.app',
  'Samuel Karanja',
  'Kenya',
  NULL,
  NULL,
  NULL,
  NULL,
  'PhD',
  'Data Science',
  '[]',
  NULL,
  NULL,
  NULL,
  NULL,
  'UK',
  NULL,
  'English',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'institutional',
  'super_admin',
  'active',
  '[]',
  '2023-01-01',
  NULL
) ON CONFLICT (email) DO NOTHING;

-- NOTE: Admin auth credentials are NOT hardcoded here.
-- To create the admin Supabase Auth user and set their password, run:
--   node scripts/setup-admin.mjs
-- This reads ADMIN_EMAIL and ADMIN_PASSWORD from your .env file and creates
-- the auth user via the setup-admin Edge Function (deployed separately).
-- Alternatively, run the setup SQL via the setup-admin edge function endpoint.

-- ============================================================
-- 7. SEED DATA — APPLICATIONS
-- ============================================================

INSERT INTO applications (id, user_email, scholarship_id, status, priority, notes, updated_at) VALUES
(
  'app-1',
  'amara.d@example.com',
  'schol-1',
  'Preparing Documents',
  'High',
  'Looking forward to get feedback on the secondary essay drafts. Transcripts uploaded.',
  '2026-05-27'
),
(
  'app-2',
  'amara.d@example.com',
  'schol-2',
  'Essay Drafting',
  'High',
  'Generative outline is ready, working with the AI Critique stage to enhance my paragraph on rural health.',
  '2026-05-27'
),
(
  'app-3',
  'amara.d@example.com',
  'schol-3',
  'Not Started',
  'Low',
  'Eiffel Excellence might fit, but wait until Oxford feedback is received.',
  '2026-05-27'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. SEED DATA — DOCUMENTS
-- ============================================================

INSERT INTO documents (id, user_email, name, type, size, uploaded_at) VALUES
(
  'doc-1',
  'amara.d@example.com',
  'Main_CV_2024_Update.pdf',
  'CV / Resume',
  '1.2 MB',
  '2024-03-12'
),
(
  'doc-2',
  'amara.d@example.com',
  'Undergrad_Transcript_Official.pdf',
  'Academic Transcript',
  '3.4 MB',
  '2024-03-10'
),
(
  'doc-3',
  'amara.d@example.com',
  'Scanned_Passport_Bio_Page.jpg',
  'Passport / ID',
  '2.1 MB',
  '2024-03-08'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. SEED DATA — ESSAYS
-- ============================================================

INSERT INTO essays (id, user_email, scholarship_name, essay_type, prompt, stage, draft, critique, final, created_at) VALUES
(
  'ess-1',
  'amara.d@example.com',
  'Mastercard Foundation Scholars Program',
  'Personal Statement',
  'Tell us about a time you led an initiative and how you plan to return and contribute to Africa.',
  'polish',
  'Draft version of the Mastercard Foundation essay on leadership.',
  'Critique notes on metric inclusion and sentence structure.',
  'My five-year journey advancing community health in rural Kenya has shaped my values. During my undergraduate study, I spearheaded a low-cost water filtration project serving 50+ households. Returning equipped with Oxford''s technical expertise, I intend to dedicate my career to sustainable urban infrastructure across East Africa.',
  '2026-05-27'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. SEED DATA — BOT INGESTIONS
-- ============================================================

INSERT INTO bot_ingestions (extracted_data, source_url, confidence_score, scam_flags, status, fingerprint, pipeline_run_id, degree_levels, host_region, countries) VALUES
(
  JSONB_BUILD_OBJECT(
    'name', 'Erasmus Mundus Joint Master in Green ICT',
    'provider', 'European Union Council',
    'host_institution', 'Multiple European Universities',
    'apply_url', 'https://erasmus-plus.ec.europa.eu/opportunities',
    'degree_levels', JSONB_BUILD_ARRAY('Masters'),
    'countries', JSONB_BUILD_ARRAY('All African Countries'),
    'funding_type', 'Full',
    'host_region', 'Rest of Europe'
  ),
  'https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/joint-masters-scholarships',
  0.91,
  '[]'::jsonb,
  'pending',
  encode(sha256('Erasmus Mundus Joint Master in Green ICTEuropean Union Council'::bytea), 'hex'),
  'seed',
  '["Masters"]'::jsonb,
  'Rest of Europe',
  '["All African Countries"]'::jsonb
),
(
  JSONB_BUILD_OBJECT(
    'name', 'Rotary Peace Fellowship 2026 Intake',
    'provider', 'Rotary Foundation',
    'host_institution', 'Makerere University (Uganda)',
    'apply_url', 'https://www.rotary.org/en/peace-fellowships',
    'degree_levels', JSONB_BUILD_ARRAY('Masters'),
    'countries', JSONB_BUILD_ARRAY('All African Countries'),
    'funding_type', 'Full',
    'host_region', 'Intra-African'
  ),
  'https://www.rotary.org/en/our-programs/peace-fellowships',
  0.87,
  '[]'::jsonb,
  'pending',
  encode(sha256('Rotary Peace Fellowship 2026 IntakeRotary Foundation'::bytea), 'hex'),
  'seed',
  '["Masters"]'::jsonb,
  'Intra-African',
  '["All African Countries"]'::jsonb
),
(
  JSONB_BUILD_OBJECT(
    'name', 'MEXT Scholarship for African Leaders',
    'provider', 'Japanese Ministry of Education',
    'host_institution', 'Tokyo Tech',
    'apply_url', 'https://www.mext.go.jp/en',
    'degree_levels', JSONB_BUILD_ARRAY('Masters'),
    'countries', JSONB_BUILD_ARRAY('All African Countries'),
    'funding_type', 'Full',
    'host_region', 'Japan and South Korea'
  ),
  'https://www.mext.go.jp/en/policy/education/higher/title02/detail02/slist02-000003058.htm',
  0.68,
  '[]'::jsonb,
  'pending',
  encode(sha256('MEXT Scholarship for African LeadersJapanese Ministry of Education'::bytea), 'hex'),
  'seed',
  '["Masters"]'::jsonb,
  'Japan and South Korea',
  '["All African Countries"]'::jsonb
);

-- ============================================================
-- 11. SEED DATA — PAYMENTS
-- ============================================================

INSERT INTO payments (id, user_email, paystack_reference, paystack_subscription_code, amount, currency, plan, status, created_at) VALUES
(
  'pay-1',
  'amara.d@example.com',
  'zawadi_1716912000_xy82z9',
  'PLN_02f9ve9p86cpx44',
  1560,
  'KES',
  'pro',
  'success',
  '2026-05-26'
),
(
  'pay-2',
  'kwame.o@example.edu',
  'zawadi_1716900000_km98w2',
  'PLN_unw5dchqqxx8h81',
  650,
  'KES',
  'plus',
  'success',
  '2026-05-26'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. SEED DATA — AUDIT LOGS
-- ============================================================

INSERT INTO audit_logs (id, admin_email, action, target_type, target_id, details, ip_address, created_at) VALUES
(
  'audit-1',
  'admin@zawadi.app',
  'ingestion_approved',
  'scholarship',
  'schol-1',
  'Approved Mastercard Foundation Scholarship from Bot Queue',
  '192.168.1.5',
  '2026-05-27T09:12:00Z'
),
(
  'audit-2',
  'admin@zawadi.app',
  'user_plan_updated',
  'user',
  'amara.d@example.com',
  'Switched Amara Diallo plan to Pro manually',
  '192.168.1.5',
  '2026-05-27T10:45:00Z'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 13. AI CONFIGURATION
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_config (
  id           TEXT PRIMARY KEY DEFAULT 'default',
  provider     TEXT NOT NULL DEFAULT 'gemini' CHECK (provider IN ('openai', 'deepseek', 'gemini')),
  openai_key   TEXT DEFAULT '',
  deepseek_key TEXT DEFAULT '',
  gemini_key   TEXT DEFAULT '',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO ai_config (id, provider, openai_key, deepseek_key, gemini_key)
VALUES ('default', 'gemini', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 13. Mentor Review System Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS mentor_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  specializations JSONB DEFAULT '[]',
  max_concurrent_reviews INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  total_reviews_completed INTEGER DEFAULT 0,
  average_mentor_score REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mentor_review_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_reference TEXT UNIQUE NOT NULL,
  user_email TEXT NOT NULL,
  user_first_name TEXT DEFAULT '',
  user_country TEXT DEFAULT '',
  user_plan TEXT DEFAULT 'explorer',
  essay_id TEXT NOT NULL,
  essay_version INTEGER DEFAULT 1,
  essay_content TEXT NOT NULL,
  scholarship_name TEXT NOT NULL,
  scholarship_provider TEXT,
  scholarship_deadline TEXT,
  scholarship_host_region TEXT,
  student_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','assigned','under_review','submitted_by_mentor','approved_by_admin','delivered_to_student','cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  response_deadline TIMESTAMPTZ,
  feedback_type TEXT DEFAULT 'basic',
  includes_revised_sections BOOLEAN DEFAULT false,
  includes_strategy_session BOOLEAN DEFAULT false,
  assigned_mentor_email TEXT,
  assigned_mentor_name TEXT,
  assigned_at TIMESTAMPTZ,
  mentor_started_review_at TIMESTAMPTZ,
  mentor_submitted_at TIMESTAMPTZ,
  feedback_overall_assessment TEXT,
  feedback_opening TEXT,
  feedback_narrative TEXT,
  feedback_evidence TEXT,
  feedback_cultural_authenticity TEXT,
  feedback_closing TEXT,
  feedback_general_advice TEXT,
  revised_sections JSONB DEFAULT '[]',
  mentor_confidence_score REAL,
  estimated_success_probability REAL,
  mentor_private_notes TEXT,
  admin_approved_by TEXT,
  admin_approved_at TIMESTAMPTZ,
  admin_approval_notes TEXT,
  admin_rejection_reason TEXT,
  delivered_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mentor_feedback_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES mentor_review_requests(id),
  rated_by_email TEXT NOT NULL,
  helpfulness_rating INTEGER CHECK (helpfulness_rating BETWEEN 1 AND 5),
  accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
  clarity_rating INTEGER CHECK (clarity_rating BETWEEN 1 AND 5),
  would_recommend BOOLEAN DEFAULT false,
  student_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  related_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. SETUP COMPLETE
-- ============================================================

SELECT 'Zawadi database setup complete!' AS status;
SELECT COUNT(*) || ' scholarships' AS result FROM scholarships;
SELECT COUNT(*) || ' profiles' AS result FROM profiles;
SELECT COUNT(*) || ' applications' AS result FROM applications;
SELECT COUNT(*) || ' documents' AS result FROM documents;
SELECT COUNT(*) || ' essays' AS result FROM essays;
SELECT COUNT(*) || ' bot_ingestions' AS result FROM bot_ingestions;
SELECT COUNT(*) || ' payments' AS result FROM payments;
SELECT COUNT(*) || ' audit_logs' AS result FROM audit_logs;
SELECT COUNT(*) || ' mentor_profiles' AS result FROM mentor_profiles;
SELECT COUNT(*) || ' mentor_review_requests' AS result FROM mentor_review_requests;
SELECT COUNT(*) || ' mentor_feedback_ratings' AS result FROM mentor_feedback_ratings;
SELECT COUNT(*) || ' notifications' AS result FROM notifications;
