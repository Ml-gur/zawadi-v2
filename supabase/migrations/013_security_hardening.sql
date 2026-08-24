-- 013_security_hardening.sql
-- Fixes privilege-escalation + draft-exposure findings from 2026-08-24 security audit.
-- Apply in Supabase SQL editor (or via supabase db push). Idempotent.

-- ── F1 (Critical): users must not be able to set their own role/plan/status.
-- Replace the blanket profiles_update_own policy with a column-safe version:
-- users may update profile fields, but role/plan/status/joined_at are service-role only.

DROP POLICY IF EXISTS profiles_update_own ON profiles;

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (auth.email() = email OR auth.role() = 'service_role')
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      auth.email() = email
      AND role  = (SELECT p.role  FROM profiles p WHERE p.email = auth.email())
      AND plan  = (SELECT p.plan  FROM profiles p WHERE p.email = auth.email())
      AND status = (SELECT p.status FROM profiles p WHERE p.email = auth.email())
    )
  );

-- Belt-and-braces: block role/plan/status drift even via future policies.
CREATE OR REPLACE FUNCTION enforce_profile_privileged_columns()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NEW.role <> OLD.role OR NEW.plan <> OLD.plan OR NEW.status <> OLD.status THEN
    IF auth.role() <> 'service_role' THEN
      RAISE EXCEPTION 'role, plan and status can only be changed by the service role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_privileged_columns ON profiles;
CREATE TRIGGER profiles_guard_privileged_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_profile_privileged_columns();

-- ── F7 (Medium): only PUBLISHED scholarships are public; staff keep full read.
-- 001 granted USING (true) to everyone and 011 repeated it for authenticated.
-- Replace both: public sees published rows only; super_admin/content_manager see all.

DROP POLICY IF EXISTS scholarships_select_all ON scholarships;
DROP POLICY IF EXISTS "Authenticated can read scholarships" ON scholarships;

CREATE POLICY "Public read published scholarships"
  ON scholarships
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

CREATE POLICY "Staff read all scholarships"
  ON scholarships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE email = (auth.jwt() ->> 'email')
        AND role IN ('super_admin', 'content_manager')
    )
  );
