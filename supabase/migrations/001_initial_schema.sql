-- Zawadi Platform — Initial Schema
-- Run this in the Supabase Dashboard SQL Editor

-- ============================================================
-- TABLES
-- ============================================================

-- 1. User Profiles (linked to auth.users by email)
CREATE TABLE IF NOT EXISTS profiles (
  email           TEXT PRIMARY KEY,
  name            TEXT,
  country         TEXT DEFAULT '',
  degree_level    TEXT,
  field_of_study  TEXT,
  date_of_birth   TEXT,
  gpa             NUMERIC(4,2),
  gpa_system      TEXT,
  gpa_scale       TEXT DEFAULT '4.0',
  native_language TEXT DEFAULT 'English',
  additional_languages JSONB DEFAULT '[]'::jsonb,
  destination_openness TEXT,
  destination_regions JSONB DEFAULT '[]'::jsonb,
  include_fully_funded_anywhere BOOLEAN DEFAULT true,
  work_experience_years NUMERIC(4,1) DEFAULT 0,
  has_research    BOOLEAN DEFAULT false,
  publications    INTEGER DEFAULT 0,
  has_leadership  BOOLEAN DEFAULT false,
  verified_via_doc BOOLEAN DEFAULT false,
  institution    TEXT,
  plan           TEXT DEFAULT 'explorer',
  role           TEXT DEFAULT 'user',
  status         TEXT DEFAULT 'active',
  confirmed_fields JSONB DEFAULT '[]'::jsonb,
  joined_at      TEXT,
  updated_at     TEXT,
  auth_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Scholarships
CREATE TABLE IF NOT EXISTS scholarships (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  provider              TEXT,
  host                  TEXT,
  country               JSONB DEFAULT '[]'::jsonb,
  eligible_country_codes JSONB,
  degree_levels          JSONB DEFAULT '[]'::jsonb,
  fields                JSONB DEFAULT '[]'::jsonb,
  funding_type          TEXT,
  amount                TEXT,
  deadline              TEXT,
  description           TEXT,
  eligibility           TEXT,
  required_documents    JSONB DEFAULT '[]'::jsonb,
  apply_url             TEXT,
  source_url            TEXT,
  published             BOOLEAN DEFAULT false,
  no_ielts              BOOLEAN DEFAULT false,
  work_experience_required INTEGER,
  age_limit_masters     INTEGER,
  age_limit_phd         INTEGER,
  host_region           TEXT,
  verified_at           TEXT,
  view_count            INTEGER DEFAULT 0
);

-- 3. Applications
CREATE TABLE IF NOT EXISTS applications (
  id              TEXT PRIMARY KEY,
  user_email      TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  scholarship_id  TEXT REFERENCES scholarships(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'Saved',
  priority        TEXT DEFAULT 'Medium',
  notes           TEXT,
  updated_at      TEXT
);

-- 4. Documents
CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  user_email  TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  name        TEXT,
  type        TEXT,
  size        TEXT,
  file_path   TEXT,
  uploaded_at TEXT
);

-- 5. Essays
CREATE TABLE IF NOT EXISTS essays (
  id              TEXT PRIMARY KEY,
  user_email      TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  scholarship_name TEXT,
  essay_type      TEXT,
  prompt          TEXT,
  stage           TEXT DEFAULT 'draft',
  draft           TEXT,
  critique        TEXT,
  final           TEXT,
  created_at      TEXT
);

-- 6. Bot Ingestions
CREATE TABLE IF NOT EXISTS bot_ingestions (
  id              TEXT PRIMARY KEY,
  scholarship_name TEXT,
  provider        TEXT,
  host            TEXT,
  source_url      TEXT,
  apply_url       TEXT,
  status          TEXT DEFAULT 'pending',
  confidence      TEXT,
  created_at      TEXT
);

-- 7. Payments / Subscriptions
CREATE TABLE IF NOT EXISTS payments (
  id                        TEXT PRIMARY KEY,
  user_email                TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  paystack_reference        TEXT,
  paystack_subscription_code TEXT,
  amount                    NUMERIC(10,2),
  currency                  TEXT DEFAULT 'KES',
  plan                      TEXT,
  status                    TEXT DEFAULT 'pending',
  webhook_event_id          TEXT,
  created_at                TEXT
);

-- 8. Audit Logs
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

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_email);
CREATE INDEX IF NOT EXISTS idx_applications_scholarship ON applications(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_email);
CREATE INDEX IF NOT EXISTS idx_essays_user ON essays(user_email);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_email);
CREATE INDEX IF NOT EXISTS idx_scholarships_published ON scholarships(published);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;

-- Everyone can read scholarships
CREATE POLICY scholarships_select_all ON scholarships
  FOR SELECT USING (true);

-- Users can read/write their own profiles
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.email() = email OR auth.role() = 'service_role');

CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (auth.email() = email OR auth.role() = 'service_role');

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.email() = email OR auth.role() = 'service_role');

-- Users can read/write their own applications
CREATE POLICY applications_select_own ON applications
  FOR SELECT USING (auth.email() = user_email OR auth.role() = 'service_role');

CREATE POLICY applications_insert_own ON applications
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');

CREATE POLICY applications_update_own ON applications
  FOR UPDATE USING (auth.email() = user_email OR auth.role() = 'service_role');

CREATE POLICY applications_delete_own ON applications
  FOR DELETE USING (auth.email() = user_email OR auth.role() = 'service_role');

-- Documents
CREATE POLICY documents_select_own ON documents
  FOR SELECT USING (auth.email() = user_email OR auth.role() = 'service_role');

CREATE POLICY documents_insert_own ON documents
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');

CREATE POLICY documents_delete_own ON documents
  FOR DELETE USING (auth.email() = user_email OR auth.role() = 'service_role');

-- Essays
CREATE POLICY essays_select_own ON essays
  FOR SELECT USING (auth.email() = user_email OR auth.role() = 'service_role');

CREATE POLICY essays_insert_own ON essays
  FOR INSERT WITH CHECK (auth.email() = user_email OR auth.role() = 'service_role');

CREATE POLICY essays_update_own ON essays
  FOR UPDATE USING (auth.email() = user_email OR auth.role() = 'service_role');

CREATE POLICY essays_delete_own ON essays
  FOR DELETE USING (auth.email() = user_email OR auth.role() = 'service_role');
