# Admin Portal Rebuild + Data-Layer Fixes — Design Spec

Date: 2026-08-25
Status: Approved (operator confirmed via chat)
Scope: Full admin portal rebuild, document-analysis fix, application-tracker fix.

## Problem statement

Three confirmed defects block the founder from operating the platform:

1. **Document analysis never completes.** The `document-analysis` edge function
   writes `extraction_method` to `documents`, but the live database lacks that
   column (verified: `column documents.extraction_method does not exist` via
   REST probe). Every analysis 500s on its final write; the client then marks
   the document `pending` forever and toasts "Document analysis service is
   temporarily unavailable."
2. **Tracker stages never persist.** Live `applications.id` is `TEXT PRIMARY KEY`
   with no default (verified: insert probe fails `23502 null value in column
   "id"`). The client sends no `id`, and `handleTrackScholarship` swallows the
   error (console only). The applications table has zero rows.
3. **Admin portal is blind.** RLS grants no admin read on `profiles`
   (`profiles_select_own` is the only SELECT policy), applications, documents,
   essays, or payments. The founder sees only their own row. Migration 013's
   `WITH CHECK` blocks client-side plan/status writes for other users.
   `fetchStats` hardcodes applications/documents/essays/MRR to 0 and ships
   empty chart arrays. `audit_logs` is empty — nothing writes to it. The AI
   Config panel writes `ai_config`, which `generate-essay` reads, but
   `document-analysis` ignores (hardcoded DeepSeek + env key). The UI uses dead
   tokens (`bg-off-black`, `status-warning`, `status-error`), emoji icons, and a
   `MockUserType`.

## Approved decisions

- Migration SQL is delivered in-repo + pasted to the operator, who runs it in
  Supabase SQL Editor.
- Full rebuild of all eight admin sections.
- Live updates: 15s polling (paused on hidden tabs), instant refetch after
  mutations, visible "updated Ns ago" stamp.
- Admin data flows through a new `admin-api` edge function (service role,
  caller-role-verified). No RLS widening. This mirrors the existing
  `admin-settings` pattern.

## Architecture

### Data fixes

Migration `supabase/migrations/017_fix_documents_and_applications.sql`:

```sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction_method TEXT;
ALTER TABLE applications ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
```

Client hardening:

- `App.tsx handleTrackScholarship`: toast on error; no silent catch.
- `App.tsx invokeDocAnalysis`: no retry on 4xx (only network/5xx/timeout);
  error message propagated to caller.
- `DocumentVault`: staged upload feedback (uploading → analyzing → done) and
  honest status chips.
- `document-analysis` edge function: read provider/model/key from `ai_config`
  (fallback: env `DEEPSEEK_API_KEY`), matching `generate-essay` behavior.

### admin-api edge function

`supabase/functions/admin-api/index.ts`. Same CORS + auth skeleton as
`admin-settings`: JWT → `auth.getUser` → profile role lookup. `super_admin`
gets all actions; `content_manager` gets read-only + bot moderation. POST
`{ action, params }`, response `{ ok: true, data } | { ok: false, error }`.

Actions:

- `overview` — parallel service-role counts: users (total / active / suspended /
  new-7d), scholarships (total / published / expiring-7d), applications by
  stage, documents (total / pending / failed analysis), essays (total /
  last-7d), payments (successful count, MRR = Σ amount of successful payments
  from active subscriptions), bot_ingestions pending, contact_submissions
  unread, audit_logs count.
- `timeseries` — user growth by month (`joined_at`), essays/day and
  applications/day for last 14 days, top-10 scholarships by `view_count`,
  5 most recent signups (name, country, plan, joined).
- `users.list` — paginated (range), search by name/email, filter by plan and
  status; per-user engagement counts (applications, documents, essays) computed
  with count queries grouped per page of users (bounded, not N+1 across all
  users).
- `user.update` — `{ email, plan?, status? }`; validates plan against
  explorer|plus|pro|institutional and status against active|suspended; writes
  audit entry `{ actor, action: 'user.update', target, changes }`.
- `user.delete` — `{ email }`; deletes profile row (cascades) and the linked
  auth user via `auth.admin.deleteUser` when `auth_user_id` present; audit entry.
- `audit.list` — paginated, newest first.
- `payments.list` — paginated payments (status, plan, amount, date) + MRR
  summary for the PaymentsTab.
- `test` (AI) — pings the provider currently configured in `ai_config` with a
  5-token completion; returns latency + model for the AI Config "Test
  connection" button.

Every mutation is wrapped in try/catch and appends to `audit_logs` via the
service-role client before returning.

### Portal UI

Editorial system only: `off-black-ink` on `pure-white`, `ash` hairlines,
`electric-lime` single accent, Inter Tight, JetBrains Mono numerals, lucide
icons, no emojis, no dead tokens. Left rail nav (desktop) / segmented control
(mobile). Sections, one file each under `src/components/admin/`:

1. `OverviewTab` — 4 headline stats with week-over-week deltas (Users, MRR,
   Live scholarships, Pipeline applications); "Needs attention" strip (pending
   bot items, stuck documents, expiring scholarships, unread contact
   submissions); growth + essay sparklines; recent activity (audit). Stats
   click through to their sections.
2. `UsersTab` — table (search, plan/status filters), row → `UserDrawer` with
   engagement counts and working plan/suspend/delete controls.
3. `ScholarshipsTab` — existing CRUD handlers lifted from `AdminPortal.tsx`
   (form, filters, bulk actions, CSV export), restyled.
4. `BotQueueTab` — existing approve/reject flow, restyled; approve prefills the
   scholarship form.
5. `PaymentsTab` — payments table + MRR summary (via `admin-api`
   `payments.list`, added to the action set).
6. `AuditTab` — real audit trail table.
7. `AiConfigTab` — existing `admin-settings` GET/PUT flow restyled; added
   `test` action in `admin-api` pings the configured provider (5-token ping).
8. `MentorQueueTab` — existing mentor review queue, restyled.

Shared primitives in `src/components/admin/ui/`: `StatCard`, `DataTable`,
`Drawer`, `AdminSectionShell`. Each file < 200 lines where feasible.
`AdminPortal.tsx` becomes a thin shell: nav + data hook + section switch.

### State & polling

`src/hooks/useAdminData.ts`: fetches `overview` + `timeseries` on mount;
`setInterval` 15s paused via `document.visibilityState`; `refresh()` after
mutations; `updatedAt` timestamp; first paint skeleton, then silent refresh;
error banner + retry keeps last-good data. Mutations optimistic with rollback +
error toast.

### Out of scope

- Supabase Realtime channels (polling approved instead).
- RLS widening (explicitly rejected).
- New auth flows; admin route guard stays `user.role === 'super_admin'`
  (client) + server-side role check (edge function).

## Verification plan

1. Operator runs migration SQL; engineer re-probes live REST: documents columns
   resolve; applications upsert probe succeeds and cleans up.
2. Every `admin-api` action verified by curl with service-role JWT-shaped
   requests (contract level), including audit row creation.
3. `npm run lint` (tsc --noEmit) clean.
4. Dev-server screenshots of the rebuilt portal (overview, users, AI config).
5. Operator does the final authenticated click-through (tracker stage change,
   upload → analysis completed, admin user management).
