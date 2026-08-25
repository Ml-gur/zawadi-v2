-- ============================================================
-- ZAWADI — Migration 018: age + gender profile fields
-- Product asks age (not birth year) for eligibility matching;
-- gender gates gender-specific scholarships. DOB stays for
-- legacy rows; matching prefers age when present.
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
