-- ============================================================
-- ZAWADI — Migration 017: document analysis + application id fixes
-- 1. documents.extraction_method — written by document-analysis edge fn
--    on every successful analysis; missing column made EVERY analysis
--    fail its final DB write (42703), leaving docs stuck on 'pending'.
-- 2. applications.id default — tracker upserts send no id; TEXT PK with
--    no default rejected every stage change (23502). Mirrors migration 006.
-- ============================================================

ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction_method TEXT;

ALTER TABLE applications ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
