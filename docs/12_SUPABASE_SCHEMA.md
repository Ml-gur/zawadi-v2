# Zawadi v2 — Supabase Schema & Migration

**Document Version:** 3.0 (Rebuild)
**Date:** May 27, 2026
**Author:** Techsari Product Team
**Status:** Active — Spec-Driven Development

---

## How to Apply

Run the complete SQL below in **Supabase Dashboard → SQL Editor**. This creates all tables, RLS policies, storage buckets, triggers, and indexes in one migration.

---

## Complete Migration SQL

```sql
-- ============================================================
-- Zawadi v2 — Complete Supabase Migration
-- Run: Supabase Dashboard → SQL Editor → Paste & Execute
-- ============================================================

-- 1. CREATE TABLES
-- ============================================================

-- Scholarships table
CREATE TABLE IF NOT EXISTS public.scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  host TEXT NOT NULL,
  country TEXT[] NOT NULL DEFAULT '{}',
  degree_levels TEXT[] NOT NULL DEFAULT '{}',
  fields TEXT[] NOT NULL DEFAULT '{}',
  funding_type TEXT NOT NULL DEFAULT 'Partial',
  amount TEXT,
  deadline TIMESTAMPTZ NOT NULL,
  description TEXT,
  eligibility TEXT,
  required_documents TEXT[] DEFAULT '{}',
  apply_url TEXT NOT NULL,
  source_url TEXT,
  published BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  country TEXT NOT NULL DEFAULT 'Kenya',
  degree_level TEXT,
  field_of_study TEXT,
  study_country_preference TEXT,
  plan TEXT DEFAULT 'explorer',
  plan_expires_at TIMESTAMPTZ,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Applications tracking
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_id UUID NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started',
  priority TEXT DEFAULT 'normal',
  applied BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, scholarship_id)
);

-- Document metadata
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Essay generations
CREATE TABLE IF NOT EXISTS public.essay_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  essay_type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  scholarship_name TEXT,
  draft TEXT,
  critique TEXT,
  final TEXT,
  stage TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment records
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paystack_reference TEXT NOT NULL UNIQUE,
  paystack_subscription_code TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'KES',
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  webhook_event_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bot ingestion log
CREATE TABLE IF NOT EXISTS public.bot_ingestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_name TEXT NOT NULL,
  host TEXT NOT NULL,
  source_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(scholarship_name, host)
);

-- Admin audit log
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_ingestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- 3. GRANT PERMISSIONS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholarships TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.essay_generations TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_ingestions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO anon, authenticated, service_role;


-- 4. RLS POLICIES
-- ============================================================

-- Scholarships: anyone can read published; service_role full access
DROP POLICY IF EXISTS "Anyone can read published scholarships" ON public.scholarships;
CREATE POLICY "Anyone can read published scholarships" ON public.scholarships
  FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "Service role full access scholarships" ON public.scholarships;
CREATE POLICY "Service role full access scholarships" ON public.scholarships
  FOR ALL USING (auth.role() = 'service_role');

-- User profiles: users manage own; service_role reads all
DROP POLICY IF EXISTS "Users manage own profile" ON public.user_profiles;
CREATE POLICY "Users manage own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role read all profiles" ON public.user_profiles;
CREATE POLICY "Service role read all profiles" ON public.user_profiles
  FOR SELECT USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role update all profiles" ON public.user_profiles;
CREATE POLICY "Service role update all profiles" ON public.user_profiles
  FOR UPDATE USING (auth.role() = 'service_role');

-- Applications: users manage own
DROP POLICY IF EXISTS "Users manage own applications" ON public.applications;
CREATE POLICY "Users manage own applications" ON public.applications
  FOR ALL USING (auth.uid() = user_id);

-- Documents: users manage own
DROP POLICY IF EXISTS "Users manage own documents" ON public.documents;
CREATE POLICY "Users manage own documents" ON public.documents
  FOR ALL USING (auth.uid() = user_id);

-- Essay generations: users manage own
DROP POLICY IF EXISTS "Users manage own essay generations" ON public.essay_generations;
CREATE POLICY "Users manage own essay generations" ON public.essay_generations
  FOR ALL USING (auth.uid() = user_id);

-- Payments: users read own; service_role full access
DROP POLICY IF EXISTS "Users read own payments" ON public.payments;
CREATE POLICY "Users read own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access payments" ON public.payments;
CREATE POLICY "Service role full access payments" ON public.payments
  FOR ALL USING (auth.role() = 'service_role');

-- Bot ingestions: service_role only
DROP POLICY IF EXISTS "Service role manage bot ingestions" ON public.bot_ingestions;
CREATE POLICY "Service role manage bot ingestions" ON public.bot_ingestions
  FOR ALL USING (auth.role() = 'service_role');

-- Audit logs: service_role only
DROP POLICY IF EXISTS "Service role manage audit logs" ON public.audit_logs;
CREATE POLICY "Service role manage audit logs" ON public.audit_logs
  FOR ALL USING (auth.role() = 'service_role');


-- 5. AUTO-PROFILE TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, email, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'country', 'Kenya')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 6. STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,  -- 10MB
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

-- Storage RLS: users can only access their own folder
DROP POLICY IF EXISTS "Users access own documents" ON storage.objects;
CREATE POLICY "Users access own documents" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- 7. INDEXES (Performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_scholarships_country ON scholarships USING GIN (country);
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline ON scholarships (deadline);
CREATE INDEX IF NOT EXISTS idx_scholarships_published ON scholarships (published);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications (user_id);
CREATE INDEX IF NOT EXISTS idx_applications_scholarship_id ON applications (scholarship_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_essays_user_id ON essay_generations (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments (paystack_reference);
CREATE INDEX IF NOT EXISTS idx_bot_ingestions_status ON bot_ingestions (status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);


-- 8. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_scholarships_updated_at ON public.scholarships;
CREATE TRIGGER set_scholarships_updated_at
  BEFORE UPDATE ON public.scholarships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_applications_updated_at ON public.applications;
CREATE TRIGGER set_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

## 9. Verification Checklist

After running the migration, verify:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN (
  'scholarships', 'user_profiles', 'applications', 'documents',
  'essay_generations', 'payments', 'bot_ingestions', 'audit_logs'
);

-- Check policies exist
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public';

-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check storage bucket
SELECT id, name, public FROM storage.buckets;

-- Test: register a user → check user_profiles has a row
```

---

*Schema document reviewed by: _____________________ Date: _____________________*
