# Zawadi (zawadi-v2) — Full Production-Readiness Audit

**Date:** 2026-08-24
**Auditor:** Hermes (interactive browser UX audit) + delegated static code-audit subagent
**App:** Zawadi scholarship platform — Vite 6 + React 19 + TypeScript + Tailwind v4 + Supabase + React Router 7 + vite-plugin-pwa
**Audit environment:** Dev server running at `http://127.0.0.1:5180/` (port 5180, isolated from other local projects). Sign-in performed with the provided owner account (`ai.ml27808@gmail.com` / `Test@212`).

---

## How this audit was run

| Stream | Method | Coverage |
|---|---|---|
| **Code audit** | Delegated read-only static analysis subagent (terminal-based, independent) | All `src/`, `api/*.js`, `middleware.ts`, `database.sql`, `supabase/functions/*`, conventions in `Desktop/AGENTS.md` |
| **Signed-OUT UX audit** | Live browser, Dogfood workflow (snapshot + vision + computed-style probes + real clicks) | `/`, auth modal, `/scholarships/browse`, `/about`, `/faq`, `/privacy`, `/terms`, `/how-it-works`, `/contact`, deep-link behavior |
| **Signed-IN UX audit** | Live browser, logged in as owner account, real click-through of every authed route | `/dashboard`, `/vault`, `/essays`, `/profile`, `/billing`, `/scholarships` (authed), detail redirect chain |

Two prior reports already exist in this repo (`AUDIT_CODE_REPORT.md` from the subagent, plus older `ZAWADI_AUDIT_REPORT_2026.md`, `AUDIT_REPORT.md`). This document is the **consolidated, current** verdict and is the one to act on.

---

## Executive verdict

**🚫 NOT PRODUCTION-READY.** The app is feature-rich and the public/marketing surface is genuinely polished, but it has **launch-blocking security defects**, a **broken headline feature**, and a **runtime crash on a primary nav destination**.

- **Code audit:** 47 findings — **6 Critical, 10 High, 16 Medium, 15 Low** (`AUDIT_CODE_REPORT.md`).
- **Live UX audit:** 1 confirmed runtime crash (`/essays`), 1 confirmed deep-link/refresh failure on every authenticated route, and a pervasive **icon-font glyph leak** (Material Symbols ligature names rendering as literal text across the authenticated app).

---

# PART A — Live UX / Functional Audit (browser, real clicks)

### A.0 What works well (verified)
- **Landing page (`/`)** renders correctly: hero, "01–04" feature bento, featured-opportunities cards, FAQ accordion, footer. No horizontal overflow, no broken images, no console errors. Contrast ratios measured ≥15:1 (well above WCAG AAA). Scroll-reveal (`FadeUp`) animations fire correctly (25 reveal nodes, working).
- **Auth modal**: opens, has email + password fields, inline validation works ("Please enter a valid email address" on empty submit), login with the provided credentials **succeeds** and lands on `/dashboard` as "Karanja / FREE ACADEMIC ACCOUNT". No JS errors on submit.
- **Public scholarship browser (`/scholarships/browse`)**: renders 187 listings, country/degree/region filters, quick filters, grid/table toggle, pagination (10 pages). Works logged-out.
- **Public scholarship detail**: graceful **"Scholarship Not Available"** empty state for unknown slugs; redirect chain `/scholarships/:slug` → `ScholarshipRedirect` → `/scholarships/browse/:slug` is correct (`src/App.tsx:34-37, 869`).
- **Signed-in pages that load fine:** `/dashboard` (rich match center, stats, deadlines), `/vault` (Doc Vault upload + file list), `/profile` (5-step "Academic Persona Configuration" wizard, full country list), `/billing` (3 plans + comparison table), `/scholarships` (authed in-app finder).

### A.1 🔴 CRITICAL — `/essays` (AI Essay Studio) crashes to the ErrorBoundary
- **Route:** nav item "AI Essay Studio" → `/essays` → `App.tsx:900` renders `<ComingSoonPage/>`.
- **Observed:** navigating there shows the global error fallback — **"Something went wrong — An unexpected error occurred. Please refresh the page"** — not even the intended "Coming Soon" page. `ComingSoonPage` itself throws at runtime (console error was swallowed by the ErrorBoundary, no JS error surfaced to console).
- **Impact:** This is the app's headline AI feature, promoted in the hero ("AI essay partner") and the dashboard CTA ("Generate Essay"). A primary nav destination crashes. **This is worse than the static code audit assumed** (which expected a benign "Coming Soon" wall) — it is an actual uncaught render crash.
- **Evidence:** `location.pathname === "/essays"`, body === `warning / Something went wrong / An unexpected error occurred...`.

### A.2 🔴 HIGH — Authenticated deep-links / refresh return 404 or blank
- **Reproduced:** Hard-loading `http://127.0.0.1:5180/dashboard` (and `/profile`) in a fresh browser tab returns the **`404` NotFoundPage** (or a near-empty shell). Public routes (`/scholarships/browse`) deep-link fine.
- **Root cause:** In `App.tsx`, authenticated routes are only rendered inside `{user ? <routes> : <NotFoundPage/>}` (lines 885-909). On a hard navigation the Supabase session is not yet restored, so `user` is null and the route resolves to NotFoundPage. There is no "redirect to login" or "loading" state for deep links, and the SPA fallback does not preserve the intended route.
- **Impact:** Any user who bookmarks, shares, or refreshes an authenticated URL (or who lands via an emailed link) hits a 404. Reinforces code finding **[S-00]** (whole app gated on `authLoading`).

### A.3 🟠 HIGH — Material Symbols icon-font glyphs render as literal text
- **Observed across the authenticated app:** button/label text shows raw ligature names instead of icons:
  - Dashboard/Profile/Billing: `arrow_back`, `arrow_forward`, `chevron_left`, `chevron_right`, `verified_user`, `workspace_premium`, `bar_chart`, `badge`
  - Doc Vault: `cloud_upload`, `table_chart`, `download`, `delete`, `refresh`
  - Authed Scholarships: `notifications`, `sync`, `search`
- **Cause:** Components reference Material Symbols via ligature class/text (e.g. `<span>arrow_back</span>`) but **no Material Symbols / icon web-font is loaded** (only `@fontsource/inter-tight` + `jetbrains-mono` are installed per `package.json`). The ligature text falls through to plain text.
- **Impact:** Pervasive visual defect — every icon slot in the authenticated shell shows meaningless English words. This alone makes the product look broken to a user, regardless of underlying functionality.

### A.4 🟡 MEDIUM — Branding/theme split between surfaces
- The **landing + public browser + public detail** use the light "editorial" system ("Zawadi", `bg-pure-white`/`electric-lime`).
- The **authenticated dashboard** uses "Techsari Zawadi / AFRICAN SCHOLARS" dark "chalkboard" shell.
- The **authed `/scholarships` finder** uses yet another header ("Zawadi / Browse Scholarships / Dashboard / Sign out") that differs from the dashboard shell.
- Logging in drops the user from a light homepage into a dark dashboard with a different product name — a jarring, unplanned theme/brand switch (static finding **[U-01]** confirmed at runtime).

### A.5 🟡 MEDIUM — Auth modal copy/ARIA inconsistency
- The dialog has `aria-label`/accessible name **"Sign in or create an account"** but the visible heading is **"Sign In"**, and the footer says "Don't have an account? Sign Up instead". The modal is a sign-in form only, so the broader "or create an account" label is misleading (also flagged as **[A-01]** focus/label gap in code audit).

### A.6 🟢 LOW — Decorative glyphs in body copy
- Billing page uses `✦` sparkle characters in marketing sentences ("✦ Every plan includes real human mentor feedback…"). Inconsistent with the otherwise restrained copy and reads as an AI tell.

### A.7 Minor / non-blocking
- Landing page had 2 `data-reveal` elements that did not receive `is-visible` on first paint (low severity; content still visible because `FadeUp` is visible-by-default).
- FAQ accordion (`<details>`) works; "All FAQs" link routes to `/faq`.

---

# PART B — Code Audit Summary (47 findings)

Full detail with `File:Line` evidence in **`AUDIT_CODE_REPORT.md`**. Top items:

### Critical (6)
| ID | Finding | Location |
|---|---|---|
| **S-01** | `exec_sql(TEXT)` SECURITY DEFINER RPC — arbitrary SQL as DB owner; unused, catastrophic privilege escalation | `database.sql:18-23` |
| **S-02** | Auth JWT persisted in `localStorage` (XSS-exfiltratable); violates project's own hard rule | `App.tsx:168,175,325,340,361,364,370-371`; `AdminLoginPage.tsx:58-59` |
| **S-03** | Admin authorization enforced **only client-side**; invoked Edge Functions have no server-side role check | `App.tsx:875-883`; `AdminLoginPage.tsx` |
| **S-04** | `/api/ai-generate` is an open, unauthenticated, unthrottled AI proxy (bill-abuse risk) | `api/ai-generate.js:81-118` |
| **S-00** | Entire app (incl. public pages) collapses to a spinner behind `authLoading`; single point of total failure | `App.tsx:96,165-202,705-712` |
| **B-01** | `/essays` is a dead-end "Coming Soon" (actually crashes — see A.1) reached by primary nav + Dashboard CTA; the real 584-line `EssayGenerator` is orphaned | `App.tsx:900, 66, 895` |

### High (10, representative)
- **S-05** Wildcard CORS on `api/og-scholarship.js:136`
- **S-06** No filename allowlist on document upload (path-traversal in object key) — `App.tsx:409-472`
- **S-07** Service-role key on public `api/waitlist.js` with only email-format check
- **S-08** 6 query helpers take `any` (bypass type safety)
- **B-02** Two parallel scholarship list/detail routes, divergent implementations
- **B-03** `EssayGenerator` lazy import is orphaned (never mounted)
- **U-01** Two conflicting design systems (dark vs light editorial)
- **Q-01** 17 `console.error`/`console.warn` left in production client code
- **A-01** Auth modal lacks focus trap + `aria-labelledby`
- **P-01** `recharts` imported eagerly into admin bundle (no lazy split)

### Medium (16) / Low (15)
Cover unused `cheerio` dep, `manualChunks` omissions, non-strict `tsconfig` + 113 `any` usages, empty `catch {}` blocks, components far exceeding the 200-line convention (AdminPortal 2218, Scholarships 1664), hardcoded `techsari.online` domain throughout, stale static `sitemap.xml`/`robots.txt`, generic "Get Started" CTA, tiny `01–04` numbered labels, dead CSS utilities, `alert()` used for admin feedback, color-only status indicators, missing `aria-label` on icon buttons.

---

# PART C — Consolidated "Why this is NOT production-ready"

1. **Catastrophic security surface.** Arbitrary-SQL SECURITY DEFINER RPC (S-01) + JWT in localStorage (S-02) + client-only admin auth with no server-side role check (S-03) + an open AI proxy (S-04). Any one of these is launch-blocking; together they make the app unsafe to expose.
2. **The headline AI feature is broken.** `/essays` crashes (A.1) and the only implementation (`EssayGenerator`) is orphaned dead code (B-01/B-03). The product's core differentiator does not work.
3. **Authenticated deep-links/refresh 404** (A.2) — bookmarking or refreshing any logged-in page breaks, a basic expectation for a web app.
4. **Pervasive icon-font glyph leak** (A.3) — the authenticated UI shows raw ligature text instead of icons, making the product look unfinished to every logged-in user.
5. **No single design system / brand** (A.4/U-01) — light homepage → dark "Techsari Zawadi" dashboard → third header on the authed finder. Unplanned theme + name switching.
6. **Type safety is illusory** — `tsc --noEmit` passes 0 errors only because the config is non-strict and there are 113 `any` sites (T-01/Q-02). Real type safety is weak.
7. **Dead routes, orphaned components, duplicate implementations** (B-01/02/03, U-02) — the `/scholarships` vs `/scholarships/browse` split and the orphaned `EssayGenerator` indicate the app shipped mid-refactor.

---

# PART D — Remediation priority

**Must-fix before any deploy (blockers):**
1. Drop `exec_sql` SECURITY DEFINER (S-01).
2. Stop persisting JWT in localStorage; rely on Supabase session; remove `zawadi_admin_token` (S-02).
3. Add server-side `role = 'super_admin'` checks to every admin Edge Function (S-03).
4. Authenticate + rate-limit + cost-cap `/api/ai-generate` (S-04).
5. Fix the `/essays` crash and either wire `EssayGenerator` or remove the nav item (A.1/B-01).
6. Fix authenticated deep-link/refresh (redirect to login or loading state) (A.2/S-00).
7. Load the Material Symbols font (or self-host SVG icons) so icons render (A.3).

**Should-fix (quality/consistency, schedule post-launch):**
- Consolidate to one design system + one brand name (U-01/A.4).
- Enable strict TS, eliminate `any`, add `vite-env.d.ts` (T-01/Q-02/Q-09).
- Remove `console.error` noise and silent `catch {}` blocks (Q-01/Q-03).
- Remove orphaned `EssayGenerator` lazy import, `cheerio` dep; split `recharts`/`motion` chunks (B-03/P-01/P-03).
- Fix auth-modal ARIA/copy, add focus trap (A-01/A-05).
- De-duplicate scholarship routes; serve dynamic sitemap; parameterize `techsari.online` domain (B-02/B-04/B-05).

---

## Methodology & caveats
- **Runtime findings (Part A)** were verified in a live Chromium against the running dev server; the auxiliary vision model proved unreliable on solid-color backgrounds, so layout/contrast claims were confirmed with **computed-style probes and real DOM interaction**, not screenshots alone. The browser daemon became unstable late in the session (resource exhaustion from orphaned Chromium processes); routes `/mentor` and exact-slug detail rendering were verified via code + partial runtime rather than a full click-through, but all other authed routes were exercised live.
- **Code findings (Part B)** are from a read-only static-analysis subagent; `tsc --noEmit` and `npm run lint` both exit 0 (noted as partly an artifact of a non-strict config + 113 `any`).
- No production build was run (per the project's own "do NOT run build unless asked" rule); findings are from source + live dev runtime.
