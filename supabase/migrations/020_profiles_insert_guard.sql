-- ============================================================
-- ZAWADI — Migration 020: profiles INSERT privilege guard
-- Closes the escalation path where a fresh auth user could INSERT
-- their own profile row with role='super_admin' (013 guarded UPDATE
-- only). Non-service-role inserts are forced to safe defaults.
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_profile_insert_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.role = 'user';
  NEW.plan = 'explorer';
  NEW.status = 'active';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_guard_insert ON profiles;
CREATE TRIGGER profiles_guard_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_profile_insert_defaults();
