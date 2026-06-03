# Changelog

## 2026-06-03

### Fixed: Profile save - "invalid input syntax for type numeric: ''"

- **Root cause**: `gpa`, `work_experience_years`, and `publications` fields were sent as empty strings `""` to Postgres `NUMERIC`/`INTEGER` columns when users left them blank.
- **Fix**: Added numeric field sanitization in both:
  - `src/components/StudentProfile.tsx:79-85` — sanitizes before `onUpdateProfile`
  - `src/App.tsx:428-434` — `handleUpdateProfile` sanitizes all paths (including ProfileSetupWizard)
- Converts empty strings to `null` for numeric fields before upserting.

### Fixed: Document vault uploads disappearing silently

- **Root cause 1**: Storage bucket `scholarship-docs` may not exist in Supabase project (no migration ever created it).
- **Root cause 2**: No UPDATE RLS policy on `documents` table, causing the AI extraction result update to fail silently.
- **Root cause 3**: Upload errors were silently swallowed (only `console.error`), no user feedback.
- **Fix**: Created `supabase/migrations/004_storage_and_fixes.sql` with:
  - Creates `scholarship-docs` storage bucket
  - Adds storage RLS policy for authenticated users
  - Adds UPDATE RLS policy for `documents` table
  - Adds `mime_type` column to `documents` table
  - Adds missing `destination_openness`, `destination_regions`, `include_fully_funded_anywhere` columns to `profiles`
- **Fix**: `src/App.tsx:409` — Added `toast.error()` on upload failure so users see the error.
- **Fix**: `src/App.tsx:374` — Now includes `mime_type: file.type` in document insert payload.
- **Fix**: `src/lib/supabase.ts:81-82` — Added `mime_type` and `ai_extraction_result` to `Document` type.

### To apply database fixes

Run `supabase/migrations/004_storage_and_fixes.sql` in your Supabase SQL Editor.
