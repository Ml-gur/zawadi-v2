# Changelog

## 2026-06-04 (continued — Security & Audit Remediation)

### Critical Security Fixes

**`supabase/functions/process-payment/index.ts`**
- **Sandbox bypass fixed**: Sandbox mode (free plan upgrades without Paystack) is now gated behind `ENVIRONMENT !== 'production'`. In production, if `PAYSTACK_SECRET_KEY` is missing, both `initialize` and `verify` return 5xx errors instead of silently creating free upgrades.
- **Webhook signature verification fixed**: Missing `x-paystack-signature` header now returns HTTP 401 instead of silently skipping verification.
- **CORS restricted**: Updated from `Access-Control-Allow-Origin: '*'` to dynamically resolve origin against an allowlist (`https://www.techsari.online` in production, `localhost:5173` in development).

**`supabase/migrations/005_rls_and_fixes.sql`** (new migration)
- **RLS added to 6 unprotected tables**: `payments`, `audit_logs`, `bot_ingestions`, `contact_submissions`, `recommendation_feedback`, `pipeline_runs` — all now have proper row-level security policies.
- **Payments**: users can SELECT/INSERT/UPDATE own records only.
- **Audit logs, bot ingestions, pipeline runs**: service_role only (no direct public access).
- **Contact submissions**: anon INSERT allowed (for contact form), service_role only for SELECT/UPDATE.
- **Storage bucket ownership fixed**: `scholarship-docs` bucket RLS now requires `storage.foldername(name)[1] = auth.email()` for SELECT/INSERT/DELETE — users can only access their own folder.
- **Document plan limit trigger**: New `check_document_plan_limit()` trigger on `documents` table prevents inserts beyond plan limits (Explorer=15, Plus=50, Pro/Institutional=unlimited). Returns clear error message with plan name.
- **Reapplied all missing RLS policies** for `essay_soul_profiles`, `mentor_review_requests`, `mentor_profiles`, `mentor_feedback_ratings`, `notifications` (safe DROP/CREATE pattern).

**`supabase/config.toml`**
- Password minimum length increased from 6 → 8.
- Password requirements set to `lower_upper_letters_digits`.
- Email confirmations enabled (`enable_confirmations = true`).
- Secure password change enabled (`secure_password_change = true`).

**`.env`**
- Live keys annotated with prominent warnings. User must rotate `PAYSTACK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `DEEPSEEK_API_KEY` in respective dashboards and set via `supabase secrets set`.

### Medium Priority Fixes

**`src/components/SubscriptionPlans.tsx`**
- Removed sandbox leak: error message changed from `'Sandbox upgrade failed. Check server logs.'` → `'Payment verification failed. Please try again or contact support.'`
- Removed "v2" marker: `'Affordable Premium Billing v2'` → `'Affordable Premium Billing'`

**`src/components/AdminPortal.tsx`**
- Replaced fake audit log fallback values (`'Sarah Jenkins'`, `'SCH-01'`, `'194.22.1.201'`, etc.) with empty strings.
- Null admin_email/action/target_type/target_id/details/ip_address now show as blank instead of fabricated data.

**`src/components/StudentProfile.tsx`**
- Removed biased default values: `country` no longer defaults to `'Kenya'`, `gender` to `'Female'`, `degree_level` to `'Bachelors'`, `field_of_study` to `'Computer Science'`, `native_language` to `'English'`. All now default to empty string.
- Fixed financial need dropdown jargon: `'Requires secondary partial grant assistance'` → `'Partial financial assistance needed'`, `'Full Mastercard / DAAD equity support eligible'` → `'Full funding support eligible'`.
- Fixed "v2" marker: `'Onboarding Portal v2'` → `'Onboarding Portal'`

**`src/components/Scholarships.tsx`**
- Sample document upload button gated behind `import.meta.env.DEV` — no longer visible in production builds.

**Removed `_test_jwt.mjs`**
- Deleted test file containing a real admin JWT signed with known secret.

## 2026-06-04 (Initial)

### Removed: All Express.js API calls — fully migrated to Supabase Edge Functions

**Breaking change**: Removed all remaining references to the old Express backend (`server.ts` was already deleted in a prior commit). All frontend API calls now go through Supabase Edge Functions or direct Supabase queries.

#### Files migrated:

**`src/components/SubscriptionPlans.tsx`**
- Removed `authFetch` helper (was using `localStorage` `zawadi_token`)
- Added `import { supabase }` 
- Replaced `fetch('/api/payments/initialize')` → `supabase.functions.invoke('process-payment', { body: { action: 'initialize', ... } })`
- Replaced `fetch('/api/payments/verify')` → `supabase.functions.invoke('process-payment', { body: { action: 'verify', ... } })` (both Pop callback and sandbox)
- Replaced `fetch('/api/payments/abandon')` → `supabase.functions.invoke('process-payment', { body: { action: 'abandon', ... } })`
- **Bug fix**: `authorizationUrl = authorizationUrl || null` → `authorizationUrl = initData.authorization_url` (was always null, breaking mobile money redirect)

**`src/components/MentorPortal.tsx`**
- Removed `authFetch` helper
- Added `import { supabase }`
- Added local `invokeMentor(action, body)` helper wrapping `supabase.functions.invoke('mentor-review', ...)`
- Replaced `fetch('/api/mentor/queue')` → `invokeMentor('my-queue')`
- Replaced `fetch('/api/mentor/queue/:id/start')` → `invokeMentor('start-review', { request_id })`
- Replaced `fetch('/api/mentor/queue/:id/submit')` → `invokeMentor('submit-review', { request_id, ... })`
- Replaced `fetch('/api/notifications?unread=true')` → `supabase.from('notifications').select()`
- Replaced `fetch('/api/notifications/:id/read')` → `supabase.from('notifications').update({ read: true })`

**`src/components/AdminPortal.tsx`**
- Added `import { supabase }`
- Removed `adminFetch` helper (was using `localStorage` `zawadi_admin_token`)
- Added local `invokeMentor(action, body)` helper
- Replaced `fetch('/api/admin/mentor-queue')` → `invokeMentor('mentor-queue')`
- Replaced `fetch('/api/admin/mentor-profiles')` → `invokeMentor('mentor-profiles')`
- Replaced `fetch('/api/admin/mentor-queue/:id/assign')` → `invokeMentor('assign', { request_id, mentor_email })`
- Replaced `fetch('/api/admin/mentor-queue/:id/approve')` → `invokeMentor('approve-review', { request_id })`
- Replaced `fetch('/api/admin/mentor-queue/:id/reject')` → `invokeMentor('reject-review', { request_id, rejection_reason })`
- Replaced `fetch('/api/admin/stats')` → direct `supabase.from('scholarships|profiles|payments|audit_logs|bot_ingestions').select()` queries
- Replaced `fetch('/api/admin/users')` → `supabase.from('profiles').select()`
- Replaced `fetch('/api/admin/users/:email')` PATCH/DELETE → `supabase.from('profiles').update()/.delete()`

**`src/components/admin/BotQueueReview.tsx`**
- Removed `API_BASE` constant and `getAuthHeaders()` helper
- Added `import { supabase }`
- Added local `invokeFn(action, body)` helper wrapping `supabase.functions.invoke('run-pipeline', ...)`
- Replaced all 5 `fetch()` calls (stats, bot-queue, run, approve, reject) with `invokeFn()`

**`src/components/DocumentVault.tsx`**
- Removed unused `authFetch` helper (no calls existed, straight dead code)

**`supabase/functions/run-pipeline/index.ts`**
- **Bug fix**: Renamed `action` to `review_action` in `handleReview` destructuring to avoid naming conflict with the route-level `action` field. Both the route dispatch and the sub-action used the same `action` key, making `handleReview` always receive `action='review'` instead of `'approved'`/`'rejected'`.

### Summary
- **7 frontend files** touched
- **1 Edge Function** fixed (`run-pipeline` review action naming conflict)
- **0 remaining references** to any `/api/` Express endpoint
- All server-side operations now go through: `process-payment`, `mentor-review`, `run-pipeline`, `admin-settings`, `generate-essay` Edge Functions or direct Supabase queries

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

### Fixed: OCR / Document Intelligence broken in browser (Node.js APIs in client bundle)

- **Root cause**: `text-extractor.ts` used Node.js-only modules (`sharp`, `fs`, `path`, `os`, `pdf2pic`, `pdf-parse`) that cannot run in the browser. The dynamic import workaround hid the crash but document analysis silently failed for all file types.
- **Fix**: Rewrote `src/services/text-extractor.ts` to use browser-compatible libraries:
  - `pdfjs-dist` for PDF text extraction and page rendering (replaces `pdf-parse` + `pdf2pic`)
  - `tesseract.js` directly on `Blob` objects for image OCR (removes `sharp` preprocessing)
  - `mammoth` kept for DOCX (browser-compatible)
  - Removed all Node.js-only imports: `sharp`, `fs`, `path`, `os`, `pdf-parse`, `pdf2pic`
- Build no longer has "Module has been externalized for browser compatibility" warnings.

### Fixed: Vercel deployment config (404 on API routes)

- **Root cause**: `vercel.json` still referenced deleted `server.ts` which no longer exists (removed in Express→Supabase migration commit `f608941`).
- **Fix**: `vercel.json` now only has the `@vercel/static-build` build with SPA fallback routing.

### Added: File download from Document Vault

- **Fix**: Students can now download uploaded files from Supabase Storage.
- `src/lib/supabase-queries.ts` — Added `getDocumentDownloadUrl()` and existing `downloadDocument()` now used by the UI.
- `src/components/DocumentVault.tsx` — Added download button on each document card.

### Added: Richer profile enrichment from document extraction

- **Fix**: `src/services/document-intelligence.ts` — `buildProfileEnrichment()` now maps 8+ extracted fields:
  - `doc_institution_extracted`, `doc_field_of_study_extracted`, `doc_degree_level_extracted`
  - `doc_skills_extracted`, `doc_languages_extracted`, `doc_honors_extracted`
  - `doc_extraction_method`, `doc_extraction_confidence`
  - Previously only 5 fields were mapped (GPA, research, publications, work years, leadership).
- **Fix**: `src/App.tsx` — After document analysis, profile enrichment updates the user profile:
  - GPA updates if extracted value is higher
  - Institution, field of study, degree level fill in if currently empty
- `supabase/migrations/004_storage_and_fixes.sql` — Added new columns to `profiles` table for extracted fields.

### Added: Document-grounded essay generation

- The `generate-essay` Edge Function already supported `document_ids` and loaded `ai_extraction_result` from documents to ground the essay. The system prompt now includes: "Ground all claims in the document-based evidence provided — never fabricate GPA, institutions, degrees, or other factual details."
- The critique stage cross-references essay claims against uploaded documents.

### Fixed: Document upload silently fails (re-throw errors to DocumentVault)

- **Root cause**: `handleUploadDocument` in App.tsx caught all errors internally with `console.error` only. The `DocumentVault` component never knew the upload failed — it just showed the upload button re-enabling with no document appearing.
- **Fix**: `src/App.tsx:449-454` — The catch block now calls `toast.error()` AND re-throws the error, so DocumentVault can also catch it and show an inline error message.
- **Fix**: `src/components/DocumentVault.tsx:77-87` — Added try/catch around `onUploadDocument()` call to display inline error in the vault UI.
- **Fix**: `src/App.tsx:378-379` — DB insert error now throws explicitly instead of silently falling through.
- **Fix**: `supabase/migrations/004_storage_and_fixes.sql` — Fixed storage RLS policy: split `FOR ALL USING` (which blocks INSERT) into separate `FOR SELECT`, `FOR INSERT WITH CHECK`, and `FOR DELETE` policies.

### To apply database fixes

Run `supabase/migrations/004_storage_and_fixes.sql` in your Supabase SQL Editor.

## 2026-06-04 (Live System Audit)

### Fixed: Vercel SPA routing (404 on all client-side routes)
- **vercel.json**: Added proper route ordering — static assets first (`/assets/*`, `/sw.js`, `/pwa-icon-*`), then `/[^.]+` SPA fallback to `/dist/index.html`, then catch-all `/(.*)` to `/dist/$1`.
- **Impact**: Routes like `/about`, `/faq`, `/how-it-works`, `/privacy`, `/terms`, `/dashboard`, `/scholarships` were returning HTTP 404 when accessed directly.
- **NOTE**: Requires manual Vercel redeploy to take effect. See below.

### Added: Automated audit script (Playwright)
- `audit_script.mjs` — Headless Chromium script running 38 automated tests across sections A, B, C, H, K, N.
- `AUDIT_RESULTS_AUTOMATED.md` — Saved results from the Playwright run.
- `audit.har` — Network request log (HAR format) for security analysis.

### Playwright Audit Key Findings
**22 PASS / 8 FAIL / 8 PARTIAL** (of 38 automated tests)

**Confirmed working:**
- Login flow (correct + wrong password + non-existent email all work correctly)
- Rate limiting present (no different message on 6th attempt but no crash)
- No Lorem ipsum, no raw icon text, no exposed secrets in page source
- No algorithmic language in profile UI
- 6 homepage sections detected
- No $29 Mentor plan exists (only 3 plans)
- HTTPS redirect works
- Admin login page loads

**Confirmed failures (all same root cause — SPA routing):**
- A16-A21: `/about`, `/faq`, `/how-it-works`, `/privacy`, `/terms` all return 404
- A25, A26: `/dashboard`, `/admin` not redirected (also return 404 since no SPA fallback)
- H1: `/plans` page returns 404

**Partial (need manual verification):**
- RLS and JWT expiry tests — Supabase client not exposed on `window`
- Network Authorization header check — needs HAR file analysis
- Footer links — SPA renders footer client-side, not in initial HTML

## 2026-06-04 — Critical Issue Fixes: Auth Guard + Admin Setup Secret

### Auth Guard: /admin and /dashboard no longer accessible without login
**Root cause**: No `authLoading` state blocked route rendering before Supabase session restoration completed. The initial render had `user = null`, and React Router processed routes before the session check finished, causing a race condition where protected routes briefly appeared accessible.

**Fix** (`src/App.tsx`):
- Added `const [authLoading, setAuthLoading] = useState(true)` — blocks all route rendering until session init completes
- Added `.finally(() => setAuthLoading(false))` to the `supabase.auth.getSession()` promise chain
- Added full-screen loading spinner when `authLoading` is true, preventing any flash of unauthenticated content
- Simplified `/admin` route guard — replaced fragile IIFE with clean ternary chain: `!user → redirect | role !== super_admin → redirect | render AdminPortal`

### Admin Setup Secret applied
- `SETUP_ADMIN_SECRET=zawadi-setup-2026-xk9m` provided by user
- Deployed `setup-admin` Edge Function expects this value in `x-setup-secret` header
- To complete admin setup: `curl -X POST https://dgiqyvnpmeiomvfauetw.supabase.co/functions/v1/setup-admin -H "x-setup-secret: zawadi-setup-2026-xk9m" -H "Content-Type: application/json" -d '{"email":"admin@zawadi.app","password":"<YOUR_ADMIN_PASSWORD>"}'`
- **Note**: Set env var via Supabase Dashboard → Edge Functions → Environment Variables

## 2026-06-04 — 5 Production Bug Fixes

### Bug 1: Account creation auto-login fails
**Root cause**: `supabase/config.toml` had `enable_confirmations = true`, which meant after `supabase.auth.signUp()`, no session was returned. The auto-login fallback (`signInWithPassword`) failed because unconfirmed emails can't sign in. Manual login also failed for the same reason.

**Fix** (`supabase/config.toml:226`):
- `enable_confirmations` changed from `true` → `false`
- Users are now auto-confirmed on signup, so both auto-login and manual login work immediately
- Added 1.5s delay before auto-login retry for reliability

### Bug 2: Onboarding Guide not reflecting saved profile fields
**Root cause**: The `confirmed_fields` array on the profile object was never written to the DB. The Dashboard (`Dashboard.tsx:51`) reads `user.confirmed_fields` to determine which onboarding guide fields are complete, but `handleUpdateProfile` in `App.tsx` never set this field.

**Fix** (`src/App.tsx:465-486`):
- After saving profile fields, compute which non-null keys were just submitted
- Merge them with existing `confirmed_fields` from user state
- Include merged `confirmed_fields` in the upsert payload
- Also updates `confirmed_fields` on voice profile saves (line 529)

### Bug 3: Document upload null id constraint
**Root cause**: `documents` table (`001_initial_schema.sql:80`) has `id TEXT PRIMARY KEY`, but `handleUploadDocument` (`App.tsx:369`) created the `doc` object without an `id` field. Postgres rejects the NULL primary key.

**Fix**:
- Added `id: crypto.randomUUID()` to the doc object in `handleUploadDocument` (`App.tsx:370`)
- Created `supabase/migrations/006_document_id_default.sql` that adds `DEFAULT gen_random_uuid()::text` as a DB-level safety net

### Bug 4: Admin login fails
**Root cause**: The admin user (`admin@zawadi.app`) exists in the `profiles` table (from the old Express JWT era) but has no corresponding entry in `supabase.auth.users`. Since the platform migrated from Express JWT to native Supabase Auth, admin login via `supabase.auth.signInWithPassword()` fails with "Invalid login credentials" because no auth user exists.

**Fix**:
- Created `supabase/functions/setup-admin/index.ts` — a new Edge Function that creates the admin auth user using `supabase.auth.admin.createUser()`
- The function:
  - Authenticates via `x-setup-secret` header (requires `SETUP_ADMIN_SECRET` env var)
  - Checks if auth user already exists (returns 409 if so)
  - Creates auth user with `email_confirm: true`
  - Copies old profile data (name, role, plan, etc.) to the new profile
  - Sets `role = 'super_admin'` on the new profile
  - Deletes the old profile row
- Deployed and ACTIVE on Supabase
- **Manual step**: Set `SETUP_ADMIN_SECRET` in Supabase Dashboard → Edge Functions env vars, then call the function

### Bug 5: Essay generation Edge Function error
**Root cause**: The `generate-essay` Edge Function was deployed and ACTIVE but used an invalid DeepSeek model name (`deepseek-v4-flash` instead of `deepseek-chat`), causing the AI provider call to fail. Additionally, critique-stage essays were incorrectly saved to the `final` field instead of `critique`.

**Fix** (`supabase/functions/generate-essay/index.ts`):
- Default model changed from `deepseek-v4-flash` → `deepseek-chat` (valid DeepSeek API model, line 53)
- Critique stage now saves to `critique` field instead of `final`
- Added error logging for essay insert/update failures
- Essay selection now handles empty `scholarship_name`
- All stages (draft, critique, polish) properly save to the database (previously only draft/polish were saved)
- Deployed as version 2, ACTIVE

### ACTION REQUIRED: Trigger Vercel redeploy
1. Go to https://vercel.com/ → your project → Deployments
2. Find the latest deployment (commit `fde3dac`)
3. Click the three dots → Redeploy
4. OR run: `npx vercel --prod` (requires Vercel login)
5. After redeploy, SPA routes will work correctly
