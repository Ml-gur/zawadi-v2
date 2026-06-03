-- ============================================================
-- ZAWADI v2 — COMPLETE SUPABASE DATABASE SYSTEM
-- ============================================================
-- Run once in Supabase SQL Editor. Creates everything:
-- tables, RLS, triggers, functions, views, indexes,
-- storage buckets, seed data, and realtime config.
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1a. USER PROFILES (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  name        TEXT NOT NULL DEFAULT '',
  country     TEXT NOT NULL DEFAULT 'Kenya',
  degree_level TEXT CHECK (degree_level IN ('Bachelors','Masters','PhD','Doctorate','Postdoctoral','Diploma','Certificate')),
  field_of_study TEXT,
  destination_openness TEXT,
  destination_regions TEXT[] DEFAULT '{}',
  include_fully_funded_anywhere BOOLEAN DEFAULT true,
  institution TEXT,
  gpa         NUMERIC(4,2),
  gpa_scale   TEXT DEFAULT '4.0',
  degree_class TEXT,
  native_language TEXT DEFAULT 'English',
  additional_languages TEXT[] DEFAULT '{}',
  work_experience_years NUMERIC(4,1) DEFAULT 0,
  has_research BOOLEAN DEFAULT false,
  publications INTEGER DEFAULT 0 CHECK (publications >= 0),
  has_leadership BOOLEAN DEFAULT false,
  verified_via_doc BOOLEAN DEFAULT false,
  role        TEXT NOT NULL DEFAULT 'user'
              CHECK (role IN ('user','support_agent','content_manager','super_admin')),
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','suspended','banned')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 1b. SUBSCRIPTION PLANS (catalog)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price_usd   INTEGER NOT NULL DEFAULT 0,
  price_kes   INTEGER NOT NULL DEFAULT 0,
  essay_limit INTEGER NOT NULL DEFAULT 3,
  doc_limit   INTEGER NOT NULL DEFAULT 5,
  features    JSONB DEFAULT '[]',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 1c. USER SUBSCRIPTIONS (tracks active & history)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id       TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','cancelled','expired','past_due')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end   TIMESTAMPTZ,
  cancelled_at   TIMESTAMPTZ,
  paystack_subscription_code TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 1d. DAILY USAGE (per-user per-day counters)
CREATE TABLE IF NOT EXISTS public.daily_usage (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date               DATE NOT NULL DEFAULT CURRENT_DATE,
  essays_generated   INTEGER NOT NULL DEFAULT 0 CHECK (essays_generated >= 0),
  documents_uploaded INTEGER NOT NULL DEFAULT 0 CHECK (documents_uploaded >= 0),
  api_calls          INTEGER NOT NULL DEFAULT 0 CHECK (api_calls >= 0),
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 1e. SCHOLARSHIPS
CREATE TABLE IF NOT EXISTS public.scholarships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  provider          TEXT NOT NULL,
  host              TEXT NOT NULL,
  country           TEXT[] NOT NULL DEFAULT '{}',
  degree_levels     TEXT[] NOT NULL DEFAULT '{}',
  fields            TEXT[] NOT NULL DEFAULT '{}',
  funding_type      TEXT NOT NULL DEFAULT 'Partial'
                    CHECK (funding_type IN ('Full','Partial','Tuition','Stipend','Other')),
  amount            TEXT,
  deadline          TIMESTAMPTZ NOT NULL,
  description       TEXT,
  eligibility       TEXT,
  required_documents TEXT[] DEFAULT '{}',
  apply_url         TEXT NOT NULL,
  source_url        TEXT,
  published         BOOLEAN DEFAULT false,
  verified_at       TIMESTAMPTZ,
  view_count        INTEGER DEFAULT 0 CHECK (view_count >= 0),
  no_ielts          BOOLEAN DEFAULT false,
  host_region       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- 1f. APPLICATIONS (user tracked applications)
CREATE TABLE IF NOT EXISTS public.applications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_id UUID NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'Not Started'
                 CHECK (status IN ('Not Started','Saved','Drafting','Ready','Applied','Interview','Awarded','Rejected','Archived')),
  priority       TEXT NOT NULL DEFAULT 'Normal'
                 CHECK (priority IN ('High','Normal','Low')),
  applied        BOOLEAN DEFAULT false,
  notes          TEXT DEFAULT '',
  applied_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, scholarship_id)
);

-- 1g. DOCUMENTS (uploaded file metadata)
CREATE TABLE IF NOT EXISTS public.documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL,
  size_bytes     INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  storage_path   TEXT NOT NULL,
  mime_type      TEXT,
  extracted_data JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 1h. ESSAY GENERATIONS
CREATE TABLE IF NOT EXISTS public.essay_generations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_name TEXT,
  essay_type       TEXT NOT NULL,
  prompt           TEXT NOT NULL,
  draft            TEXT,
  critique         TEXT,
  final            TEXT,
  stage            TEXT NOT NULL DEFAULT 'draft'
                   CHECK (stage IN ('draft','critique','polish')),
  word_count       INTEGER,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- 1i. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paystack_reference        TEXT NOT NULL UNIQUE,
  paystack_subscription_code TEXT,
  amount                    INTEGER NOT NULL CHECK (amount >= 0),
  currency                  TEXT NOT NULL DEFAULT 'KES',
  plan                      TEXT NOT NULL,
  status                    TEXT NOT NULL
                            CHECK (status IN ('pending','success','failed','cancelled','refunded')),
  webhook_event_id          TEXT UNIQUE,
  metadata                  JSONB DEFAULT '{}',
  created_at                TIMESTAMPTZ DEFAULT now()
);

-- 1j. BOT INGESTIONS
CREATE TABLE IF NOT EXISTS public.bot_ingestions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_name TEXT NOT NULL,
  provider         TEXT,
  host             TEXT NOT NULL,
  source_url       TEXT,
  apply_url        TEXT,
  confidence       TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected','duplicate')),
  admin_notes      TEXT,
  reviewed_by      UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT now(),
  reviewed_at      TIMESTAMPTZ,
  UNIQUE(scholarship_name, host)
);

-- 1k. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES auth.users(id),
  admin_email TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT,
  details     JSONB DEFAULT '{}',
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 1l. USER SESSIONS
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1m. KNOWLEDGE BASE
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  tags          TEXT[] DEFAULT '{}',
  search_vector TSVECTOR,
  published     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 1n. CONTACT MESSAGES
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT,
  message    TEXT NOT NULL,
  user_id    UUID REFERENCES auth.users(id),
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1o. SAVED SEARCHES
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  filters    JSONB NOT NULL DEFAULT '{}',
  notify     BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1p. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL
             CHECK (type IN ('deadline','status_change','essay_tip','upgrade','admin','system')),
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1q. ESSAY TEMPLATES
CREATE TABLE IF NOT EXISTS public.essay_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  word_target INTEGER DEFAULT 500,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_generations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_ingestions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

-- 3a. ADMIN HELPER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('super_admin','content_manager','support_agent')
  );
END;
$$;

-- 3b. USER PROFILES
DROP POLICY IF EXISTS "user_profiles_self" ON public.user_profiles;
CREATE POLICY "user_profiles_self" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles_admin_read" ON public.user_profiles;
CREATE POLICY "user_profiles_admin_read" ON public.user_profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "user_profiles_admin_write" ON public.user_profiles;
CREATE POLICY "user_profiles_admin_write" ON public.user_profiles
  FOR UPDATE USING (public.is_admin());

-- 3c. SUBSCRIPTION PLANS (anyone can read)
DROP POLICY IF EXISTS "sub_plans_read" ON public.subscription_plans;
CREATE POLICY "sub_plans_read" ON public.subscription_plans
  FOR SELECT USING (true);

-- 3d. USER SUBSCRIPTIONS
DROP POLICY IF EXISTS "user_subs_self" ON public.user_subscriptions;
CREATE POLICY "user_subs_self" ON public.user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_subs_admin" ON public.user_subscriptions;
CREATE POLICY "user_subs_admin" ON public.user_subscriptions
  FOR ALL USING (public.is_admin());

-- 3e. DAILY USAGE
DROP POLICY IF EXISTS "daily_usage_self" ON public.daily_usage;
CREATE POLICY "daily_usage_self" ON public.daily_usage
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "daily_usage_admin" ON public.daily_usage;
CREATE POLICY "daily_usage_admin" ON public.daily_usage
  FOR SELECT USING (public.is_admin());

-- 3f. SCHOLARSHIPS
DROP POLICY IF EXISTS "scholarships_read_published" ON public.scholarships;
CREATE POLICY "scholarships_read_published" ON public.scholarships
  FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "scholarships_admin_all" ON public.scholarships;
CREATE POLICY "scholarships_admin_all" ON public.scholarships
  FOR ALL USING (public.is_admin());

-- 3g. APPLICATIONS
DROP POLICY IF EXISTS "applications_self" ON public.applications;
CREATE POLICY "applications_self" ON public.applications
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "applications_admin" ON public.applications;
CREATE POLICY "applications_admin" ON public.applications
  FOR SELECT USING (public.is_admin());

-- 3h. DOCUMENTS
DROP POLICY IF EXISTS "documents_self" ON public.documents;
CREATE POLICY "documents_self" ON public.documents
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_admin" ON public.documents;
CREATE POLICY "documents_admin" ON public.documents
  FOR SELECT USING (public.is_admin());

-- 3i. ESSAY GENERATIONS
DROP POLICY IF EXISTS "essays_self" ON public.essay_generations;
CREATE POLICY "essays_self" ON public.essay_generations
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "essays_admin" ON public.essay_generations;
CREATE POLICY "essays_admin" ON public.essay_generations
  FOR SELECT USING (public.is_admin());

-- 3j. PAYMENTS
DROP POLICY IF EXISTS "payments_read_self" ON public.payments;
CREATE POLICY "payments_read_self" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;
CREATE POLICY "payments_admin_all" ON public.payments
  FOR ALL USING (public.is_admin());

-- 3k. BOT INGESTIONS
DROP POLICY IF EXISTS "bot_ingestions_admin" ON public.bot_ingestions;
CREATE POLICY "bot_ingestions_admin" ON public.bot_ingestions
  FOR ALL USING (public.is_admin());

-- 3l. AUDIT LOGS
DROP POLICY IF EXISTS "audit_logs_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_admin" ON public.audit_logs
  FOR ALL USING (public.is_admin());

-- 3m. USER SESSIONS
DROP POLICY IF EXISTS "sessions_self" ON public.user_sessions;
CREATE POLICY "sessions_self" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_admin" ON public.user_sessions;
CREATE POLICY "sessions_admin" ON public.user_sessions
  FOR SELECT USING (public.is_admin());

-- 3n. KNOWLEDGE BASE
DROP POLICY IF EXISTS "knowledge_read_published" ON public.knowledge_base;
CREATE POLICY "knowledge_read_published" ON public.knowledge_base
  FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "knowledge_admin_all" ON public.knowledge_base;
CREATE POLICY "knowledge_admin_all" ON public.knowledge_base
  FOR ALL USING (public.is_admin());

-- 3o. CONTACT MESSAGES
DROP POLICY IF EXISTS "contact_insert" ON public.contact_messages;
CREATE POLICY "contact_insert" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "contact_admin" ON public.contact_messages;
CREATE POLICY "contact_admin" ON public.contact_messages
  FOR ALL USING (public.is_admin());

-- 3p. SAVED SEARCHES
DROP POLICY IF EXISTS "saved_searches_self" ON public.saved_searches;
CREATE POLICY "saved_searches_self" ON public.saved_searches
  FOR ALL USING (auth.uid() = user_id);

-- 3q. NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_self" ON public.notifications;
CREATE POLICY "notifications_self" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_admin" ON public.notifications;
CREATE POLICY "notifications_admin" ON public.notifications
  FOR ALL USING (public.is_admin());

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

-- 4a. AUTO-CREATE PROFILE ON SIGNUP (country from user metadata, no hardcoded default)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, email, country, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'country', 'Kenya'),
    'user',
    'active'
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4b. AUTO-SYNC EMAIL TO PROFILES
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.user_profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_email();

-- 4c. SET UPDATED_AT
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to tables
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.user_profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_subs_updated ON public.user_subscriptions;
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_daily_usage_updated ON public.daily_usage;
CREATE TRIGGER trg_daily_usage_updated BEFORE UPDATE ON public.daily_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_scholarships_updated ON public.scholarships;
CREATE TRIGGER trg_scholarships_updated BEFORE UPDATE ON public.scholarships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_applications_updated ON public.applications;
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_essays_updated ON public.essay_generations;
CREATE TRIGGER trg_essays_updated BEFORE UPDATE ON public.essay_generations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_knowledge_updated ON public.knowledge_base;
CREATE TRIGGER trg_knowledge_updated BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_saved_searches_updated ON public.saved_searches;
CREATE TRIGGER trg_saved_searches_updated BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated ON public.user_subscriptions;
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4d. KNOWLEDGE BASE FULL-TEXT SEARCH TRIGGER
CREATE OR REPLACE FUNCTION public.knowledge_search_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    NEW.title || ' ' || NEW.content || ' ' ||
    COALESCE(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_knowledge_search ON public.knowledge_base;
CREATE TRIGGER trg_knowledge_search
  BEFORE INSERT OR UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.knowledge_search_update();

-- ============================================================
-- 5. BUSINESS LOGIC FUNCTIONS
-- ============================================================

-- 5a. GET REMAINING ESSAYS FOR USER TODAY
CREATE OR REPLACE FUNCTION public.get_remaining_essays(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_limit INTEGER;
  v_used  INTEGER;
  v_plan  TEXT;
BEGIN
  SELECT COALESCE(sp.essay_limit, 3) INTO v_limit
  FROM public.user_profiles up
  LEFT JOIN public.user_subscriptions us ON us.user_id = up.id AND us.status = 'active'
  LEFT JOIN public.subscription_plans sp ON sp.id = COALESCE(us.plan_id, 'explorer')
  WHERE up.id = p_user_id
  LIMIT 1;

  SELECT essays_generated INTO v_used
  FROM public.daily_usage
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  RETURN GREATEST(v_limit - COALESCE(v_used, 0), 0);
END;
$$;

-- 5b. CHECK IF CAN GENERATE ESSAY
CREATE OR REPLACE FUNCTION public.can_generate_essay(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public.get_remaining_essays(p_user_id) > 0;
END;
$$;

-- 5c. INCREMENT ESSAY USAGE
CREATE OR REPLACE FUNCTION public.increment_essay_usage(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.daily_usage (user_id, date, essays_generated)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date) DO UPDATE
  SET essays_generated = public.daily_usage.essays_generated + 1,
      updated_at = now();
END;
$$;

-- 5d. GET DOCUMENT LIMIT FOR USER
CREATE OR REPLACE FUNCTION public.get_doc_limit(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_limit INTEGER;
BEGIN
  SELECT COALESCE(sp.doc_limit, 5) INTO v_limit
  FROM public.user_profiles up
  LEFT JOIN public.user_subscriptions us ON us.user_id = up.id AND us.status = 'active'
  LEFT JOIN public.subscription_plans sp ON sp.id = COALESCE(us.plan_id, 'explorer')
  WHERE up.id = p_user_id
  LIMIT 1;
  RETURN v_limit;
END;
$$;

-- 5e. GET USER DOCUMENT COUNT
CREATE OR REPLACE FUNCTION public.get_doc_count(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.documents WHERE user_id = p_user_id;
  RETURN v_count;
END;
$$;

-- 5f. CHECK IF USER CAN UPLOAD DOCUMENT
CREATE OR REPLACE FUNCTION public.can_upload_document(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN public.get_doc_count(p_user_id) < public.get_doc_limit(p_user_id);
END;
$$;

-- 5g. LOG AUDIT ENTRY
CREATE OR REPLACE FUNCTION public.log_audit(
  p_admin_email TEXT,
  p_action      TEXT,
  p_target_type TEXT,
  p_target_id   TEXT DEFAULT NULL,
  p_details     JSONB DEFAULT '{}',
  p_ip_address  TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_logs (admin_id, admin_email, action, target_type, target_id, details, ip_address)
  VALUES (auth.uid(), p_admin_email, p_action, p_target_type, p_target_id, p_details, p_ip_address)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 5h. COMPUTE SCHOLARSHIP MATCH SCORE
CREATE OR REPLACE FUNCTION public.compute_match_score(
  p_scholarship_id UUID,
  p_user_id        UUID
)
RETURNS TABLE (
  score            INTEGER,
  is_eligible      BOOLEAN,
  reasons          TEXT[],
  disqualifiers    TEXT[],
  breakdown        JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_scholarship RECORD;
  v_profile     RECORD;
  v_score       INTEGER := 0;
  v_eligible    BOOLEAN := true;
  v_reasons     TEXT[] := '{}';
  v_disqual     TEXT[] := '{}';
  v_breakdown   JSONB;
  v_country_match    INTEGER := 0;
  v_degree_match     INTEGER := 0;
  v_field_match      INTEGER := 0;
  v_gpa_match        INTEGER := 0;
  v_lang_match       INTEGER := 0;
  v_exp_match        INTEGER := 0;
BEGIN
  SELECT * INTO v_scholarship FROM public.scholarships WHERE id = p_scholarship_id;
  SELECT * INTO v_profile FROM public.user_profiles WHERE id = p_user_id;

  IF v_scholarship.id IS NULL THEN
    disqualifiers := array_append(disqualifiers, 'Scholarship not found');
    RETURN NEXT; RETURN;
  END IF;

  -- Country match (+25)
  IF v_profile.country = ANY(v_scholarship.country) OR 'All' = ANY(v_scholarship.country) THEN
    v_country_match := 25;
    v_reasons := array_append(v_reasons, 'Country eligible');
  ELSE
    v_disqual := array_append(v_disqual, 'Country not in eligibility list');
    v_eligible := false;
  END IF;

  -- Degree level match (+25)
  IF v_profile.degree_level = ANY(v_scholarship.degree_levels) OR 'All' = ANY(v_scholarship.degree_levels) THEN
    v_degree_match := 25;
    v_reasons := array_append(v_reasons, 'Degree level matches');
  ELSE
    v_degree_match := 0;
    v_reasons := array_append(v_reasons, 'Degree level not specified');
  END IF;

  -- Field of study match (+20)
  IF v_profile.field_of_study = ANY(v_scholarship.fields) OR 'All fields' = ANY(v_scholarship.fields) THEN
    v_field_match := 20;
    v_reasons := array_append(v_reasons, 'Field of study matches');
  END IF;

  -- GPA threshold (+15)
  IF v_profile.gpa IS NOT NULL AND v_profile.gpa >= 3.0 THEN
    v_gpa_match := 15;
    v_reasons := array_append(v_reasons, 'GPA meets minimum threshold');
  END IF;

  -- Language match (+10)
  IF v_profile.native_language = 'English' OR v_profile.additional_languages @> ARRAY['English'] THEN
    v_lang_match := 10;
    v_reasons := array_append(v_reasons, 'English proficiency');
  END IF;

  -- Experience (+5)
  IF v_profile.work_experience_years >= 1 THEN
    v_exp_match := 5;
    v_reasons := array_append(v_reasons, 'Has work experience');
  END IF;

  v_score := v_country_match + v_degree_match + v_field_match + v_gpa_match + v_lang_match + v_exp_match;

  v_breakdown := jsonb_build_object(
    'country', v_country_match,
    'degree', v_degree_match,
    'field', v_field_match,
    'gpa', v_gpa_match,
    'languages', v_lang_match,
    'experience', v_exp_match
  );

  RETURN QUERY SELECT
    v_score,
    v_eligible,
    v_reasons,
    v_disqual,
    v_breakdown;
END;
$$;

-- 5i. CREATE NOTIFICATION
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type    TEXT,
  p_title   TEXT,
  p_body    TEXT DEFAULT NULL,
  p_link    TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (p_user_id, p_type, p_title, p_body, p_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 5j. CHECK APPLICATION DEADLINES (call from cron or edge function)
CREATE OR REPLACE FUNCTION public.check_upcoming_deadlines()
RETURNS TABLE (user_id UUID, scholarship_name TEXT, days_remaining INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT a.user_id, s.name,
         EXTRACT(DAY FROM s.deadline - now())::INTEGER AS days_remaining
  FROM public.applications a
  JOIN public.scholarships s ON s.id = a.scholarship_id
  WHERE a.status IN ('Saved','Drafting','Ready')
    AND s.deadline BETWEEN now() AND now() + INTERVAL '14 days'
    AND s.published = true;
END;
$$;

-- ============================================================
-- 6. STORAGE
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage
DROP POLICY IF EXISTS "storage_documents_self" ON storage.objects;
CREATE POLICY "storage_documents_self" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "storage_documents_admin" ON storage.objects;
CREATE POLICY "storage_documents_admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND public.is_admin()
  );

-- ============================================================
-- 7. VIEWS & FUNCTIONS
-- ============================================================

-- 7a. DASHBOARD STATS (per user)
CREATE OR REPLACE VIEW public.view_dashboard_stats AS
SELECT
  up.id AS user_id,
  COALESCE(a.total, 0) AS total_applications,
  COALESCE(a.applied, 0) AS applied_count,
  COALESCE(a.interview, 0) AS interview_count,
  COALESCE(a.awarded, 0) AS awarded_count,
  COALESCE(d.doc_count, 0) AS document_count,
  COALESCE(e.essay_count, 0) AS essay_count,
  COALESCE(s.active_scholarships, 0) AS active_scholarships,
  public.get_remaining_essays(up.id) AS remaining_essays_today,
  public.get_doc_limit(up.id) AS doc_limit,
  public.get_doc_count(up.id) AS doc_used
FROM public.user_profiles up
LEFT JOIN (
  SELECT user_id,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'Applied') AS applied,
    COUNT(*) FILTER (WHERE status = 'Interview') AS interview,
    COUNT(*) FILTER (WHERE status = 'Awarded') AS awarded
  FROM public.applications GROUP BY user_id
) a ON a.user_id = up.id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS doc_count
  FROM public.documents GROUP BY user_id
) d ON d.user_id = up.id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS essay_count
  FROM public.essay_generations GROUP BY user_id
) e ON e.user_id = up.id
LEFT JOIN (
  SELECT COUNT(*) AS active_scholarships FROM public.scholarships WHERE published = true
) s ON true;

-- 7b. ADMIN STATS (enhanced with engagement metrics)
CREATE OR REPLACE VIEW public.view_admin_stats AS
SELECT
  (SELECT COUNT(*) FROM public.user_profiles) AS total_users,
  (SELECT COUNT(*) FROM public.user_profiles WHERE status = 'active') AS active_users,
  (SELECT COUNT(*) FROM public.scholarships) AS total_scholarships,
  (SELECT COUNT(*) FROM public.scholarships WHERE published = true) AS published_scholarships,
  (SELECT COUNT(*) FROM public.scholarships WHERE published = false) AS draft_scholarships,
  (SELECT COUNT(*) FROM public.applications) AS total_applications,
  (SELECT COUNT(*) FROM public.documents) AS total_documents,
  (SELECT COUNT(*) FROM public.essay_generations) AS total_essays,
  (SELECT COUNT(*) FROM public.payments WHERE status = 'success') AS successful_payments,
  (SELECT COUNT(*) FROM public.payments) AS total_payments,
  (SELECT COUNT(*) FROM public.bot_ingestions WHERE status = 'pending') AS pending_ingestions,
  (SELECT COUNT(*) FROM public.contact_messages WHERE is_read = false) AS unread_messages,
  (SELECT COUNT(*) FROM public.daily_usage WHERE date = CURRENT_DATE) AS active_today,
  (SELECT COUNT(*) FROM public.user_subscriptions WHERE plan_id = 'plus' AND status = 'active') AS plus_users,
  (SELECT COUNT(*) FROM public.user_subscriptions WHERE plan_id = 'pro' AND status = 'active') AS pro_users,
  (SELECT COUNT(*) FROM public.user_subscriptions WHERE plan_id = 'mentor' AND status = 'active') AS mentor_users;

-- 7c. GET ADMIN STATS (mirrors server /api/admin/stats endpoint)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
  v_total_users INT;
  v_active_users INT;
  v_total_scholarships INT;
  v_published_scholarships INT;
  v_draft_scholarships INT;
  v_total_applications INT;
  v_total_documents INT;
  v_total_essays INT;
  v_pending_ingestions INT;
  v_total_payments INT;
  v_successful_payments INT;
  v_plus_users INT;
  v_pro_users INT;
  v_mentor_users INT;
  v_explorer_users INT;
  v_mrr NUMERIC;
  v_distribution JSONB;
  v_user_growth JSONB;
  v_app_status_breakdown JSONB;
  v_essay_trend JSONB;
BEGIN
  -- Basic counts
  SELECT COUNT(*) INTO v_total_users FROM public.user_profiles;
  SELECT COUNT(*) INTO v_active_users FROM public.user_profiles WHERE status = 'active';
  SELECT COUNT(*) INTO v_total_scholarships FROM public.scholarships;
  SELECT COUNT(*) INTO v_published_scholarships FROM public.scholarships WHERE published = true;
  SELECT v_total_scholarships - v_published_scholarships INTO v_draft_scholarships;
  SELECT COUNT(*) INTO v_total_applications FROM public.applications;
  SELECT COUNT(*) INTO v_total_documents FROM public.documents;
  SELECT COUNT(*) INTO v_total_essays FROM public.essay_generations;
  SELECT COUNT(*) INTO v_pending_ingestions FROM public.bot_ingestions WHERE status = 'pending';
  SELECT COUNT(*) INTO v_total_payments FROM public.payments;
  SELECT COUNT(*) INTO v_successful_payments FROM public.payments WHERE status = 'success';

  -- Plan distribution (active subscriptions)
  SELECT COUNT(*) INTO v_explorer_users
  FROM public.user_profiles up
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions us
    WHERE us.user_id = up.id AND us.status = 'active'
  );

  SELECT COUNT(*) INTO v_plus_users
  FROM public.user_subscriptions
  WHERE plan_id = 'plus' AND status = 'active';

  SELECT COUNT(*) INTO v_pro_users
  FROM public.user_subscriptions
  WHERE plan_id = 'pro' AND status = 'active';

  SELECT COUNT(*) INTO v_mentor_users
  FROM public.user_subscriptions
  WHERE plan_id = 'mentor' AND status = 'active';

  -- MRR: plus=$5, pro=$12, mentor=$29
  v_mrr := (v_plus_users * 5) + (v_pro_users * 12) + (v_mentor_users * 29);

  v_distribution := jsonb_build_object(
    'explorer', v_explorer_users,
    'plus', v_plus_users,
    'pro', v_pro_users,
    'mentor', v_mentor_users
  );

  -- User growth (by month)
  SELECT jsonb_agg(jsonb_build_object('month', month, 'users', cnt) ORDER BY month)
  INTO v_user_growth
  FROM (
    SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*) AS cnt
    FROM public.user_profiles
    WHERE created_at IS NOT NULL
    GROUP BY month
  ) sub;

  -- Application status breakdown
  SELECT jsonb_object_agg(COALESCE(status, 'Unknown'), cnt)
  INTO v_app_status_breakdown
  FROM (
    SELECT status, COUNT(*) AS cnt
    FROM public.applications
    GROUP BY status
  ) sub;

  -- Essay trend (last 7 days)
  SELECT jsonb_agg(jsonb_build_object('date', day, 'essays', cnt) ORDER BY day)
  INTO v_essay_trend
  FROM (
    SELECT to_char(created_at, 'YYYY-MM-DD') AS day, COUNT(*) AS cnt
    FROM public.essay_generations
    WHERE created_at >= now() - INTERVAL '7 days'
    GROUP BY day
  ) sub;

  v_result := jsonb_build_object(
    'totalScholarships', v_total_scholarships,
    'publishedScholarships', v_published_scholarships,
    'draftScholarships', v_draft_scholarships,
    'totalUsers', v_total_users,
    'activeUsers', v_active_users,
    'activeSubs', v_plus_users + v_pro_users + v_mentor_users,
    'totalApplications', v_total_applications,
    'totalDocuments', v_total_documents,
    'totalEssays', v_total_essays,
    'pendingBotCount', v_pending_ingestions,
    'totalPayments', v_total_payments,
    'successfulPayments', v_successful_payments,
    'mrr', v_mrr,
    'mrrKes', v_mrr * 130,
    'distribution', v_distribution,
    'userGrowth', COALESCE(v_user_growth, '[]'::JSONB),
    'appStatusBreakdown', COALESCE(v_app_status_breakdown, '{}'::JSONB),
    'essayTrend', COALESCE(v_essay_trend, '[]'::JSONB)
  );

  RETURN v_result;
END;
$$;

-- 7d. UPCOMING DEADLINES
CREATE OR REPLACE VIEW public.view_upcoming_deadlines AS
SELECT
  s.id,
  s.name,
  s.provider,
  s.deadline,
  s.funding_type,
  s.country,
  s.degree_levels,
  EXTRACT(DAY FROM s.deadline - now())::INTEGER AS days_remaining
FROM public.scholarships s
WHERE s.published = true
  AND s.deadline BETWEEN now() AND now() + INTERVAL '30 days'
ORDER BY s.deadline ASC;

-- ============================================================
-- 8. INDEXES
-- ============================================================

-- Scholarships
CREATE INDEX IF NOT EXISTS idx_sch_countries     ON public.scholarships USING GIN (country);
CREATE INDEX IF NOT EXISTS idx_sch_degrees       ON public.scholarships USING GIN (degree_levels);
CREATE INDEX IF NOT EXISTS idx_sch_fields        ON public.scholarships USING GIN (fields);
CREATE INDEX IF NOT EXISTS idx_sch_deadline      ON public.scholarships (deadline);
CREATE INDEX IF NOT EXISTS idx_sch_published     ON public.scholarships (published);
CREATE INDEX IF NOT EXISTS idx_sch_funding       ON public.scholarships (funding_type);
CREATE INDEX IF NOT EXISTS idx_sch_name_trgm     ON public.scholarships USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sch_created       ON public.scholarships (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sch_provider      ON public.scholarships (provider);

-- User profiles
CREATE INDEX IF NOT EXISTS idx_up_email          ON public.user_profiles (email);
CREATE INDEX IF NOT EXISTS idx_up_role           ON public.user_profiles (role);
CREATE INDEX IF NOT EXISTS idx_up_status         ON public.user_profiles (status);
CREATE INDEX IF NOT EXISTS idx_up_country        ON public.user_profiles (country);

-- Applications
CREATE INDEX IF NOT EXISTS idx_app_user         ON public.applications (user_id);
CREATE INDEX IF NOT EXISTS idx_app_scholar       ON public.applications (scholarship_id);
CREATE INDEX IF NOT EXISTS idx_app_status        ON public.applications (status);
CREATE INDEX IF NOT EXISTS idx_app_user_status   ON public.applications (user_id, status);
CREATE INDEX IF NOT EXISTS idx_app_priority      ON public.applications (priority);

-- Documents
CREATE INDEX IF NOT EXISTS idx_doc_user          ON public.documents (user_id);
CREATE INDEX IF NOT EXISTS idx_doc_type          ON public.documents (type);
CREATE INDEX IF NOT EXISTS idx_doc_created       ON public.documents (created_at DESC);

-- Essays
CREATE INDEX IF NOT EXISTS idx_ess_user          ON public.essay_generations (user_id);
CREATE INDEX IF NOT EXISTS idx_ess_type          ON public.essay_generations (essay_type);
CREATE INDEX IF NOT EXISTS idx_ess_created       ON public.essay_generations (created_at DESC);

-- Payments
CREATE INDEX IF NOT EXISTS idx_pay_user          ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_pay_reference     ON public.payments (paystack_reference);
CREATE INDEX IF NOT EXISTS idx_pay_status        ON public.payments (status);
CREATE INDEX IF NOT EXISTS idx_pay_created       ON public.payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pay_plan          ON public.payments (plan);

-- Bot ingestions
CREATE INDEX IF NOT EXISTS idx_bot_status        ON public.bot_ingestions (status);
CREATE INDEX IF NOT EXISTS idx_bot_created       ON public.bot_ingestions (created_at DESC);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_action      ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_admin       ON public.audit_logs (admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_created     ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target      ON public.audit_logs (target_type, target_id);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sess_user         ON public.user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sess_token        ON public.user_sessions (token);
CREATE INDEX IF NOT EXISTS idx_sess_expires      ON public.user_sessions (expires_at);

-- Knowledge base
CREATE INDEX IF NOT EXISTS idx_kb_search         ON public.knowledge_base USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_kb_category       ON public.knowledge_base (category);
CREATE INDEX IF NOT EXISTS idx_kb_published      ON public.knowledge_base (published);

-- Daily usage
CREATE INDEX IF NOT EXISTS idx_du_user_date      ON public.daily_usage (user_id, date);
CREATE INDEX IF NOT EXISTS idx_du_date           ON public.daily_usage (date);
CREATE INDEX IF NOT EXISTS idx_du_user           ON public.daily_usage (user_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notif_user        ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read        ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created     ON public.notifications (created_at DESC);

-- Contact messages
CREATE INDEX IF NOT EXISTS idx_contact_read      ON public.contact_messages (is_read);
CREATE INDEX IF NOT EXISTS idx_contact_created   ON public.contact_messages (created_at DESC);

-- User subscriptions
CREATE INDEX IF NOT EXISTS idx_us_user           ON public.user_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_us_status         ON public.user_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_us_plan           ON public.user_subscriptions (plan_id);

-- ============================================================
-- 9. SEED DATA
-- ============================================================

-- 9a. SUBSCRIPTION PLANS
INSERT INTO public.subscription_plans (id, name, price_usd, price_kes, essay_limit, doc_limit, features, sort_order)
VALUES
  ('explorer', 'Explorer', 0, 0, 3, 5,
   '["Browse all scholarships","Unlimited application tracking","5 document uploads","3 AI essays per day","Basic match scores","Deadline alerts"]'::JSONB, 0),
  ('plus', 'Scholar Plus', 5, 650, 10, 15,
   '["10 essays per day","15 documents","Detailed match scores","Document gap analysis","Priority support (48h)"]'::JSONB, 1),
  ('pro', 'Application Pro', 12, 1560, 25, 50,
   '["25 essays per day","50 documents","Auto-apply engine","Essay voice learning","Priority support (24h)"]'::JSONB, 2),
  ('mentor', 'Mentor Review', 29, 3770, 50, 9999,
   '["50 essays per day","Unlimited documents","1-on-1 mentorship","Human essay review","Interview prep","WhatsApp support"]'::JSONB, 3)
ON CONFLICT (id) DO NOTHING;

-- 9b. ESSAY TEMPLATES
INSERT INTO public.essay_templates (name, description, prompt_template, word_target, sort_order)
VALUES
  ('Personal Statement', 'General personal background and aspirations',
   'Write a compelling personal statement for the {scholarship_name} scholarship. Focus on your academic journey, personal background, and future goals as a student from {country}.', 500, 1),
  ('Statement of Purpose', 'Academic and research focused SOP',
   'Write a statement of purpose for {scholarship_name}. Describe your academic background, research interests, and why you chose this program.', 500, 2),
  ('Motivation Letter', 'Why you deserve this scholarship',
   'Write a motivation letter for {scholarship_name}. Explain why you are the ideal candidate, your achievements, and how this scholarship will help you achieve your goals.', 400, 3),
  ('Leadership Essay', 'Showcase leadership experience',
   'Write a leadership essay for {scholarship_name}. Describe a situation where you demonstrated leadership, the impact you made, and what you learned.', 500, 4),
  ('Study Plan', 'Academic plan and research proposal',
   'Write a study plan for {scholarship_name}. Outline your intended course of study, research questions, methodology, and expected outcomes.', 600, 5)
ON CONFLICT DO NOTHING;

-- 9c. KNOWLEDGE BASE
INSERT INTO public.knowledge_base (category, title, content, tags) VALUES
  ('About Zawadi', 'What is Zawadi?',
   'Zawadi is an AI-powered scholarship discovery and application management platform built specifically for African students. We help you find scholarships you are eligible for, track your applications, generate AI-assisted essays, and manage your documents all in one place. "Zawadi" means "gift" in Swahili.',
   ARRAY['about','platform','overview']),
  ('About Zawadi', 'Who built Zawadi?',
   'Zawadi is built by Techsari, a technology company focused on building AI-powered tools for Africa.',
   ARRAY['about','company','techsari']),
  ('About Zawadi', 'Which countries do you cover?',
   'Zawadi covers all 54 African countries. Our scholarship database is filtered specifically for African student eligibility.',
   ARRAY['countries','coverage','africa']),
  ('About Zawadi', 'How is Zawadi different?',
   'Unlike generic aggregators, Zawadi is Africa-first. We verify every listing for African eligibility, provide AI essay generation, track applications through 8 stages, analyze your documents for gaps, and can auto-fill application forms.',
   ARRAY['about','comparison','unique']),
  ('Pricing', 'Is Zawadi free?',
   'Yes! Zawadi has a generous free tier (Explorer plan) that includes unlimited scholarship browsing, unlimited application tracking, 5 document uploads, and 3 AI-generated essays per day. You only upgrade when you need more.',
   ARRAY['pricing','free','plans','explorer']),
  ('Pricing', 'How much do paid plans cost?',
   'Scholar Plus: $5/month or $50/year. Application Pro: $12/month or $120/year. Mentor Review: $29/month or $290/year. All prices shown in USD and Kenyan Shillings (KES). Payments via Paystack.',
   ARRAY['pricing','plans','cost','subscription']),
  ('Pricing', 'What can I do on the free Explorer plan?',
   'Free users can: Browse all published scholarships, track unlimited applications through 8 stages, upload up to 5 documents, generate 3 AI essays per day, get basic match scores and deadline urgency indicators, and access all public resources.',
   ARRAY['pricing','free','explorer','features']),
  ('Pricing', 'Can I cancel my subscription?',
   'Yes, you can cancel anytime. Your access continues until the end of your current billing period. No cancellation fees. After cancellation, your account reverts to the free Explorer plan.',
   ARRAY['pricing','cancel','subscription']),
  ('Scholarships', 'How do you find scholarships?',
   'Our AI-powered Zawadi Bot searches for scholarships daily across university websites, government portals, and foundation pages. Every scholarship is verified for African eligibility with direct application links.',
   ARRAY['scholarships','discovery','bot','verification']),
  ('Scholarships', 'Can I trust the scholarship listings?',
   'Yes. Every scholarship is verified for African eligibility, current deadlines, and direct application links. Our dead link rate is under 2% with automated daily checks.',
   ARRAY['scholarships','trust','verification','accuracy']),
  ('Scholarships', 'How often are scholarships added?',
   'The Zawadi Bot runs daily at 9 AM East Africa Time. New listings go through admin review before being published. Fresh scholarships available every week.',
   ARRAY['scholarships','frequency','updates','bot']),
  ('Application Tracking', 'How does the application tracker work?',
   'Track your progress through 8 stages: Not Started, Saved, Drafting, Ready, Applied, Interview, Awarded, Rejected. Set priority levels (High/Normal/Low), add notes, and view overall progress on your dashboard.',
   ARRAY['tracking','applications','stages','pipeline']),
  ('Application Tracking', 'How many applications can I track?',
   'Unlimited! Application tracking is free and unlimited on all plans including Explorer.',
   ARRAY['tracking','limits','unlimited']),
  ('AI Essay Generator', 'How does the AI essay generator work?',
   'Three-stage pipeline: Draft (creates first draft based on your prompt), Critique & Rewrite (reviews for clarity and persuasiveness), Final Polish (optimizes language and impact).',
   ARRAY['essays','ai','generator','pipeline']),
  ('AI Essay Generator', 'What types of essays can it generate?',
   'Personal Statement, Statement of Purpose (SOP), Motivation Letter, Leadership Essay, Study Plan / Research Proposal.',
   ARRAY['essays','types','personal statement','sop','motivation letter']),
  ('AI Essay Generator', 'Are the essays good enough to submit?',
   'AI-generated essays are powerful starting points, but always review, personalize, and verify before submitting. The AI captures structure and key points; your unique voice makes the essay truly yours.',
   ARRAY['essays','quality','submission','review']),
  ('AI Essay Generator', 'Are my essay prompts private?',
   'Yes. Your essay prompts and generated content are private to your account. We use prompts transiently to generate essays but do not use them to train AI models.',
   ARRAY['essays','privacy','security','data']),
  ('Documents', 'What documents can I upload?',
   'CV, Resume, Transcript, Certificate, Motivation Letter, Statement of Purpose, Reference Letters, Passport copy, Financial Evidence, Admission Letter, Essays, and Other application documents.',
   ARRAY['documents','types','upload']),
  ('Documents', 'What file formats do you accept?',
   'PDF, DOCX, JPG, PNG, and TXT files. Maximum 10MB per file.',
   ARRAY['documents','formats','pdf','limits']),
  ('Documents', 'Is there a limit on documents?',
   'Explorer (Free): 5 documents. Scholar Plus: 15 documents. Application Pro: 50 documents. Mentor Review: Unlimited.',
   ARRAY['documents','limits','plans']),
  ('Documents', 'Where are my documents stored?',
   'Documents are stored securely on Supabase Storage with encryption. Each user documents are private and only accessible by that user, enforced by row-level security.',
   ARRAY['documents','storage','security','supabase']),
  ('Payments & Security', 'How do I pay?',
   'We use Paystack for payments. Pay with debit/credit cards, mobile money (M-Pesa), or bank transfer in Kenyan Shillings (KES). PCI-DSS compliant. We never see or store your card details.',
   ARRAY['payments','paystack','mpesa','security']),
  ('Payments & Security', 'Is my data safe?',
   'Yes. Passwords are hashed (bcrypt). All data encrypted at rest (AES-256) and in transit (TLS 1.2+). Row-level security ensures each user only accesses their own data. We never sell your data.',
   ARRAY['security','privacy','encryption','data']),
  ('Payments & Security', 'How do I delete my account?',
   'Contact us at privacy@techsari.online to request account deletion. Your data will be permanently deleted within 30 days. You can also delete individual documents and application data directly from the platform.',
   ARRAY['account','deletion','privacy','gdpr']),
  ('Support', 'How do I contact support?',
   'General: hello@techsari.online. Privacy: privacy@techsari.online. Legal: legal@techsari.online. Security: security@techsari.online.',
   ARRAY['support','contact','email']),
  ('Support', 'What support do I get on each plan?',
   'Explorer: FAQ and community resources. Scholar Plus: Email support (48h response). Application Pro: Priority email (24h). Mentor Review: Priority (12h) + WhatsApp access.',
   ARRAY['support','plans','response time']),
  ('Technical', 'Do I need to install anything?',
   'No! Zawadi is a web app at www.techsari.online. Works on desktop and mobile. Installable as a Progressive Web App (PWA) for offline access.',
   ARRAY['technical','installation','pwa','browser']),
  ('Technical', 'What browsers do you support?',
   'Chrome, Firefox, Safari, and Edge (latest versions).',
   ARRAY['technical','browsers','compatibility']),
  ('Technical', 'Does it work on slow internet?',
   'Yes. Zawadi is designed for African internet conditions. Landing page loads under 3 seconds on 3G. PWA enables offline access to saved data.',
   ARRAY['technical','performance','offline','pwa']),
  ('Technical', 'Does Zawadi work on mobile?',
   'Yes! Fully responsive on phones, tablets, and desktops. Installable as PWA for native app-like experience with offline support.',
   ARRAY['technical','mobile','responsive','pwa'])
ON CONFLICT DO NOTHING;

-- 9d. SAMPLE SCHOLARSHIPS
INSERT INTO public.scholarships (name, provider, host, country, degree_levels, fields, funding_type, amount, deadline, description, eligibility, required_documents, apply_url, published, verified_at, view_count)
VALUES
  ('MasterCard Foundation Scholars Program',
   'MasterCard Foundation',
   'University of Nairobi',
   ARRAY['Kenya','Uganda','Tanzania','Rwanda','Ethiopia','Ghana','Nigeria','South Africa'],
   ARRAY['Bachelors','Masters'],
   ARRAY['All fields'],
   'Full',
   'Full tuition + living stipend',
   '2026-09-30 23:59:59+03',
   'The MasterCard Foundation Scholars Program provides comprehensive scholarships to academically talented young people from Africa facing economic challenges. Covers full tuition, accommodation, books, and living expenses.',
   'Must be from an African country. Demonstrated financial need. Strong academic record. Commitment to giving back to your community.',
   ARRAY['Academic Transcript','Recommendation Letters','Personal Statement','Financial Evidence'],
   'https://mastercardfdn.org/all/scholarships/',
   true,
   now(),
   1250),
  ('African Women in STEM Fellowship',
   'African Development Bank',
   'Carnegie Mellon University Africa',
   ARRAY['Rwanda','Kenya','Nigeria','Ghana','Ethiopia','South Africa','Uganda','Tanzania'],
   ARRAY['Masters'],
   ARRAY['Computer Science','Engineering','STEM'],
   'Full',
   'Full tuition + stipend $15,000/yr',
   '2026-08-15 23:59:59+03',
   'Fellowship for African women pursuing Masters degrees in STEM fields at CMU Africa. Includes mentorship program and leadership training.',
   'Female applicant. African citizen. Admitted to CMU Africa Masters program. STEM background.',
   ARRAY['Academic Transcript','SOP','Recommendation Letters','Proof of Citizenship'],
   'https://www.cmu.edu/africa/admissions/fees-and-funding/index.html',
   true,
   now(),
  890),
  ('DAAD African in-country Scholarship',
   'DAAD (German Academic Exchange Service)',
   'Multiple Universities in Africa',
   ARRAY['Kenya','Ethiopia','Uganda','Tanzania','Rwanda','Burundi','South Sudan','Somalia','DRC'],
   ARRAY['Masters','PhD'],
   ARRAY['Engineering','Public Health','Environmental Science','Agriculture','Economics'],
   'Full',
   'Tuition + monthly stipend + research allowance',
   '2026-07-31 23:59:59+03',
   'DAAD supports postgraduate studies at selected African universities. Focus on development-related fields.',
   'Graduate degree. At least 2 years professional experience. Demonstrated commitment to development.',
   ARRAY['Degree Certificate','Transcript','Research Proposal','Recommendation Letters'],
   'https://www.daad.de/en/study-and-research-in-germany/scholarships/',
   true,
   now(),
  2100),
  ('Aga Khan Foundation International Scholarship',
   'Aga Khan Foundation',
   'Various Universities Worldwide',
   ARRAY['Kenya','Uganda','Tanzania','India','Pakistan','Bangladesh','Afghanistan','Syria','Egypt','Madagascar','Mozambique'],
   ARRAY['Masters','PhD'],
   ARRAY['All fields'],
   'Partial',
   '50% tuition + living allowance',
   '2026-06-30 23:59:59+03',
   'The Aga Khan Foundation provides a limited number of scholarships each year for postgraduate studies to outstanding students from select developing countries.',
   'Excellent academic records. Demonstrated financial need. Admitted to recognized university. Commitment to community development.',
   ARRAY['Application Form','Academic Records','Recommendation Letters','Financial Need Statement'],
   'https://www.akdn.org/our-agencies/aga-khan-foundation',
   true,
   now(),
  1560),
  ('Chevening Scholarship Kenya',
   'UK Foreign & Commonwealth Office',
   'UK Universities',
   ARRAY['Kenya'],
   ARRAY['Masters'],
   ARRAY['All fields'],
   'Full',
   'Full tuition + living expenses + airfare',
   '2026-11-05 23:59:59+03',
   'Chevening is the UK Government global scholarship programme. Funded by the Foreign and Commonwealth Office and partner organisations.',
   'Kenyan citizen. Minimum 2 years work experience. Undergraduate degree. Return to Kenya for 2 years after scholarship.',
   ARRAY['Academic Transcript','Recommendation Letters','CV','Personal Statement'],
   'https://www.chevening.org/scholarships/kenya/',
   true,
   now(),
  3200),
  ('Schwarzman Scholars Program',
   'Schwarzman Foundation',
   'Tsinghua University Beijing',
   ARRAY['All'],
   ARRAY['Masters'],
   ARRAY['International Relations','Public Policy','Economics','Business','STEM'],
   'Full',
   'Full tuition + room + board + travel + stipend',
   '2026-09-15 23:59:59+03',
   'Schwarzman Scholars prepares future leaders to understand emerging political and economic trends. One-year Masters at Tsinghua University.',
   'Undergraduate degree. Age 18-28. English proficiency. Demonstrated leadership.',
   ARRAY['Application Form','Academic Records','Resume','Recommendation Letters','Video Essay'],
   'https://www.schwarzmanscholars.org/',
   true,
   now(),
  980),
  ('African Leadership University Scholarship',
   'African Leadership University',
   'ALU Rwanda / Mauritius',
   ARRAY['All'],
   ARRAY['Bachelors'],
   ARRAY['Business','Computer Science','Engineering','Social Sciences'],
   'Partial',
   'Up to 80% tuition reduction',
   '2026-08-30 23:59:59+03',
   'ALU offers need-based scholarships for African students. Entrepreneurial leadership-focused undergraduate program.',
   'African citizen. Strong academic potential. Leadership experience. Financial need.',
   ARRAY['Application','Academic Records','Leadership Essay','Recommendation'],
   'https://www.alueducation.com/scholarships/',
   true,
   now(),
  670)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.essay_generations;

-- ============================================================
-- 11. VERIFICATION QUERIES (run separately)
-- ============================================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
-- SELECT trigger_name, event_manipulation, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY trigger_name;
-- SELECT id, name, public FROM storage.buckets;
-- SELECT * FROM public.subscription_plans ORDER BY sort_order;
-- SELECT category, title FROM public.knowledge_base ORDER BY category, title;
-- SELECT name, provider, funding_type FROM public.scholarships ORDER BY name;
