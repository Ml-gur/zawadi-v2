# Admin Rebuild + Data Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix document-analysis persistence, tracker stage persistence, and rebuild the admin portal as a live, real-data founder dashboard served by a new `admin-api` edge function.

**Architecture:** Two small DB migrations applied by the operator via SQL Editor; client error-surfacing hardening; one new `admin-api` Deno edge function (service-role inside, caller-role-verified, audit-logged mutations) following the existing `admin-settings` pattern; portal rebuilt as small editorial-styled components fed by a 15s-polling `useAdminData` hook.

**Tech Stack:** React 19 + TypeScript (strict), Tailwind v4 tokens in `src/index.css`, Supabase JS v2 + Deno edge functions, lucide-react, recharts, react-hot-toast, Playwright (screenshots only).

## Global Constraints

- Design tokens: only ones defined in `src/index.css` `@theme` (`off-black-ink`, `pure-white`, `ash`, `electric-lime`, `graphite`, `stone`, `parchment`, `error`, `status-success`, `ed-*` type scale, `rounded-ed`). NEVER `bg-off-black`, `accent-blue`, `status-warning`, `status-error`, `text-cream`-on-dark patterns, or emoji icons.
- No comments unless explaining WHY. No `any` in new code where a type exists in `src/types.ts`.
- Lint gate: `npm run lint` (tsc --noEmit) must pass after every task.
- Conventional commits; commit after every verified task.
- Never print or commit secrets; `.env` values stay local.
- Live-DB probes use `SUPABASE_SERVICE_ROLE_KEY` from `.env` via curl, read-only unless explicitly a cleanup-verified probe.

---

## Phase 1 — Data fixes

### Task 1: Migration 017 + operator application

**Files:**
- Create: `supabase/migrations/017_fix_documents_and_applications.sql`

**Interfaces:**
- Produces: live DB columns `documents.extraction_method TEXT`, `applications.id` default `gen_random_uuid()::text`.

- [ ] Step 1: Write migration file

```sql
-- ============================================================
-- ZAWADI — Migration 017: document analysis + application id fixes
-- 1. documents.extraction_method — written by document-analysis edge fn
-- 2. applications.id default — tracker upserts send no id (mirrors 006)
-- ============================================================

ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction_method TEXT;
ALTER TABLE applications ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
```

- [ ] Step 2: Commit `fix(db): migration 017 — documents.extraction_method + applications.id default`
- [ ] Step 3: Give operator the SQL to paste into Supabase SQL Editor; wait for confirmation
- [ ] Step 4: Verify live with probes:

```bash
set -a; source .env; set +a
curl -s "${SUPABASE_URL}/rest/v1/documents?select=extraction_method&limit=1" -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
# Expect: [] (no 42703)
```

### Task 2: Tracker + analysis client hardening (App.tsx)

**Files:**
- Modify: `src/App.tsx` (`handleTrackScholarship` ~line 376, `invokeDocAnalysis` ~line 509, `handleUploadDocument` error toast ~line 455)

**Interfaces:**
- Produces: `handleTrackScholarship` toasts `error.message` on failure; `invokeDocAnalysis` returns `{ ok: boolean; error?: string }` and does not retry on HTTP 4xx.

- [ ] Step 1: `handleTrackScholarship` — add error toast:

```ts
const { data, error } = await upsertApplication(application);
if (!error && data) {
  setApplications(prev => {
    const filtered = prev.filter(a => a.scholarship_id !== scholarshipId);
    if (status !== 'not_started') filtered.push(data as TrackerType);
    return filtered;
  });
} else if (error) {
  toast.error(error.message || 'Could not update the stage. Try again.');
}
```

- [ ] Step 2: `invokeDocAnalysis` — return shape `{ ok, error }`; skip second attempt when `res.status >= 400 && res.status < 500`; propagate `errBody.error`.
- [ ] Step 3: Update both call sites (`handleUploadDocument`, `handleReanalyzeDocument`) to surface the returned error text in toasts/DB `analysis_error`.
- [ ] Step 4: `npm run lint` passes. Commit `fix(app): surface tracker + analysis errors, stop retrying 4xx`.

### Task 3: document-analysis reads ai_config

**Files:**
- Modify: `supabase/functions/document-analysis/index.ts` (`callDeepSeek` ~line 574, handler ~line 666)

**Interfaces:**
- Consumes: `ai_config` row `id='default'` (provider, deepseek_key, openai_key, gemini_key, ai_model).
- Produces: AI fallback uses configured provider/key/model; env key remains fallback.

- [ ] Step 1: Load config in handler before analyze; pass to extraction:

```ts
const { data: aiCfg } = await supabase.from('ai_config').select('*').eq('id', 'default').maybeSingle()
```

- [ ] Step 2: `callDeepSeek(systemPrompt, textContent, aiCfg)` resolves key `aiCfg?.deepseek_key || Deno.env.get('DEEPSEEK_API_KEY')` and model `aiCfg?.ai_model || 'deepseek-v4-pro'`; if configured provider is not deepseek and no deepseek key exists, skip AI fallback (pattern-only) rather than fail.
- [ ] Step 3: Commit `fix(edge): document-analysis honors ai_config provider settings`.

### Task 4: Vault staged upload feedback

**Files:**
- Modify: `src/components/DocumentVault.tsx` (upload modal region ~line 460+), `src/App.tsx` (`handleUploadDocument`)

**Interfaces:**
- Produces: `onUploadDocument` accepts optional `onStage?: (stage: 'uploading' | 'extracting' | 'analyzing' | 'done') => void`.

- [ ] Step 1: Thread `onStage` through `handleUploadDocument` at each phase boundary.
- [ ] Step 2: Modal shows stage text + spinner; status chip logic unchanged.
- [ ] Step 3: Lint + dev-server screenshot of upload modal. Commit `feat(vault): staged upload progress feedback`.

---

## Phase 2 — admin-api edge function

### Task 5: Function skeleton + overview

**Files:**
- Create: `supabase/functions/admin-api/index.ts`

**Interfaces:**
- Produces: `POST { action, params }` → `{ ok: true, data } | { ok: false, error }`; auth: JWT → role from `profiles`; `super_admin` full, `content_manager` read-only actions (`overview`, `timeseries`, `users.list`, `audit.list`, `payments.list`, `bot.review`).

- [ ] Step 1: CORS + auth + role gate + envelope + action router (copy pattern from `admin-settings/index.ts`).
- [ ] Step 2: `overview` action — parallel `count:'exact', head:true` queries: profiles (total, active, suspended, created_at gte now()-7d), scholarships (total, published, deadline lte now()+7d published), applications grouped by status (select status, count via group? PostgREST: `select=status&limit=1000` then reduce client-side-in-function), documents (total, analysis_status pending, failed), essays (total, created_at gte -7d), payments (status success count, sum amount via `select=amount&status=eq.success` reduce), bot_ingestions pending, contact_submissions (total, is_read false), audit count.
- [ ] Step 3: Commit `feat(edge): admin-api skeleton + overview action`.

### Task 6: timeseries + users.list

- [ ] Step 1: `timeseries` — fetch `profiles.joined_at`, `essays.created_at`, `applications.created_at` (last 90d), reduce in-function to monthly growth + 14d daily arrays; top-10 scholarships by `view_count` (`order=view_count.desc&limit=10&select=id,name,view_count`); 5 recent signups.
- [ ] Step 2: `users.list` — `params: { page, search?, plan?, status? }`; page of 25 profiles ordered `created_at desc`; engagement counts for the page's emails via 3 `in (...)` count queries reduced to a map.
- [ ] Step 3: Commit `feat(edge): admin-api timeseries + users.list`.

### Task 7: user.update / user.delete + audit writes

- [ ] Step 1: `writeAudit(supabase, actor, action, target, changes)` helper inserting into `audit_logs` (service role).
- [ ] Step 2: `user.update` — validate plan ∈ {explorer,plus,pro,institutional}, status ∈ {active,suspended}; update `profiles` by email; audit.
- [ ] Step 3: `user.delete` — lookup `auth_user_id`; `supabase.auth.admin.deleteUser` when present; delete profile row; audit.
- [ ] Step 4: Commit `feat(edge): admin-api user management with audit trail`.

### Task 8: audit.list + payments.list + ai test

- [ ] Step 1: `audit.list` — paginated newest-first.
- [ ] Step 2: `payments.list` — paginated payments `select=id,user_email,plan,amount,status,paystack_reference,created_at`.
- [ ] Step 3: `ai.test` — read `ai_config`, call provider with 5-token ping, return `{ latency_ms, model }`.
- [ ] Step 4: Commit `feat(edge): admin-api audit, payments, ai-test actions`.

### Task 9: Deploy + contract verification (operator deploys)

- [ ] Step 1: Operator: `supabase functions deploy admin-api` (and `document-analysis` if Task 3 changed it).
- [ ] Step 2: Curl every action with an authenticated admin JWT (operator supplies session token from their logged-in browser or CLI); verify `{ ok: true }` shapes + audit rows appear after `user.update` on a throwaway profile.
- [ ] Step 3: Commit nothing (verification only) — record results in `progress.md`.

---

## Phase 3 — Portal rebuild

### Task 10: useAdminData hook + admin/ui primitives

**Files:**
- Create: `src/hooks/useAdminData.ts`, `src/components/admin/ui/StatCard.tsx`, `src/components/admin/ui/DataTable.tsx`, `src/components/admin/ui/Drawer.tsx`, `src/components/admin/ui/AdminSectionShell.tsx`

**Interfaces:**
- Produces: `useAdminData()` → `{ overview, timeseries, loading, error, updatedAt, refresh }`; `callAdminApi<T>(action, params)` in `src/lib/admin-api.ts` → `Promise<T>` posting to `functions/v1/admin-api` with session token.
- StatCard: `{ label, value, delta?, hint?, onClick?, icon }`; DataTable: `{ columns: { key, header, render? }[], rows, onRowClick? }`; Drawer: `{ open, onClose, title, children }`.

- [ ] Step 1: `admin-api.ts` client (session token via `supabase.auth.getSession()`).
- [ ] Step 2: `useAdminData` — 15s interval, `visibilitychange` pause, skeleton-then-silent-refresh, error keeps last good data.
- [ ] Step 3: Primitives on editorial tokens. Lint. Commit `feat(admin): data hook + ui primitives`.

### Task 11: AdminPortal shell

**Files:**
- Rewrite: `src/components/AdminPortal.tsx` (thin shell: nav rail, section switch, header with "Updated Ns ago" + refresh button)
- Create: section stubs rendering "Coming in next task" placeholders that Task 12+ replace.

- [ ] Step 1: Shell + nav (Overview, Users, Scholarships, Bot Queue, Payments, Audit, AI Config, Mentor Queue). Keep route guard in `App.tsx` unchanged.
- [ ] Step 2: Lint + screenshot. Commit `feat(admin): portal shell + navigation`.

### Task 12: OverviewTab

- [ ] Step 1: 4 StatCards with deltas (users new-7d vs prior-7d, MRR vs last month from payments, live scholarships, pipeline applications); "Needs attention" strip; two recharts sparklines (growth bar, essays line) styled `#14140f`/`#beff50`/`#6e6e64`; recent audit feed.
- [ ] Step 2: Lint + screenshot. Commit `feat(admin): overview tab`.

### Task 13: UsersTab + UserDrawer

- [ ] Step 1: Table + search/filters wired to `users.list` (local page state, debounced search).
- [ ] Step 2: Drawer: engagement counts, joined, plan select + suspend/delete via `user.update`/`user.delete` with ConfirmationDialog + optimistic rollback.
- [ ] Step 3: Lint + screenshot. Commit `feat(admin): users tab with working management actions`.

### Task 14: ScholarshipsTab + BotQueueTab

- [ ] Step 1: Lift scholarship CRUD handlers from old AdminPortal (git history is the source) into `useScholarshipAdmin` hook + restyled table/form slide-over; keep CSV export.
- [ ] Step 2: BotQueueTab: approve/reject via existing `run-pipeline` invoke; approve prefills scholarship form.
- [ ] Step 3: Lint + screenshots. Commit `feat(admin): scholarships + bot queue tabs`.

### Task 15: PaymentsTab + AuditTab + MentorQueueTab

- [ ] Step 1: PaymentsTab from `payments.list` (MRR summary + table).
- [ ] Step 2: AuditTab from `audit.list`.
- [ ] Step 3: MentorQueueTab: lift existing mentor queue handlers (`fetchMentorQueue`, approve/review flows).
- [ ] Step 4: Lint + screenshots. Commit `feat(admin): payments, audit, mentor tabs`.

### Task 16: AiConfigTab

- [ ] Step 1: Restyle existing admin-settings GET/PUT panel on editorial tokens; add "Test connection" calling `ai.test`.
- [ ] Step 2: Lint + screenshot. Commit `feat(admin): ai config tab with connection test`.

### Task 17: Final verification

- [ ] Step 1: `npm run lint`; grep new/modified admin files for dead tokens (`rg "bg-off-black\b|accent-blue|status-warning|status-error|material-symbols|emoji" src/components/admin/ src/hooks/` → zero hits).
- [ ] Step 2: Full dev-server screenshot pass of all 8 tabs.
- [ ] Step 3: Operator click-through checklist (tracker stage change persists; upload → analysis completes with badge; admin user plan change persists + audit row).
- [ ] Step 4: Final commit + progress.md update.
