-- ============================================================
-- ZAWADI — Migration 004: Storage bucket, RLS, missing columns
-- ============================================================
-- Run this in Supabase Dashboard SQL Editor
-- ============================================================

-- 1. Create storage bucket for documents (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scholarship-docs',
  'scholarship-docs',
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

-- 2. Storage RLS policy for documents bucket
DROP POLICY IF EXISTS "storage_documents_self" ON storage.objects;
CREATE POLICY "storage_documents_self" ON storage.objects
  FOR ALL USING (
    bucket_id = 'scholarship-docs'
    AND auth.role() = 'authenticated'
  );

-- 3. Add UPDATE RLS policy for documents table (was missing)
DROP POLICY IF EXISTS documents_update_own ON documents;
CREATE POLICY documents_update_own ON documents
  FOR UPDATE USING (auth.email() = user_email OR auth.role() = 'service_role');

-- 4. Add missing mime_type column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- 5. Add missing columns to profiles table (from 001_initial_schema)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS destination_openness TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS destination_regions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS include_fully_funded_anywhere BOOLEAN DEFAULT true;

-- 6. Add document-enrichment columns for richer profile mapping
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_institution_extracted TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_field_of_study_extracted TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_degree_level_extracted TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_skills_extracted JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_languages_extracted JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_honors_extracted TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_extraction_method TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS doc_extraction_confidence NUMERIC(3,0);

-- 7. Add analysis_status and last_analyzed_at to documents if missing
ALTER TABLE documents ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'pending';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS analysis_error TEXT;
