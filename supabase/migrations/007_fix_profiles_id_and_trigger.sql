-- Fix profiles table: add missing id column and update trigger to use UPSERT

-- Add id column (UUID, auto-generated) if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Set id for any existing rows that don't have one
UPDATE profiles SET id = gen_random_uuid() WHERE id IS NULL;

-- Make id NOT NULL
ALTER TABLE profiles ALTER COLUMN id SET NOT NULL;

-- Keep existing PK on email (too many FKs depend on it), but ensure id has a unique index
CREATE UNIQUE INDEX IF NOT EXISTS profiles_id_idx ON profiles (id);

-- Update the trigger function to use ON CONFLICT (email) DO UPDATE
-- This prevents auth user creation from failing when a profile row already exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, country, plan, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'country',
    'explorer',
    'user',
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    name = CASE
      WHEN EXCLUDED.name IS NOT NULL AND EXCLUDED.name != ''
      THEN EXCLUDED.name ELSE profiles.name
    END,
    country = CASE
      WHEN EXCLUDED.country IS NOT NULL AND EXCLUDED.country != ''
      THEN EXCLUDED.country ELSE profiles.country
    END,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
