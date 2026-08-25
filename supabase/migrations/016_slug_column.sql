-- 016_slug_column.sql
-- The old production project gained scholarships.slug after database.sql was
-- written; 0045 parity missed it. Public detail routes use it (?slug=).
-- Idempotent. Applied to raomkgvnkgvbbezffpyb via Management API on 2026-08-25.

ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS slug TEXT;

-- Old data: 237/237 published rows have a non-null unique slug.
CREATE UNIQUE INDEX IF NOT EXISTS idx_scholarships_slug ON scholarships(slug);
