# Zawadi v2 — Dark Rebrand, Responsive Hardening & Full Optimization

**Date:** 2026-08-22
**Status:** Approved design, pending implementation plan
**Scope:** Entire app (landing, public marketing pages, auth flows, student dashboard, admin/mentor portals)

---

## 1. Goals

1. Rebrand the entire UI to the dark "chalkboard" design language supplied in `design.md` (GSAP-style): near-black canvas `#0e100f`, warm cream type `#fffce1`, outlined ghost-pill controls, hairline dividers, zero drop shadows, color-as-taxonomy accents.
2. Harden responsiveness for every screen size and orientation: phones (320–430px), tablets, laptops, large desktops, landscape phones, foldables.
3. Fix all open audit findings: route guards, RLS gaps, client-side-only plan limits, `confirmed_fields` sync verification, SPA routing, dead dependencies.
4. Hit performance budgets: initial JS < 170KB gzip, LCP ≤ 2.5s (stretch 1.2s), CLS < 0.05, no server-only SDKs in the client bundle.
5. Verify everything with the existing toolchain (tsc, Playwright) plus a fresh audit report.

## 2. Non-goals / Out of scope

- No light mode. The dark canvas is unbroken across the whole product (per design.md).
- No new animation dependency — existing `motion` package covers all choreography; do not add GSAP.
- No framework, router, styling-system, or hosting changes. Tailwind v4 CSS-first config stays.
- No backend architecture change (Supabase + Vercel functions stay).
- Mori font is commercial — not used. Inter Tight is the sanctioned substitute.
- No copy rewrite beyond what visual rebrand requires (existing product copy preserved).

## 3. Design Language

### 3.1 Color tokens (replace current Material-3 palette in `src/index.css` `@theme`)

| Token | Value | Role |
|---|---|---|
| `--color-canvas` | `#0e100f` | Page background everywhere |
| `--color-surface-cream` | `#fffce1` | Primary text, button borders/labels, headings |
| `--color-surface-50` | `#7c7c6f` | Muted secondary text, resting icon fills |
| `--color-surface-25` | `#42433d` | Hairline borders, dividers, low-contrast outlines |
| `--color-off-black` | `#191919` | Nested panels, footer, code blocks |
| `--color-accent-green` | `#0ae448` | Brand accent: links, tags, gradient CTA stroke (with `#abff84`) |
| `--color-accent-light-green` | `#abff84` | Gradient endpoint, "Other" taxonomy label |
| `--color-accent-orange` | `#ff8709` | Taxonomy: Scholarships/Discovery |
| `--color-accent-pink` | `#fec5fb` | Taxonomy: Deadlines/Timeline |
| `--color-accent-lilac` | `#9d95ff` | Taxonomy: AI Essay tools |
| `--color-accent-blue` | `#00bae2` | Taxonomy: Profile/Documents/UI |
| Status colors | success `#10B981`, warning `#F59E0B`, error `#ff5c5c`, info `#00bae2` | Adjusted for AA contrast on `#0e100f` |

**Taxonomy rule:** each product domain keeps its hue everywhere it appears (nav category, section label, chart series, badge). Never reuse a hue for a different domain.

**Contrast gate:** every text/background pair must pass WCAG AA (4.5:1 body, 3:1 ≥18px). Cream on canvas ≈ 19:1 ✓; surface-50 muted text ≈ 4.6:1 ✓; verify accent-on-dark pairs during implementation.

**Legacy token strategy:** keep old token *names* as aliases pointing at new values where component migration is incremental (`--color-primary` → cream roles etc.), then delete aliases when the last consumer migrates.

### 3.2 Typography

- **Family:** Inter Tight (400, 600; add 500 if hierarchy demands). Self-hosted WOFF2 via `@font-face`, `font-display: swap`, preload the 400/600 roman files. Remove Google Fonts `<link>` import from `index.css`. JetBrains Mono stays for mono/data numerals.
- **Scale (desktop → mobile via clamp):**

| Role | Desktop | Line height | Tracking |
|---|---|---|---|
| display | clamp(64px, 14vw, 224px) | 0.9 | -0.02em |
| heading-lg | 101px → clamp(48px, 9vw, 101px) | 1.0 | -0.011em |
| heading | 66px → clamp(40px, 7vw, 66px) | 1.2 | -0.01em |
| heading-sm | 44px → clamp(30px, 5vw, 44px) | 1.2 | -0.01em |
| subheading | 34px → clamp(24px, 4vw, 34px) | 1.2 | -0.01em |
| body-lg | 23px | 1.38 | -0.01em |
| body | 19px (16px mobile) | 1.15–1.4 | -0.01em |
| caption | 14px floor | 1.4 | -0.01em |

- Body text never below 14px anywhere (mobile floor 16px for forms and dashboard data).
- Headlines may bleed to viewport edge on landing hero only; all other content respects max-width 1280px.

### 3.3 Shape, spacing, elevation

- Radius: cards/tags 8px; buttons/pills 100px. No other radii. No 24px+ squircles.
- Spacing: 4px base unit; section gap 80px desktop / 48px mobile; card padding 24px / 16px mobile.
- **Zero box-shadows.** Depth = surface step shifts (`#0e100f` → `#191919`) and gradient washes only. Audit removes every existing `shadow-*` utility.
- Hairline dividers: 1px `#42433d`, full content width, between sibling feature sections.
- Buttons are **outlined-only**: transparent fill, 1px cream border, cream text, weight 600, 18px. Sole exception: primary CTA uses 1.5px green→light-green gradient stroke. Existing filled buttons convert to ghost pills or gradient-stroke CTA per intent.

### 3.4 Signature elements

- Curly-bracket eyebrows `{ Like this }` introduce major sections, 16–19px, weight 400. Max one per section header; not on every subsection.
- Category color labels: single word in its domain hue (e.g. "Scholarships" orange, "Deadlines" pink).
- Decorative soft-gradient organic shapes allowed on landing hero/tool sections; implemented as CSS/SVG gradients (no external images required), `pointer-events-none`, hidden under `prefers-reduced-motion` where animated.
- Footer: `#191919` surface, hairline top divider, multi-column links, 60–80px vertical padding.

### 3.5 Motion

- Library: existing `motion`. Entrance: fade-up 16–24px, 500–700ms, cubic-bezier(0.22,1,0.36,1), staggered 60ms, `whileInView once`.
- Micro-interactions: hover border-opacity shift + subtle translate; active `scale(0.98)`; 150–250ms.
- All motion collapses to static under `prefers-reduced-motion`.
- Animate only `transform`/`opacity`. No scroll listeners; use `useScroll`/`whileInView`.

## 4. Component primitives (new: `src/components/ui/`)

| Primitive | Notes |
|---|---|
| `GhostPillButton` | variants: `outline` (cream hairline), `gradient` (green stroke, primary CTA only), sizes sm/md/lg; min-height 44px; full-width option for mobile |
| `SectionShell` | max-w 1280 container, curly-bracket eyebrow slot, hairline divider rhythm, responsive section padding |
| `CategoryLabel` | domain → hue mapping enforced via prop union type |
| `PanelCard` | 8px radius, `#191919` surface or hairline outline, no shadow |
| `StatBlock` | JetBrains Mono tabular numerals, cream value + muted label |

Existing shared components (`ConfirmationDialog`, toasts, modals, inputs) restyle onto tokens; inputs get designed focus rings (2px accent-green offset ring), 44px touch targets, inline error states.

## 5. Migration order

1. **Foundation:** tokens, fonts, primitives, global CSS cleanup, PWA manifest theme colors (`background_color`, `theme_color` → dark), helmet meta theme-color, favicon check.
2. **Landing page** (`LandingPage.tsx`) — hero with bleed headline + gradient shapes, social proof below hero, feature sections as two-column rows with hairlines, showcase grid, footer.
3. **Public marketing:** HowItWorks, About, FAQ, Contact, ComingSoon, legal pages, NotFoundPage, public scholarship list/detail.
4. **Auth flows:** AuthScreen, ForgotPassword, ResetPassword, ProfileSetupWizard.
5. **Student app:** Dashboard, Scholarships, ApplicationTracker, DocumentVault, EssayGenerator, StudentProfile, SubscriptionPlans, ShareButton, PWAInstallPrompt.
6. **Admin/Mentor portals + admin/*:** dense tables get zebra-free row hairlines, mono numerals, sticky headers; recharts themed to cream/accent palette; ensure AA contrast for status badges.

Each group must pass `npm run lint` (tsc) and a Playwright smoke pass at 375×812, 768×1024, 1440×900, and 812×390 landscape before the next group starts.

## 6. Responsive hardening rules (applied globally)

- Replace every `h-screen`/`min-h-screen` with `min-h-[100dvh]` (and `h-[100dvh]` only where truly fixed-viewport); iOS Safari address-bar jump fixed.
- Breakpoint coverage: audit all layouts for `sm:` (640) and `xl:` (1280+) behavior; large-desktop container caps at 1280–1400px.
- Landscape phones (≤ 480px height): compact nav, hero scales down via clamp, avoid pinned 100dvh sections.
- Touch targets ≥ 44×44px on all interactive elements; nav/hamburger morph uses transform-only transitions.
- Horizontal-scroll ban: automated check for `document.documentElement.scrollWidth > innerWidth` in e2e at all four viewports.
- Tables/portals collapse to card lists below `md:` where horizontal overflow would occur.

## 7. Performance work

1. Move server-only SDKs (`openai`, `@google/genai`, `pdf-parse`, `pdf2pic`, `sharp`, `cheerio`, `mammoth` usage that runs server-side) out of the client graph into `/api` functions or Supabase Edge Functions; lazy-load `pdfjs-dist` only in DocumentVault route.
2. Remove dead `axios` dependency.
3. Font loading: self-hosted WOFF2, preload critical weights, `size-adjust` fallback metrics to prevent CLS.
4. Images: explicit width/height, lazy below-fold, modern formats where available.
5. Route-level code splitting already present — verify no eager imports defeat it; target initial JS < 170KB gz.
6. Lighthouse before/after on `/` (mobile profile) recorded in final report.

## 8. Backend sync & security fixes

1. **Route guards:** protect `/admin*` behind admin-role check and `/dashboard*` behind auth check in `App.tsx` routing layer (redirect to login, preserve return path).
2. **RLS:** SQL migration enabling RLS + policies on `payments`, `audit_logs`, `bot_ingestions`, `contact_submissions`, `recommendation_feedback`, `pipeline_runs`; storage policy restricting `scholarship-docs` to owner read/write. Delivered as reviewed SQL file(s) in `supabase/migrations/` + run instructions (execution needs service credentials — operator applies or provides env).
3. **Plan-limit enforcement:** move document-count and application-count checks into an RPC/Edge function called before writes; client shows resulting errors. Free-tier Paystack bypass closed (server verifies plan, webhook signature verified).
4. **confirmed_fields:** verify fix end-to-end via Playwright test (save profile → reload → guide state correct).
5. **Secrets:** confirm none of `.env` values ship in client bundle (grep build output); document key rotation steps for operator (rotation itself is manual).
6. **Misc:** standardize document titles; replace fake fallback names in admin audit trail with real fields or explicit placeholders; remove `admin123` seed hash path from setup docs; tighten CORS allowlist notes on Edge Functions.

## 9. Verification matrix

- `npm run lint` (tsc strict) after every task; `npm run build` green.
- Playwright: existing spec + new smoke spec covering nav, hero, scholarship list, auth redirect guard; projects at 375×812, 768×1024, 1440×900, 812×390 landscape; assert no horizontal scroll, hero visible, CTAs reachable.
- axe-core scan (via Playwright) on migrated pages: 0 critical violations.
- Adversarial fresh-context subagent review at the end: blocklist tells, contrast, hallucinated APIs, regressions.
- Final deliverable: before/after report (bundle size, Lighthouse scores, viewport matrix results, security-fix checklist).

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Dense admin/dashboard views unreadable on dark | Contrast gate per pair; charts themed; status colors adjusted for AA |
| Incremental migration leaves mixed light/dark pages mid-stream | Migrate in page groups; deploy only after a group completes; alias tokens ease transition |
| RLS changes could lock out legitimate access | Policies mirror existing service-role access patterns; tested against seeded users in staging SQL before apply |
| Client-bundled AI keys already exposed historically | Rotation documented as manual operator step; build-output grep proves future bundles clean |
| Playwright suite depends on live site (baseURL techsari.online) | Point baseURL at local preview server for this work; keep live-site project optional |

## 11. Success criteria

- Every route renders in the new dark system with zero light-theme remnants.
- No horizontal scroll at 320, 375, 768, 1024, 1440 widths; landscape phone usable end-to-end.
- Initial route JS < 170KB gz; LCP improves vs 7.11s live baseline.
- All §8 fixes verifiably in place (code + SQL files + tests where automatable).
- Fresh audit report written with evidence (screenshots/JSON outputs committed under `docs/superpowers/reports/`).
