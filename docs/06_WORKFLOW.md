# Zawadi v2 — Workflows & Operations Manual

**Document Version:** 4.0 (Operations Manual Rewrite)
**Date:** May 27, 2026
**Author:** Techsari Engineering
**Status:** Active — Spec-Driven Development
**Audience:** Developers, DevOps, Support Staff — this document enables anyone to trace any user action from click to database.

---

## Table of Contents

1. [End-to-End Scholarship Pipeline](#1-end-to-end-scholarship-pipeline)
2. [User Onboarding Flow](#2-user-onboarding-flow)
3. [Core User Flows](#3-core-user-flows)
4. [Admin Operations](#4-admin-operations)
5. [Bot Pipeline — Complete Hermes Cron Configuration](#5-bot-pipeline--complete-hermes-cron-configuration)
6. [Cron Job Schedule](#6-cron-job-schedule)
7. [Error Handling Flows](#7-error-handling-flows)
8. [Edge Cases](#8-edge-cases)

---

## 1. End-to-End Scholarship Pipeline

Every scholarship in Zawadi flows through a six-stage lifecycle: **Discovery → Ingestion → Review → Publication → Live Usage → Expiry.** Each stage has specific actors, validation checks, and database state transitions.

```
                            SCHOLARSHIP LIFECYCLE

  STAGE 1           STAGE 2           STAGE 3           STAGE 4
  DISCOVERY         INGESTION         REVIEW            PUBLICATION
  ─────────         ─────────         ──────            ───────────

  ┌──────────┐    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ Zawadi   │    │ POST         │  │ Admin logs in │  │ published    │
  │ Bot      │───▶│ /api/ingest  │─▶│ at /admin     │─▶│ = true       │
  │ (Hermes  │    │              │  │               │  │              │
  │  cron)   │    │ Validates:   │  │ Reviews:      │  │ Scholarship  │
  │          │    │ • API key    │  │ • Eligibility │  │ appears on   │
  │ Searches:│    │ • Not dup    │  │ • Deadline ✓  │  │ live site    │
  │ • Web    │    │ • No aggr    │  │ • Link works  │  │ for all      │
  │ • Extracts│   │ • Future     │  │ • Country ✓   │  │ users        │
  │ • Formats │   │   deadline   │  │               │  │              │
  └──────────┘    └──────────────┘  └──────────────┘  └──────────────┘
       │                │                 │                  │
       │                │                 │                  │
       ▼                ▼                 ▼                  ▼
  bot_ingestions   bot_ingestions    bot_ingestions     scholarships
  status: NULL     status: 'pending' status: 'approved'  published: true
                   scholarships      scholarships
                   published: false  published: false→true


  STAGE 5           STAGE 6
  LIVE USAGE        EXPIRY
  ──────────        ──────

  ┌──────────────┐  ┌──────────────┐
  │ Users browse │  │ Deadline     │
  │ , filter,    │  │ passes →     │
  │ save, track, │  │ auto-        │
  │ apply        │  │ unpublish    │
  │              │  │              │
  │ View count   │  │ Link re-     │
  │ increments   │  │ validated    │
  │ on detail    │  │ daily        │
  └──────────────┘  └──────────────┘
       │                  │
       ▼                  ▼
  applications       scholarships
  (user_id,          published: false
   scholarship_id,
   status)
```

### 1.1 Stage 1: Bot Discovery (Hermes Cron, 9 AM EAT Daily)

**Actor:** Zawadi Bot (Hermes Agent with `scholarship-scout` skill)
**Schedule:** `0 6 * * *` UTC = 9 AM EAT (UTC+3)

The bot wakes up daily and executes a four-phase pipeline:

**Phase 1 — Web Search:**
- Queries search engines for: *"new scholarships for African students [current date]"*
- Scans target domains: university `.edu` sites, foundation `.org` pages, government `.gov` portals
- Searches across all 54 African countries, all degree levels (Bachelors, Masters, PhD, Postdoc), all academic fields
- Target: 10–20 new scholarships per run

**Phase 2 — Extract & Structure:**
For each scholarship found, the bot extracts structured data:
- `name` — Full scholarship name
- `provider` — Organization offering it
- `host` — Host institution/country
- `country` — Array of eligible countries
- `degree_levels` — Array: `['Bachelors','Masters','PhD']`
- `fields` — Array of academic fields
- `funding_type` — `Full` or `Partial`
- `amount` — Funding amount / description
- `deadline` — ISO 8601 timestamp
- `description` — Full description text
- `eligibility` — Eligibility criteria
- `required_documents` — Array of document names
- `apply_url` — Direct application URL (NOT aggregator)
- `source_url` — Page where the scholarship was found

**Phase 3 — Client-Side Prevalidation (before submission):**
- ✓ Link is a direct application page (reject aggregator domains like `scholarships.com`, `opportunitiesforafricans.com`, etc.)
- ✓ Deadline is in the future (reject closed scholarships)
- ✓ Scholarship accepts African students (eligibility check)
- ✓ Not a duplicate by name + host (keep in-memory de-dup map for the batch)

**Phase 4 — Submit:**
- POST to `https://efvxtcxhjlbzzsixfrvo.supabase.co/functions/v1/ingest-scholarship`
- Header: `x-ingest-key: zawadi_aea7f39282771f497d46303943a909e24677d76b12fac43d`
- Body: `{ scholarships: [...] }` — all found scholarships as an array
- Each scholarship defaults to `published: false`

### 1.2 Stage 2: Ingestion (Edge Function: `ingest-scholarship`)

**Actor:** Supabase Edge Function (Deno runtime)
**Endpoint:** `POST /functions/v1/ingest-scholarship`
**Auth:** `x-ingest-key` header validation

```
REQUEST FLOW: Bot → Edge Function → Database
─────────────────────────────────────────────

Bot POST /functions/v1/ingest-scholarship
  Header: x-ingest-key: zawadi_aea7f39282771f4...
  Body: { scholarships: [...] }
        │
        ▼
┌─────────────────────────────────────────┐
│ ingest-scholarship Edge Function        │
│                                         │
│ 1. Verify INGEST_API_KEY                │
│    └─ Fail → 401 Unauthorized           │
│                                         │
│ 2. For each scholarship in batch:       │
│    ┌─────────────────────────────────┐  │
│    │ a. Validate apply_url           │  │
│    │    └─ Aggregator domain? →      │  │
│    │       log as 'rejected', skip   │  │
│    │                                 │  │
│    │ b. Validate deadline            │  │
│    │    └─ Past deadline? →          │  │
│    │       log as 'rejected', skip   │  │
│    │                                 │  │
│    │ c. Dedup check (DB query)       │  │
│    │    SELECT FROM scholarships     │  │
│    │    WHERE name ILIKE '%...%'     │  │
│    │    AND host = '...'             │  │
│    │    └─ Exists? →                │  │
│    │       log as 'duplicate', skip  │  │
│    │                                 │  │
│    │ d. Dedup check (ingestion log)  │  │
│    │    SELECT FROM bot_ingestions   │  │
│    │    WHERE scholarship_name = ... │  │
│    │    AND host = ...              │  │
│    │    └─ Exists? →                │  │
│    │       update if pending,       │  │
│    │       else skip                 │  │
│    │                                 │  │
│    │ e. INSERT INTO scholarships     │  │
│    │    • published = false          │  │
│    │    • All extracted fields       │  │
│    │                                 │  │
│    │ f. INSERT INTO bot_ingestions   │  │
│    │    • status = 'pending'         │  │
│    │    • scholarship_name, host,    │  │
│    │      source_url, created_at     │  │
│    └─────────────────────────────────┘  │
│                                         │
│ 3. Return summary:                      │
│    { received, accepted,                │
│      duplicates, rejected,              │
│      rejected_reasons }                 │
└─────────────────────────────────────────┘
        │
        ▼
    Response: {
      received: 14,
      accepted: 9,
      duplicates: 3,
      rejected: 2,
      rejected_reasons: [
        { name: "Scholarship X", reason: "aggregator_url" },
        { name: "Scholarship Y", reason: "past_deadline" }
      ]
    }
```

**Database state after ingestion:**

| Table | Row State |
|---|---|
| `scholarships` | New rows inserted with `published = false` |
| `bot_ingestions` | One row per scholarship with `status = 'pending'` (or `'duplicate'`, `'rejected'`) |
| `audit_logs` | Ingestion event logged (if configured) |

### 1.3 Stage 3: Admin Review Queue

**Actor:** Content Manager (`content_manager` or `super_admin` role)
**Interface:** Admin Panel → Ingestion Queue (`/admin` → "Bot Queue" tab)

**Daily admin review workflow:**

```
Admin logs in at /admin
  │
  ▼
Admin Dashboard
  ├─ Stats: "14 new items in review queue"
  ├─ Clicks "Bot Queue" tab
  │
  ▼
IngestionQueue.jsx
  │
  ├─ Loads: GET bot_ingestions WHERE status = 'pending'
  │   (via admin-operations Edge Function)
  │
  ├─ For each pending item, admin sees:
  │   ┌───────────────────────────────────┐
  │   │ Scholarship Name                  │
  │   │ Provider | Host Country           │
  │   │ Deadline: 2026-08-15              │
  │   │ Apply URL: [click to test]        │
  │   │ Source URL: [original page]       │
  │   │ Eligibility: African students...  │
  │   │                                   │
  │   │ [Approve] [Reject] [Duplicate]    │
  │   └───────────────────────────────────┘
  │
  ├─ Admin verifies:
  │   ✓ Eligibility criteria match the listed countries
  │   ✓ Deadline is correct and in the future
  │   ✓ Apply URL loads and is a direct application page
  │   ✓ No duplicate exists in the system
  │   ✓ Scholarship description is accurate
  │
  ├─ APPROVE action:
  │   ┌──────────────────────────────────┐
  │   │ Edge Function: admin-operations  │
  │   │ operation: ingestions_approve    │
  │   │                                  │
  │   │ 1. UPDATE scholarships          │
  │   │    SET published = true,         │
  │   │        verified_at = now()       │
  │   │    WHERE id = :scholarship_id    │
  │   │                                  │
  │   │ 2. UPDATE bot_ingestions        │
  │   │    SET status = 'approved',      │
  │   │        reviewed_at = now()       │
  │   │    WHERE id = :ingestion_id      │
  │   │                                  │
  │   │ 3. INSERT INTO audit_logs       │
  │   │    action: 'ingestion_approved'  │
  │   └──────────────────────────────────┘
  │
  ├─ REJECT action:
  │   ┌──────────────────────────────────┐
  │   │ Edge Function: admin-operations  │
  │   │ operation: ingestions_reject     │
  │   │                                  │
  │   │ 1. UPDATE bot_ingestions        │
  │   │    SET status = 'rejected',      │
  │   │        admin_notes = :reason,    │
  │   │        reviewed_at = now()       │
  │   │                                  │
  │   │ 2. (Scholarship row remains      │
  │   │    unpublished — may be cleaned  │
  │   │    up by weekly cleanup job)     │
  │   └──────────────────────────────────┘
  │
  └─ MARK DUPLICATE:
      ┌──────────────────────────────────┐
      │ 1. UPDATE bot_ingestions        │
      │    SET status = 'duplicate'      │
      │                                  │
      │ 2. DELETE the unpublished       │
      │    scholarship row (or leave it  │
      │    for cleanup)                  │
      └──────────────────────────────────┘
```

### 1.4 Stage 4: Publication — Live on Site

**The moment `published` becomes `true`:**

1. **RLS policy activates** — The existing policy `"Anyone can read published scholarships"` on the `scholarships` table immediately allows the anon role to SELECT this row:

   ```sql
   CREATE POLICY "Anyone can read published scholarships" ON public.scholarships
     FOR SELECT USING (published = true);
   ```

2. **Site consumers see it** — Any user browsing `/scholarships` or the dashboard will see the new scholarship on their next data fetch. No deploy, no cache invalidation — RLS handles it live.

3. **Match scores calculated** — The user's profile (country, degree_level, field_of_study) is compared against the scholarship's criteria to produce a match score (0–100%).

4. **Urgency determined** — Based on deadline proximity:
   - 🔴 **Critical:** < 14 days until deadline
   - 🟡 **Upcoming:** 14–30 days
   - 🟢 **Open:** 31–90 days
   - 🔵 **Rolling:** No fixed deadline / > 90 days

### 1.5 Stage 5: Live Usage — User Interaction

Users interact with the published scholarship through multiple touchpoints:

| User Action | Frontend | Database Operation | RLS Check |
|---|---|---|---|
| Browse grid | `ScholarshipGrid.jsx` | `SELECT * FROM scholarships WHERE published=true` | `published=true` |
| View detail | `ScholarshipDetail.jsx` | `SELECT * FROM scholarships WHERE id=X` + increment `view_count` | `published=true` |
| Save/track | Click "Save" button | `UPSERT INTO applications (user_id, scholarship_id, status='saved')` | `auth.uid() = user_id` |
| "Not Interested" | Click hide button | `UPSERT INTO applications (…, status='not_interested')` | `auth.uid() = user_id` |
| Apply Now | Click external link | Opens `apply_url` in new tab; toggles `applied=true` | `auth.uid() = user_id` |

### 1.6 Stage 6: Expiry — Auto-Unpublish

**Trigger:** Scholarship deadline passes (`deadline < now()`)

**Implementation options (choose one):**

*Option A — RLS-based soft expiry (zero-cost, immediate):*
```sql
-- Modify the public read policy to also check deadline
CREATE POLICY "Anyone can read published non-expired scholarships"
  ON public.scholarships
  FOR SELECT USING (published = true AND deadline > now());
```
With this approach, expired scholarships vanish from user queries instantly with no cron job needed. They remain in the database for admin review.

*Option B — Daily cleanup Edge Function (preferred for explicit state):*
A scheduled cron job (or Supabase scheduled function) runs daily at 3 AM EAT:
```sql
UPDATE scholarships
SET published = false
WHERE deadline < now()
  AND published = true;
```

**Recommendation:** Use Option A (RLS filter) for instant expiry + Option B (cleanup function) for explicit state management and admin visibility. The RLS filter ensures no user ever sees an expired scholarship even between cleanup runs.

### 1.7 Stage 6b: Link Validation (Daily)

**Schedule:** Daily at 3 AM EAT (see [Cron Job Schedule](#6-cron-job-schedule))

A scheduled job checks that `apply_url` for all published scholarships still resolves:

```
For each scholarship WHERE published = true:
  1. HTTP HEAD request to apply_url
  2. If status is 2xx → link OK, update verified_at
  3. If status is 4xx/5xx → flag for admin review:
     a. Set published = false (or add to broken_links table)
     b. Log to audit_logs
     c. Optionally notify admins via Telegram
```

---

## 2. User Onboarding Flow

### 2.1 Complete Screen-by-Screen Journey

```
                        USER ONBOARDING FLOW
                        ────────────────────

  ┌─────────────────────────────────────────────────────────────────┐
  │ SCREEN 1: LANDING PAGE (Public — /)                            │
  │                                                                 │
  │  ┌───────────────────────────────────────────────────────────┐  │
  │  │  🌍 Zawadi — Your Scholarship Journey Starts Here         │  │
  │  │                                                           │  │
  │  │  "Discover, track, and win scholarships with AI-powered   │  │
  │  │   tools built for African students."                      │  │
  │  │                                                           │  │
  │  │  [Get Started]  [Sign In]                                 │  │
  │  │                                                           │  │
  │  │  ── Features ──                                           │  │
  │  │  🔍 Smart Discovery  ✍️ AI Essays  📋 App Tracker         │  │
  │  │                                                           │  │
  │  │  ── Pricing ──                                            │  │
  │  │  Explorer (Free) | Plus ($5) | Pro ($12) | Mentor ($29)   │  │
  │  └───────────────────────────────────────────────────────────┘  │
  └─────────────────────────────────────────────────────────────────┘
        │
        │ User clicks [Get Started]
        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ SCREEN 2: SIGN UP (/signup)                                    │
  │                                                                 │
  │  ┌───────────────────────────────────────────────────────────┐  │
  │  │  Create Your Account                                      │  │
  │  │                                                           │  │
  │  │  Full Name:          [________________]                   │  │
  │  │  Email:              [________________]                   │  │
  │  │  Country:            [Kenya ▼]                            │  │
  │  │  Password:           [________________] (≥8 characters)   │  │
  │  │                                                           │  │
  │  │  [Create Account]                                         │  │
  │  │                                                           │  │
  │  │  Already have an account? [Sign In]                       │  │
  │  └───────────────────────────────────────────────────────────┘  │
  │                                                                 │
  │  On submit:                                                     │
  │  ┌──────────────────────────────────────────────────────┐       │
  │  │ supabase.auth.signUp({                                │       │
  │  │   email, password,                                    │       │
  │  │   options: { data: { name, country } }                │       │
  │  │ })                                                    │       │
  │  │                                                       │       │
  │  │ → auth.users INSERT (Supabase)                        │       │
  │  │ → handle_new_user() TRIGGER fires                     │       │
  │  │ → user_profiles INSERT:                               │       │
  │  │     id = auth.users.id                                │       │
  │  │     name = metadata.name                              │       │
  │  │     email = auth.users.email                          │       │
  │  │     country = metadata.country                        │       │
  │  │     plan = 'explorer'                                 │       │
  │  │     role = 'user'                                     │       │
  │  │                                                       │       │
  │  │ → Response: { data: { user, session } }               │       │
  │  │ → Store user directly: const user = data.user         │       │
  │  │   (NO second getUser() call — v1 lesson)              │       │
  │  └──────────────────────────────────────────────────────┘       │
  └─────────────────────────────────────────────────────────────────┘
        │
        │ Auto-logged in (session active)
        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ SCREEN 3: DASHBOARD — EMPTY STATE (/dashboard)                  │
  │                                                                 │
  │  ┌───────────────────────────────────────────────────────────┐  │
  │  │  👋 Welcome, [Name]!                                      │  │
  │  │                                                           │  │
  │  │  Your scholarship journey starts here.                    │  │
  │  │                                                           │  │
  │  │  ┌──────────────────────────────────────────────────┐     │  │
  │  │  │  📝 Complete your profile                          │     │  │
  │  │  │  Add your degree level and field of study to      │     │  │
  │  │  │  get personalized scholarship matches.            │     │  │
│  │  │  [Complete Profile]                                │     │  │
  │  │  └──────────────────────────────────────────────────┘     │  │
  │  │                                                           │  │
  │  │  ┌──────────────────────────────────────────────────┐     │  │
  │  │  │  🔍 Browse Scholarships                            │     │  │
  │  │  │  Explore 150+ scholarships for African students.  │     │  │
  │  │  │  [Browse Scholarships]                            │     │  │
  │  │  └──────────────────────────────────────────────────┘     │  │
  │  │                                                           │  │
  │  │  ┌──────────────────────────────────────────────────┐     │  │
  │  │  │  ✍️ Try AI Essay Generator                         │     │  │
  │  │  │  Generate a personal statement in minutes.        │     │  │
  │  │  │  [Write an Essay] (3 free today)                  │     │  │
  │  │  └──────────────────────────────────────────────────┘     │  │
  │  │                                                           │  │
  │  │  Stats (all zeros):                                       │  │
  │  │  ┌─────────┬──────────┬─────────┬──────────────┐         │  │
  │  │  │ Saved: 0 │ Applied: 0 │ Urgent: 0 │ Matches: —   │         │  │
  │  │  └─────────┴──────────┴─────────┴──────────────┘         │  │
  │  └───────────────────────────────────────────────────────────┘  │
  └─────────────────────────────────────────────────────────────────┘
        │
        │ User clicks [Complete Profile]
        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ SCREEN 4: PROFILE CREATION (/profile)                           │
  │                                                                 │
  │  ┌───────────────────────────────────────────────────────────┐  │
  │  │  Your Profile                                             │  │
  │  │                                                           │  │
  │  │  Name:          [Amara Okafor________]                    │  │
  │  │  Email:         amara@email.com (read-only)               │  │
  │  │  Country:       [Nigeria ▼]                               │  │
  │  │  Degree Level:  [Masters ▼]                               │  │
  │  │  Field of Study:[Computer Science___]                     │  │
  │  │  Preferred      [United Kingdom ▼]                        │  │
  │  │  Study Country:                                           │  │
  │  │                                                           │  │
  │  │  Plan: Explorer (Free) — [Upgrade →]                      │  │
  │  │                                                           │  │
  │  │  [Save Changes]                                           │  │
  │  └───────────────────────────────────────────────────────────┘  │
  │                                                                 │
  │  On save:                                                       │
  │  ┌──────────────────────────────────────────────────────┐       │
  │  │ api('/api/me', {                                      │       │
  │  │   method: 'POST',                                     │       │
  │  │   body: { operation: 'update_profile', ... }          │       │
  │  │ })                                                    │       │
  │  │                                                       │       │
  │  │ → POST /functions/v1/user-profile                     │       │
  │  │ → UPDATE user_profiles                                │       │
  │  │   SET degree_level, field_of_study,                   │       │
  │  │       study_country_preference, updated_at            │       │
  │  │   WHERE id = auth.uid()                               │       │
  │  └──────────────────────────────────────────────────────┘       │
  └─────────────────────────────────────────────────────────────────┘
        │
        │ Profile saved — redirect to dashboard
        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ SCREEN 5: DASHBOARD — WITH DATA (/dashboard)                    │
  │                                                                 │
  │  Now shows match scores based on completed profile.             │
  │  "Complete profile" card is replaced with scholarship matches.  │
  └─────────────────────────────────────────────────────────────────┘
```

### 2.2 First-Time User Guidance

When a new user arrives at the dashboard with an incomplete profile (no `degree_level` or `field_of_study`), the system shows a guided onboarding sequence:

```
┌────────────────────────────────────────┐
│  🎯 Getting Started with Zawadi        │
│                                        │
│  Follow these steps to start winning   │
│  scholarships:                         │
│                                        │
│  1. ✅ Create account                  │
│  2. ⬜ Complete your profile            │
│     → Add degree & field for matches   │
│  3. ⬜ Browse scholarships              │
│     → Filter by your country & field   │
│  4. ⬜ Save one to your tracker         │
│     → Click "Save" on any scholarship  │
│  5. ⬜ Generate your first essay        │
│     → Use AI Essay Generator           │
│                                        │
│  [Complete Profile →]                  │
└────────────────────────────────────────┘
```

This checklist persists on the dashboard until all steps are completed, then collapses into the normal stats view.

---

## 3. Core User Flows

### 3.1 Browse → Filter → Save → Track → Apply → Update Status

This is the primary user workflow — the "happy path" from discovery to application.

```
DETAILED STEP-BY-STEP: SCHOLARSHIP DISCOVERY TO APPLICATION
──────────────────────────────────────────────────────────

STEP 1: BROWSE
──────────────
User navigates to /scholarships or clicks "Browse Scholarships" on dashboard.

Component: ScholarshipsPage.jsx
  └─ ScholarshipGrid.jsx renders all published scholarships

Data fetch:
  api('/api/scholarships', { params: { country, degree, field, sort } })
    │
    ▼
  supabase
    .from('scholarships')
    .select('*')
    .eq('published', true)       ← RLS enforced
    .order('deadline', { ascending: true })
    │
    ▼
  Returns scholarship rows → normalizeScholarships() → React state

Rendered as a responsive grid (1 col mobile, 2 col tablet, 3 col desktop).
Each card shows: name, provider, country flags, deadline, urgency badge, match score.


STEP 2: FILTER
──────────────
Component: ScholarshipFilters.jsx

Filters available:
  ┌─────────────────────────────────────┐
  │ Country:    [All Countries ▼]       │
  │ Degree:     [All Levels ▼]          │
  │ Field:      [All Fields ▼]          │
  │ Funding:    [Any ▼]                 │
  │ Deadline:   [Any Time ▼]            │
  │                                     │
  │ Search: [keyword search...]         │
  │                                     │
  │ Sort by: [Match Score ▼]            │
  └─────────────────────────────────────┘

Each filter change triggers a re-fetch:
  api('/api/scholarships', {
    params: {
      country: 'Kenya',
      degree: 'Masters',
      field: 'Computer Science',
      funding: 'Full',
      sort: 'match_score'
    }
  })

The query is built dynamically on the client and sent to Supabase.
Supabase returns filtered results. RLS still enforces published=true.

Empty state: "No scholarships match your filters. Try broadening your search."


STEP 3: VIEW DETAIL & SAVE
───────────────────────────
User clicks a scholarship card → navigates to /scholarships/:id

Component: ScholarshipDetail.jsx

Detail view shows:
  ┌─────────────────────────────────────────────────┐
  │  Chevening Scholarship                          │
  │  UK Government • United Kingdom                  │
  │  ─────────────────────────────────────────────  │
  │                                                  │
  │  Match Score: 🟢 87%                              │
  │  Deadline: 🔴 August 15, 2026 (80 days)           │
  │                                                  │
  │  Funding: Full • Amount: Full tuition + stipend   │
  │  Eligible Countries: Kenya, Nigeria, Ghana...     │
  │  Degree Levels: Masters                          │
  │  Fields: All fields                              │
  │                                                  │
  │  Description:                                    │
  │  The Chevening Scholarship is the UK...           │
  │                                                  │
  │  Eligibility:                                    │
  │  • Citizen of a Chevening-eligible country       │
  │  • Completed undergraduate degree                │
  │  • At least 2 years work experience              │
  │                                                  │
  │  Required Documents:                             │
  │  ✅ CV        ✅ Transcript    ❌ Passport       │
  │  ❌ SOP       ✅ References                      │
  │                                                  │
  │  ─────────────────────────────────────────────  │
  │  [Apply Now →] (external)    [💾 Save]           │
  └─────────────────────────────────────────────────┘

User clicks [Save]:
  api('/api/applications', {
    method: 'POST',
    body: { scholarship_id, status: 'saved' }
  })
    │
    ▼
  supabase
    .from('applications')
    .upsert({
      user_id: auth.uid(),         ← RLS: must match auth.uid()
      scholarship_id: id,
      status: 'saved',
      priority: 'normal',
      applied: false
    })
    │
    ▼
  UNIQUE(user_id, scholarship_id) constraint ensures
  one application row per user per scholarship

Button changes to [✓ Saved] with checkmark.
Toast: "Scholarship saved to your tracker!"


STEP 4: TRACK & MANAGE
───────────────────────
User goes to /applications (Application Tracker)

Component: ApplicationTracker.jsx

Data fetch:
  api('/api/applications')
    │
    ▼
  supabase
    .from('applications')
    .select('*, scholarships(*)')    ← join to get scholarship details
    .eq('user_id', auth.uid())       ← RLS enforced
    .order('created_at')

Shows all tracked applications in a pipeline view:

  ┌──────────┬──────────┬──────────┬──────────┬──────────┐
  │ Saved    │ Drafting │ Ready    │ Applied  │ Awarded  │
  │ (5)      │ (3)      │ (2)      │ (4)      │ (1)      │
  ├──────────┼──────────┼──────────┼──────────┼──────────┤
  │ Chevening│ Erasmus  │ DAAD     │ Fulbright│ Gates    │
  │ 🔴 80d  │ 🟡 120d │ 🟢 200d │          │ 🏆       │
  │ 87% match│ 72%     │ 91%     │          │          │
  └──────────┴──────────┴──────────┴──────────┴──────────┘

Each application row has:
  - Status dropdown (8 stages)
  - Priority selector (High/Normal/Low)
  - Notes field
  - "Applied" toggle
  - "Apply Now" link

Status progression:
  Not Started → Saved → Drafting → Ready → Applied → Interview → Awarded → Rejected → Archived

Stats bar at top:
  Total: 15 | Applied: 4 | Drafting: 3 | Urgent (≤14d): 2 | Strong Matches (≥80%): 7


STEP 5: APPLY (External)
─────────────────────────
User clicks "Apply Now" on a scholarship:

  1. apply_url opens in new tab (window.open(apply_url, '_blank'))
  2. User completes the external application on the provider's website
  3. User returns to Zawadi, toggles "Applied" checkbox

Toggle "Applied":
  api('/api/applications', {
    method: 'POST',
    body: {
      id: application_id,
      applied: true,
      status: 'applied'
    }
  })
    │
    ▼
  supabase
    .from('applications')
    .update({ applied: true, status: 'applied' })
    .eq('id', application_id)
    .eq('user_id', auth.uid())    ← RLS: user must own this application


STEP 6: UPDATE STATUS
──────────────────────
As the application progresses, the user updates the status:

Status options (dropdown):
  Not Started → Saved → Drafting → Ready → Applied → Interview → Awarded → Rejected → Archived

For "Interview" status:
  User can add notes: "Phone interview scheduled for June 15"

For "Awarded" status:
  🎉 Celebration animation / confetti
  Stats bar updates
  Option to share achievement

For "Rejected":
  Scholarship stays in tracker
  Can be archived (moved to Archive view)

Each status change:
  UPDATE applications SET status = :newStatus, updated_at = now()
  WHERE id = :id AND user_id = auth.uid()
```

### 3.2 Essay Generation Flow

The essay generator has a 3-stage pipeline: **Draft → Critique & Rewrite → Final Polish.** Each stage is a separate call to the `ai-essay` Edge Function, which proxies to DeepSeek via OpenRouter.

```
ESSAY GENERATION — COMPLETE 3-STAGE PIPELINE
────────────────────────────────────────────

STAGE 0: ENTRY POINTS
─────────────────────
User can start essay generation from:
  • Dashboard → "AI Essay Generator" card
  • /essays page
  • Application detail page → "Write Essay" button (pre-fills scholarship name)


STAGE 1: SELECT ESSAY TYPE + CONTEXT
─────────────────────────────────────
Component: EssayGenerator.jsx → EssayTypeSelector.jsx

Screen:
  ┌─────────────────────────────────────────────────┐
  │  ✍️ AI Essay Generator                           │
  │                                                  │
  │  Step 1 of 3: Choose essay type                  │
  │                                                  │
  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐    │
  │  │ Personal │ │Statement │ │ Motivation    │    │
  │  │ Statement│ │of Purpose│ │ Letter        │    │
  │  └──────────┘ └──────────┘ └───────────────┘    │
  │  ┌──────────┐ ┌──────────┐                      │
  │  │Leadership│ │Study Plan│                       │
  │  │Essay     │ │          │                       │
  │  └──────────┘ └──────────┘                      │
  │                                                  │
  │  Scholarship (optional): [Chevening___________]  │
  │                                                  │
  │  Prompt:                                         │
  │  ┌──────────────────────────────────────────┐    │
  │  │ "Why I deserve the Chevening Scholarship  │    │
  │  │  based on my leadership experience in     │    │
  │  │  community health initiatives..."         │    │
  │  └──────────────────────────────────────────┘    │
  │                                                  │
  │  Key points to include (optional):               │
  │  • Led vaccination drive in rural Kenya          │
  │  • Founded health education club                 │
  │  • Published research on malaria prevention      │
  │                                                  │
  │  Tone: [Professional ▼]                          │
  │                                                  │
  │  [Generate Draft]  (3/3 remaining today)         │
  └─────────────────────────────────────────────────┘


STAGE 2: GENERATE DRAFT
───────────────────────
User clicks [Generate Draft]:

  1. Client-side check:
     if (remainingToday <= 0) → Show UpgradeModal (see §3.4)

  2. POST to Edge Function:
     api('/api/essays/generate', {
       method: 'POST',
       body: {
         type: 'personal_statement',
         prompt: 'Why I deserve the Chevening...',
         scholarship_name: 'Chevening Scholarship',
         stage: 'draft',
         tone: 'professional',
         key_points: ['...', '...', '...']
       }
     })
       │
       ▼
     POST /functions/v1/ai-essay
     Header: Authorization: Bearer <user_jwt>

     ┌─────────────────────────────────────────────┐
     │ ai-essay Edge Function                      │
     │                                             │
     │ 1. Verify JWT → extract user.id             │
     │                                             │
     │ 2. Get user plan:                           │
     │    SELECT plan FROM user_profiles           │
     │    WHERE id = user.id                       │
     │                                             │
     │ 3. Check daily limit:                       │
     │    SELECT COUNT(*) FROM essay_generations   │
     │    WHERE user_id = :id                      │
     │    AND created_at >= today_start            │
     │                                             │
     │    IF count >= TIER_LIMITS[plan]:           │
     │      → 429 { error: 'DAILY_LIMIT_REACHED' } │
     │                                             │
     │ 4. Check per-minute limit (8 req/min):      │
     │    SELECT COUNT(*) FROM essay_generations   │
     │    WHERE user_id = :id                      │
     │    AND created_at >= :one_minute_ago         │
     │                                             │
     │    IF count >= 8:                           │
     │      → 429 { error: 'RATE_LIMITED' }        │
     │                                             │
     │ 5. Build system prompt based on:            │
     │    - Essay type (personal_statement)        │
     │    - Stage (draft)                          │
     │    - Tone (professional)                    │
     │    - Key points                             │
     │    - Scholarship context                    │
     │                                             │
     │ 6. Call OpenRouter API:                     │
     │    POST https://openrouter.ai/api/v1/       │
     │         chat/completions                    │
     │    Authorization: Bearer DEEPSEEK_API_KEY    │
     │    Body: {                                  │
     │      model: 'deepseek/deepseek-chat',       │
     │      messages: [                            │
     │        { role: 'system', content: ... },    │
     │        { role: 'user', content: prompt }    │
     │      ],                                     │
     │      max_tokens: 2000                       │
     │    }                                        │
     │                                             │
     │ 7. Save to database:                        │
     │    INSERT INTO essay_generations (          │
     │      user_id, essay_type, prompt,           │
     │      scholarship_name, draft,               │
     │      stage: 'draft'                         │
│     │    )                                       │
     │                                             │
     │ 8. Return: {                                │
     │      content, stage, id,                    │
     │      remaining_today, daily_limit, plan     │
     │    }                                        │
     └─────────────────────────────────────────────┘
       │
       ▼
     Response received by client.

  3. Draft displayed in EssayEditor.jsx:
     ┌─────────────────────────────────────────────────┐
     │  📝 Draft — Personal Statement                   │
     │                                                  │
     │  ┌────────────────────────────────────────────┐  │
     │  │ As a passionate advocate for community      │  │
     │  │ health, I have dedicated the past five      │  │
     │  │ years to improving healthcare access in     │  │
     │  │ rural Kenya. My experience leading a        │  │
     │  │ vaccination drive that reached over         │  │
     │  │ 10,000 children taught me that...           │  │
     │  └────────────────────────────────────────────┘  │
     │                                                  │
     │  [Regenerate]  [Continue to Critique →]          │
     └─────────────────────────────────────────────────┘


STAGE 3: CRITIQUE & REWRITE
────────────────────────────
User clicks [Continue to Critique]:

  POST /functions/v1/ai-essay
  Body: {
    type: 'personal_statement',
    stage: 'critique',
    previous_content: '<the draft text>',
    scholarship_name: 'Chevening Scholarship'
  }

Edge Function builds a critique prompt:
  "You are an expert scholarship essay reviewer. Analyze this essay for:
   1. Clarity & coherence
   2. Grammar & style
   3. Persuasiveness — does it convince the scholarship committee?
   4. Scholarship fit — does it address what Chevening looks for?
   Then provide a rewritten version incorporating improvements."

Response contains: { critique: "...", rewritten: "..." }

Component: CritiquePanel.jsx shows side-by-side:

  ┌─────────────────────┬──────────────────────────┐
  │  📋 Your Draft       │  ✨ AI Rewrite            │
  │                      │                          │
  │  As a passionate     │  My five-year journey    │
  │  advocate for...     │  advancing community     │
  │                      │  health in rural Kenya   │
  │  ...                 │  has shaped my...        │
  │                      │                          │
  │                      │  ── Critique ──          │
  │                      │  ✅ Strong opening       │
  │                      │  ⚠️ Add specific metrics │
  │                      │  ⚠️ Connect to Chevening │
  │                      │     values explicitly    │
  └─────────────────────┴──────────────────────────┘

  [Keep Original]  [Accept Rewrite & Polish →]


STAGE 4: FINAL POLISH
─────────────────────
User clicks [Accept Rewrite & Polish]:

  POST /functions/v1/ai-essay
  Body: {
    type: 'personal_statement',
    stage: 'polish',
    previous_content: '<accepted version>'
  }

Edge Function polishes for:
  - Flow and transitions between paragraphs
  - Vocabulary enhancement (stronger verbs, more precise language)
  - Emotional impact and memorability
  - Professional tone consistency
  - Grammar and punctuation (final pass)

Final output displayed:

  ┌─────────────────────────────────────────────────┐
  │  ✨ Final Essay — Personal Statement              │
  │                                                  │
  │  ┌────────────────────────────────────────────┐  │
  │  │ [Final polished text...]                    │  │
  │  └────────────────────────────────────────────┘  │
  │                                                  │
  │  [📋 Copy]  [📥 Download as PDF]  [💾 Save]      │
  │  [🔄 Start New Essay]                            │
  └─────────────────────────────────────────────────┘

Actions:
  • Copy: navigator.clipboard.writeText(content) → toast "Copied!"
  • Download PDF: Generate client-side PDF → download
  • Save: Links essay to user's document vault (INSERT into documents)
  • Start New: Returns to Stage 1

Database state after full pipeline:
  essay_generations row:
    id, user_id, essay_type, prompt, scholarship_name,
    draft (Stage 2 output),
    critique (Stage 3 critique text),
    final (Stage 4 polished text),
    stage: 'polish',
    created_at
```

### 3.3 Document Upload Flow

```
DOCUMENT UPLOAD — COMPLETE FLOW
────────────────────────────────

User navigates to /documents (Document Vault)

Component: DocumentVault.jsx

Data fetch:
  api('/api/documents')
    │
    ▼
  supabase
    .from('documents')
    .select('*')
    .eq('user_id', auth.uid())       ← RLS enforced
    .order('created_at', { ascending: false })


STEP 1: SELECT FILE
───────────────────
User clicks [Upload Document] button.

Native file input opens (accepts: .pdf, .jpg, .jpeg, .png, .webp, .doc, .docx, .txt).
Max size: 10MB (enforced by both client-side check AND storage bucket limit).

Client validation:
  if (file.size > 10 * 1024 * 1024) → "File too large. Maximum 10MB."
  if (!allowedTypes.includes(file.type)) → "Unsupported file type."


STEP 2: CHOOSE DOCUMENT TYPE
─────────────────────────────
Modal appears after file selected:

  ┌─────────────────────────────────────────┐
  │  Upload Document                        │
  │                                         │
  │  File: cv_final.pdf (245 KB)            │
  │                                         │
  │  Document Type:                         │
  │  [CV / Resume ▼]                        │
  │  ─ CV/Resume                            │
  │  ─ Transcript                           │
  │  ─ Certificate                          │
  │  ─ Motivation Letter                    │
  │  ─ Statement of Purpose                 │
  │  ─ References                           │
  │  ─ Passport/ID                          │
  │  ─ Financial Evidence                   │
  │  ─ Admission Letter                     │
  │  ─ Essay                                │
  │  ─ Other                                │
  │                                         │
  │  [Cancel]  [Upload]                     │
  └─────────────────────────────────────────┘


STEP 3: UPLOAD TO STORAGE
──────────────────────────
User clicks [Upload]:

  1. TIER CHECK (server-side via database trigger):
     ┌──────────────────────────────────────────────┐
     │ BEFORE INSERT trigger on documents:          │
     │                                              │
     │ check_document_upload_limit()                │
     │   1. SELECT plan FROM user_profiles          │
     │      WHERE id = NEW.user_id                  │
     │   2. Map plan to limit:                      │
     │      explorer → 5                            │
     │      plus → 15                               │
     │      pro → 50                                │
     │      mentor → unlimited (999999)              │
     │   3. SELECT COUNT(*) FROM documents          │
     │      WHERE user_id = NEW.user_id             │
     │   4. IF count >= limit:                      │
     │        RAISE EXCEPTION 'limit reached'       │
     │                                              │
     │ This cannot be bypassed — it runs inside     │
     │ PostgreSQL with SECURITY DEFINER.            │
     └──────────────────────────────────────────────┘

  2. Upload file to Supabase Storage:
     supabase.storage
       .from('documents')
       .upload(
         `${user_id}/${timestamp}_${filename}`,
         file
       )
       │
       ▼
     Storage RLS policy:
       "Users access own documents" ON storage.objects
       FOR ALL USING (
         bucket_id = 'documents'
         AND auth.uid()::text = (storage.foldername(name))[1]
       )
       → Only allows upload to the user's own folder

  3. Insert metadata into documents table:
     supabase
       .from('documents')
       .insert({
         user_id: auth.uid(),
         name: 'cv_final.pdf',
         type: 'CV / Resume',
         size_bytes: 250880,
         storage_path: `${user_id}/1716921600_cv_final.pdf`
       })
       │
       ▼
     RLS policy:
       "Users manage own documents" ON documents
       FOR ALL USING (auth.uid() = user_id)

  4. Return success → Document appears in vault

  5. If tier limit exceeded, trigger raises exception:
     → Client receives error
     → Toast: "Document limit reached (5/5 on Explorer). Upgrade to add more."
     → [Upgrade →] button shown


STEP 4: DOCUMENT VAULT VIEW
────────────────────────────
After successful upload:

  ┌─────────────────────────────────────────────────┐
  │  📁 Document Vault    [Upload Document]          │
  │                                                  │
  │  ┌─────────┬──────────┬──────────┬──────────┐   │
  │  │ 📄 CV   │ 📄 Trans │ 📄 Cert  │ 📄 Pass  │   │
  │  │ resume  │ cript    │ ificate  │ port     │   │
  │  │ 245 KB  │ 1.2 MB   │ 890 KB   │ 450 KB   │   │
  │  │ [🗑️]    │ [🗑️]    │ [🗑️]    │ [🗑️]    │   │
  │  └─────────┴──────────┴──────────┴──────────┘   │
  │                                                  │
  │  Used: 4/5 documents (Explorer plan)             │
  │  [Upgrade for more storage →]                    │
  └─────────────────────────────────────────────────┘


DELETE FLOW:
  User clicks 🗑️ → Confirmation modal → [Delete]

  supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', auth.uid())     ← RLS enforced

    Then:
    supabase.storage
      .from('documents')
      .remove([storagePath])

  Document removed from both storage and metadata table.
  Used count decreases → "Used: 3/5 documents"
```

### 3.4 Payment Upgrade Flow

This flow triggers when a user hits a tier limit or proactively wants to upgrade.

```
PAYMENT UPGRADE — COMPLETE FLOW FROM LIMIT TO ACTIVATION
─────────────────────────────────────────────────────────

TRIGGERS:
  • Essay generation: "3/3 essays used today" → UpgradeModal
  • Document upload: "5/5 documents used" → UpgradeModal
  • Proactive: User visits /pricing or clicks "Upgrade" on /profile


STEP 1: UPGRADE MODAL
─────────────────────
Component: UpgradeModal.jsx

Triggered when a feature limit is hit:

  ┌─────────────────────────────────────────────────┐
  │  ⚡ Upgrade to Continue                          │
  │                                                  │
  │  You've reached your daily essay limit           │
  │  (3/3 on Explorer).                              │
  │                                                  │
  │  Upgrade to Scholar Plus for:                    │
  │  • 10 essays per day                             │
  │  • 15 document uploads                           │
  │  • Detailed match scores                         │
  │  • Document gap analysis                         │
  │                                                  │
  │  ─────────────────────────────────────────────  │
  │  [View Plans]     [Maybe Later]                  │
  └─────────────────────────────────────────────────┘

[Maybe Later] → Modal closes, user returns to previous screen.
[View Plans]   → Navigate to /pricing


STEP 2: PRICING PAGE
────────────────────
Component: PricingPage.jsx

Shows all four tiers with monthly/annual toggle:

  ┌──────────────────────────────────────────────────────────────────┐
  │  Choose Your Plan              [Monthly] / [Annual] (save 17%)   │
  │                                                                  │
  │  ┌──────────┬──────────┬──────────────┬──────────────┐          │
  │  │ Explorer │ Scholar  │ Application │ Mentor       │          │
  │  │ FREE     │ Plus     │ Pro         │ Review       │          │
  │  │          │ $5/mo    │ $12/mo      │ $29/mo       │          │
  │  │          │ ≈KES 650 │ ≈KES 1,560  │ ≈KES 3,770   │          │
  │  ├──────────┼──────────┼──────────────┼──────────────┤          │
  │  │Unlimited │Unlimited │ Unlimited    │ Unlimited    │          │
  │  │browsing  │browsing  │ browsing     │ browsing     │          │
  │  │          │          │              │              │          │
  │  │3 essays  │10 essays │ 25 essays    │ 50 essays    │          │
  │  │/day      │/day      │ /day         │ /day         │          │
  │  │          │          │              │              │          │
  │  │5 docs    │15 docs   │ 50 docs      │ Unlimited    │          │
  │  │          │          │              │ docs         │          │
  │  │          │          │              │              │          │
  │  │Basic     │Detailed  │ +Auto-apply  │ +Mentorship  │          │
  │  │match     │match     │ +Voice learn │ +Interview   │          │
  │  │          │          │              │ prep         │          │
  │  ├──────────┼──────────┼──────────────┼──────────────┤          │
  │  │[Current] │[Select   │[Select       │[Select       │          │
  │  │          │ Plan]    │ Plan]        │ Plan]        │          │
  │  └──────────┴──────────┴──────────────┴──────────────┘          │
  └──────────────────────────────────────────────────────────────────┘

If user is already on a paid plan → lower-tier plans show "Downgrade"
but are disabled if user exceeds that tier's limits.

User clicks [Select Plan] on Scholar Plus monthly.


STEP 3: PAYSTACK CHECKOUT
─────────────────────────
  api('/api/payments/initiate', {
    method: 'POST',
    body: { plan_code: 'PLN_unw5dchqqxx8h81', email: user.email }
  })

  → Client-side Paystack popup:

  ┌─────────────────────────────────────────┐
  │  Paystack Checkout                      │
  │                                         │
  │  Scholar Plus — Monthly                 │
  │  KES 650.00                             │
  │                                         │
  │  Pay with:                              │
  │  ┌─────────────────────────────────┐    │
  │  │ 💳 Card                         │    │
  │  │ 📱 M-Pesa                       │    │
  │  │ 🏦 Bank Transfer                │    │
  │  └─────────────────────────────────┘    │
  │                                         │
  │  Email: amara@email.com                 │
  └─────────────────────────────────────────┘

  User completes payment.


STEP 4: WEBHOOK PROCESSING
──────────────────────────
Paystack sends webhook to POST /functions/v1/paystack-webhook:

  ┌─────────────────────────────────────────────────┐
  │ paystack-webhook Edge Function                  │
  │                                                 │
  │ 1. Verify HMAC SHA-512 signature               │
  │    crypto.createHmac('sha512', secret)           │
  │    .update(JSON.stringify(body))                │
  │    .digest('hex')                               │
  │    → Timing-safe comparison with header         │
  │    → Fail → 401 Unauthorized                    │
  │                                                 │
  │ 2. Idempotency check:                           │
  │    SELECT FROM payments                         │
  │    WHERE webhook_event_id = body.event          │
  │    → Exists → 200 OK (already processed)        │
  │                                                 │
  │ 3. Process charge.success:                      │
  │    a. Find user:                                │
  │       SELECT FROM user_profiles                 │
  │       WHERE email = data.customer.email          │
  │    b. Map plan:                                 │
  │       PLN_unw5dchqqxx8h81 → 'plus'             │
  │    c. Update profile:                           │
  │       UPDATE user_profiles                      │
  │       SET plan = 'plus',                        │
  │           plan_expires_at = next_payment_date    │
  │       WHERE id = user_id                        │
  │    d. Record payment:                           │
  │       INSERT INTO payments (                    │
  │         user_id, paystack_reference,            │
  │         amount, plan, status,                   │
  │         webhook_event_id                        │
  │       )                                         │
  │                                                 │
  │ 4. Return 200 OK                                │
  └─────────────────────────────────────────────────┘


STEP 5: CLIENT-SIDE CONFIRMATION
────────────────────────────────
Meanwhile, the client is polling for plan update:

  // After Paystack callback fires:
  const interval = setInterval(async () => {
    const { data } = await api('/api/me');
    if (data.plan === 'plus') {
      clearInterval(interval);
      showSuccess();
    }
  }, 2000);  // poll every 2 seconds, up to 30 seconds

  // Fallback: if 30 seconds pass, show "Still processing..." with manual refresh

  On success:

  ┌─────────────────────────────────────────────────┐
  │  🎉 Plan Activated!                              │
  │                                                  │
  │  You're now on Scholar Plus!                     │
  │  • 10 essays/day                                 │
  │  • 15 document uploads                           │
  │  • Detailed match scores                         │
  │                                                  │
  │  [Continue to Essay Generator →]                 │
  └─────────────────────────────────────────────────┘

  User returns to the feature they were using when the limit was hit.
```

---

## 4. Admin Operations

### 4.1 Admin Roles & Access

Zawadi has four roles with granular permissions. The admin panel at `/admin` is a completely separate Vite entry point — zero admin code appears in the user bundle.

| Role | `user_profiles.role` | Who | Key Abilities |
|---|---|---|---|
| **Super Admin** | `super_admin` | Techsari leads (1–2 people) | Everything: delete users, delete scholarships, view audit logs, change roles |
| **Content Manager** | `content_manager` | Content team | CRUD scholarships, manage bot queue, bulk import, publish/unpublish |
| **Support Agent** | `support_agent` | Support team | List users, change user plans, view statistics |
| **User** | `user` | Every registered user | Own data only — no admin access |

All admin operations flow through the `admin-operations` Edge Function, which uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. The Edge Function checks the caller's `user_profiles.role` against a hardcoded permission map:

```typescript
const OPERATION_PERMISSIONS: Record<string, string> = {
  scholarships_create:       'content_manager',
  scholarships_update:       'content_manager',
  scholarships_delete:       'super_admin',       // DESTRUCTIVE
  scholarships_publish:      'content_manager',
  scholarships_bulk_import:  'content_manager',
  ingestions_approve:        'content_manager',
  ingestions_reject:         'content_manager',
  users_list:                'support_agent',
  users_update_plan:         'support_agent',
  users_suspend:             'super_admin',       // DESTRUCTIVE
  users_delete:              'super_admin',       // DESTRUCTIVE
  users_change_role:         'super_admin',
  stats_get:                 'support_agent',
  audit_list:                'super_admin',
};
```

### 4.2 Daily Admin Workflow

```
DAILY ADMIN WORKFLOW (Content Manager)
──────────────────────────────────────

MORNING ROUTINE (9:30 AM EAT — after bot runs at 9 AM)

  STEP 1: LOGIN
  ─────────────
  Navigate to https://www.techsari.online/admin
    │
    ▼
  Admin Login screen:
    Email: admin@zawadi.app
    Password: ********
    │
    ▼
  Authenticate via Supabase Auth → check user_profiles.role
  Role check: role IN ('super_admin', 'content_manager', 'support_agent')
  → AdminDashboard.jsx loads


  STEP 2: DASHBOARD OVERVIEW
  ──────────────────────────
  AdminDashboard.jsx shows at-a-glance metrics:

  ┌────────────────────────────────────────────────────────────┐
  │  📊 Admin Dashboard                  [Last updated: just now]│
  │                                                            │
  │  ┌──────────┬──────────┬──────────┬──────────┐            │
  │  │ 150      │ 120      │ 30       │ 450      │            │
  │  │ Total    │ Published│ Pending  │ Total    │            │
  │  │ Schol.   │          │ Review   │ Users    │            │
  │  └──────────┴──────────┴──────────┴──────────┘            │
  │                                                            │
  │  ┌──────────┬──────────┬──────────┐                       │
  │  │ 35       │ KES      │ 14       │                       │
  │  │ Active   │ 22,750   │ In Bot   │                       │
  │  │ Subs.    │ Revenue   │ Queue ⚠️  │                       │
  │  └──────────┴──────────┴──────────┘                       │
  │                                                            │
  │  ⚠️ Attention needed: 14 items in bot review queue         │
  │  ⚠️ 2 scholarships expire this week                        │
  │                                                            │
  │  [Review Bot Queue →]                                      │
  └────────────────────────────────────────────────────────────┘


  STEP 3: REVIEW BOT QUEUE
  ────────────────────────
  Clicks "Bot Queue" tab → IngestionQueue.jsx

  Lists all bot_ingestions WHERE status = 'pending':

  ┌────────────────────────────────────────────────────────────┐
  │  🤖 Bot Ingestion Queue — 14 Pending                       │
  │                                                            │
  │  ┌──────────────────────────────────────────────────────┐  │
  │  │ #1 — Mastercard Foundation Scholarship                │  │
  │  │ Provider: Mastercard Foundation                       │  │
  │  │ Host: Multiple Countries (Africa)                     │  │
  │  │ Deadline: 2026-09-30 (126 days) 🟢                    │  │
  │  │ Apply URL: https://mastercardfdn.org/... [Test Link]  │  │
  │  │ Source: https://mastercardfdn.org/scholarships        │  │
  │  │ Eligibility: African students, undergraduate...       │  │
  │  │                                                       │  │
  │  │ [Approve ✅]  [Reject ❌]  [Mark Duplicate 🔄]         │  │
  │  └──────────────────────────────────────────────────────┘  │
  │                                                            │
  │  ┌──────────────────────────────────────────────────────┐  │
  │  │ #2 — [Next scholarship...]                             │  │
  │  └──────────────────────────────────────────────────────┘  │
  └────────────────────────────────────────────────────────────┘

  Admin actions per item:
    • [Test Link] — opens apply_url in new tab to verify it's live
    • Verify eligibility matches listed countries
    • Check deadline is correct
    • [Approve] → scholarship published immediately
    • [Reject] → prompted for reason, logged
    • [Mark Duplicate] → linked to existing scholarship, unpublished row deleted


  STEP 4: MANAGE SCHOLARSHIPS
  ───────────────────────────
  "Scholarships" tab → ScholarshipManager.jsx

  ┌────────────────────────────────────────────────────────────┐
  │  📚 Scholarship Database                                    │
  │                                                            │
  │  Search: [_______________]  Status: [All ▼]                 │
  │  [Add New]  [Bulk Import]                                   │
  │                                                            │
  │  ┌──────┬────────────────┬──────────┬─────────┬─────────┐  │
  │  │Status│ Name           │ Provider │ Deadline│ Actions │  │
  │  ├──────┼────────────────┼──────────┼─────────┼─────────┤  │
  │  │🟢Pub │Chevening       │UK Gov    │Aug 15   │[Edit]   │  │
  │  │     │                │          │         │[Unpub]  │  │
  │  │     │                │          │         │[Delete] │  │
  │  ├──────┼────────────────┼──────────┼─────────┼─────────┤  │
  │  │🔴Unp.│DAAD MIPLC      │DAAD      │Oct 31   │[Edit]   │  │
  │  │     │                │          │         │[Pub]    │  │
  │  │     │                │          │         │[Delete] │  │
  │  └──────┴────────────────┴──────────┴─────────┴─────────┘  │
  └────────────────────────────────────────────────────────────┘

  Available actions (permission-gated):
    • Add New → ScholarshipForm.jsx (content_manager+)
    • Bulk Import → upload CSV/JSON → parsed → preview → confirm (content_manager+)
    • Edit → inline edit form (content_manager+)
    • Publish/Unpublish → toggle button (content_manager+)
    • Delete → confirmation modal → super_admin only


  STEP 5: MANAGE USERS
  ────────────────────
  "Users" tab → UserManager.jsx (support_agent+)

  ┌────────────────────────────────────────────────────────────┐
  │  👥 User Management                                         │
  │                                                            │
  │  Search: [_______________]  Plan: [All ▼]  Country: [All ▼]│
  │                                                            │
  │  ┌──────┬──────────────┬─────────┬────────┬─────────────┐  │
  │  │ Name │ Email        │ Country │ Plan   │ Actions     │  │
  │  ├──────┼──────────────┼─────────┼────────┼─────────────┤  │
  │  │Amara │amara@email.. │ Nigeria │ plus   │[View] [Plan]│  │
  │  │Kofi  │kofi@email..  │ Ghana   │ pro    │[View] [Plan]│  │
  │  │Fatima│fatima@email..│ Kenya   │explorer│[View] [Plan]│  │
  │  └──────┴──────────────┴─────────┴────────┴─────────────┘  │
  └────────────────────────────────────────────────────────────┘

  Actions:
    • [View] → UserDetail.jsx: full profile, application list, payment history
    • [Plan] → Dropdown to change plan (support_agent+):
        explorer | plus | pro | mentor
      → Calls admin-operations → users_update_plan
    • Suspend / Delete → super_admin only


  STEP 6: VIEW STATISTICS
  ───────────────────────
  "Statistics" tab → StatisticsPanel.jsx (support_agent+)

  • Signups over time (chart)
  • Essays generated per day
  • Applications tracked per user (average)
  • Revenue by plan
  • Scholarship views / saves / applications
  • Bot ingestion acceptance rate
```

### 4.3 Role-Specific Admin UI

Each admin role sees a different subset of the admin panel:

| Tab | `super_admin` | `content_manager` | `support_agent` |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Bot Queue | ✅ | ✅ | ❌ |
| Scholarships | ✅ | ✅ | ❌ (view only) |
| Users | ✅ | ❌ | ✅ |
| Subscriptions | ✅ | ❌ | ✅ |
| Audit Logs | ✅ | ❌ | ❌ |
| Statistics | ✅ | ✅ | ✅ |
| Settings | ✅ | ❌ | ❌ |

---

## 5. Bot Pipeline — Complete Hermes Cron Configuration

### 5.1 Hermes Cron Job Definition

```yaml
# Hermes Cron Job Configuration
# Deployed via: cronjob create (see deployment command below)
# Managed in Hermes Agent dashboard

name: "Zawadi Bot — Daily Scholarship Hunt"
description: >
  Automated scholarship discovery agent. Searches the web daily
  for new scholarship opportunities for African students, validates
  findings, and submits them to the Zawadi platform for admin review.

schedule: "0 6 * * *"          # UTC = 9 AM EAT (UTC+3)
timezone: Africa/Nairobi       # EAT timezone

agent:
  model: "deepseek-v4-pro"     # or latest available
  provider: "deepseek"

  prompt: |
    You are the Zawadi Scholarship Bot. Your mission is to find NEW scholarship
    opportunities for African students that are NOT already in the Zawadi database.

    ## SEARCH PHASE
    Search the web for scholarships meeting these criteria:
    - Open to students from African countries
    - For Bachelors, Masters, PhD, or Postdoctoral studies
    - Any academic field (not limited to STEM)
    - Full or partial funding
    - Deadline must be in the future (after today: ${TODAY})
    - Direct application links only — NOT aggregator sites

    Search across these domains and sources:
    - University websites (.edu, .ac.ke, .ac.za, .ac.uk, etc.)
    - Foundation websites (.org) — Mastercard Foundation, Gates Foundation, etc.
    - Government scholarship portals (.gov)
    - International organizations (DAAD, Chevening, Commonwealth, Erasmus, etc.)
    - African Union and regional bodies

    ## EXTRACTION PHASE
    For each scholarship found, extract structured data:

    {
      "name": "Full official scholarship name",
      "provider": "Organization offering the scholarship",
      "host": "Host institution or country",
      "country": ["List of eligible countries"],
      "degree_levels": ["Bachelors", "Masters", "PhD"],
      "fields": ["List of eligible academic fields"],
      "funding_type": "Full" or "Partial",
      "amount": "Funding details (tuition, stipend, travel, etc.)",
      "deadline": "ISO 8601 date (YYYY-MM-DD)",
      "description": "Full description of the scholarship",
      "eligibility": "Eligibility requirements",
      "required_documents": ["List of required documents"],
      "apply_url": "DIRECT application page URL (not aggregator)",
      "source_url": "Page where you found this scholarship"
    }

    ## VALIDATION PHASE (DO BEFORE SUBMITTING)
    For each scholarship, verify:
    1. ✅ apply_url goes to an official application page (reject: scholarships.com,
       opportunitiesforafricans.com, scholarship-positions.com, after school africa,
       advance-africa.com, and any other aggregator/listing site)
    2. ✅ Deadline is in the future
    3. ✅ Scholarship accepts students from African countries
    4. ✅ Not a duplicate of another entry in this batch (check name + host)

    ## TARGET
    - Find 10-20 NEW scholarships per run
    - Cover all 54 African countries
    - Cover all degree levels
    - Cover all academic fields

    ## SUBMISSION PHASE
    After validation, submit ALL validated scholarships in a single POST request:

    POST https://efvxtcxhjlbzzsixfrvo.supabase.co/functions/v1/ingest-scholarship
    Header: x-ingest-key: zawadi_aea7f39282771f497d46303943a909e24677d76b12fac43d
    Content-Type: application/json

    Body:
    {
      "scholarships": [
        { ... scholarship 1 ... },
        { ... scholarship 2 ... },
        ...
      ]
    }

    ## OUTPUT
    - Report how many scholarships were found, validated, and submitted
    - Report how many were accepted, rejected, or marked as duplicates
    - List any that were rejected and why
    - If fewer than 5 were submitted, explain why (dry day? search issues?)

    ## ERROR HANDLING
    - If the ingest endpoint returns an error, report the error details
    - If no new scholarships are found, report: "No new scholarships found today"
    - If the search itself fails, report the failure and suggest retry

  skills:
    - "web-search"          # For searching the web
    - "scholarship-scout"   # Custom skill for scholarship extraction patterns

  delivery:
    channel: "telegram"
    target: "admin_chat"     # Sends summary to admin Telegram

  retry:
    on_failure: true
    max_retries: 2
    retry_delay_minutes: 30

  timeout_seconds: 600       # 10 minutes max
```

### 5.2 What the Bot Searches For

The bot uses web search capabilities to scan:

| Source Type | Examples | What It Looks For |
|---|---|---|
| University sites | `.edu`, `.ac.ke`, `.ac.za` | "International scholarships", "financial aid for African students" |
| Foundation sites | `.org` | Mastercard Foundation, Gates Foundation, Mandela Rhodes |
| Government portals | `.gov` | DAAD (Germany), Chevening (UK), Commonwealth (UK), Erasmus (EU) |
| International orgs | `au.int`, `afdb.org` | African Union scholarships, AfDB programs |
| NGO sites | Various `.org` | WAAW Foundation, Zawadi Africa, Aga Khan Foundation |

**Search queries the bot constructs:**
- `"new scholarships for African students [MONTH] [YEAR]"`
- `"fully funded masters scholarships for Africans [YEAR]"`
- `"PhD funding African students [DEADLINE_YEAR]"`
- `"[COUNTRY] scholarships for international students from Africa"`

### 5.3 Bot Error Handling & Edge Cases

| Scenario | Bot Behavior | System Response |
|---|---|---|
| **No new scholarships found** | Bot reports: "No new scholarships found today. Searched X sources." | Admin sees empty queue — normal |
| **Fewer than 5 found** | Bot submits what it found + explanation ("Light day — only found 3 new scholarships") | Admin reviews 3 items |
| **All found are duplicates** | Bot submits with notes; ingest endpoint rejects all as duplicates | Admin sees 0 new in queue |
| **Ingest endpoint down** | Bot retries 2x with 30-min delay, then reports failure to Telegram | Admin investigates Edge Function |
| **Found scholarship has dead apply link** | Bot still submits (link may be temporarily down); admin catches during review | Admin rejects with reason "dead link" |
| **Found scholarship with same name but different host** | This is NOT a duplicate — different host = different scholarship | Both submitted as separate items |
| **Found scholarship with same name AND same host** | Bot marks as duplicate, skips submission | Nothing ingested |
| **Search engine returns aggregator-only results** | Bot skips those, tries more specific queries, reports "low signal" | May result in fewer submissions |

---

## 6. Cron Job Schedule

### 6.1 Complete Automated Task Calendar

```
                    WEEKLY CRON CALENDAR (EAT Timezone)
                    ─────────────────────────────────────

    TIME (EAT)    MON     TUE     WED     THU     FRI     SAT     SUN
    ──────────    ───     ───     ───     ───     ───     ───     ───

    03:00         LINK    LINK    LINK    LINK    LINK    LINK    LINK
                  VALID   VALID   VALID   VALID   VALID   VALID   VALID

    09:00         ZBDH    ZBDH    ZBDH    ZBDH    ZBDH    ZBDH    ZBDH
                  +UALRT  +UALRT  +UALRT  +UALRT  +UALRT  +UALRT  +UALRT

    21:00         UALRT   UALRT   UALRT   UALRT   UALRT   UALRT   UALRT

    ──────────

    LEGEND:
    ZBDH  = Zawadi Bot Daily Hunt
    LINK  = Link Validation Check
    UALRT = Urgent Deadline Alerts
    CLEAN = Weekly Data Cleanup (Sundays only, 02:00)
```

### 6.2 Job Specifications

#### Job 1: Zawadi Bot Daily Hunt

| Parameter | Value |
|---|---|
| **Schedule** | `0 6 * * *` UTC = 9:00 AM EAT daily |
| **Executor** | Hermes Cron → Zawadi Bot Agent |
| **Duration** | ~5–10 minutes |
| **Purpose** | Discover new scholarships and submit to ingest endpoint |
| **Success criteria** | 5–20 new scholarships ingested with `published=false` |
| **Failure handling** | Retry 2× at 30-minute intervals; alert admin Telegram on total failure |
| **Output** | Summary posted to admin Telegram + `bot_ingestions` table populated |

#### Job 2: Urgent Deadline Alerts

| Parameter | Value |
|---|---|
| **Schedule** | `0 6 * * *` AND `0 18 * * *` UTC = 9 AM + 9 PM EAT daily |
| **Executor** | Hermes Cron or Supabase Scheduled Function |
| **Purpose** | Notify users with tracked scholarships closing within 7 days |
| **Logic** | `SELECT * FROM applications a JOIN scholarships s ON a.scholarship_id = s.id WHERE s.deadline BETWEEN now() AND now() + INTERVAL '7 days' AND a.status != 'applied' AND a.status != 'awarded'` |
| **Delivery** | In-app notification badge + optional email |
| **Success criteria** | All users with urgent deadlines receive notification |

#### Job 3: Link Validation

| Parameter | Value |
|---|---|
| **Schedule** | `0 0 * * *` UTC = 3:00 AM EAT daily |
| **Executor** | Supabase Scheduled Function (Edge Function) |
| **Purpose** | Verify all published scholarship `apply_url` links are still live |
| **Logic** | For each published scholarship: HTTP HEAD → check status 2xx |
| **On failure** | Set `published=false`, log to `audit_logs`, notify admin |
| **Duration** | ~1–5 minutes (depends on scholarship count) |

Edge Function pseudocode:
```typescript
// Scheduled Edge Function: link-validator
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: scholarships } = await supabase
    .from('scholarships')
    .select('id, name, apply_url')
    .eq('published', true);

  const brokenLinks = [];

  for (const s of scholarships) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(s.apply_url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok && res.status >= 400) {
        brokenLinks.push(s);
      } else {
        // Link OK — update verified_at
        await supabase
          .from('scholarships')
          .update({ verified_at: new Date().toISOString() })
          .eq('id', s.id);
      }
    } catch {
      brokenLinks.push(s); // timeout or network error
    }
  }

  // Handle broken links
  for (const s of brokenLinks) {
    await supabase
      .from('scholarships')
      .update({ published: false })
      .eq('id', s.id);

    await supabase.from('audit_logs').insert({
      admin_email: 'system@zawadi.app',
      action: 'link_validation_failed',
      target_type: 'scholarship',
      target_id: s.id,
      details: { name: s.name, url: s.apply_url },
    });
  }

  return new Response(JSON.stringify({
    checked: scholarships.length,
    broken: brokenLinks.length,
    broken_names: brokenLinks.map(s => s.name),
  }));
});
```

#### Job 4: Weekly Data Cleanup

| Parameter | Value |
|---|---|
| **Schedule** | `0 23 * * 0` UTC = 2:00 AM EAT Sunday |
| **Executor** | Supabase Scheduled Function |
| **Purpose** | Archive old bot ingestion logs, clean orphaned data |
| **Operations** | 1. Archive `bot_ingestions` older than 30 days<br>2. DELETE unpublished scholarships with rejected/duplicate ingestions older than 14 days<br>3. Vacuum/analyze tables (if needed)<br>4. Log cleanup summary to `audit_logs` |

---

## 7. Error Handling Flows

### 7.1 Authentication Failures

```
AUTH FAILURE SCENARIOS
──────────────────────

SCENARIO A: WRONG PASSWORD
──────────────────────────
User enters wrong password on Sign In form.

  Client:
    supabase.auth.signInWithPassword({ email, password })
      │
      ▼
    Response: { data: null, error: { message: "Invalid login credentials" } }

  UI:
    ┌─────────────────────────────────────────┐
    │  ❌ Invalid email or password            │
    │  Please check your credentials and try   │
    │  again.                                  │
    │                                          │
    │  [Try Again]  [Forgot Password?]         │
    └─────────────────────────────────────────┘

  Database: No entry created. No state changed.

  Rate limiting: Supabase Auth enforces rate limits (typically 5 attempts
  per IP per minute). After 5 failures → temporary IP block.


SCENARIO B: EXPIRED SESSION
───────────────────────────
User returns after several days. JWT has expired.

  Client makes API call:
    api('/api/scholarships')
      │
      ▼
    supabase.from('scholarships').select('*')
    → Returns 401 / empty array (RLS blocks unauthenticated reads)

  AuthContext detects expired session:
    onAuthStateChange listener fires with event: 'SIGNED_OUT'
      │
      ▼
    AuthContext updates: user = null, session = null
    AuthGuard component redirects to /signin

  UI:
    ┌─────────────────────────────────────────┐
    │  Session expired                         │
    │  Please sign in again to continue.       │
    │                                          │
    │  Email: [pre-filled if available]        │
    │  Password: [________________]            │
    │                                          │
    │  [Sign In]                               │
    └─────────────────────────────────────────┘

  After re-authentication:
    → Redirect back to the page they were on (stored in location state)


SCENARIO C: ACCOUNT LOCKED / SUSPENDED
───────────────────────────────────────
Admin suspends user account (super_admin action).

  User attempts to sign in:
    → Supabase Auth may return error if account disabled
    → Or: sign in succeeds, but user_profiles.status = 'suspended'

  AuthGuard checks profile:
    if (profile.status === 'suspended') {
      return <AccountSuspended reason={profile.suspension_reason} />;
    }

  UI:
    ┌─────────────────────────────────────────┐
    │  ⚠️ Account Suspended                    │
    │                                          │
    │  Your account has been suspended.        │
    │  Reason: Violation of Terms of Service   │
    │                                          │
    │  Contact support@zawadi.app to appeal.   │
    └─────────────────────────────────────────┘
```

### 7.2 Payment Failures

```
PAYMENT FAILURE SCENARIOS
─────────────────────────

SCENARIO A: INSUFFICIENT FUNDS
───────────────────────────────
User attempts payment but has insufficient funds.

  Paystack popup:
    → Payment declined by bank / M-Pesa
    → Paystack shows: "Transaction declined. Insufficient funds."

  Client callback:
    onClose fires (user closes popup)
    → Toast: "Payment was not completed. Please try again."

  No webhook sent. No database changes. User remains on current plan.


SCENARIO B: WEBHOOK TIMEOUT / NOT RECEIVED
───────────────────────────────────────────
Payment succeeds on Paystack but webhook doesn't arrive (network issue, Edge Function down).

  Client-side polling:
    // After Paystack callback (transaction reference received):
    let attempts = 0;
    const interval = setInterval(async () => {
      const { data: profile } = await api('/api/me');
      if (profile.plan === expectedPlan) {
        clearInterval(interval);
        showSuccess();
        return;
      }
      attempts++;
      if (attempts > 15) {  // 30 seconds
        clearInterval(interval);
        showDelayed();
      }
    }, 2000);

  If plan not updated after 30 seconds:

    ┌─────────────────────────────────────────────────┐
    │  ⏳ Payment Processing                           │
    │                                                  │
    │  Your payment was received but your plan is      │
    │  still being updated. This can take up to        │
    │  5 minutes.                                      │
    │                                                  │
    │  If your plan hasn't updated in 10 minutes,      │
    │  please contact support@zawadi.app with your     │
    │  payment reference: REF_abc123                   │
    │                                                  │
    │  [I'll Wait]  [Contact Support]                  │
    └─────────────────────────────────────────────────┘

  Admin can manually verify payment:
    → Check Paystack Dashboard for transaction REF_abc123
    → If confirmed, manually update user's plan via admin panel:
        users_update_plan → 'plus'
    → Record in payments table manually if needed


SCENARIO C: DUPLICATE WEBHOOK (IDEMPOTENCY)
────────────────────────────────────────────
Paystack sends the same webhook twice (network retry).

  paystack-webhook Edge Function:
    1. Verify HMAC signature → OK
    2. Check idempotency:
       SELECT FROM payments WHERE webhook_event_id = body.event
       → Row found! (already processed)

    3. Return 200 OK immediately. No duplicate processing.

  UNIQUE constraint on payments.webhook_event_id is the safety net:
    Even if the SELECT check somehow fails, the INSERT would
    violate the UNIQUE constraint → error caught → return 200.


SCENARIO D: SUBSCRIPTION RENEWAL FAILURE
─────────────────────────────────────────
User's monthly subscription renewal fails (expired card, insufficient funds).

  Paystack retries automatically (configurable in Paystack dashboard).
  After 3 failed attempts → subscription.disable webhook sent.

  paystack-webhook handles subscription.disable:
    UPDATE user_profiles SET plan = 'explorer', plan_expires_at = NULL
    WHERE ... subscription_code matches

  User notified:
    Email: "Your Zawadi subscription has ended. Update payment method to continue."
    In-app: Banner on dashboard: "Your plan has expired. [Renew →]"

  Data preserved: All documents, applications, essays remain.
  Just limits enforced: 3 essays/day, 5 documents max.

  If user has 12 documents and gets downgraded to explorer (limit 5):
    → Existing documents remain accessible (read-only)
    → Cannot upload new documents until count < 5 or re-upgrade
```

### 7.3 AI / Essay Generation Failures

```
AI FAILURE SCENARIOS
────────────────────

SCENARIO A: DEEPSEEK API TIMEOUT
─────────────────────────────────
The DeepSeek API takes too long to respond (>30 seconds).

  ai-essay Edge Function:
    fetch() to OpenRouter with timeout (AbortController, 45 seconds)
      │
      ▼
    Timeout → throw error

  Response to client:
    {
      error: 'AI_TIMEOUT',
      message: 'The essay generation service took too long. Please try again.',
      retry_after_seconds: 30
    }

  UI:
    ┌─────────────────────────────────────────┐
    │  ⏱️ Generation Timed Out                 │
    │                                          │
    │  The AI service is experiencing high     │
    │  demand. Please try again in a moment.   │
    │                                          │
    │  [Retry]  [Cancel]                       │
    └─────────────────────────────────────────┘

  IMPORTANT: The daily essay count is NOT decremented because
  no essay was saved. The Edge Function only inserts after a
  successful AI response.


SCENARIO B: DEEPSEEK API ERROR (5xx)
─────────────────────────────────────
OpenRouter returns a 500-level error.

  Edge Function:
    aiResponse.status >= 500
      │
      ▼
    Response:
    {
      error: 'AI_SERVICE_ERROR',
      message: 'The AI service is temporarily unavailable.',
      retry_after_seconds: 60
    }

  UI: Same timeout UI with "Service temporarily unavailable" message.


SCENARIO C: RATE LIMIT EXCEEDED
─────────────────────────────────
User hits daily or per-minute limit.

  Daily limit (e.g., 3/3 on Explorer):
    Edge Function returns 429:
    {
      error: 'DAILY_LIMIT_REACHED',
      limit: 3,
      used: 3,
      plan: 'explorer',
      reset_at: '2026-05-28T00:00:00+03:00'
    }

  UI → UpgradeModal (see §3.4 Payment Upgrade Flow)

  Per-minute limit (8 req/min, all plans):
    Edge Function returns 429:
    {
      error: 'RATE_LIMITED',
      retry_after_seconds: 45
    }

  UI:
    ┌─────────────────────────────────────────┐
    │  🐇 Too Many Requests                     │
    │                                          │
    │  Please wait ~45 seconds before          │
    │  generating another essay.               │
    │                                          │
    │  [OK]                                    │
    └─────────────────────────────────────────┘


SCENARIO D: EMPTY OR LOW-QUALITY AI RESPONSE
─────────────────────────────────────────────
AI returns a very short or nonsensical response.

  Edge Function validates:
    if (content.length < 50) {
      return { error: 'AI_LOW_QUALITY', message: '...' };
    }

  UI:
    ┌─────────────────────────────────────────┐
    │  ⚠️ Low Quality Response                  │
    │                                          │
    │  The AI generated an unusually short     │
    │  response. Try providing more detail in  │
    │  your prompt, or try regenerating.       │
    │                                          │
    │  [Regenerate]  [Edit Prompt]             │
    └─────────────────────────────────────────┘
```

### 7.4 Document Upload Failures

```
UPLOAD FAILURE SCENARIOS
────────────────────────

SCENARIO A: FILE TOO LARGE
───────────────────────────
User selects a file > 10MB.

  Client-side check (first line of defense):
    if (file.size > 10 * 1024 * 1024) {
      → Toast: "File too large. Maximum file size is 10MB."
      → File input reset
    }

  Server-side check (if client bypassed somehow):
    Supabase Storage bucket config:
      file_size_limit: 10485760 (10MB)
    → Storage API returns error
    → Client: Toast: "Upload failed. File exceeds maximum size."


SCENARIO B: WRONG FORMAT
─────────────────────────
User selects a .exe or other unsupported file type.

  Client-side check:
    const allowed = [
      'application/pdf', 'image/jpeg', 'image/png',
      'image/webp', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (!allowed.includes(file.type)) {
      → Toast: "Unsupported file type. Allowed: PDF, JPEG, PNG, DOC, DOCX, TXT"
    }

  Storage bucket config also enforces:
    allowed_mime_types: [...]  (same list)


SCENARIO C: TIER LIMIT REACHED
───────────────────────────────
User has 5/5 documents and tries to upload a 6th on Explorer plan.

  Database trigger: check_document_upload_limit()
    → RAISE EXCEPTION 'Document upload limit (5) reached for plan: explorer'

  Client catches error:
    → Toast: "Document limit reached (5/5). Upgrade your plan to add more documents."

  UI also shows UpgradeModal (see §3.4).


SCENARIO D: STORAGE UPLOAD FAILS (NETWORK)
───────────────────────────────────────────
Network drops mid-upload.

  supabase.storage.from('documents').upload(...)
    → Network error / timeout

  Client:
    → Try upload 3 times with exponential backoff (1s, 2s, 4s)
    → If all fail:
        Toast: "Upload failed. Check your internet connection and try again."
    → File remains selected, user can retry

  No database entry created (we insert metadata AFTER successful storage upload).
```

### 7.5 Bot Pipeline Failures

```
BOT FAILURE SCENARIOS
─────────────────────

SCENARIO A: BOT FINDS NOTHING
──────────────────────────────
No new scholarships discovered on a given day.

  Bot response:
    "No new scholarships found today. Searched 45+ sources across
     university portals, foundation sites, and government databases.
     This is normal — some days yield fewer new opportunities.
     Will retry tomorrow at 9 AM EAT."

  Admin sees:
    Dashboard: "Bot Queue: 0 items"
    → No action needed. Normal operation.

  System state: No changes. No database writes.


SCENARIO B: BOT FINDS DUPLICATES ONLY
──────────────────────────────────────
Bot finds 8 scholarships, but all are already in the database.

  Bot submits all 8 to /api/ingest.
  Edge Function dedup check:
    → All 8 match existing (name ILIKE + host) → status='duplicate'

  Response:
    {
      received: 8,
      accepted: 0,
      duplicates: 8,
      rejected: 0
    }

  Bot reports:
    "Found 8 scholarships but all were already in the database.
     Duplicates detected for: [list]. No new items to review."

  Admin sees: Queue unchanged. No action needed.

  bot_ingestions table: 8 rows with status='duplicate' (for logging).


SCENARIO C: BOT FINDS DEAD LINKS
─────────────────────────────────
Bot finds a scholarship but apply_url returns 404.

  Bot behavior:
    → Still submits to ingest (link may be temporarily down or bot's
      request was blocked)
    → Adds note: "Apply URL returned 404 during validation but may
      be geo-restricted or temporarily down"

  Admin review:
    → Admin clicks [Test Link] → sees 404
    → Admin tries manually in browser → still 404
    → Admin rejects with reason: "Dead link — scholarship may be closed"

  Scholarship stays unpublished. bot_ingestion status = 'rejected'.


SCENARIO D: INGEST ENDPOINT RETURNS 500
────────────────────────────────────────
Edge Function crashes or Supabase is degraded.

  Bot retry logic:
    Attempt 1: POST /api/ingest → 500 Internal Server Error
    Wait 30 minutes
    Attempt 2: POST /api/ingest → 500
    Wait 30 minutes
    Attempt 3: POST /api/ingest → 500

  Bot reports to Telegram:
    "⚠️ CRITICAL: Zawadi ingest endpoint returning 500 after 3 retries.
     Scholarships found but could not be ingested: [list].
     Endpoint: https://efvxtcxhjlbzzsixfrvo.supabase.co/functions/v1/ingest-scholarship
     Action: Manual investigation required."

  Admin response:
    1. Check Supabase Dashboard → Edge Functions → ingest-scholarship logs
    2. Check for runtime errors, memory issues, or rate limiting
    3. Fix and redeploy if needed
    4. Manually re-run bot or bulk-import the missed scholarships
```

---

## 8. Edge Cases

### 8.1 User Deletes Account While Having Active Subscription

```
SCENARIO: User on Scholar Plus (paid monthly) requests account deletion.

  User initiates deletion from /profile → "Delete Account"

  Confirmation modal:
    ┌─────────────────────────────────────────────────┐
    │  ⚠️ Delete Your Account?                         │
    │                                                  │
    │  This will permanently delete:                   │
    │  • Your profile and account                      │
    │  • All saved applications (15 tracked)           │
    │  • All uploaded documents (8 files)              │
    │  • All generated essays (23 essays)              │
    │                                                  │
    │  ⚠️ You have an active Scholar Plus              │
    │  subscription ($5/month). This will NOT be       │
    │  automatically cancelled.                        │
    │                                                  │
    │  Please cancel your subscription first:          │
    │  • Paystack Dashboard                           │
    │  • Or contact support@zawadi.app                 │
    │                                                  │
    │  [Cancel Subscription First]  [Delete Anyway]    │
    │  [Keep My Account]                               │
    └─────────────────────────────────────────────────┘


  PATH A: User clicks "Cancel Subscription First"
    → Redirected to Paystack customer portal
    → User cancels subscription
    → Returns to Zawadi → repeats account deletion
    → This time: no active subscription warning → proceeds with deletion

  PATH B: User clicks "Delete Anyway"
    → Account deleted via Edge Function (user-profile, operation: delete_account)
    → Cascade delete removes:
        auth.users → user_profiles → applications → documents → essay_generations
    → Subscription remains active on Paystack (NOT auto-cancelled)
    → Admin sees orphaned subscription in Paystack dashboard
    → Admin manually cancels subscription in Paystack

    Prevention:
      • audit_logs records the deletion
      • Paystack subscription_code is logged for manual follow-up
      • Weekly cleanup job flags orphaned subscriptions for admin review

  Best practice: Always guide user to cancel subscription FIRST.


DATABASE CASCADE DETAIL:
  DELETE FROM auth.users WHERE id = :user_id
    → ON DELETE CASCADE triggers:
        user_profiles (id REFERENCES auth.users(id) ON DELETE CASCADE)
        applications (user_id REFERENCES auth.users(id) ON DELETE CASCADE)
        documents (user_id REFERENCES auth.users(id) ON DELETE CASCADE)
        essay_generations (user_id REFERENCES auth.users(id) ON DELETE CASCADE)
        payments (user_id REFERENCES auth.users(id) ON DELETE CASCADE)

  Storage cleanup:
    → All files under documents/{user_id}/ are deleted from Supabase Storage
    → Edge Function uses service_role to delete storage objects for that user
```

### 8.2 Scholarship Deleted While Users Have It Tracked

```
SCENARIO: Admin deletes a published scholarship that 12 users have saved.

  Admin action: ScholarshipManager.jsx → [Delete] button
    → Confirmation modal warns: "12 users have this scholarship tracked.
       Deleting will remove it from their trackers."
    → Admin confirms → Edge Function: scholarships_delete

  Cascade effect:
    DELETE FROM scholarships WHERE id = :id
      → ON DELETE CASCADE:
          applications WHERE scholarship_id = :id (ALL rows deleted)

  User impact:
    • User who saved Chevening (now deleted):
        ApplicationTracker loads → Chevening is gone from the list
        Stats update: "Total: 14" (was 15)
        No error, no blank screen — it simply disappears

    • But user's notes and tracking history for that scholarship are LOST.

  MITIGATION (soft delete recommended):
    Instead of hard DELETE, use a "deleted" flag:
      UPDATE scholarships SET deleted = true, published = false WHERE id = :id

    Applications remain (with scholarship_id reference).
    UI shows: "This scholarship has been removed" with stats preserved.

  If hard delete is used, add a pre-delete check:
    SELECT COUNT(*) FROM applications WHERE scholarship_id = :id
    → Show admin: "Warning: 12 users tracking this. Proceed?"
    → Require super_admin role (only super_admin can delete scholarships)
```

### 8.3 Two Users Save Same Scholarship

```
SCENARIO: Amara and Kofi both save "Chevening Scholarship."

  Amara clicks [Save]:
    UPSERT INTO applications (user_id, scholarship_id, ...)
    VALUES ('amara-uuid', 'chevening-uuid', 'saved', ...)

  Kofi clicks [Save]:
    UPSERT INTO applications (user_id, scholarship_id, ...)
    VALUES ('kofi-uuid', 'chevening-uuid', 'saved', ...)

  UNIQUE constraint: (user_id, scholarship_id)
    → Different user_ids → no conflict → both rows exist

  Database state:
    applications table:
      | user_id      | scholarship_id   | status |
      | amara-uuid   | chevening-uuid   | saved  |
      | kofi-uuid    | chevening-uuid   | saved  |

  This is normal and expected. No edge case issue.
  Each user has their own application row. RLS isolates them.


  BUT: What if a user clicks [Save] twice?

  First click:
    INSERT INTO applications (user_id, scholarship_id) ...
    → Row created. status = 'saved'.

  Second click (button still says "Save" — UI hasn't updated):
    INSERT ... → violates UNIQUE(user_id, scholarship_id) → ERROR

  SOLUTION: Use UPSERT (INSERT ... ON CONFLICT ... DO UPDATE):
    supabase.from('applications').upsert({
      user_id, scholarship_id, status: 'saved'
    }, { onConflict: 'user_id, scholarship_id' })

    → Second click: updates existing row, no error.

  UI should also debounce the button:
    const [saving, setSaving] = useState(false);
    onClick = async () => {
      if (saving) return;
      setSaving(true);
      await saveScholarship(id);
      setSaving(false);
    };
```

### 8.4 Bot Finds Scholarship with Same Name but Different Host

```
SCENARIO: Bot finds "Mastercard Foundation Scholarship" hosted at
  "University of Cape Town" — but database already has
  "Mastercard Foundation Scholarship" hosted at
  "University of Pretoria."

  Dedup logic in ingest-scholarship Edge Function:

    SELECT FROM scholarships
    WHERE name ILIKE '%Mastercard Foundation Scholarship%'
      AND host = 'University of Cape Town'

    Result: NO MATCH. Host is different.

    → This is considered a NEW scholarship and is ingested.

  Rationale:
    The Mastercard Foundation Scholars Program operates at multiple
    universities. Each university's program has:
    - Different application deadlines
    - Different application URLs (each university has its own portal)
    - Potentially different eligibility criteria
    - Different document requirements

    These are genuinely separate opportunities for the student.

  Database state after ingestion:

    scholarships table:
    | name                             | host                   |
    | Mastercard Foundation Scholarship| University of Pretoria |
    | Mastercard Foundation Scholarship| University of Cape Town|  ← NEW

  Admin review:
    Admin sees both in the system. Can verify:
    → "UCT application deadline: Sept 30"
    → "UP application deadline: Oct 15"
    → Both are valid, separate entries. Both should be published.


  WHAT IF IT'S ACTUALLY THE SAME SCHOLARSHIP?
  Example: "Chevening Scholarship" found on a different source URL
  but same host ("UK Government") and same deadline.

  Dedup catches this:
    SELECT FROM scholarships
    WHERE name ILIKE '%Chevening%'
      AND host = 'UK Government'

    → MATCH FOUND → status = 'duplicate' → skipped.

  If the bot incorrectly deduplicates (same name, slightly different host spelling):
    → Admin catches during review
    → Admin marks as duplicate manually
    → Links the bot_ingestion to the existing scholarship


  WHAT IF SCHOLARSHIP IS THE SAME BUT NAME IS SLIGHTLY DIFFERENT?
  Example: "Chevening Scholarship 2026" vs existing "Chevening Scholarship"

  ILIKE pattern matching should catch most variations:
    WHERE name ILIKE '%chevening%'

  But for edge cases that slip through:
    → Both end up in admin queue as separate items
    → Admin identifies them as duplicates during review
    → Admin marks one as duplicate
```

---

## Appendix A: Quick Reference — User Action to Database Trace

| User Action | Component | API Call | Supabase Table | Operation | RLS Check |
|---|---|---|---|---|---|
| Visit landing page | LandingPage.jsx | — | — | Static HTML | None |
| Sign up | SignUpForm.jsx | `supabase.auth.signUp()` | `auth.users` → trigger → `user_profiles` | INSERT | None (auth) |
| Sign in | SignInForm.jsx | `supabase.auth.signInWithPassword()` | `auth.users` | SELECT | None (auth) |
| View dashboard | DashboardPage.jsx | `api('/api/scholarships')` | `scholarships` | SELECT | `published=true` |
| Browse scholarships | ScholarshipsPage.jsx | `api('/api/scholarships?filters')` | `scholarships` | SELECT | `published=true` |
| View scholarship detail | ScholarshipDetail.jsx | `api('/api/scholarships/:id')` | `scholarships` | SELECT | `published=true` |
| Save scholarship | ScholarshipCard.jsx | `api('/api/applications', POST)` | `applications` | UPSERT | `auth.uid() = user_id` |
| Update application | ApplicationRow.jsx | `api('/api/applications', POST)` | `applications` | UPDATE | `auth.uid() = user_id` |
| Generate essay | EssayGenerator.jsx | `api('/api/essays/generate', POST)` | `essay_generations` | INSERT | Edge Function (service_role) |
| Upload document | DocumentUpload.jsx | `api('/api/documents', POST)` | `documents` + Storage | INSERT | `auth.uid() = user_id` + trigger check |
| Delete document | DocumentCard.jsx | `api('/api/documents', DELETE)` | `documents` + Storage | DELETE | `auth.uid() = user_id` |
| Initiate payment | PricingPage.jsx | `api('/api/payments/initiate')` | — | Paystack popup | None |
| Payment webhook | (Paystack → Edge Fn) | `POST /paystack-webhook` | `payments` + `user_profiles` | INSERT + UPDATE | HMAC verify |
| Admin approve ingestion | IngestionQueue.jsx | `api('/api/admin', POST)` | `scholarships` + `bot_ingestions` | UPDATE | Edge Function role check |
| Admin delete user | UserManager.jsx | `api('/api/admin', POST)` | `auth.users` (cascade) | DELETE | Edge Function: super_admin |
| Link validation | (Scheduled job) | — | `scholarships` | UPDATE | Service role |
| Bot ingest | (Hermes cron) | `POST /ingest-scholarship` | `scholarships` + `bot_ingestions` | INSERT | `x-ingest-key` |

## Appendix B: Environment Variables Quick Reference

| Variable | Location | Visibility | Purpose |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env` (Vite) | Client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` (Vite) | Client | Public anon key for browser |
| `VITE_PAYSTACK_PUBLIC_KEY` | `.env` (Vite) | Client | Paystack public key for popup |
| `VITE_EDGE_FUNCTIONS_URL` | `.env` (Vite) | Client | Edge Functions base URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Vault | Server ONLY | Bypasses RLS |
| `PAYSTACK_SECRET_KEY` | Supabase Vault | Server ONLY | HMAC verification |
| `DEEPSEEK_API_KEY` | Supabase Vault | Server ONLY | AI API calls |
| `INGEST_API_KEY` | Supabase Vault | Server ONLY | Bot authentication |

## Appendix C: Status Codes Reference

| Code | Meaning | Typical Scenario |
|---|---|---|
| `saved` | Scholarship bookmarked | User clicks Save |
| `drafting` | Working on application | User starts essays/docs |
| `ready` | Application complete | All docs ready, ready to submit |
| `applied` | Submitted externally | User clicks Apply Now, toggles Applied |
| `interview` | Got interview invitation | Status updated manually |
| `awarded` | Won the scholarship 🎉 | Status updated manually |
| `rejected` | Application rejected | Status updated manually |
| `archived` | Hidden from main view | User archives old applications |
| `not_interested` | Dismissed | User clicked "Not Interested" |

---

*Operations Manual — Document Version 4.0*
*Last updated: May 27, 2026*
*Maintained by: Techsari Engineering*
