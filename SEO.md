# SEO Audit — Zawadi (techsari.online)

## 1. Routing Structure

All routes defined in `src/App.tsx`. The app uses `BrowserRouter` with React Router v7.

### Public routes (no auth required):
| Path | Component |
|------|-----------|
| `/` | LandingPage |
| `/about` | AboutPage |
| `/faq` | FAQPage |
| `/privacy` | PrivacyPolicy |
| `/terms` | TermsOfService |
| `/how-it-works` | HowItWorksPage |
| `/contact` | ContactPage |
| `/forgot-password` | ForgotPassword |
| `/reset-password` | ResetPassword |
| `/admin/login` | AdminLoginPage |
| `/admin` | AdminPortal (with auth guard) |

### Authenticated routes (user must be logged in):
| Path | Component |
|------|-----------|
| `/dashboard` | Dashboard |
| `/scholarships` | Scholarships |
| `/vault` | DocumentVault |
| `/essays` | ComingSoonPage |
| `/profile` | StudentProfile |
| `/applications` | ApplicationTracker |
| `/billing` | SubscriptionPlans |
| `/mentor` | MentorPortal |

### Catch-all:
- `*` → NotFoundPage (for both authenticated and unauthenticated)

## 2. Existing /scholarships Routes

**`/scholarships`** exists but is **behind auth** (inside `{user ? (...)}` block). It loads the `Scholarships` component which requires a logged-in user and shows full scholarship details with application links.

There is **no `/scholarships/[slug]` route** anywhere.

## 3. Scholarships Table Structure

Source: `database.sql:108-192` and actual Supabase schema.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | TEXT | NOT NULL | Primary key |
| name | TEXT | NOT NULL | |
| provider | TEXT | YES | |
| host_institution | TEXT | YES | |
| countries | JSONB | YES (default `[]`) | Eligible countries |
| degree_levels | JSONB | YES (default `[]`) | |
| fields_of_study | JSONB | YES (default `[]`) | |
| funding_type | TEXT | YES | CHECK: Full/Partial/Tuition Only |
| amount | TEXT | YES | Free text like "Full funding" or "$10,000" |
| deadline | DATE | YES | |
| description | TEXT | YES | Full description |
| eligibility | TEXT | YES | |
| required_documents | JSONB | YES (default `[]`) | |
| apply_url | TEXT | YES | **PRIVATE — must not expose** |
| source_url | TEXT | YES | |
| published | BOOLEAN | YES (default false) | |
| verified | BOOLEAN | YES (default false) | |
| verified_by | TEXT | YES | |
| verified_at | TIMESTAMPTZ | YES | |
| view_count | INTEGER | YES (default 0) | |
| instruction_language | TEXT | YES (default 'English') | |
| no_ielts | BOOLEAN | YES (default false) | |
| min_english_score | NUMERIC(4,1) | YES | |
| min_english_test_type | TEXT | YES | |
| min_french_level | TEXT | YES | |
| min_arabic_level | TEXT | YES | |
| min_portuguese_level | TEXT | YES | |
| work_experience_required | INTEGER | YES | |
| age_limit_masters | INTEGER | YES | |
| age_limit_phd | INTEGER | YES | |
| min_work_years | NUMERIC(4,1) | YES | |
| max_work_years | NUMERIC(4,1) | YES | |
| min_gpa_normalised | NUMERIC(5,3) | YES | |
| requires_research | BOOLEAN | YES (default false) | |
| requires_publications | BOOLEAN | YES (default false) | |
| min_publication_count | INTEGER | YES | |
| requires_leadership | BOOLEAN | YES (default false) | |
| requires_community | BOOLEAN | YES (default false) | |
| targets_financial_need | BOOLEAN | YES (default false) | |
| targets_first_generation | BOOLEAN | YES (default false) | |
| targets_rural_origin | BOOLEAN | YES (default false) | |
| targets_ldc_countries | BOOLEAN | YES (default false) | |
| is_intra_african | BOOLEAN | YES (default false) | |
| stem_focus | BOOLEAN | YES (default false) | |
| development_focus | BOOLEAN | YES (default false) | |
| social_sciences_focus | BOOLEAN | YES (default false) | |
| humanities_focus | BOOLEAN | YES (default false) | |
| peace_conflict_focus | BOOLEAN | YES (default false) | |
| quality_score | DECIMAL(3,2) | YES | |
| scam_flags | JSONB | YES (default `[]`) | |
| pipeline_source | TEXT | YES (default 'manual') | |
| sponsor_type | TEXT | YES | |
| urgency | TEXT | YES (default 'Normal') | Computed by trigger |
| host_region | TEXT | YES | |
| host_country | JSONB | YES (default `[]`) | |
| iso2 | TEXT | YES | |
| auto_unpublished | BOOLEAN | YES (default false) | |
| category | TEXT | YES | Added by migration |
| **created_at** | TIMESTAMPTZ | YES (default NOW()) | EXISTS |
| **updated_at** | TIMESTAMPTZ | YES (default NOW()) | EXISTS — auto-updated by trigger `trg_scholarships_updated_at` |
| **slug** | TEXT | YES | **NOT YET — needs to be added** |
| **status** | TEXT | YES | **NOT YET — needs to be added** |

### Key observations:
- `deadline` column: EXISTS (DATE type, nullable)
- `status` column: **MISSING** — currently uses `published` BOOLEAN + `urgency` TEXT instead
- `slug` column: **MISSING**
- `amount` column: EXISTS (TEXT, free-form like "Full funding" or "$10,000")
- `created_at` / `updated_at`: Both EXIST, `updated_at` auto-updated by trigger `trg_scholarships_updated_at`
- `eligible_countries`: Uses `countries` JSONB column
- `education_level`: Uses `degree_levels` JSONB column
- `currency`: **MISSING** — would need to be added or derived from `amount`

### Existing triggers:
- `trg_scholarships_updated_at`: BEFORE UPDATE, calls `set_updated_at()` → sets `updated_at = NOW()`
- `trg_scholarships_urgency`: BEFORE INSERT OR UPDATE OF deadline, computes `urgency`
- `auto_unpublish_expired_scholarships()`: Sets `published = false` where `deadline < CURRENT_DATE`

### Existing RLS:
- `scholarships_select_all`: `FOR SELECT USING (true)` — anyone can read scholarships
- This already allows public read access. No change needed for RLS.

## 4. Existing sitemap.xml

**Location:** `public/sitemap.xml`

A static file with only 6 static URLs:
- `/`, `/about`, `/faq`, `/privacy`, `/terms`, `/how-it-works`
- No scholarship pages
- Dates hardcoded to `2026-05-31`
- Uses `www.techsari.online` subdomain

## 5. Existing robots.txt

**Location:** `public/robots.txt`

Current content:
```
User-agent: *
Allow: /
Allow: /about
Allow: /faq
Allow: /privacy
Allow: /terms
Allow: /how-it-works
Disallow: /dashboard
Disallow: /scholarships    ← BLOCKS Google from crawling /scholarships
Disallow: /vault
Disallow: /essays
Disallow: /profile
Disallow: /billing
Disallow: /admin

Sitemap: https://www.techsari.online/sitemap.xml
```

**Critical issue:** `/scholarships` is DISALLOWED. This must be removed for public scholarship pages to be crawlable.

## 6. Existing Meta Tags in index.html

Updated by previous work. Current `index.html` has:
- Title: "Zawadi — Find Scholarships You're 100% Eligible For | African Students"
- Description: "Zawadi uses AI to match African students..."
- OG tags for WhatsApp/Facebook with `techsari.online` (no www)
- Twitter card tags

The app also uses `react-helmet-async` via `SEO.tsx` component for per-page meta tags.

## 7. Rendering Mode

**Pure client-side React SPA (Single Page Application).**
- No SSR (Server-Side Rendering)
- No SSG (Static Site Generation)
- Vite builds to static files served via `@vercel/static-build`
- All rendering happens in the browser
- Dynamic meta tags are injected client-side via `react-helmet-async`

**Implication for SEO:** Google can crawl SPAs, but dynamic meta tags (helmet) may not be rendered in the initial HTML. The `index.html` title/description serve as fallback. For rich snippets, Google must execute JavaScript.

## Summary of What Needs to Change

| Item | Status |
|------|--------|
| `slug` column | ✅ Added + trigger created |
| `status` column | Decided: use `published` BOOLEAN instead |
| `currency` column | Decided: parse from `amount` TEXT |
| `updated_at` trigger | ✅ Already exists — not touched |
| `urgency`/computed fields | ✅ Already exists — not touched |
| RLS for public read | ✅ Already allows all — not touched |
| Public API routes | ✅ `api/scholarships-public.js` + `api/scholarships-public-detail.js` |
| Public frontend pages | ✅ `PublicScholarshipList` + `PublicScholarshipDetail` + routes added |
| Structured data (JSON-LD) | ✅ `ScholarshipSchema` component created |
| Dynamic sitemap | ✅ `api/sitemap.js` — generates XML from DB, cached 12h |
| robots.txt | ✅ `api/robots.js` — `/scholarships/browse` allowed, `/scholarships` disallowed |
| Vercel rewrites | ✅ `/sitemap.xml` + `/robots.txt` routes added before SPA catch-all |
| Google ping | Pending — need to find admin scholarship update routes |
