# Progress — 2026-08-24 launch-hardening session

## Completed
1. Visual QA logged-in (writingdebugger@gmail.com): dashboard, applied pipeline, deadline deep-link, compare, detail — all verified via screenshots.
2. Fixed compare click-trap (stopPropagation) — compare works logged-in, modal shows real fields (amount, funding, host region + flags, deadline countdown, IELTS status).
3. Fixed /scholarships?sort=deadline: open deadlines ascending first, expired/rolling last.
4. Removed fabricated match %; honest badges ("New listing" when no computed match); Match Center copy reflects real counts.
5. Finder cards now route to the uniform public detail page; ~450 lines of legacy dark inline detail deleted; alerts drawer restyled + relevance-capped.
6. Login stall fix: getSession() instead of network getUser() after signInWithPassword.
7. Country + flag: flagFor() on cards/dashboard/tracker (pre-existing) + new hero chip on detail page; API exposes iso2/host_region/fields_of_study.
8. SEO: Breadcrumbs component (visible + BreadcrumbList JSON-LD) on 6 static pages + browse; sitemap covers all public pages; robots.txt verified; unique titles/meta verified per route; favicon set (ico/16/32/apple-touch) shipped from favicon_io.
9. Speed audit (prod build): initial JS 157KB gzip (budget 170KB), FCP 748-964ms, LCP 928ms, CLS 0.
10. Mobile audit: 0px horizontal overflow on 6 routes, tap targets raised to 44px (ShareButton, view toggle), axe CLEAN on key pages.
11. Security audit (subagent): 6 pre-publish fixes applied (JWT auth on /api/ai-generate, security headers in vercel.json, credential-leaking e2e spec deleted, admin email fallback removed, Gemini key to header, database.sql hardened); migration 014 written.
12. agent-reach (Exa) SERP validation: 4 keyword clusters checked; added public "Closing soon" filter chip to capture urgency-intent searches.
13. Full e2e suite: 271 passed / 5 skipped (viewport-gated); fixed stale smoke CTA assertion + 2 hover-style audit findings.

## User actions required before publish
1. Apply supabase/migrations/013_security_hardening.sql AND 014_security_hardening_followups.sql in Supabase SQL editor (service role). Verify: SELECT * FROM pg_policies WHERE tablename IN ('profiles','scholarships');
2. ROTATE the Test@212 password (it is in git history via a deleted spec file) — use a strong unique password for any real account.
3. Set spend alerts on OpenAI/DeepSeek/Google AI dashboards.
4. Ensure Vercel env vars are set for prod: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY/DEEPSEEK_API_KEY/GOOGLE_API_KEY (whichever used), AI_PROVIDER, VITE_* mirrors.
5. Optional post-launch: move auth sessions off localStorage (@supabase/ssr), CSP tuning.

## Commits
- 8c87412 feat(app): compare/deadline/badges/uniform finder + breadcrumbs
- 50371ec feat(launch): security hardening, closing-soon filter, perf/mobile fixes, favicon set
- 78f0431 chore: drop temp perf script from repo

## Session 2 — matching honesty + urgency UX (2026-08-24, commit 8be21cb)
1. Matching gate strict: no % until country AND degree AND field confirmed (needs_profile).
2. Dashboard setup panel: missing profile fields + doc analysis status; honest copy.
3. Day-based deadline badges everywhere (cards, table, tracker); opens_at + migration 015 with graceful fallback (42703/PGRST204 retry without column — caught live in dev).
4. eligibilityInfo(): Pan-African/regional markers → plain labels + globe; flags only for concrete lists (compare/cards/detail/table).
5. Authed finder: grid/table toggle; TrackerTable with per-row stage select (187 rows verified).
6. Detail: real required_documents checklist + provider fine print + steps referencing them.
7. Perf: explicit columns (-90KB/payload), removed duplicate fetch on login, deadline-ordered query.
8. Full e2e: 272 passed / 5 skipped.
USER ACTION: run migrations 013, 014, 015 in Supabase SQL editor; rotate Test@212 password.

## Session 3 — eligibility specificity + new project env + GA (2026-08-24, commit 4b8308a)
1. eligibilityInfo v2: regional markers (ECOWAS/EAC/SADC/IGAD/COMESA/CEN-SAD/AMU/ECCAS/Sub-Saharan/Francophone/Lusophone/OIC/Commonwealth) expand to REAL member-country lists via country-graph; only true continent-wide awards say "All African countries".
2. EligibilityList component: inline "+N more / Show less" — verified live on a 21-country list (Commonwealth Master's).
3. .env + .env.local → new project raomkgvnkgvbbezffpyb (anon + service-role, gitignored). GA G-TKPPCN8X3S via existing deferred Analytics component (verified gtag.js + dataLayer config fire).
4. scripts/migrate-data-to-new-project.mjs ready — copies published scholarships old→new AFTER migrations run.
NOTE: dev now points at the EMPTY new project; app shows empty states until migrations + data copy complete.
SQL ORDER: 001→015 numeric (see final message).
