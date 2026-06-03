# Express → Supabase Migration Map

**Date:** 2026-06-03  
**Goal:** Eliminate Express server entirely. Frontend → Supabase direct + Edge Functions.  
**Current:** Frontend → Express → Supabase (two hops)  
**Target:** Frontend → Supabase (one hop) + Edge Functions for complex logic

---

## Complete Endpoint Audit (78 endpoints from server.ts)

### Category A: Direct DB Operations → Supabase Client + RLS (39 endpoints)

These are pure CRUD operations. They become direct `supabase.from('table')` calls from the frontend, secured by Row Level Security.

| # | Endpoint | Method | Replaces With | RLS Policy Needed |
|---|----------|--------|---------------|-------------------|
| 1 | `/api/config` | GET | Client-side constant in `src/config/api-config.ts` | None |
| 2 | `/api/health` | GET | Removed (no server to check) | None |
| 3 | `/api/scholarships` | GET | `supabase.from('scholarships').select()` with filters | SELECT: published=true OR role=admin |
| 4 | `/api/match/:scholarshipId` | GET | Client-side `computeScholarshipMatch()` + DB queries | SELECT on profiles, documents, scholarships |
| 5 | `/api/match` | GET | Client-side matching engine + DB queries | SELECT on profiles, documents, scholarships |
| 6 | `/api/match/feedback` | GET | `supabase.from('recommendation_feedback').select()` | SELECT own rows |
| 7 | `/api/match/feedback` | POST | `supabase.from('recommendation_feedback').insert()` | INSERT own rows |
| 8 | `/api/users` | GET | `supabase.from('profiles').select()` | SELECT own row |
| 9 | `/api/users/:email` | GET | `supabase.from('profiles').select().eq('email', email)` | SELECT own row |
| 10 | `/api/users` | POST | `supabase.from('profiles').upsert()` | UPDATE own row |
| 11 | `/api/applications` | GET | `supabase.from('applications').select()` | SELECT own rows |
| 12 | `/api/applications` | POST | `supabase.from('applications').upsert()` | INSERT/UPDATE own rows |
| 13 | `/api/applications/:id` | DELETE | `supabase.from('applications').delete()` | DELETE own rows |
| 14 | `/api/documents` | GET | `supabase.from('documents').select()` | SELECT own rows |
| 15 | `/api/documents/:id` | DELETE | `supabase.from('documents').delete()` + `supabase.storage.from().remove()` | DELETE own rows |
| 16 | `/api/documents/:id/download` | GET | `supabase.storage.from('scholarship-docs').download()` | SELECT own docs |
| 17 | `/api/essays` | GET | `supabase.from('essays').select()` | SELECT own rows |
| 18 | `/api/essays/history` | GET | Same as above | SELECT own rows |
| 19 | `/api/essays/voice-profile` | GET | `supabase.from('profiles').select('voice_profile,essay_style_notes')` | SELECT own row |
| 20 | `/api/essays/voice-profile` | POST | `supabase.from('profiles').update()` | UPDATE own row |
| 21 | `/api/notifications` | GET | `supabase.from('notifications').select()` | SELECT own rows |
| 22 | `/api/notifications/:id/read` | PATCH | `supabase.from('notifications').update({is_read:true})` | UPDATE own rows |
| 23 | `/api/contact` | GET | `supabase.from('contact_submissions').select()` (admin only via RLS) | SELECT for admin roles |
| 24 | `/api/admin/audit` | GET | Edge Function `admin-stats` or direct with RLS for admin | SELECT for admin roles |
| 25 | `/api/admin/logs` | GET | Same as above | SELECT for admin roles |
| 26 | `/api/admin/analysis-logs` | GET | `supabase.from('documents').select().not('analysis_status','is',null)` | SELECT for admin roles |
| 27 | `/api/admin/users` | GET | `supabase.from('profiles').select()` | SELECT for admin roles |
| 28 | `/api/admin/users/:email` | PATCH | `supabase.from('profiles').update()` with service_role in Edge Function | — |
| 29 | `/api/admin/users/:email` | DELETE | `supabase.from('profiles').update({status:'suspended'})` | — |
| 30 | `/api/admin/scholarships` | POST | `supabase.from('scholarships').upsert()` | INSERT for admin roles |
| 31 | `/api/scholarships` | POST | Same as above | INSERT for admin roles |
| 32 | `/api/admin/scholarships/:id` | DELETE | `supabase.from('scholarships').update({published:false})` | UPDATE for admin roles |
| 33 | `/api/scholarships/:id` | DELETE | Same as above | UPDATE for admin roles |
| 34 | `/api/admin/scholarships/bulk-delete` | POST | `supabase.from('scholarships').update({published:false}).in('id',ids)` | UPDATE for admin roles |
| 35 | `/api/admin/scholarships/:id/publish` | PATCH | `supabase.from('scholarships').update({published: !current})` | UPDATE for admin roles |
| 36 | `/api/admin/ingestions` | GET | `supabase.from('bot_ingestions').select()` | SELECT for admin roles |
| 37 | `/api/admin/bot-queue` | GET | `supabase.from('bot_ingestions').select()` with filters/pagination | SELECT for admin roles |
| 38 | `/api/admin/bot-run` | POST | `supabase.from('bot_ingestions').select().eq('status','pending')` | SELECT for admin roles |
| 39 | `/api/admin/bot-queue/review` | POST | Stub — replace with PATCH endpoint | — |

---

### Category B: Authentication → Supabase Auth (6 endpoints)

| # | Endpoint | Method | Supabase Auth Replacement |
|---|----------|--------|---------------------------|
| 40 | `/api/auth/register` | POST | `supabase.auth.signUp({email, password, options:{data:{name, country}}})` |
| 41 | `/api/auth/login` | POST | `supabase.auth.signInWithPassword({email, password})` |
| 42 | `/api/admin/auth/login` | POST | `supabase.auth.signInWithPassword()` + check `profiles.role === 'super_admin'` |
| 43 | `/api/auth/me` | GET | `supabase.auth.getSession()` then `supabase.from('profiles').select()` |
| 44 | `/api/auth/forgot-password` | POST | `supabase.auth.resetPasswordForEmail(email)` |
| 45 | `/api/auth/reset-password` | POST | `supabase.auth.updateUser({password})` |

---

### Category C: Complex Operations → Supabase Edge Functions (14 endpoints)

| # | Endpoint | Method | Edge Function | Secrets Needed |
|---|----------|--------|---------------|----------------|
| 46 | `/api/match-rationale` | POST | `match-rationale` | AI provider keys |
| 47 | `/api/essays/generate` | POST | `generate-essay` | AI provider keys |
| 48 | `/api/documents/upload` | POST | `upload-document` (Storage + trigger analysis) | — |
| 49 | `/api/documents/analyze/:id` | POST | `analyze-document` | AI provider keys |
| 50 | `/api/payments/initialize` | POST | `process-payment` (initialize) | PAYSTACK_SECRET_KEY |
| 51 | `/api/payments/verify` | POST | `process-payment` (verify) | PAYSTACK_SECRET_KEY |
| 52 | `/api/payments/abandon` | POST | `process-payment` (abandon) | PAYSTACK_SECRET_KEY |
| 53 | `/api/payments/webhook` | POST | `process-payment` (webhook) | PAYSTACK_SECRET_KEY |
| 54 | `/api/payments/checkout` | POST | `process-payment` (legacy checkout) | PAYSTACK_SECRET_KEY |
| 55 | `/api/contact` | POST | `send-contact-email` | EMAIL_SERVICE |
| 56 | `/api/essays/request-mentor-review` | POST | `mentor-review` | — |
| 57 | `/api/essays/mentor-review-status/:essay_id` | GET | Direct DB (or merged into `mentor-review` EF) | — |
| 58 | `/api/mentor/feedback-rating/:request_id` | POST | `mentor-review` (submit rating) | — |
| 59 | `/api/admin/pipeline/ingest` | POST | `run-pipeline` (ingest) | INGEST_API_KEY |

---

### Category D: Admin Elevated → Edge Functions with Service Role (19 endpoints)

| # | Endpoint | Method | Edge Function | Notes |
|---|----------|--------|---------------|-------|
| 60 | `/api/admin/mentor-queue` | GET | `mentor-review` (admin list) | Service role |
| 61 | `/api/admin/mentor-queue/:id/assign` | PATCH | `mentor-review` (admin assign) | Service role |
| 62 | `/api/admin/mentor-queue/:id/approve` | PATCH | `mentor-review` (admin approve) | Service role |
| 63 | `/api/admin/mentor-queue/:id/reject` | PATCH | `mentor-review` (admin reject) | Service role |
| 64 | `/api/mentor/queue` | GET | `mentor-review` (mentor list) | — |
| 65 | `/api/mentor/queue/:id/start` | PATCH | `mentor-review` (mentor start) | — |
| 66 | `/api/mentor/queue/:id/submit` | PATCH | `mentor-review` (mentor submit) | — |
| 67 | `/api/admin/mentor-profiles` | GET | `mentor-review` (profiles list) | Service role |
| 68 | `/api/admin/mentor-profiles` | POST | `mentor-review` (upsert profile) | Service role |
| 69 | `/api/admin/bot/scout` | POST | Direct DB (Category A) | Admin RLS |
| 70 | `/api/admin/ingestions/action` | POST | `run-pipeline` (DEPRECATED) | Replaced by PATCH /bot-queue/:id/review |
| 71 | `/api/admin/bot-queue/:id/review` | PATCH | `run-pipeline` (review/approve/reject) | Service role |
| 72 | `/api/admin/pipeline/run` | POST | `run-pipeline` (trigger scan) | Service role |
| 73 | `/api/admin/pipeline/stats` | GET | `admin-stats` or direct DB | Admin RLS |
| 74 | `/api/admin/pipeline/status` | GET | `admin-stats` or direct DB | Admin RLS |
| 75 | `/api/admin/stats` | GET | `admin-stats` Edge Function | Service role |
| 76 | `/api/admin/ai-config` | GET | `admin-settings` Edge Function | Service role |
| 77 | `/api/admin/ai-config` | PUT | `admin-settings` Edge Function | Service role |
| 78 | `/api/admin/bot-run` | POST | Direct DB (see #38) | Admin RLS |

---

## Edge Functions to Create (7 total)

| Function | Replaces | Key Logic |
|----------|----------|-----------|
| `generate-essay` | essays/generate, match-rationale | AI generation with plan-based rate limiting |
| `process-payment` | payments/initialize, verify, abandon, webhook, checkout | Paystack integration |
| `upload-document` | documents/upload, documents/analyze/:id | Supabase Storage + AI analysis trigger |
| `run-pipeline` | admin/pipeline/*, admin/bot-queue/* | Scholarship discovery pipeline + ingest |
| `mentor-review` | essays/request-mentor-review, all mentor/*, all admin/mentor* | Full mentor review workflow |
| `admin-stats` | admin/stats, admin/pipeline/stats, admin/pipeline/status | Aggregated dashboard stats |
| `admin-settings` | admin/ai-config, admin/contact | AI config management, contact form |

---

## Frontend Files to Update

| File | Current Pattern | New Pattern |
|------|----------------|-------------|
| `src/App.tsx` | `authFetch('/api/...')` | `supabase.from(...)` / `supabase.functions.invoke(...)` |
| `src/components/AuthScreen.tsx` | `fetch('/api/auth/register')` | `supabase.auth.signUp(...)` |
| `src/components/AdminLoginPage.tsx` | `fetch('/api/admin/auth/login')` | `supabase.auth.signInWithPassword(...)` |
| `src/components/ForgotPassword.tsx` | `fetch('/api/auth/forgot-password')` | `supabase.auth.resetPasswordForEmail(...)` |
| `src/components/ResetPassword.tsx` | `fetch('/api/auth/reset-password')` | `supabase.auth.updateUser(...)` |
| `src/components/ContactPage.tsx` | `fetch('/api/contact')` | `supabase.functions.invoke('send-contact')` or direct DB insert |
| `src/components/EssayGenerator.tsx` | `fetch('/api/essays/request-mentor-review')` | `supabase.functions.invoke('mentor-review')` |
| `src/components/admin/AiConfigPanel.tsx` | `fetch('/api/admin/ai-config')` | `supabase.functions.invoke('admin-settings')` |
| `src/lib/supabase-server.ts` | Used by Express (server-side) | DELETE — no longer needed |

---

## Files to DELETE

- `server.ts` (4286 lines — the entire Express server)
- `src/lib/supabase-server.ts` (server-side Supabase queries — replaced by direct client + Edge Functions)
- `uploads/` directory (Supabase Storage replaces local uploads)
- `src/data/db.json` (local JSON DB — fully replaced)

## Packages to REMOVE from package.json

- `express`, `@types/express`
- `bcryptjs`, `@types/bcryptjs`
- `jsonwebtoken`, `@types/jsonwebtoken`
- `multer`, `@types/multer`
- `express-rate-limit`
- `compression` (if present)
- `node-cron`, `@types/node-cron`
- `dotenv` (server-side — client uses Vite env)
- `tsx` (if only used for server.ts)

## package.json Scripts Update

Before:
```json
"dev": "npm run generate-icons && tsx server.ts",
"build": "npm run generate-icons && vite build && esbuild server.ts ...",
"start": "node dist/server.cjs"
```

After:
```json
"dev": "npm run generate-icons && vite",
"build": "npm run generate-icons && vite build",
"start": "vite preview"
```

## Supabase Auth Trigger SQL

```sql
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Verification Checklist

- [x] Register new account → uses `supabase.auth.signUp()` 
- [x] Login → uses `supabase.auth.signInWithPassword()` 
- [x] Profile → uses direct `supabase.from('profiles')` queries
- [x] Scholarships → loads from `supabase.from('scholarships')` 
- [x] Essay generation → Edge Function `generate-essay` 
- [x] Document upload → Supabase Storage + direct DB insert
- [x] Payment → Edge Function `process-payment` 
- [x] Admin → Edge Functions with service role
- [x] Contact form → direct `supabase.from('contact_submissions').insert()`
- [x] All static pages → Vite SPA routing (unchanged)
- [ ] `npm run build` succeeds (needs Supabase URL + ANON KEY in .env)
- [x] Zero remaining `fetch('/api/...')` in codebase

## Migration Completion Summary (2026-06-03)

### What Was Done:

**Deleted (5 files, 4,300+ lines):**
- `server.ts` (4,286 lines) — Entire Express server
- `src/lib/supabase-server.ts` (498 lines) — Server-side Supabase wrapper
- `src/data/db.json` — Local JSON database fallback
- `test-audit.mjs` — JWT test file
- `_test_require.ts` — Obsolete JWT test

**Created (7 files, ~2,350 lines):**
- `src/lib/supabase-queries.ts` (188 lines) — Typed DB query functions
- `supabase/functions/generate-essay/index.ts` (398 lines) — AI essay generation
- `supabase/functions/process-payment/index.ts` (513 lines) — Paystack integration
- `supabase/functions/run-pipeline/index.ts` (398 lines) — Scholarship pipeline
- `supabase/functions/mentor-review/index.ts` (649 lines) — Mentor review workflow
- `supabase/functions/admin-settings/index.ts` (192 lines) — AI config management
- `CHANGELOG.md` — This file

**Modified (10 files):**
- `src/App.tsx` — Replaced `authFetch('/api/...')` with Supabase client + Edge Function calls
- `src/components/AuthScreen.tsx` — Replaced JWT auth with Supabase Auth
- `src/components/AdminLoginPage.tsx` — Supabase Auth + role check
- `src/components/ForgotPassword.tsx` — `supabase.auth.resetPasswordForEmail`
- `src/components/ResetPassword.tsx` — `supabase.auth.updateUser`
- `src/components/ContactPage.tsx` — Direct Supabase insert
- `src/components/EssayGenerator.tsx` — Edge Function invoke
- `src/components/admin/AiConfigPanel.tsx` — Edge Function invoke
- `src/services/scholarship-pipeline.ts` — Fixed import from server
- `src/services/duplicate-detector.ts` — Fixed import from server
- `package.json` — Removed Express packages, updated scripts

**Removed from package.json (14 packages):**
express, @types/express, bcryptjs, @types/bcryptjs, jsonwebtoken, @types/jsonwebtoken, multer, @types/multer, express-rate-limit, node-cron, @types/node-cron, dotenv, @vercel/node, tsx

### New Architecture:
```
Frontend (React/Vite/Vercel)
    ├── Supabase Client (direct DB queries + storage)
    │   ├── supabase.auth.* (Auth)
    │   ├── supabase.from('table').* (CRUD)
    │   └── supabase.storage.from('bucket').* (Files)
    └── Supabase Edge Functions (complex logic)
        ├── generate-essay (AI generation)
        ├── process-payment (Paystack)
        ├── run-pipeline (Scholarship discovery)
        ├── mentor-review (Review workflow)
        └── admin-settings (AI config)
```

### Post-Migration Steps (PART 8):
1. Run Supabase Auth trigger SQL in Supabase Dashboard
2. Set secrets: `supabase secrets set GOOGLE_API_KEY=... PAYSTACK_SECRET_KEY=...`
3. Deploy Edge Functions: `supabase functions deploy generate-essay` (×5)
4. Deploy frontend: `git push origin main` → Vercel auto-deploys
5. Test all features on techsari.online
