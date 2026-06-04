-- ============================================================
-- ZAWADI — Migration 006: Document id auto-generation
-- ============================================================

ALTER TABLE documents ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
