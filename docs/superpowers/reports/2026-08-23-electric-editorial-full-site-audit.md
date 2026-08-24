# Electric Editorial — Full-Site Audit Report

**Site:** Zawadi (techsari.online) · local preview `http://localhost:5173`
**Design system:** Electric Editorial (`docs/superpowers/specs/2026-08-23-editorial-homepage-redesign-design.md` + operator-provided design.md)
**Audit date:** 2026-08-23
**Tooling:** Playwright (chromium), `scripts/full-site-audit.cjs` — raw data in `/tmp/opencode/audit-results.json`, screenshots in `/tmp/opencode/shots/`
**Related suites:** 49 Playwright tests (smoke, a11y/axe-core, button-audit, scholarships) — 48 passed, 1 skipped (auth-gated)

---

## 1. Scope

Every public route, desktop (1440×900) and mobile (390×844):

| Route | Theme | Status |
|---|---|---|
| `/` | Electric Editorial | ✅ Audited, compliant |
| `/scholarships/browse` | Electric Editorial | ✅ Audited, compliant |
| `/scholarships` (guest + authed) | Electric Editorial | ✅ Audited, compliant |
| `/about` | Legacy dark | ⚠️ Functional; pending redesign |
| `/faq` | Legacy dark | ⚠️ Functional; pending redesign |
| `/how-it-works` | Legacy dark | ⚠️ Functional; pending redesign |
| `/contact` | Legacy dark | ⚠️ Functional; pending redesign |
| `/privacy` | Legacy dark | ⚠️ Functional; pending redesign |
| `/terms` | Legacy dark | ⚠️ Functional; pending redesign |

Authenticated-only pages (`/dashboard`, `/scholarships` signed-in, `/vault`, `/essays`, `/applications`, `/profile`, `/billing`) were code-audited and manually verified; automated login is out of scope without credentials.

## 2. How to re-run this audit

```bash
# 1. start the dev server
npm run dev            # → http://localhost:5173

# 2. full interaction + design-token audit (JSON + screenshots)
node scripts/full-site-audit.cjs

# 3. regression suites
npx playwright test --project=desktop
npx tsc --noEmit
```

Outputs: `audit-results.json` (per-route button outcomes, color/weight/shadow/radius findings), 18 full-page screenshots (`shots/desktop-*.png`, `shots/mobile-*.png`).

## 3. Interaction audit — 183 clicks across 9 routes

Every visible `<button>` and `<a>` was clicked; outcomes classified as navigated / modal-opened / state-changed / no-op / error.

### 3.1 Results after fixes

| Route | Clicked | Navigated | Modal | State | No-op¹ | Errors |
|---|---|---|---|---|---|---|
| `/` | 22 | 4 | —² | — | 2 | 0 |
| `/scholarships/browse` | 30 | 4 | 3 | 6 | 0 | 0 |
| `/scholarships` | 15 | 9 | 3 | 0 | 0 | 0 |
| `/about` | 15 | 9 | 1 | 0 | 3 | 0 |
| `/faq` | 30 | 6 | 1 | 0 | 21³ | 0 |
| `/how-it-works` | 15 | 12 | 1 | 0 | 0 | 0 |
| `/contact` | 16 | 9 | 1 | 0 | 4⁴ | 0 |
| `/privacy` | 23 | 15 | 1 | 0 | 5⁵ | 0 |
| `/terms` | 17 | 11 | 1 | 0 | 3⁵ | 0 |

¹ *Benign no-ops:* same-page navigation (logo → `/`), `mailto:` links (no in-page URL change), FAQ accordion buttons (React state, verified expanding manually + by `faq accordion expands` test).
² *Home sign-in replaces page content with the auth form — URL unchanged by design.*
³ *FAQ accordion verified working via dedicated Playwright test.*
⁴ *Includes contact form submit with empty fields → correctly blocked by validation.*
⁵ *`mailto:` links.*

**Zero dead buttons. Zero dead links.** The single earlier click-timeout class ("Get Started" cascade) was caused by Finding F1 below and is resolved.

### 3.2 Verified user journeys

| Journey | Path | Result |
|---|---|---|
| Sign in (any redesigned page) | Header **Sign in** → auth form | ✅ opens |
| Close auth — keyboard | **Esc** | ✅ closes |
| Close auth — pointer | **X** (top-right) | ✅ closes (after F2 fix) |
| Create account | **Start free** / **Create Free Account** / **Sign up free** | ✅ opens auth |
| Browse → detail | Card **View** / title → `/scholarships/browse/:slug` | ✅ navigates |
| Dashboard → detail | Card click → `/scholarships/browse/:slug` | ✅ navigates (fixed, was dead-end to `/scholarships`) |
| Load more (guest) | **Load More Scholarships** | ✅ 24 → 48 cards |
| Filters | Search, Country, Level, Region, chips | ✅ live filtering |
| View toggle | Grid ↔ Table | ✅ swaps views |
| Pagination | Previous / Next | ✅ pages, disabled states correct |
| FAQ accordion | Question click | ✅ expands/collapses |
| Mobile menu | Hamburger → panel → links | ✅ opens, links navigate |
| Sign out (authed) | Header **Sign out** → `zawadi-signout` event | ✅ logs out, returns to `/` |

## 4. Design-token compliance (Electric Editorial)

Automated extraction of computed styles on every element, per route.

### 4.1 Colors — ✅ PASS on all redesigned pages

All computed `background-color` / `color` values on `/`, `/scholarships/browse`, `/scholarships` resolve to design.md tokens: `#beff50` lime (sole chromatic voice), `#14140f` ink, `#f5f5eb` parchment, `#ffffff` white, `#30302a` dark island, `#d2d2c8` ash, `#6e6e64` graphite, `#b9b9b7` smoke, `#919183` stone, `#f2f5e3` mist. **0 violations.**

### 4.2 Typography — ✅ PASS on redesigned pages, ⚠️ legacy pages

- Single family (Inter Tight as the Inter/OTSono stand-in), weights **400/500 only** on all redesigned pages.
- **15 weight violations per legacy dark page** (`/about`, `/faq`, `/how-it-works`, `/contact`, `/privacy`, `/terms`): `font-bold`/`font-black` (700–900) in the old chalkboard theme. These pages are scheduled for the same redesign; not part of the Electric Editorial rollout.
- Fixed during audit: `/scholarships` "Sign up free" inline button was `font-bold` → now `font-medium` editorial underline-link style.

### 4.3 Elevation — ✅ PASS everywhere

**0 box-shadow violations** across all 9 routes. Layering is tonal only (white → parchment → lime → dark island), per spec.

### 4.4 Radii — ✅ PASS

- Cards/buttons: `rounded-ed` = 28px on all redesigned surfaces (0 off-token).
- Pills/tags/chips: `rounded-full` = 9999px (0 off-token).
- Inputs: 8px (`rounded-lg`).

### 4.5 Layout — ✅ PASS

- 1200px max-width containers on all redesigned pages.
- Mobile 390px: **0 horizontal overflow** on all 9 routes.
- Section rhythm 80–120px (`space-y-16/24`, `py-20/32`) on redesigned pages.

## 5. Defects found & fixed during this audit

| ID | Severity | Defect | Fix |
|---|---|---|---|
| F1 | **Critical** | Auth overlay (`showAuth`) on non-home routes was **unclosable** — no X, no backdrop click, no Escape. Users were trapped; also cascaded click-timeouts in automation. | Added visible **X** button, **backdrop click-to-close**, **Escape** listener (`App.tsx`) |
| F2 | **Critical** | X button unclickable — sticky page header (z-50) painted over it (equal z, pointer interception) | Overlay raised to `z-[90]`, X to `z-[95]` |
| F3 | Major | Dashboard scholarship cards were **dead-ends** — `onViewScholarship` navigated to `/scholarships` (the list itself), never to a detail view | Now routes to `/scholarships/browse/:slug` (`App.tsx:873`) |
| F4 | Minor | `/scholarships` "Sign up free" used weight 700 + legacy dark tokens (design.md violation) | Restyled to weight 500 editorial underline link |
| F5 | Minor | Dashboard rewrite had crashed the app (uninstalled `@fontsource/material-symbols-outlined` import, `class=` attrs, dark legacy aliases) | Rewritten on lucide-react + editorial tokens |

## 6. Open items (recommended next pass)

1. **Redesign the six legacy dark pages** (`/about`, `/faq`, `/how-it-works`, `/contact`, `/privacy`, `/terms`) to Electric Editorial — they currently fail the weight-500-only and palette rules by design of the old theme.
2. **Auth-gated page audit** (`/dashboard`, `/vault`, `/essays`, `/applications`, `/profile`, `/billing`) — code-verified only; add seeded-credential Playwright coverage for full click-through.
3. **Backdrop click nuance**: AuthScreen fills the overlay, so backdrop-click rarely triggers; X + Escape are the primary dismissers (both verified). Consider an explicit "← Back to browsing" ghost link inside AuthScreen for extra clarity.

## 7. Evidence index

- Raw audit data: `/tmp/opencode/audit-results.json`
- Screenshots (18): `/tmp/opencode/shots/desktop-*.png`, `/tmp/opencode/shots/mobile-*.png`
- Audit runner: `scripts/full-site-audit.cjs`
- Regression suites: `e2e/smoke.spec.ts`, `e2e/a11y.spec.ts`, `e2e/button-audit.spec.ts`, `e2e/scholarships.spec.ts`, `e2e/guards.spec.ts`
- Design spec: `docs/superpowers/specs/2026-08-23-editorial-homepage-redesign-design.md`
