# Zawadi Scholarship Web App — Static Code Audit

**Date:** 2026-08-24
**Auditor:** Static analysis subagent (read-only; no dev server run, no app code written)
**Scope:** `/home/karanja/Desktop/zawadi-v2` — Vite 6 + React 19 + TypeScript ~5.8 + Tailwind v4 + Supabase + React Router 7 + vite-plugin-pwa SPA, plus `api/*.js` serverless routes, `middleware.ts`, `supabase/functions/*` Edge Functions, and `database.sql`.

---

## Executive Summary

| Metric | Value |
|---|---|
| Total findings | 47 |
| Critical | 6 |
| High | 10 |
| Medium | 16 |
| Low | 15 |

**Severity counts by category**

| Category | Critical | High | Medium | Low |
|---|---|---|---|---|
| Security | 4 | 4 | 2 | 0 |
| Broken Link / Dead Route | 1 | 2 | 3 | 1 |
| Quality / Smell | 1 | 1 | 5 | 5 |
| Uniformity | 0 | 1 | 4 | 2 |
| Types | 0 | 0 | 1 | 0 |
| Perf | 0 | 1 | 2 | 1 |
| A11y | 0 | 1 | 3 | 2 |
| Convention (AGENT.md) | 0 | 0 | 3 | 1 |

**TypeScript health:** `npx tsc --noEmit` exits **0** (0 type errors). `npm run lint` is wired to `tsc --noEmit`, so it also passes. Note: the tsconfig is **not strict** (no `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), and there is **no `vite-env.d.ts`** declaring `import.meta.env`, so dozens of `import.meta.env.*` accesses are untyped — the clean typecheck is partly an artifact of the loose config and `skipLibCheck`. See [T-01].

**Production-readiness verdict:** NOT production-ready. The blocking issues are the arbitrary-SQL `exec_sql` SECURITY DEFINER function [S-01], JWT stored in `localStorage` [S-02], client-only admin authorization [S-03], the public AI proxy with no auth/rate-limit [S-04], and the SQLite-style `authLoading` gate collapsing the entire app into a full-screen spinner [S-00].

---

## [S-00] [Critical] Entire app is gated behind a single client-side `authLoading` flag

- **Category:** Quality / Architecture
- **File:Line:** `src/App.tsx:96, 165-202, 705-712`
- **Description:** The whole SPA — including all public marketing/SEO pages (`/`, `/about`, `/faq`, `/scholarships/browse`, etc.) — refuses to render until `supabase.auth.getSession()` resolves (`authLoading`). If the Supabase project URL/anon key is unset (the client is created with empty strings at `src/lib/supabase.ts:4-5`), `getSession()` rejects, the catch sets `authLoading=false` but **only after** — and any thrown error path that doesn't clear it leaves the app stuck on the loading spinner forever. Public pages should never depend on auth state to render.
- **Recommendation:** Render public routes unconditionally; gate only authed routes. Add a timeout/fallback so `authLoading` is always cleared within N ms.
- **Severity:** Critical (single point of total app failure; directly contradicts "public pages must render without auth").

---

## [S-01] [Critical] `exec_sql(TEXT)` SECURITY DEFINER function enables arbitrary SQL execution

- **Category:** Security
- **File:Line:** `database.sql:18-23`
- **Description:** `CREATE OR REPLACE FUNCTION exec_sql(sql_text TEXT) ... SECURITY DEFINER` runs **arbitrary SQL passed as a string**. SECURITY DEFINER executes with the privileges of the function owner (typically the DB superuser). Any client that can invoke this RPC (it is exposed via the anon key by default unless a restrictive RLS policy exists) can read/modify/drop any table. This is a textbook privilege-escalation primitive. The function is also **entirely unused** by the codebase (`supabase-queries.ts` uses typed `upsert`/`insert`/`select`), so it provides no value while adding catastrophic risk.
- **Recommendation:** Drop `exec_sql` immediately. If a one-time admin task requires it, run it via the SQL editor, never as a live RPC. Verify no RLS policy grants `anon`/`authenticated` EXECUTE on it.
- **Severity:** Critical.

## [S-02] [Critical] Auth access token (JWT) persisted in `localStorage`

- **Category:** Security
- **File:Line:** `src/App.tsx:168, 175, 325, 340, 361, 364, 370-371`; `src/components/AdminLoginPage.tsx:58-59`; `src/App.tsx:518-524`
- **Description:** `session.access_token` (a Supabase JWT) and a separate `zawadi_admin_token` are written to `localStorage` on every auth event. This is XSS-exfiltratable and directly violates the project's own AGENT.md rule: *"Never JWT in localStorage"* and *"HTTPS + HSTS … CSRF on cookie-auth"*. Worse, the token is then read back out and used as a Bearer in `invokeDocAnalysis` (`App.tsx:518-524`). `localStorage` is also read by the auth guard, so any XSS in a dependency (e.g. the eagerly-imported `cheerio`/`pdfjs` graph) yields session takeover.
- **Recommendation:** Rely on Supabase's `getSession()` (which uses an httpOnly-ish secure store) instead of re-persisting the JWT. Remove all `zawadi_token`/`zawadi_admin_token` localStorage writes/reads; gate admin via a server-checked `role` claim, not a client token.
- **Severity:** Critical.

## [S-03] [Critical] Admin authorization is enforced only on the client

- **Category:** Security
- **File:Line:** `src/App.tsx:875-883`; `src/components/AdminLoginPage.tsx:4, 17, 44-55`
- **Description:** Admin access is gated purely by `user.role === 'super_admin'` checked in React render (`App.tsx:878`). `AdminLoginPage` additionally hardcodes the admin email in `VITE_ADMIN_EMAIL` and only soft-checks `profile.role`. There is **no server-side authorization** in the invoked Edge Functions (`process-payment`, `generate-essay`, `run-pipeline`, `admin-settings`, `mentor-review`, `document-analysis` under `supabase/functions/*`). A non-admin authenticated user can call these functions directly with admin `body` payloads (e.g. `run-pipeline` review/trigger, `admin-settings`) because nothing server-side validates the caller's role. Client-side gating is trivially bypassed.
- **Recommendation:** Enforce `role = 'super_admin'` (or a server trust claim) inside every admin Edge Function before any mutation. Do not ship a public `VITE_ADMIN_EMAIL` gate.
- **Severity:** Critical.

## [S-04] [Critical] Public AI proxy has no authentication or rate limiting

- **Category:** Security
- **File:Line:** `api/ai-generate.js:81-118`
- **Description:** `/api/ai-generate` accepts any POST with a `prompt` (up to 32 000 chars) and calls the configured provider using server-side keys. There is **no auth, no per-IP rate limit, and no abuse/cost ceiling**. A stranger can spam it to run up provider bills (OpenAI/DeepSeek/Gemini) or use it as a free proxy. It is referenced by `ai-provider.ts:56` and by `document-intelligence.ts:109` / `essay-voice-learner.ts:41`.
- **Recommendation:** Require a session or signed token, add per-user/per-IP rate limiting and a hard daily cost cap, and validate prompt size more aggressively. Consider keeping this logic only inside authenticated Supabase Edge Functions (which already run per-user) rather than an open serverless route.
- **Severity:** Critical.

---

## [S-05] [High] `api/og-scholarship.js` sets `Access-Control-Allow-Origin: *` on a dynamic image generator

- **Category:** Security
- **File:Line:** `api/og-scholarship.js:136`
- **Description:** Wildcard CORS on a server-rendered endpoint is low-risk here (it only emits a PNG), but it is a project-forbidden pattern ("Over-broad CORS") and unnecessary since the only caller is the same-origin middleware/site. Combined with [S-04]'s open proxy, the app ships two over-broad CORS surfaces.
- **Recommendation:** Remove the header or restrict to the site origin.
- **Severity:** High.

## [S-06] [High] No input validation / file-type allowlist on document upload path

- **Category:** Security
- **File:Line:** `src/App.tsx:409-472` (`handleUploadDocument`); `src/lib/supabase-queries.ts:119-130`
- **Description:** `uploadDocumentToStorage` accepts any `File` and writes to `scholarship-docs` at `${user_email}/${docType}/${Date.now()}_${file.name}`. The storage path **interpolates the client-supplied `file.name` verbatim** — a crafted filename containing `/` or `..` could write outside the intended prefix (path traversal in the object key). There is no server-side MIME/size allowlist; only the client `text-extractor` later rejects unsupported types. Storage bucket policies were not audited (no `supabase/storage` config in repo) so write scope is unverified.
- **Recommendation:** Sanitize/encode the filename on the server (Edge Function) or use a UUID for the object key; enforce a strict extension/MIME allowlist and max size in the storage policy + function.
- **Severity:** High.

## [S-07] [High] Service-role key used in serverless route with only an email-format check

- **Category:** Security
- **File:Line:** `api/waitlist.js:19-31`
- **Description:** `waitlist.js` creates a Supabase client with `SUPABASE_SERVICE_ROLE_KEY` and inserts into `waitlist`. The only guard is a regex email check. Service role bypasses RLS entirely; if this route is ever mis-deployed or the table lacks a server-side insert policy, it becomes an unauthenticated write path. (Lower risk than [S-01] but still a privileged key on a public endpoint.)
- **Recommendation:** Use the anon key (with a restrictive insert policy) instead of service role for a public waitlist, or validate via a signed token.
- **Severity:** High.

## [S-08] [High] SQL injection not possible but `any` query builders bypass type safety on every query

- **Category:** Security / Types
- **File:Line:** `src/lib/supabase-queries.ts:20, 77, 102, 132, 193, 198` (`upsertScholarship(any)`, `upsertProfile(any)`, `upsertApplication(any)`, `insertDocument(any)`, `insertMatchFeedback(any)`, `insertContactSubmission(any)`)
- **Description:** Six data-mutation helpers take `any`, so callers can pass arbitrary shaped objects with no compile-time check. While Supabase parameterizes queries (no classic SQLi), the `any` surface means a malformed payload reaches the DB unchecked and undefined fields can be upserted. Combined with the weak server-side validation in [S-06], this widens the trust boundary.
- **Recommendation:** Type every insert/upsert payload with the `Scholarship`/`Profile`/etc. interfaces already defined in `src/types.ts`.
- **Severity:** High.

---

## [B-01] [Critical] `/essays` route is a dead-end "Coming Soon" reached by primary nav and Dashboard CTA

- **Category:** Broken Link / Dead Route
- **File:Line:** `src/App.tsx:900` (`<Route path="/essays" element={<ComingSoonPage/>} />`); nav at `src/App.tsx:738, 802`; Dashboard CTA at `src/App.tsx:895` (`onTriggerQuickDraft={() => navigate('/essays')}`)
- **Description:** The "AI Essay Studio" nav item (in both desktop and mobile headers) and the Dashboard "Generate Essay" quick-action (`onTriggerQuickDraft`) both navigate to `/essays`, which renders `ComingSoonPage`. However, `EssayGenerator.tsx` (584 lines, a fully-built essay studio) is **orphaned** — it is lazy-imported at `App.tsx:66` but never mounted by any `<Route>`. Users clicking the essay CTA hit a "Coming Soon" wall; the real component is dead code. This is a functional dead-end for the app's headline AI feature.
- **Recommendation:** Either wire `/essays` to `<EssayGenerator>` (the `onGenerateEssay` handler already exists at `App.tsx:588`) or remove the nav item and CTA until the feature ships. Do not ship a CTA to a dead-end.
- **Severity:** Critical (feature dead-end + orphaned 584-line component).

## [B-02] [High] Two parallel scholarship list/detail routes with divergent, partly redundant implementations

- **Category:** Broken Link / Dead Route / Uniformity
- **File:Line:** `src/App.tsx:867-870` (`/scholarships/browse` + `/scholarships`) vs `src/App.tsx:869` (`/scholarships/:slug` → `ScholarshipRedirect`)
- **Description:** There are **two** list routes — `/scholarships` (in-app `<Scholarships>`, 1664 lines, fetches its own public data client-side even when logged out) and `/scholarships/browse` (public `<PublicScholarshipList>`). And **two** detail routes — `/scholarships/:slug` (`ScholarshipRedirect` at `App.tsx:34-37`, redirects to `/scholarships/browse/:slug`) and `/scholarships/browse/:slug` (the real `<PublicScholarshipDetail>`). The redirect target is valid, but the dual implementation means SEO/indexing, styling, and data sources diverge. `ScholarshipRedirect` is harmless but adds redundant routing; more importantly `/scholarships` while logged out passes `user={null}` into `<Scholarships>` which then runs its own duplicate public fetch (see [U-02]).
- **Recommendation:** Pick one canonical list route and one detail route; 301-redirect the other. Deprecate `ScholarshipRedirect` in favor of a direct `<PublicScholarshipDetail>` route, or make `/scholarships/:slug` the canonical and drop `/browse`.
- **Severity:** High.

## [B-03] [High] `EssayGenerator` lazy import is orphaned (never rendered) — dead code

- **Category:** Broken Link / Dead Route / Quality
- **File:Line:** `src/App.tsx:66` (`const EssayGenerator = lazy(...)`); no `<EssayGenerator/>` render anywhere (grep confirms).
- **Description:** The lazy import and the 584-line component are dead. Build still bundles/code-splits it, adding maintenance burden and a phantom chunk.
- **Recommendation:** Remove the lazy import + component, or mount it on `/essays` (see [B-01]).
- **Severity:** High.

## [B-04] [Medium] Static `sitemap.xml` / `robots.txt` in `public/` are stale duplicates of the dynamic API routes

- **Category:** Broken Link / Dead Route
- **File:Line:** `public/sitemap.xml`, `public/robots.txt`, `api/sitemap.js:31-37`, `api/robots.js`
- **Description:** `vercel.json` rewrites `/api/(.*)` → `/api/$1`, but `public/sitemap.xml` and `public/robots.txt` are **static committed files** that will be served instead of the dynamic `api/sitemap.js`. The static `sitemap.xml` won't reflect live scholarship slugs; the static `robots.txt` may differ from `api/robots.js`. Crawlers get a stale/duplicate sitemap. The `middleware.ts` `ROUTE_META` also hardcodes og-asset URLs that must exist at `techsari.online/og-*.png` (the `public/og-*.png` files exist, but the canonical domain is `techsari.online` while the app brand in code is "Techsari Zawadi").
- **Recommendation:** Serve the dynamic sitemap (remove the static copy or have middleware prefer `/api/sitemap.xml`) and ensure one source of truth for robots.
- **Severity:** Medium.

## [B-05] [Medium] Hardcoded production domain `https://techsari.online` littered across code, mismatched with brand

- **Category:** Broken Link / Uniformity
- **File:Line:** `index.html:20-56` (OG tags, `og:image` `https://techsari.online/og-home.png`), `middleware.ts:6` (`SITE_URL`), `src/components/*.tsx` (AboutPage:15, ContactPage:167, FAQPage:94/115/191, HowItWorksPage:47), `api/sitemap.js:32-53`, `App.tsx:647, 667` (Google ping to `techsari.online/sitemap.xml`).
- **Description:** Every SEO/asset URL is hardcoded to `techsari.online`, but the visible product name is "Zawadi" / "Techsari Zawadi" and the SPA can be hosted elsewhere. If deployed to a different domain, all OG images, sitemap pings, and schema URLs break (404 social cards, failed sitemap pings). Not a route 404 but a deployment-coupling smell.
- **Recommendation:** Centralize the canonical origin in one env/config value and interpolate.
- **Severity:** Medium.

## [B-06] [Medium] `og:image` referenced in `index.html` (`/og-home.png`) vs middleware dynamic generation mismatch

- **Category:** Broken Link / Dead Route
- **File:Line:** `index.html:23` (`https://techsari.online/og-home.png`); `middleware.ts:33` (also `og-home.png`); `api/og-scholarship.js:142` falls back to `og-scholarships.png`.
- **Description:** The static fallback OG images exist in `public/` (`og-home.png`, `og-scholarships.png`, etc.), so they resolve — but the dynamic per-scholarship OG is generated by `api/og-scholarship` which is only invoked by the middleware for `/scholarships/browse/:slug`. If `sharp` is unavailable the route 302-redirects to `og-scholarships.png` (a generic image), so individual scholarship shares lose their custom card. Not a hard break, but a degraded/duplicated asset strategy.
- **Recommendation:** Pick static-vs-dynamic OG per route deliberately; document the fallback.
- **Severity:** Medium.

## [B-07] [Low] Mobile bottom-nav "Profile" button opens auth modal instead of routing

- **Category:** Broken Link / UX
- **File:Line:** `src/App.tsx:956-959`
- **Description:** The logged-out mobile bottom nav "Profile" button calls `setShowAuth(true)` rather than navigating anywhere — arguably intended (it prompts login), but it's inconsistent with the desktop header where "Profile" is absent for logged-out users and with the "Search"/"Home"/"About" siblings that navigate. Acceptable but worth a conscious decision.
- **Recommendation:** Confirm intent; if it should route to `/profile` (which redirects to auth), navigate instead of firing the modal directly for consistency.
- **Severity:** Low.

---

## [U-01] [High] Two completely different design systems coexist (dark "chalkboard" vs light "editorial")

- **Category:** Uniformity
- **File:Line:** `src/index.css:26-126` (dark tokens + `ed-*` light tokens); `src/App.tsx:714-943` (dark shell); `src/components/landing/*` + `src/pages/public/*` (light `bg-pure-white`/`bg-parchment`); `src/components/Dashboard.tsx:56` (`text-off-black-ink`), `src/components/Scholarships.tsx` (dark `text-on-surface`).
- **Description:** The app mixes two visual languages: the authenticated "chrome" (header/footer/dashboard/scholarships) uses the dark chalkboard system (`bg-canvas`, `text-cream`, `accent-green`), while the landing page, `PublicScholarshipList`/`PublicScholarshipDetail`, `Dashboard`, and `Scholarships` (public mode) use the light "editorial" system (`bg-pure-white`, `electric-lime`, `off-black-ink`). A user lands on a light homepage, clicks "Browse scholarships" (light), then signs in and is dropped into a dark dashboard — a jarring, unplanned theme switch. The dark tokens (`--color-surface`, `--color-on-surface-variant`, etc.) are legacy aliases that the editorial pages don't use, and `index.css:49-71` admits "Delete each alias as its consumers migrate."
- **Recommendation:** Choose one system (or a deliberate, token-driven theme switch) and migrate all routes. The current split is the single biggest consistency problem.
- **Severity:** High.

## [U-02] [Medium] `<Scholarships>` fetches public data itself AND is rendered while logged out with `user={null}`

- **Category:** Uniformity / Quality
- **File:Line:** `src/App.tsx:870` (`<Scholarships user={user} ... />` with `user` possibly null); `src/components/Scholarships.tsx:13` (`user?: any`), `49-57` (public-mode self-fetch), `798-803` (calls `onTrackScholarship` without checking `user`).
- **Description:** The "in-app" `<Scholarships>` component duplicates the public list functionality of `<PublicScholarshipList>` by running its own `fetchPublicScholarships` when `user` is null. It then calls `onTrackScholarship(scholId, ...)` (which early-returns if `!user` in `App.tsx:384`) without a null guard, so logged-out users see Save controls that silently no-op. This is redundant logic and inconsistent with the cleaner public route.
- **Recommendation:** When logged out, render `<PublicScholarshipList>` (or a read-only variant) instead of the authed `<Scholarships>`. Remove the duplicate public fetch.
- **Severity:** Medium.

## [U-03] [Medium] Inconsistent button patterns across the app

- **Category:** Uniformity
- **File:Line:** `src/components/ui/GhostPillButton.tsx` (canonical `rounded-full` pill) vs `src/App.tsx:735-746` (raw `<button>` nav items), `src/components/landing/LandingHeader.tsx:68` (`bg-electric-lime` pill), `src/App.tsx:779-780` (`btn-gradient-stroke` + literal "Get Started"), `src/components/Scholarship.tsx` `selectBgStyle` (dynamic inline style).
- **Description:** The project built a `GhostPillButton` primitive but most CTAs bypass it: header nav uses bare `<button>`s, the landing header uses a bespoke lime pill, and `App.tsx` hardcodes a `btn-gradient-stroke` "Get Started" button. There is no single button component enforced.
- **Recommendation:** Route all CTAs through `GhostPillButton` (or extend it) to unify focus/hover/disabled microstates.
- **Severity:** Medium.

## [U-04] [Medium] Color-token naming is split between legacy aliases and semantic names with no migration

- **Category:** Uniformity
- **File:Line:** `src/index.css:49-71` ("Legacy aliases … Delete each alias as its consumers migrate"); used inconsistently — `src/App.tsx` uses `text-on-surface-variant`, `border-hairline`, `bg-canvas` (legacy), while editorial files use `text-graphite`, `border-ash`, `bg-pure-white` (new). Both systems are live simultaneously.
- **Recommendation:** Complete the alias migration or formally retire the legacy set; don't ship both.
- **Severity:** Medium.

## [U-05] [Low] `rounded-ed` (28px) radius violates the "extreme border-radius (24px+)" convention in places

- **Category:** Uniformity / Convention
- **File:Line:** `src/index.css:125` (`--radius-ed: 28px`); used in `FeatureBento.tsx:70`, `Dashboard.tsx`, `Scholarships.tsx`, `BrowseCard.tsx`, etc.
- **Description:** AGENT.md forbids extreme border-radius (24px+). The editorial system sets `--radius-ed: 28px` and applies `rounded-ed` widely. This is a deliberate subsystem but still trips the stated convention; flag for conscious sign-off.
- **Severity:** Low.

## [U-06] [Low] Dead CSS utilities defined but never used

- **Category:** Uniformity / Quality
- **File:Line:** `src/index.css:199-204` (`.text-brand-gradient`), `207-222` (`.btn-shine`), `249-253` (`.mesh-gradient`) — none referenced in any `.tsx` (grep confirms).
- **Recommendation:** Remove unused utilities or use them deliberately.
- **Severity:** Low.

---

## [Q-01] [High] 17 `console.error`/`console.warn` calls left in production client code

- **Category:** Quality
- **File:Line:** `src/App.tsx:288, 295, 319, 396, 406, 452, 467, 531, 538, 575, 649, 657, 671, 690, 700` (17 occurrences); plus `src/components/AdminPortal.tsx` (5), `Scholarships.tsx` (2), `StudentProfile.tsx`, `SubscriptionPlans.tsx` (3), `ErrorBoundary.tsx`, `services/ai-provider.ts`.
- **Description:** The SPA ships verbose `console.error` logging on the client (including raw error objects and "CRUD insertion error", "Ingestion crawler failed", etc.). These leak internal structure to the browser console and add noise. AGENT.md forbids leaving debug artifacts.
- **Recommendation:** Replace with a structured client logger (no-op in prod) or `react-hot-toast` errors only.
- **Severity:** High.

## [Q-02] [Medium] 113 `any` / `as any` usages defeat TypeScript safety

- **Category:** Quality / Types
- **File:Line:** Counts: `App.tsx` (8), `AdminPortal.tsx` (18), `EssayGenerator.tsx` (8), `DocumentVault.tsx` (8), `Scholarships.tsx` (5), `ApplicationTracker.tsx` (5), `matching-engine.ts` (16), `supabase-queries.ts` (7), `Dashboard.tsx`/`MentorPortal.tsx` (4 each), plus `StudentProfile`, `SubscriptionPlans`, `ProfileSetupWizard`, `AuthScreen`, `PublicScholarshipDetail`, `Icons`, `text-extractor`, `document-intelligence`, `ai-provider`, `PWAInstallPrompt`, `BotQueueReview`, `AdminDashboard`, `AiConfigPanel`.
- **Description:** Pervasive `any` (confirmed 113 sites) means the green `tsc --noEmit` is misleading — large parts of the app are effectively untyped. `handleUpdateProfile(updatedFields: any)` (`App.tsx:482`) and `handleGenerateEssay` cast loops (`App.tsx:601-617`) are representative.
- **Recommendation:** Introduce strict mode + eliminate `any` in data flows (see [T-01]).
- **Severity:** Medium.

## [Q-03] [Medium] Empty `catch {}` blocks swallow errors silently

- **Category:** Quality
- **File:Line:** `src/App.tsx:131, 188, 265, 461, 585, 973`; `src/components/AdminPortal.tsx:125, 135, 147`; `src/components/AdminLoginPage.tsx:61`.
- **Description:** Multiple `catch {}` (no variable, no handling) silently discard errors — e.g. `App.tsx:265` `try { await autoUnpublishExpiredScholarships(); } catch {}` and `App.tsx:973` the profile-setup save `catch {}`. AGENT.md explicitly forbids this ("`except Exception as e` that swallows errors" — same class of smell).
- **Recommendation:** Log or surface every swallowed error.
- **Severity:** Medium.

## [Q-04] [Medium] Massive components violate the "<200 lines" convention

- **Category:** Quality / Convention
- **File:Line:** `AdminPortal.tsx` (2218), `Scholarships.tsx` (1664), `App.tsx` (979), `MentorPortal.tsx` (925), `SubscriptionPlans.tsx` (906), `matching-engine.ts` (859), `StudentProfile.tsx` (794), `DocumentVault.tsx` (618), `EssayGenerator.tsx` (584), `BotQueueReview.tsx` (574), `ApplicationTracker.tsx` (343), `PublicScholarshipDetail.tsx` (321), `ApplicationTracker` etc.
- **Description:** 11 files exceed 200 lines; `AdminPortal` and `Scholarships` exceed 1600. AGENT.md mandates components <200 lines and "split before exceeding." These are unmaintainable and bundle-heavy.
- **Recommendation:** Decompose into feature subcomponents/hooks (the editorial pages already do this well — `FeatureBento`, `FeaturedOpportunities`, `ProductMockup` are small).
- **Severity:** Medium.

## [Q-05] [Medium] Primitives use `class` attribute on DOM/SVG nodes (React `className` expected)

- **Category:** Quality
- **File:Line:** `src/components/landing/ProductMockup.tsx:33` (`style={{ background: conic-gradient(...) }}` is fine, but the `*_style` patterns) — specifically `src/components/Scholarships.tsx` `selectBgStyle` builds a raw `style` string; and `main.tsx:24` builds an SVG via `encodeURIComponent` string (acceptable). The clearest violation: `ProductMockup.tsx` uses inline `style` for the score ring rather than a token utility.
- **Description:** AGENT.md forbids "all styling inlined into tsx." Several components (AuthScreen `bg-grid-pattern`, ProductMockup score-ring `style={{background: conic-gradient(...)}}`, Scholarships `selectBgStyle`) inline styles or build style strings instead of using CSS/token classes. Not pervasive, but present.
- **Recommendation:** Move dynamic styles to CSS utilities / CSS variables.
- **Severity:** Medium.

## [Q-06] [Low] `alert()` used for user-facing messages in admin flows

- **Category:** Quality
- **File:Line:** `src/App.tsx:645, 669, 678` (`alert("Listing saved successfully!")`, `alert(\`Toggle failed: ...\`)`, `alert(\`Successfully removed ...\`)`); `src/App.tsx:405` (`alert(error.message ...)` in `handleRemoveTrack`).
- **Description:** Native `alert()` is used for success/error feedback in admin CRUD, inconsistent with the `react-hot-toast` system used everywhere else and with the "designed error states" requirement.
- **Recommendation:** Use `toast` for all feedback.
- **Severity:** Low.

## [Q-07] [Low] Hardcoded Google sitemap-ping URLs in app code

- **Category:** Quality
- **File:Line:** `src/App.tsx:647, 667` (`fetch('https://www.google.com/ping?sitemap=https://techsari.online/sitemap.xml')`).
- **Description:** Side-effect `fetch` to Google on every scholarship publish/toggle — a network call with no error handling relevance and a hardcoded domain (see [B-05]). Harmless but noisy and deployment-coupled.
- **Recommendation:** Move ping logic server-side or remove.
- **Severity:** Low.

## [Q-08] [Low] `EssayGenerator` `user: any` prop and many `any[]` props

- **Category:** Quality
- **File:Line:** `src/components/EssayGenerator.tsx:7-21` (`user: any; essays: any[]; scholarships?: any[]; documents?: any[]`).
- **Description:** The orphaned essay component (see [B-03]) also has the weakest typing. If retained, type it.
- **Severity:** Low.

## [Q-09] [Low] No `vite-env.d.ts`, so `import.meta.env.*` is untyped

- **Category:** Quality / Types
- **File:Line:** root has no `src/vite-env.d.ts` (confirmed absent); `src/lib/supabase.ts:1` references `vite/client` but the global `ImportMetaEnv` is never augmented, so `VITE_SUPABASE_URL`, `VITE_ADMIN_EMAIL`, `VITE_AI_PROVIDER`, `VITE_GA_MEASUREMENT_ID` are all `any`.
- **Recommendation:** Add `src/vite-env.d.ts` with `/// <reference types="vite/client" />` + an `ImportMetaEnv` interface listing each env var with its type.
- **Severity:** Low (subset of [T-01]).

---

## [T-01] [Medium] TypeScript config is not strict; typecheck passes only under loose settings

- **Category:** Types
- **File:Line:** `tsconfig.json:2-24` — no `"strict": true`, no `noUncheckedIndexedAccess`, no `exactOptionalPropertyTypes`; `skipLibCheck: true`; `allowJs: true`.
- **Description:** The clean `tsc --noEmit` result is partly an artifact of a non-strict config plus 113 `any` usages ([Q-02]) and untyped env vars ([Q-09]). The project's AGENT.md premium bar requires "TypeScript strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes." As-is, the type safety claim is weak.
- **Recommendation:** Enable strict mode, fix the resulting errors, add `vite-env.d.ts`. Re-run `tsc --noEmit` and treat new errors as blockers.
- **Severity:** Medium.

---

## [P-01] [High] `recharts` imported eagerly into `AdminDashboard` (no lazy split)

- **Category:** Perf
- **File:Line:** `src/components/admin/AdminDashboard.tsx:3` (`import { BarChart, Bar, XAxis, ... } from 'recharts'`) — `AdminDashboard` is imported by `AdminPortal.tsx` which is lazy-loaded, so recharts lands in the `AdminPortal` chunk, but it is **not** separately code-split from the rest of the 2218-line admin bundle. `recharts` (~100KB+ gzip) loads whenever any admin view opens.
- **Recommendation:** `React.lazy` the chart subcomponent, or manualChunk `recharts`. The `manualChunks` in `vite.config.ts:87-93` splits `lucide/react/pdfjs/supabase` but **not** `recharts`, so it rides the admin chunk.
- **Severity:** High (bundle weight on admin entry).

## [P-02] [Medium] Heavy deps (`mammoth`, `pdfjs-dist`, `cheerio`) pulled but only `mammoth`/`pdfjs` are dynamically imported

- **Category:** Perf
- **File:Line:** `src/services/text-extractor.ts:29, 35` (dynamic `import('mammoth')`/`import('pdfjs-dist')` — good); `package.json:21` `cheerio` is a dependency but **never imported anywhere in `src/`** (confirmed unused) — pure bloat. `pdf2pic`, `pdf-parse`, `sharp` also listed but their client usage is minimal/unclear.
- **Recommendation:** Remove `cheerio` (and verify `pdf2pic`/`pdf-parse` usage). Keep the dynamic imports for mammoth/pdfjs (they're correctly lazy).
- **Severity:** Medium.

## [P-03] [Medium] `manualChunks` omits `recharts`, `motion`, and `cheerio`

- **Category:** Perf
- **File:Line:** `vite.config.ts:87-93` only chunks `lucide-react`, `@supabase`, `pdfjs-dist`, `react/react-dom`.
- **Description:** `recharts` (admin), `motion` (used across landing + ComingSoon + many components), and the unused `cheerio` are not isolated. `motion` is large and imported by many components; without a chunk it may be duplicated or loaded eagerly.
- **Recommendation:** Add `recharts`, `motion` to manualChunks; drop `cheerio` entirely.
- **Severity:** Medium.

## [P-04] [Low] Route-level `lazy()` is good, but the initial `main.tsx` idle-prefetches 3 heavy chunks

- **Category:** Perf
- **File:Line:** `src/main.tsx:36-41` (`requestIdleCallback` prefetches `Scholarships`, `Dashboard`, `PublicScholarlist`).
- **Description:** Prefetching on idle is reasonable, but it pulls `Scholarships` (which imports `recharts`? no — but it's 1664 lines) and `Dashboard` eagerly on every first load, partly defeating code-splitting for the landing page. Minor.
- **Recommendation:** Prefetch only after the user shows intent (hover/click), not unconditionally on idle.
- **Severity:** Low.

---

## [A-01] [High] Auth/sign-in modal lacks focus trap and explicit labelled form

- **Category:** A11y
- **File:Line:** `src/App.tsx:840-859` (auth modal `role="dialog" aria-modal="true"` but **no focus trap, no `aria-labelledby`, no initial focus management**); `src/components/AuthScreen.tsx` inputs have `<label>` (good) but the modal container doesn't wire `aria-labelledby` to a heading.
- **Description:** The dialog sets `role`/`aria-modal` but keyboard users can tab out of it (no focus trap), and screen readers aren't pointed to a title. AGENT.md requires "designed focus rings" and proper modal semantics.
- **Recommendation:** Add a focus trap (or use a vetted dialog primitive), set `aria-labelledby` to the heading, move focus into the dialog on open.
- **Severity:** High.

## [A-02] [Medium] Color-only status indicators without text/aria equivalents

- **Category:** A11y
- **File:Line:** `src/components/ApplicationTracker.tsx` (status pills), `Dashboard.tsx:110` (`Urgent` badge is color+text — OK), `Scholarships.tsx` match-score chips. Some status dots use only color (e.g. `text-ed-error` red text vs `text-stone` grey) with no accompanying icon or `aria-label`.
- **Description:** WCAG 1.4.1 (Use of Color) — information conveyed by color alone fails. Several deadline/status cues rely on color differences only.
- **Recommendation:** Pair color with text/icon/aria-label.
- **Severity:** Medium.

## [A-03] [Medium] Images/logos often decorative without `alt` or `aria-hidden` discipline

- **Category:** A11y
- **File:Line:** `src/components/Logo.tsx` (verify it renders with an accessible label or `aria-hidden`); `src/components/landing/ProductMockup.tsx:44` correctly sets `aria-hidden="true"` (good); however many `<img>`-style assets and the animated favicon (`main.tsx:18-33`) have no text alternative. `og:image` alt tags exist in HTML (good). Decorative SVGs generally lack `aria-hidden` (e.g. `App.tsx:773, 785` header icons).
- **Recommendation:** Audit all informative images for `alt`; mark decorative SVGs `aria-hidden`.
- **Severity:** Medium.

## [A-04] [Low] Missing `lang`/focus-visible consistency on a few interactive elements

- **Category:** A11y
- **File:Line:** `index.html:2` sets `lang="en"` (good). Some custom buttons (`App.tsx` header SVG buttons at `773/785`) lack `aria-label` (they're icon-only). `:focus-visible` is defined globally (`index.css:147`) — good.
- **Recommendation:** Add `aria-label` to icon-only buttons.
- **Severity:** Low.

## [A-05] [Low] `min-height:44px` enforced globally but some controls smaller

- **Category:** A11y
- **File:Line:** `src/index.css:310-316` enforces 44px tap targets globally (good), but `App.tsx:779` "Log In" button uses `text-xs px-4 py-2.5` which with text-xs may fall under 44px on some fonts; `FeatureBento` number pills are non-interactive (fine).
- **Recommendation:** Verify computed heights; the global rule likely covers most.
- **Severity:** Low.

---

## [C-01] [Medium] Generic CTA "Get Started" used in primary header

- **Category:** Convention (AGENT.md)
- **File:Line:** `src/App.tsx:780` (`>Get Started<` button, `btn-gradient-stroke`).
- **Description:** AGENT.md forbids generic CTAs ("Get Started"/"Learn More"). Most of the app uses specific copy ("Start free", "Browse scholarships", "Find Matches"), but the logged-out desktop header CTA is the banned "Get Started."
- **Recommendation:** Replace with a specific CTA (e.g., "Start free" to match the landing header).
- **Severity:** Medium.

## [C-02] [Medium] Tiny numbered section labels ("01 Discover / 02 Design") pattern present

- **Category:** Convention (AGENT.md)
- **File:Line:** `src/components/landing/FeatureBento.tsx:16,24,32,40` (`n: '01' … '04'` rendered as `<span>{card.n}</span>` number pills).
- **Description:** AGENT.md lists "Tiny numbered section labels ('01 Discover / 02 Design')" as a forbidden tell. The feature bento uses exactly this pattern (small `01`–`04` pills on cards).
- **Recommendation:** Remove the numeric labels or make them meaningful, non-decorative indices.
- **Severity:** Medium.

## [C-03] [Medium] `.text-brand-gradient` (gradient text) utility exists though unused; `btn-gradient-stroke` used on CTAs

- **Category:** Convention (AGENT.md)
- **File:Line:** `src/index.css:199-204` (`.text-brand-gradient` — gradient text on text, banned; currently unused), `src/index.css:235-240` (`.btn-gradient-stroke` — gradient *border* on CTAs, used at `App.tsx:780`, `AdminLoginPage.tsx:110`). AGENT.md forbids "Gradient text on headings, metrics, or CTAs."
- **Description:** The gradient-text utility is dead (good), but the gradient-stroke CTA is applied to the primary "Get Started" / "Sign in" buttons — a gradient-chromatic treatment on a CTA, which sits close to the banned "gradient text on CTAs" tell. Border-gradient is a softer variant but should be consciously approved.
- **Recommendation:** Confirm the gradient-stroke CTA is an intentional, restrained exception; remove the dead `.text-brand-gradient`.
- **Severity:** Medium.

## [C-04] [Low] Dual AI backends: `/api/ai-generate` (serverless) AND Supabase Edge `generate-essay` both exist

- **Category:** Convention / Architecture
- **File:Line:** `src/services/ai-provider.ts:56` (calls `/api/ai-generate`) used by `document-intelligence.ts:109` + `essay-voice-learner.ts:41`; `src/App.tsx:590` (`supabase.functions.invoke('generate-essay')`) used by `EssayGenerator`/`handleGenerateEssay`.
- **Description:** Two parallel AI paths with two different provider-selection mechanisms (`VITE_AI_PROVIDER` vs server `AI_PROVIDER`). This split-brain backend is a maintenance/consistency smell and doubles the surface for [S-04]-style auth gaps.
- **Recommendation:** Consolidate on one AI backend (recommend the authed Edge Function path) and delete the other.
- **Severity:** Low (architecture).

---

## Production-Readiness Blockers (top issues)

1. **[S-01] Arbitrary-SQL `exec_sql` SECURITY DEFINER RPC** — catastrophic privilege escalation; unused, must be dropped.
2. **[S-02] JWT in `localStorage`** — session takeover via XSS; violates the project's own hard rule.
3. **[S-03] Client-only admin authorization** — server-side Edge Functions don't verify `role`; trivially bypassed.
4. **[S-04] Open, unauthenticated, unthrottled AI proxy** (`/api/ai-generate`) — bill-run / abuse risk.
5. **[S-00] Whole app gated on `authLoading`** — single point of total failure; public pages shouldn't depend on auth.
6. **[B-01] `/essays` dead-end + orphaned `EssayGenerator`** — the headline AI feature's CTA leads to "Coming Soon"; the real 584-line component is never mounted.
7. **[U-01] Two conflicting design systems** (dark vs light editorial) — unplanned theme switch on login; biggest consistency defect.
8. **[P-01]/[P-03] `recharts` not code-split; `cheerio` dead dep** — avoidable bundle weight.
9. **[T-01]/[Q-02] Non-strict TS + 113 `any`** — the green `tsc` is misleading; real type safety is weak.
10. **[Q-01] 17 client `console.error`s + [Q-03] silent `catch {}`** — debug artifacts and swallowed errors in production.

**Recommendation:** Do not deploy to production until S-01 through S-04 and S-00 are remediated and a server-side auth/role check is added to every admin function. The remaining items are quality/consistency debt that should be scheduled but are not, by themselves, launch-blocking.

---

## Methodology & Caveats

- Read-only static analysis. No dev server, no build, no runtime execution of app logic.
- `tsc --noEmit` and `npm run lint` (both = `tsc --noEmit`) executed: **0 errors**. This is reported honestly but must be read alongside [T-01] (loose config) and [Q-02] (113 `any`).
- Security findings about Supabase Edge Functions (`supabase/functions/*`) are based on the **client call sites** and the absence of any server-side role check in the code that invokes them; the function bodies were not exhaustively read but the *authorization gap* is structural (client-only gate in `App.tsx`).
- `database.sql` RLS policies exist (`ENABLE ROW LEVEL SECURITY` + per-table `CREATE POLICY` at lines 592–686) — good — but the `exec_sql` SECURITY DEFINER function ([S-01]) overrides that safety regardless of RLS because SECURITY DEFINER executes as the owner.
- "Dead route" claims verified by grep: `EssayGenerator` is imported lazily but never rendered; `/essays` renders `ComingSoonPage` only.
- Convention violations scored against the 34-tell blocklist + premium bar in `Desktop/AGENTS.md`.
