# Zawadi — AI-Powered Scholarship Platform for African Students

**AGENT.md — Single Source of Truth for Developers, AI Agents, and Contributors**

---

## Section 1: Project Overview

Zawadi is a scholarship discovery and application platform built exclusively for **African nationals from any of the 54 African Union member states** at any stage of their academic journey (high school, undergraduate, master's, PhD, or professional development).

### Problem Solved
Existing scholarship directories are incomplete, uncurated, and force students to manually check eligibility for each opportunity. Students waste hours reading requirements they don't meet, miss deadlines, and have no help crafting competitive applications.

### Core Value Proposition
> **100% deterministic eligibility filtering**, **centralized deadline tracking**, and an **AI-powered essay co-creator paired with human review** to help African students secure funding without wasting time or money.

### How It Is Different
- **Deterministic matching**, not keyword search — every scholarship has hard gates (nationality, degree level, GPA) checked against the student's verified profile
- **Country graph** maps every African country to UN Geoscheme region, AU REC membership, Commonwealth, OIF, and CPLP membership using ISO 3166-1 codes
- **AI essay co-creator** runs a three-stage pipeline (Draft → Critique → Polish) using DeepSeek V4 Pro, paired with optional human mentor review
- **Document intelligence** extracts GPA, degree, institution, and graduation year using pattern matching first, AI only as fallback

### Target Users
- Any African national from any of the 54 African Union member states
- Students at any academic stage: high school, undergraduate, master's, PhD, professional

### Business Model

| Plan | Price | Key Limits |
|------|-------|------------|
| Explorer | Free | 15 documents, 2 essays/month, 10 applications, standard mentor |
| Scholar Plus | $5/month | 50 documents, 10 essays/month, 30 applications, high mentor priority |
| Application Pro | $12/month | Unlimited documents, essays, applications, full AI, highest mentor priority |
| Zawadi Institutional | Negotiated | Bulk pricing, learning tier voice analysis |

> **Note:** Mentor is a **user role**, not a plan name. The old "Mentor Review individual plan" was removed and replaced with Institutional tier.

---

## Section 2: Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.0.1 | UI framework |
| TypeScript | ~5.8.2 | Type safety |
| Vite | ^6.2.3 | Build tool, HMR, PWA plugin |
| Tailwind CSS | ^4.1.14 | Utility-first CSS |
| lucide-react | ^0.546.0 | Icons |
| motion | ^12.23.24 | Animations (Framer Motion successor) |
| recharts | ^3.8.1 | Admin analytics charts |
| react-router-dom | ^7.16.0 | Client-side routing |

### Backend & Database
| Technology | Purpose |
|------------|---------|
| Supabase JS Client ^2.106.2 | Auth, database, storage, Edge Functions |
| Supabase PostgreSQL | Primary database with RLS |
| Supabase Edge Functions (Deno) | Serverless backend (replaced Express.js) |
| Supabase Auth | Email/password and magic link |
| Supabase Storage | File storage in `scholarship-docs` bucket |

### AI Providers
| Technology | Purpose |
|------------|---------|
| DeepSeek API V4 Pro via OpenAI-compatible | Primary AI — essays, document intelligence, match rationale |
| @google/genai ^2.4.0 | Gemini — fallback AI provider |
| openai ^6.41.0 | OpenAI-compatible client for DeepSeek |

### Payment & Scraping
| Technology | Purpose |
|------------|---------|
| Paystack (test keys in dev) | African payment processor, subscriptions |
| cheerio ^1.2.0 | HTML parsing for scholarship pipeline |
| pdf-parse ^1.1.1, mammoth ^1.12.0 | PDF/DOCX text extraction |

### Infrastructure
- **Frontend host:** Vercel — auto-deploys from `main`
- **Live domain:** `https://www.techsari.online`
- **Supabase project:** `dgiqyvnpmeiomvfauetw` at `https://dgiqyvnpmeiomvfauetw.supabase.co`
- **Git:** `https://github.com/Ml-gur/zawadi-v2`

### Migration History
Originally Express.js backend. Fully migrated to Supabase-native architecture with Edge Functions. All old Express code is removed.

---

## Section 3: Architecture Overview

### High-Level Architecture
```
Browser (React SPA on Vercel)
    │
    ├── Supabase Auth (email/password, magic link)
    │     └── Auth trigger → creates profiles row automatically
    │
    ├── Supabase PostgreSQL (RLS on every table)
    │     ├── scholarships, applications, documents, essays
    │     ├── profiles, mentor_review_requests, payments
    │     └── bot_ingestions, pipeline_runs, audit_logs
    │
    ├── Supabase Storage (scholarship-docs bucket)
    │
    └── Supabase Edge Functions (Deno runtime)
          ├── document-analysis — text extraction + pattern matching + AI fallback
          ├── generate-essay — three-stage essay pipeline
          ├── process-payment — Paystack payment intents and verification
          ├── run-pipeline — daily scholarship discovery crawler trigger
          ├── mentor-review — mentor feedback submission and admin approval
          ├── admin-settings — admin configuration management
          └── setup-admin — one-time admin creation
```

### Three Most Important User Journeys

**Journey 1: Student registers and sees matches**
1. Auth trigger creates profiles row with plan='explorer'
2. Student completes profile wizard
3. matching-engine.ts runs hard gates (nationality, degree_level, gpa_min, age, work_experience)
4. Then soft scoring (GPA quality, field alignment, destination, language, experience, completeness)
5. Realism score (application volume vs awards, specificity, deadline proximity)
6. Scholarships sorted by composite score → displayed on dashboard

**Journey 2: Student generates AI essay and requests mentor review**
1. EssayGenerator opens → student enters prompt → calls generate-essay Edge Function
2. Three stages: Draft (DeepSeek writes) → Critique (DeepSeek reviews) → Polish (DeepSeek rewrites)
3. Essay saved with generations[] array
4. Student clicks "Request Mentor Review" → mentor_review_requests created
5. Admin assigns mentor → mentor reviews → admin approves → student sees feedback

**Journey 3: Admin publishes pipeline-discovered scholarship**
1. Daily cron at 2am → run-pipeline Edge Function → crawler fetches 30+ sources
2. Duplicate detector runs SHA-256 fingerprint
3. New items → bot_ingestions with confidence score and scam_flags
4. Admin reviews Bot Queue → approves with edits → scholarship created

### Country Graph
`src/lib/country-graph.ts` maps every country (385+ lines) to:
- UN Geoscheme region (Eastern Africa, Western Africa, etc.)
- AU REC membership (ECOWAS, SADC, EAC, COMESA, IGAD, AMU)
- Commonwealth, OIF francophone, CPLP lusophone membership
- All using ISO 3166-1 alpha-2 codes

---

## Section 4: Database Schema

### profiles (PK: email)
Core: email, name, country, date_of_birth, gender, country_income_group, is_rural_origin
Academic: degree_level, field_of_study, target_fields (jsonb), gpa, gpa_system, gpa_scale, institution
Destination: study_country_preference, willing_intra_africa
Languages: native_language, additional_languages (jsonb), english_test_type, english_score, french_level, etc.
Experience: work_experience_years, has_research, publications, has_leadership, has_community_service, is_first_generation
Doc overrides: doc_gpa_normalised_extracted, doc_has_research_extracted, doc_work_years_extracted, etc.
Account: plan (explorer/plus/pro/institutional), role (user/admin/mentor), status, confirmed_fields (jsonb)

**RLS:** Users read/update own row. Admins read all. Inserted by auth trigger only.

### scholarships (PK: id)
name, provider, host, country (text[]), degree_levels (text[]), fields (text[]), funding_type, amount
deadline, description, eligibility, required_documents (text[]), apply_url, published
no_ielts, work_experience_required, age_limit_masters, age_limit_phd
urgency (computed by trigger), view_count, quality_score, scam_flags (text[]), pipeline_source

**RLS:** Published rows readable by authenticated users. Admins only for writes.

### applications (PK: id)
user_email → profiles.email, scholarship_id → scholarships.id, status (tracking/applied/interviewing/offer/rejected/withdrawn)
notes, priority, deadline (denormalized), scholarship_name (denormalized), funding_type (denormalized)

### documents (PK: id)
user_email, name, type (CV/Transcript/etc.), size, file_path, mime_type
analysis_status (pending/processing/completed/failed/unreadable)
ai_extraction_result (jsonb), extraction_method (pattern/ai/hybrid/manual), user_confirmed

### essays (PK: id)
user_email, essay_type, scholarship_name, prompt
generations (jsonb[] — array of {stage, content, timestamp})
word_count, tone, voice_profile_id → essay_soul_profiles

### Other Tables
- **essay_soul_profiles:** Writing voice characteristics storage
- **mentor_review_requests:** Core entity for mentor workflow (status: pending/assigned/submitted/delivered/returned)
- **mentor_profiles:** Mentor directory with expertise_areas, average_rating
- **mentor_feedback_ratings:** Student ratings (1-5) of mentor reviews
- **bot_ingestions:** Pipeline discovered items (fingerprint for dedup, confidence_score, scam_flags)
- **pipeline_runs:** Crawl history (urls_crawled, new_items, duplicates_skipped)
- **scholarship_outcomes:** Application results (interview_requested, shortlisted, awarded, rejected)
- **recommendation_feedback:** ML feedback loop (rating: 1-5, feedback_type)
- **payments:** Subscription billing with Paystack (plan, billing_cycle, status, paystack_reference)
- **contact_submissions, notifications, audit_logs, ai_config**

### Database Triggers
1. **handle_new_user** — On auth.users insert: creates profiles row
2. **compute_urgency** — On scholarships insert/update: sets urgency (urgent <30d, closing_soon <60d, open)
3. **set_updated_at** — Auto-updates updated_at on modification

---

## Section 5: Environment Variables

### Vercel Frontend (VITE_ prefix, safe for browser)
| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | `https://dgiqyvnpmeiomvfauetw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anon key |
| `VITE_PAYSTACK_PUBLIC_KEY` | Client-side Paystack key |

### Supabase Edge Function Secrets (never in frontend code)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`, `GOOGLE_API_KEY`, `JWT_SECRET`
`PAYSTACK_SECRET_KEY`, `PAYSTACK_CALLBACK_URL`, `PAYSTACK_*_PLAN_CODE` (6 plan codes)
`ENVIRONMENT` (development/production), `CRAWL_DELAY_MS` (2000), `OPENAI_API_KEY` (optional)

### Previously Exposed (rotated)
- `SUPABASE_SERVICE_ROLE_KEY` — was in `.env` at commit `38eea48`
- `DEEPSEEK_API_KEY` — was in `.env` at commit `38eea48`

---

## Section 6: Key Files

### Root
- `package.json`, `tsconfig.json`, `vite.config.ts`, `vercel.json`, `.env`, `.env.example`, `index.html`, `database.sql`

### src/lib/ — Core Logic
- **supabase.ts** — Supabase client init
- **supabase-queries.ts** — All database queries by entity
- **matching-engine.ts** — Deterministic matching algorithm (hard gates + soft scoring)
- **recommendation-scorer.ts** — Composite scoring with Realism Score
- **country-graph.ts** — Country-to-region mapping (385 lines)
- **fetchWithAuth.ts** — Auth-wrapped fetch

### src/services/ — Business Logic
- **ai-provider.ts** — Multi-provider AI (DeepSeek + Gemini fallback, retry/backoff)
- **document-intelligence.ts** — Document analysis pipeline
- **pdf-pattern-extractor.ts** — Regex extractors (GPA, year, degree, institution, field)
- **text-extractor.ts** — PDF/DOCX raw text extraction
- **essay-voice-learner.ts** — Writing voice analysis
- **scholarship-pipeline.ts** — Pipeline orchestration
- **crawler.ts** — Web crawler (30+ sources)
- **duplicate-detector.ts** — SHA-256 fingerprint dedup

### src/components/ — UI
- **App.tsx** — Main app, routing, all handlers, state management
- **AuthScreen.tsx** — Login/register
- **Dashboard.tsx** — Scholarship cards, match scores, filters
- **DocumentVault.tsx** — Upload, extraction badges, confirmation form
- **EssayGenerator.tsx** — Three-stage essay co-creator
- **SubscriptionPlans.tsx** — Paystack checkout
- **AdminPortal.tsx** — Scholarship editor, bot queue, user management
- **MentorPortal.tsx** — Assigned reviews, feedback submission
- **ProfileSetupWizard.tsx** — Onboarding wizard
- **StudentProfile.tsx** — Profile editing
- **AdminRoute.tsx**, **ProtectedRoute.tsx** — Route guards

### src/config/
- **matching-config.ts** — 407+ lines: AFRICAN_COUNTRIES (54), FIELD_TO_GROUP, GpaSystem constants
- **plan-config.ts** — PLAN_CONFIG, MENTOR_REVIEW_LIMITS, PLAN_HIERARCHY

### supabase/functions/ — Edge Functions (Deno)
- document-analysis, generate-essay, process-payment, run-pipeline, mentor-review, admin-settings, setup-admin

### supabase/migrations/
- 001 through 010 — Database migration SQL files

---

## Section 7: AI Integration

### Primary: DeepSeek V4 Pro via OpenAI-compatible API at `https://api.deepseek.com`
### Fallback: Google Gemini via `@google/genai`

### Provider Architecture
`src/services/ai-provider.ts` provides unified `generateContent()`:
1. Reads config from ai_config table or env vars
2. Routes to DeepSeek or Gemini
3. Implements retry with backoff (max 2 retries, 60s timeout)
4. Handles `reasoning_content` fallback for DeepSeek
5. Returns `{ text, provider, thinking? }`

### Features Using AI
1. **Essay Generation (Draft → Critique → Polish)** via generate-essay Edge Function
2. **Essay Voice Learning** — analyzes samples post-polish, extracts style summary
3. **Document Intelligence** — called only for fields where pattern confidence < 0.7
4. **Match Rationale** — human-readable explanation of scholarship match
5. **NOT used for:** pipeline extraction (uses cheerio), duplicate detection (SHA-256), scam flagging (heuristic rules)

---

## Section 8: Matching Engine

Deterministic TypeScript algorithm at `src/lib/matching-engine.ts` + `recommendation-scorer.ts`. No AI in eligibility/scoring.

### Hard Gates (in order)
1. Nationality (country graph resolves region eligibility)
2. Degree Level
3. Minimum GPA (normalised to 4.0 scale)
4. Age Limit
5. Work Experience

### Soft Scoring (weighted)
| Dimension | Weight |
|-----------|--------|
| GPA Quality | 25% |
| Field Alignment | 20% |
| Destination Preference | 15% |
| Language Compatibility | 20% |
| Experience Alignment | 10% |
| Profile Completeness | 10% |

### Realism Score
Application volume vs awards, specificity bonus, historical outcomes, deadline proximity.

### Portfolio Recommendation
30% Reach, 50% Target, 20% Safety.

---

## Section 9: Plan Configuration (src/config/plan-config.ts)

### Mentor Review Entitlements
- **Explorer:** 1 review/month, 7 days, basic feedback, low priority
- **Plus:** 2 reviews/month, 5 days, structured feedback, medium priority
- **Pro:** 4 reviews/month, 2 days, full feedback + revised sections, high priority
- **Institutional:** Unlimited, 1 day, full+ strategy session, urgent priority

---

## Section 10: Mentor Review Pipeline

1. Student requests review → status='pending'
2. Admin assigns mentor → status='assigned'
3. Mentor reviews → status='submitted_by_mentor'
4. Admin approves or returns → status='delivered_to_student' or 'returned_to_mentor'
5. Student rates mentor (1-5)

**Privacy:** Mentors never see student emails — only first name and country.

---

## Section 11: Scholarship Discovery Pipeline

- Runs daily at 2am via Supabase cron
- Crawls 30+ sources with 2s delay between requests
- SHA-256 fingerprint dedup (title + provider + source_url)
- Scam flags: application_fee_required, non_institutional_contact, unverifiable_institution, suspicious_amount, broken_url

---

## Section 12: Document Intelligence

PDF → pdf-parse → pattern matching (regex for GPA, year, degree, institution, field)
If all fields ≥0.7 confidence → DONE (method='pattern')
If any field <0.7 → DeepSeek called only for missing fields → merged result

**Priority chain:** user_confirmed > user_entered > ai_verified > profile_entered

**AI Tiers by Plan:** Explorer=none, Plus=metadata, Pro=full, Institutional=learning

---

## Section 13: Known Issues

1. **Account Creation Auto-Login Failure** (Medium) — No signInAfterCreate call in AuthScreen
2. **Profile Wizard Reappearing** (Medium) — Checks local state only, not database
3. **Admin Plan Change Fails Silently** (High) — RLS or schema cache issue
4. **Essay Token Limit** (Low) — Critique fails for >3000 word drafts
5. **Status Change Race Condition** (Medium) — Optimistic UI vs server sync
6. **Match % Using Fallback Values** (Medium) — Missing fields get defaults
7. **AdminPortal 522KB Bundle** (Low) — Not code-split
8. **Email Verification Not Enforced** (Low) — Auto-confirm enabled
9. **iOS PWA Limitations** (Low) — Push notifications limited

---

## Section 14: Development Setup

1. `git clone https://github.com/Ml-gur/zawadi-v2.git && cd zawadi-v2`
2. `npm install`
3. Create `.env` with all values from `.env.example`
4. `npx supabase login && npx supabase link --project-ref dgiqyvnpmeiomvfauetw`
5. Deploy Edge Functions: `npx supabase functions deploy <name>`
6. Set secrets: `npx supabase secrets set KEY=value`
7. Run migrations via Supabase Dashboard SQL Editor
8. `npm run dev` starts at `http://localhost:5173`

---

## Section 15: Deployment

- Frontend auto-deploys on push to `main` (Vercel)
- Edge Functions: `npx supabase functions deploy <name>`
- Migrations: Run via Supabase Dashboard SQL Editor; always `NOTIFY pgrst, 'reload schema'` after schema changes

---

## Section 16: Testing

200+ tests across 15 sections in `LAUNCH_AUDIT_CHECKLIST.md`.

### Confirmed Fixed Bugs
1. Edge Functions hardcoded Gemini → multi-provider routing
2. Matching engine never called → `computeScholarshipMatch()` wired in
3. AI analysis never triggered → fire-and-forget after upload
4. Document grounding not wired → document_ids passed to Edge Function
5. Voice learning orphaned → triggers after polish
6. Auth trigger SQL missing → migration created
7. Edge Functions not deployed → deploy commands documented

### Security Checks
- No secrets in dist build
- RLS blocks cross-user access
- Admin endpoints reject student JWTs
- HTTPS enforced
- No service role key in browser requests

---

## Section 17: AI Agent Instructions

### Golden Rules
1. Never change matching engine weights without explicit instruction
2. Never modify RLS without security review
3. Always use `generateContent()` for AI — never call APIs directly
4. Always read plan config from plan-config.ts
5. Never add default values to profiles before matching
6. Always run `NOTIFY pgrst, 'reload schema'` after schema changes
7. Always check country-graph.ts before adding country/region logic
8. Mentor is a role, not a plan name
9. Make the smallest change that fixes the bug
10. Preserve existing error handling

### Navigation
- New page → add route in App.tsx with lazy load
- New query → add to supabase-queries.ts
- New AI feature → use generateContent() from ai-provider.ts
- New Edge Function → new directory under supabase/functions/
- New env var → add to .env.example + Vercel/supabase secrets

### Debugging
- "Failed to send request" → check auth session, service worker, browser extensions
- 401 from Edge Function → JWT expired, check session
- RLS blocking → test with service role vs anon in SQL Editor
- Plans not applying → verify enforcement point reads from plan-config.ts

---

*This file is the single source of truth. If code contradicts this file, update this file or flag the contradiction.*
