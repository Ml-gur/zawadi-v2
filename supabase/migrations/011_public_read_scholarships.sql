-- ============================================================
-- ZAWADI — Migration 011: Allow anonymous reads of published scholarships
-- ============================================================
-- This policy lets logged-out users read published scholarships
-- from the /scholarships public preview page.
-- It coexists with the existing scholarships_select_all policy
-- (which lets authenticated users read all scholarships) and
-- the admin insert/update/delete policies from migration 009.

DROP POLICY IF EXISTS "Public can read published scholarships" ON scholarships;
CREATE POLICY "Public can read published scholarships" ON scholarships
  FOR SELECT
  TO anon
  USING (published = true);

-- Also allow the authenticated role to still read everything
-- (the scholarships_select_all policy from migration 001 already
--  covers this, but we add an explicit one for clarity)
DROP POLICY IF EXISTS "Authenticated can read scholarships" ON scholarships;
CREATE POLICY "Authenticated can read scholarships" ON scholarships
  FOR SELECT
  TO authenticated
  USING (true);
