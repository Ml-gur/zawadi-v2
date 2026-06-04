-- Fix: Applications table was missing a UNIQUE constraint on (user_email, scholarship_id)
-- This caused upsertApplication() to create duplicate rows on every status change
-- because .upsert() matched on the primary key (id) which is randomly generated.

-- 1. Remove duplicate rows keeping only the most recent for each user+scholarship pair
DELETE FROM applications a
USING (
  SELECT MIN(id) as keep_id, user_email, scholarship_id
  FROM applications
  GROUP BY user_email, scholarship_id
  HAVING COUNT(*) > 1
) dups
WHERE a.user_email = dups.user_email
  AND a.scholarship_id = dups.scholarship_id
  AND a.id != dups.keep_id;

-- 2. Add the unique constraint (now safe since duplicates are removed)
ALTER TABLE applications
ADD CONSTRAINT applications_user_scholarship_unique
UNIQUE (user_email, scholarship_id);

-- 3. Create an index for faster lookups (also supports the constraint)
CREATE INDEX IF NOT EXISTS idx_applications_user_scholarship
ON applications (user_email, scholarship_id);
