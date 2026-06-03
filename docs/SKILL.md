# Techsari-Zawadi — Agent Development Skill

```yaml
---
name: zawadi-platform
description: Build and maintain the Techsari-Zawadi scholarship platform — React+Vite+Supabase+Edge Functions. v2 greenfield rebuild incorporating every v1 lesson. Use for any Zawadi task.
version: 3.0.0
category: software-development
---

# Techsari-Zawadi Platform Development

## When To Load This Skill

Load when the user asks about: Zawadi, Techsari-Zawadi, scholarship platform, techsari.online, or any task involving the Zawadi codebase.

## Project Identity

- **Full name:** Techsari-Zawadi
- **What it is:** AI-powered scholarship discovery and application management platform for African students
- **v2 status:** Greenfield rebuild — NOT a v1 patch job
- **Live URL:** https://www.techsari.online
- **Admin URL:** https://www.techsari.online/admin

## Repository

- **v2 (active):** `C:\Users\samka\Downloads\HermesProjects\Zawadi-v2`
- **v1 (legacy reference):** `C:\Users\samka\Downloads\HermesProjects\Zawadi`
- **GitHub:** `https://github.com/Ml-gur/zawadi.git`
- **Git identity:** `samkaranja` / `samkaranja285@gmail.com`

## Spec Documents (MANDATORY — Read Before Any Code)

All specs in `C:\Users\samka\Downloads\HermesProjects\Zawadi-v2\docs\`:

| # | Document | Read When |
|---|---|---|
| **13** | **LESSONS_LEARNED.md** | **READ FIRST — every v1 mistake catalogued with exact code comparisons** |
| 00 | MISSION_AND_VISION.md | Understanding product purpose |
| 01 | BRD.md | Business context |
| 02 | PRD.md | Feature requirements, admin roles |
| 03 | ARCHITECTURE.md | Full-stack architecture, project structure, API reference |
| 04 | SECURITY_RULES.md | RBAC, RLS policies, tier enforcement, incident response |
| 05 | PAYMENT_PLANS.md | Pricing, Paystack integration |
| 06 | WORKFLOW.md | User journeys, bot pipeline, admin operations |
| 07 | CHECKPOINTS.md | **Developer-buildable implementation guide — 14 phases** |
| 12 | SUPABASE_SCHEMA.md | Complete migration SQL |

## Architecture (v2 Greenfield)

**Full stack clearly defined:**

```
Frontend: React 19 + Vite (Vercel static hosting)
     ↓
Backend:  Supabase Edge Functions (Deno — 5 functions)
     ↓
Database: Supabase PostgreSQL (RLS on every table)
     ↓
Auth:     Supabase Auth (GoTrue — JWT)
     ↓
Storage:  Supabase Storage (S3 — private bucket)
     ↓
Payments: Paystack (Subscription API)
     ↓
AI:       OpenRouter → DeepSeek (proxied through Edge Function)
     ↓
Bot:      Hermes Cron → Zawadi Bot (daily 9AM EAT)
```

**Key principle:** The React SPA talks to Supabase directly for simple CRUD (reads, user-owned writes). Edge Functions handle anything needing secrets (Paystack webhooks, admin operations, AI proxy, bot ingestion).

## v1 Issues — Mandatory Constraints

These are NOT optional. Every v1 issue is a constraint on v2 development:

| # | v1 Issue | v2 Constraint |
|---|---|---|
| 1 | Express on Vercel = 404/CJS/DOMMatrix failures | **NO Express. NO serverless functions. Period.** |
| 2 | `getUser()` after `signIn()` = null → blank page | **Use `data.user` directly. Never call `getUser()` after auth.** |
| 3 | Flat Supabase rows = `undefined.property` crash | **Normalize ALL data at `api()` boundary with safe defaults.** |
| 4 | Uncaught async callback = tree unmount | **Every async callback wrapped in try/catch.** |
| 5 | Non-`VITE_` vars = undefined in browser | **Only `VITE_`-prefixed in `.env`. Everything else = Vercel env.** |
| 6 | Service role in `.env` = one typo from shipping | **Service role NEVER in client bundle. Edge Functions only.** |
| 7 | No webhook idempotency = duplicate payments | **`webhook_event_id` UNIQUE constraint.** |
| 8 | Admin code in user bundle | **Admin is completely separate Vite entry point.** |
| 9 | No audit trail | **`audit_logs` table. Every admin action logged.** |
| 10 | Bot content published without review | **All bot findings = `published=false`. Admin queue.** |
| 11 | No loading/error/empty states | **Every data component has all three states.** |
| 12 | Static pages 404 | **Explicit routes in vercel.json for privacy, terms, faq.** |
| 13 | No admin roles | **4 roles: user, support_agent, content_manager, super_admin.** |
| 14 | Tier limits client-only | **Enforced at DB (PostgreSQL trigger) + Edge Function + UI.** |

## Supabase Credentials

| Variable | Value |
|---|---|
| URL | `https://efvxtcxhjlbzzsixfrvo.supabase.co` |
| Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdnh0Y3hoamxienpzaXhmcnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjE0MTIsImV4cCI6MjA5NTAzNzQxMn0.irDvr2saErnDcWl6FBB30Cd3OEO2iHCwbiwc4YZcjkQ` |

## Admin Credentials

- **Email:** admin@zawadi.app
- **Password:** zawadi-admin-2026

## Bot Ingestion

- **API Key:** `zawadi_aea7f39282771f497d46303943a909e24677d76b12fac43d`
- **Endpoint:** `POST /api/ingest` (Edge Function)
- **Header:** `x-ingest-key`

## Paystack Plan Codes

| Plan | Code |
|---|---|
| Plus Monthly | `PLN_unw5dchqqxx8h81` |
| Plus Annual | `PLN_7lbcd0qe0atza2a` |
| Pro Monthly | `PLN_02f9ve9p86cpx44` |
| Pro Annual | `PLN_r7qx092mwmn5bfz` |
| Mentor Monthly | `PLN_byk050d878lu61e` |
| Mentor Annual | `PLN_updqmdjw51xazfs` |

## When Building Zawadi

1. **Read `13_LESSONS_LEARNED.md` first.** It has exact code comparisons of v1 bugs vs v2 fixes.
2. **Follow `07_CHECKPOINTS.md` linearly.** It's a 14-phase developer-buildable guide.
3. **Reference `03_ARCHITECTURE.md`** for project structure, API endpoints, component tree.
4. **Reference `04_SECURITY_RULES.md`** for RLS policies, RBAC matrix, tier enforcement SQL.
5. **Reference `06_WORKFLOW.md`** for user journeys, admin flows, bot pipeline.
6. **Reference `12_SUPABASE_SCHEMA.md`** for database migration SQL.

## Quick Start

```bash
cd C:\Users\samka\Downloads\HermesProjects\Zawadi-v2
npm install
npm run dev          # Development
npm run build        # Production build
git push origin main # Deploy to Vercel
```

## Edge Function Deploy

```bash
supabase functions deploy paystack-webhook
supabase functions deploy admin-operations
supabase functions deploy ai-essay
supabase functions deploy ingest-scholarship
supabase functions deploy user-profile
```

## Testing Checklist (Before Any Commit)

- [ ] `npm run build` succeeds
- [ ] All data components have loading, error, and empty states
- [ ] Data normalized at `api()` boundary (check `src/lib/normalize.js`)
- [ ] No `getUser()` call after `signIn()`/`signUp()`
- [ ] All async callbacks wrapped in try/catch
- [ ] Only `VITE_` vars in `.env`
- [ ] Service role key NOT in client bundle (grep for `service_role`)
- [ ] Admin code NOT in main bundle (check dist/assets)
- [ ] Mobile responsive at 320px
- [ ] All footer links work (privacy, terms, faq, about, contact)
- [ ] No console errors in production build
```
