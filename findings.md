# Findings — Zawadi v2 launch session (2026-08-24)

## agent-reach (Exa) SERP validation
- "fully funded scholarships for Kenyan students 2026": won by university PDFs (usiu.ac.ke) + news (kenyans.co.ke). No directory owns the cluster → /scholarships/browse with country+level filters is well positioned.
- "scholarships without IELTS for African students 2026": scholar.africa has the strongest guide (18+ listings). Our edge is PRODUCT (No-IELTS filter + per-listing MOI flags) not content; FAQ already answers the PAA variants.
- "undergraduate scholarships for African students fully funded 2026": SERP = university pages + govt PDFs (Mauritius MASS, Dundee, UCT). Aggregation gap confirmed.
- "scholarships closing soon deadline this month": won by small aggregators (opportunityinside.com) + individual program pages → added public "Closing soon" quick-filter chip to browse (deadline ≤30 days) to capture this intent without auth.

## Live QA (logged in as writingdebugger@gmail.com)
- Login stall root cause: supabase.auth.getUser() network round-trip after signInWithPassword; replaced with local getSession().
- Compare in authed finder was broken by event bubbling (card onClick opened detail) — fixed with stopPropagation; verified: 187 compare pills, modal shows real data.
- /applications?stage=Applied renders uniform tracker with flags, amounts, countdowns.
- /scholarships?sort=deadline now shows Rhodes (3d), Wellcome (4d), Fulbright (6d) first — expired pushed to bottom.
- Card click in finder → /scholarships/browse/:slug (uniform detail page with flag chip + breadcrumbs).

## Performance lab (vite preview, production build)
- Initial JS: 157KB gzip (budget 170KB) + 31KB CSS gzip.
- FCP: 748ms mobile / 964ms desktop. LCP: 928ms. CLS: 0. TTFB <10ms local.
- Horizontal overflow: 0px on /, /browse, /about, /faq, /how-it-works, /privacy at 390px.
- axe (wcag2a+2aa): CLEAN on /, /browse, /faq (mobile).
- Fixed sub-44px tap targets: ShareButton icon (28→40/44px), browse view-toggle (36→44px).

## Security audit (subagent, static)
- Verdict: DO-NOT-SHIP → SHIP-WITH-CAVEATS after fixes (now applied in code):
  - [FIXED] hardcoded credentials in e2e/system-verification.spec.ts (deleted + tmp specs removed). Password rotation still REQUIRED by user (Test@212 is in git history).
  - [FIXED] /api/ai-generate now requires Supabase JWT (server-side verify) + per-user rate limit.
  - [FIXED] security headers in vercel.json (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy).
  - [FIXED] admin@zawadi.app fallback removed from client bundle.
  - [FIXED] Gemini API key moved from URL query to x-goog-api-key header.
  - [FIXED] database.sql now seeds hardened policies (published-only public read; profiles WITH CHECK guard).
  - [SHIPPED-SQL] migration 014: waitlist table + RLS, REVOKE EXECUTE on SECURITY DEFINER fns.
- USER ACTION REQUIRED: run migrations 013 + 014 in the Supabase SQL editor (service role) and verify via pg_policies; rotate the Test@212 password; set spend alerts on AI provider dashboards.

## Localhost/staging scan
- Only e2e specs + playwright.config.ts reference localhost (correct — test infra).
- No staging/*.vercel.app/ngrok refs anywhere in src/api/public.
- uploads/ holds real personal PDFs — gitignored, but purge before zipping/sharing the project.
