-- ============================================================
-- ZAWADI — Migration 021: Fix handle_new_user Auth Trigger
-- Prevents "Database error saving new user" errors during signup
-- by setting both id and auth_user_id, handling conflicts, and
-- catching unexpected errors gracefully.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    email,
    name,
    country,
    plan,
    role,
    status,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', 'Kenya'),
    'explorer',
    'user',
    'active',
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    auth_user_id = EXCLUDED.auth_user_id,
    name = CASE
      WHEN EXCLUDED.name IS NOT NULL AND EXCLUDED.name != ''
      THEN EXCLUDED.name ELSE profiles.name
    END,
    country = CASE
      WHEN EXCLUDED.country IS NOT NULL AND EXCLUDED.country != ''
      THEN EXCLUDED.country ELSE profiles.country
    END,
    updated_at = NOW()::text;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log warning to database log without aborting the auth.users INSERT transaction
  RAISE WARNING 'handle_new_user failed for email %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Harden notification preferences trigger on profiles insert
CREATE OR REPLACE FUNCTION handle_new_user_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, email, new_listing_alerts, notification_frequency)
  VALUES (NEW.id, NEW.email, true, 'instant')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user_notification_prefs failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_notif_prefs ON profiles;
CREATE TRIGGER trg_auto_notif_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_notification_prefs();
