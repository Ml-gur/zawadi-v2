-- Fix: Scholarships table is missing INSERT, UPDATE, DELETE RLS policies
-- Root cause: Only SELECT policy (scholarships_select_all) exists, so all
-- admin operations (publish/unpublish, create, edit, delete) silently fail
-- with RLS blocking the anon-key authenticated requests.

-- Allow admins to INSERT scholarships
CREATE POLICY scholarships_insert_admin ON scholarships
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE email = (auth.jwt() ->> 'email')
      AND role IN ('super_admin', 'admin')
    )
  );

-- Allow admins to UPDATE scholarships (publish/unpublish, edit)
CREATE POLICY scholarships_update_admin ON scholarships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE email = (auth.jwt() ->> 'email')
      AND role IN ('super_admin', 'admin')
    )
  );

-- Allow admins to DELETE scholarships (or soft-delete by unpublishing)
CREATE POLICY scholarships_delete_admin ON scholarships
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE email = (auth.jwt() ->> 'email')
      AND role IN ('super_admin', 'admin')
    )
  );
