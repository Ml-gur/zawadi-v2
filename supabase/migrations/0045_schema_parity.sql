-- ═══════════════════════════════════════════════════════════════
-- ZAWADI — Migration 004a: Schema parity with database.sql
-- ═══════════════════════════════════════════════════════════════
-- The numbered migrations were snapshotted early in the old project's
-- life; database.sql holds the real evolved schema. This migration
-- ports every DDL difference BEFORE 005+ run, so a fresh project can
-- stand up from supabase/migrations alone, in numeric order:
--   001 … 015 (with this file sorting between 004 and 005).
--
-- Idempotent: safe to re-run. No data is inserted here — seed data
-- arrives via 010 and scripts/migrate-data-to-new-project.mjs.
--
-- Covers:
--   1. Helper functions (increment_view_count, set_updated_at,
--      auto_unpublish_expired_scholarships) — 014 REVOKEs two of
--      these, so they must exist by then.
--   2. Guarded column renames on scholarships
--      (country→countries, fields→fields_of_study, host→host_institution)
--   3. Type corrections: deadline TEXT→DATE, verified_at TEXT→TIMESTAMPTZ
--   4. All missing columns (scholarships/profiles/documents/payments/applications)
--      incl. profiles.created_at — required by the auth signup trigger (007)
--   5. bot_ingestions reshape to the pipeline schema
--   6. The 8 tables only database.sql creates: essay_soul_profiles,
--      mentor_review_requests (+mrr_seq/reference trigger),
--      mentor_profiles, mentor_feedback_ratings, notifications,
--      contact_submissions, recommendation_feedback, pipeline_runs
--   7. RLS enabled on the five tables whose policies 005 creates
--      (005 never issues ENABLE ROW LEVEL SECURITY for them)
--   8. Urgency trigger + updated_at triggers + all indexes
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Helper functions ─────────────────────────────────────────
DROP FUNCTION IF EXISTS exec_sql(TEXT);

CREATE OR REPLACE FUNCTION increment_view_count(schol_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE scholarships SET view_count = COALESCE(view_count, 0) + 1 WHERE id = schol_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

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

-- ── 2. Scholarships: guarded renames + type fixes ───────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='scholarships' AND column_name='country') THEN
    ALTER TABLE scholarships RENAME COLUMN country TO countries;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='scholarships' AND column_name='fields') THEN
    ALTER TABLE scholarships RENAME COLUMN fields TO fields_of_study;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='scholarships' AND column_name='host') THEN
    ALTER TABLE scholarships RENAME COLUMN host TO host_institution;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='scholarships'
               AND column_name='deadline' AND data_type='text') THEN
    ALTER TABLE scholarships ALTER COLUMN deadline TYPE DATE USING NULLIF(deadline,'')::date;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='scholarships'
               AND column_name='verified_at' AND data_type='text') THEN
    ALTER TABLE scholarships ALTER COLUMN verified_at TYPE TIMESTAMPTZ USING NULLIF(verified_at,'')::timestamptz;
  END IF;

  -- Old bot_ingestions shape (TEXT id, scholarship_name): replace wholesale
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='bot_ingestions' AND column_name='scholarship_name') THEN
    DROP TABLE bot_ingestions CASCADE;
  END IF;
END $$;

-- ── 3. Missing columns ──────────────────────────────────────────
-- 3a. Scholarships (matching-engine gates, targeting flags, pipeline metadata)
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS funding_type TEXT CHECK (funding_type IN ('Full', 'Partial', 'Tuition Only'));
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS instruction_language TEXT DEFAULT 'English';
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS min_english_score NUMERIC(4,1);
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS min_english_test_type TEXT;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS min_french_level TEXT;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS min_arabic_level TEXT;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS min_portuguese_level TEXT;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS min_work_years NUMERIC(4,1);
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS max_work_years NUMERIC(4,1);
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS min_gpa_normalised NUMERIC(5,3);
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS requires_research BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS requires_publications BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS min_publication_count INTEGER;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS requires_leadership BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS requires_community BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS targets_financial_need BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS targets_first_generation BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS targets_rural_origin BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS targets_ldc_countries BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS is_intra_african BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS stem_focus BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS development_focus BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS social_sciences_focus BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS humanities_focus BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS peace_conflict_focus BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2);
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS scam_flags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS pipeline_source TEXT DEFAULT 'manual';
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS sponsor_type TEXT;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'Normal';
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS host_country JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS iso2 TEXT;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS auto_unpublished BOOLEAN DEFAULT false;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3b. Profiles (setup wizard, language gates, AI doc-extraction overrides).
--     created_at is REQUIRED by handle_new_user() from migration 007.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_income_group TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_rural_origin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_fields JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_degree TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS degree_class TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_country_preference TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS willing_intra_africa BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS english_test_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS english_score TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS french_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS french_test_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS arabic_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS arabic_test_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portuguese_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portuguese_test_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_community_service BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_first_generation BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS financial_need_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_gpa_normalised_extracted NUMERIC(5,3);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_has_research_extracted BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_publication_count_extracted INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_work_years_extracted NUMERIC(4,1);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_has_leadership_extracted BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_reference_sentiment TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_certificate_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3c. Documents (AI analysis pipeline)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_extraction_result JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3d. Payments (Paystack lifecycle)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS authorization_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- 3e. Applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ── 4. bot_ingestions v2 (pipeline schema; recreated if legacy) ──
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

-- ── 5. Tables only database.sql creates ─────────────────────────
CREATE TABLE IF NOT EXISTS essay_soul_profiles (
  user_email       TEXT PRIMARY KEY REFERENCES profiles(email) ON DELETE CASCADE,
  voice_profile    JSONB,
  writing_samples  JSONB DEFAULT '[]'::jsonb,
  style_notes      TEXT DEFAULT '',
  essays_analyzed  INTEGER DEFAULT 0,
  last_updated     TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS mrr_seq START 1;

CREATE TABLE IF NOT EXISTS mentor_review_requests (
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

DROP TRIGGER IF EXISTS trg_mrr_updated_at ON mentor_review_requests;
CREATE TRIGGER trg_mrr_updated_at
  BEFORE UPDATE ON mentor_review_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info',
  related_id  TEXT,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'responded')),
  created_at  TEXT
);

CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id          TEXT PRIMARY KEY,
  user_email  TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  scholarship_id TEXT,
  feedback    TEXT NOT NULL CHECK (feedback IN ('relevant', 'irrelevant')),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     TEXT UNIQUE NOT NULL,
  summary    JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. RLS enable (policies arrive in 005/012; 005 never enables these) ──
ALTER TABLE essay_soul_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_review_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_feedback_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;

-- ── 7. Triggers on scholarships ─────────────────────────────────
DROP TRIGGER IF EXISTS trg_scholarships_updated_at ON scholarships;
CREATE TRIGGER trg_scholarships_updated_at
  BEFORE UPDATE ON scholarships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Base urgency trigger; migration 015 replaces it with opens_at-aware version.
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

-- ── 8. Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_email        ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_plan         ON profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user    ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user     ON applications(user_email);
CREATE INDEX IF NOT EXISTS idx_applications_scholar  ON applications(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_documents_user        ON documents(user_email);
CREATE INDEX IF NOT EXISTS idx_essays_user           ON essays(user_email);
CREATE INDEX IF NOT EXISTS idx_payments_user         ON payments(user_email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_paystack_reference ON payments(paystack_reference) WHERE paystack_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status       ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_webhook      ON payments(webhook_event_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_published    ON scholarships(published);
CREATE INDEX IF NOT EXISTS idx_scholarships_countries    ON scholarships USING gin(countries);
CREATE INDEX IF NOT EXISTS idx_scholarships_fields_of_study ON scholarships USING gin(fields_of_study);
CREATE INDEX IF NOT EXISTS idx_scholarships_degree       ON scholarships USING gin(degree_levels);
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline     ON scholarships(deadline);
CREATE INDEX IF NOT EXISTS idx_scholarships_funding_type ON scholarships(funding_type);
CREATE INDEX IF NOT EXISTS idx_scholarships_host_region  ON scholarships(host_region);
CREATE INDEX IF NOT EXISTS idx_scholarships_urgency      ON scholarships(urgency);
CREATE INDEX IF NOT EXISTS idx_scholarships_category     ON scholarships(category);
CREATE INDEX IF NOT EXISTS idx_scholarships_host_country ON scholarships USING gin(host_country);

CREATE INDEX IF NOT EXISTS idx_bot_ingestions_status           ON bot_ingestions(status);
CREATE INDEX IF NOT EXISTS idx_bot_ingestions_confidence_score ON bot_ingestions(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_bot_ingestions_confidence_tier  ON bot_ingestions(confidence_tier);
CREATE INDEX IF NOT EXISTS idx_bot_ingestions_created_at       ON bot_ingestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_ingestions_host_region      ON bot_ingestions(host_region);
CREATE INDEX IF NOT EXISTS idx_bot_ingestions_pipeline_run_id  ON bot_ingestions(pipeline_run_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_email, is_read);
CREATE INDEX IF NOT EXISTS idx_mfr_request          ON mentor_feedback_ratings(request_id);
CREATE INDEX IF NOT EXISTS idx_rec_feedback_user    ON recommendation_feedback(user_email);
CREATE INDEX IF NOT EXISTS idx_rec_feedback_scholar ON recommendation_feedback(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_mrr_user_email       ON mentor_review_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_mrr_status           ON mentor_review_requests(status);
CREATE INDEX IF NOT EXISTS idx_mrr_assigned_mentor  ON mentor_review_requests(assigned_mentor_email);
CREATE INDEX IF NOT EXISTS idx_mrr_priority         ON mentor_review_requests(priority);
CREATE INDEX IF NOT EXISTS idx_mrr_response_deadline ON mentor_review_requests(response_deadline);

-- ── Verification (run after applying) ───────────────────────────
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public'
--   ORDER BY table_name;   -- expect 18 public tables incl. contact_submissions
-- SELECT count(*) FROM information_schema.columns
--   WHERE table_name='scholarships' AND column_name IN ('countries','fields_of_study','host_institution','iso2','opens_at');
