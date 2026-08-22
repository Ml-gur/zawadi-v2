# Zawadi Dark Rebrand + Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the entire app to the dark cream-on-black design language, harden responsiveness for all screen sizes/orientations, optimize performance, and fix all open audit findings.

**Architecture:** Token-level rebrand first (old token names aliased to new dark values so the whole app flips at once), then primitive components, then page-group refinement in dependency order. Backend fixes are SQL/code additions that don't change architecture.

**Tech Stack:** React 19, Vite 6, Tailwind v4 (CSS-first `@theme`), TypeScript strict, motion (framer successor), Supabase, Vercel functions, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-22-zawadi-dark-rebrand-design.md`

## Global Constraints

- Package manager: **npm** (repo has package-lock.json; AGENTS.md says pnpm — repo reality wins, conflict logged).
- Dark-only theme. No light mode anywhere. Canvas `#0e100f` unbroken.
- Zero box-shadows. Depth = surface steps + gradient washes only.
- Buttons outlined-only: 1px cream border ghost pills (radius 100px). Primary CTA = 1.5px green→light-green gradient stroke. No filled CTAs after migration.
- Body text ≥16px on mobile forms/dashboard; never <14px anywhere.
- Touch targets ≥44px. Focus rings: 2px accent-green, offset, designed.
- Motion: only transform/opacity; cubic-bezier(0.22,1,0.36,1); honor prefers-reduced-motion; no scroll listeners.
- Type: Inter Tight 400/500/600 self-hosted via @fontsource; JetBrains Mono for numerals. No Google Fonts CDN.
- Taxonomy hues locked: green=brand/links, orange=scholarships, pink=deadlines, lilac=AI tools, blue=profile/docs.
- Conventional commits per task. `npm run lint` green before each commit.

---

### Task 1: Baseline audit snapshot

**Files:**
- Create: `docs/superpowers/reports/baseline-2026-08-22.md`

- [ ] Step 1: `npm install` (expected: clean install)
- [ ] Step 2: Record baseline: `npm run lint`, `npm run build`, dist JS sizes (`du -sh dist/assets` + largest files), grep counts (`rg -c "shadow-" src -g '*.tsx' | wc -l`, `h-screen` count, old hex usage)
- [ ] Step 3: Write findings into report file with numbers
- [ ] Step 4: Commit `docs(audit): record pre-rebrand baseline metrics`

### Task 2: Playwright local config + landscape project + axe

**Files:**
- Modify: `playwright.config.ts` (full rewrite)
- Modify: `package.json` (devDep `@axe-core/playwright`)

- [ ] Step 1: Rewrite config — baseURL `http://localhost:5173`, webserver `npm run dev -- --port 5173 --strictPort` reuseExistingServer, projects: desktop 1440×900, laptop 1280×720, tablet 768×1024, mobile 375×812, landscape 812×390
- [ ] Step 2: `npm i -D @axe-core/playwright`
- [ ] Step 3: Commit `test(e2e): point playwright at local dev server, add landscape project and axe-core`

### Task 3: Design foundation — fonts, tokens, theme colors

**Files:**
- Modify: `src/index.css` (full rewrite)
- Modify: `src/main.tsx` (font imports before index.css)
- Modify: `index.html` (theme-color `#0e100f`)
- Modify: `vite.config.ts` (manifest theme_color/background_color `#0e100f`)

**Interfaces (produces):** tokens usable as Tailwind utilities: `bg-canvas text-cream border-hairline text-muted bg-panel text-accent-{green,orange,pink,lilac,blue}` plus legacy aliases (primary/on-surface/etc.) mapped to dark values so ALL existing components render dark immediately.

- [ ] Step 1: `npm i @fontsource/inter-tight @fontsource/jetbrains-mono`
- [ ] Step 2: main.tsx imports `@fontsource/inter-tight/400.css`, `/500.css`, `/600.css`, `@fontsource/jetbrains-mono/400.css`, `/500.css` above `./index.css`
- [ ] Step 3: Rewrite index.css: remove Google Fonts URL import; new `@theme` with canvas/cream/muted/hairline/off-black/accent tokens + type scale (clamp-based display) + legacy aliases; body = flat `#0e100f`, Inter Tight, cream text; keep utilities hide-scrollbar/safe-area-bottom/animate-sweep/radial-progress/bg-grid-pattern (dark variant)/44px tap targets; add `.btn-gradient-stroke` (canvas padding-box + green gradient border-box), focus-visible global ring, scrollbar styling, reduced-motion block, `.hairline` divider
- [ ] Step 4: Update index.html theme-color + vite.config manifest colors
- [ ] Step 5: `npm run lint && npm run build` green
- [ ] Step 6: Commit `feat(theme): adopt dark chalkboard token system with self-hosted Inter Tight`

### Task 4: UI primitives

**Files:**
- Create: `src/components/ui/GhostPillButton.tsx`
- Create: `src/components/ui/CategoryLabel.tsx`
- Create: `src/components/ui/SectionShell.tsx`
- Create: `src/components/ui/PanelCard.tsx`
- Create: `src/components/ui/StatBlock.tsx`
- Create: `src/components/ui/index.ts`

**Interfaces (produces):**
```ts
GhostPillButton: props {variant?: 'outline'|'gradient', size?: 'sm'|'md'|'lg', fullWidth?: boolean} extends ButtonHTMLAttributes
CategoryLabel: props {domain: 'brand'|'scholarships'|'deadlines'|'ai'|'profile', children}
SectionShell: props {eyebrow?, title?, lead?, divider?: boolean, id?, className?, children}
PanelCard: props {padded?: boolean, interactive?: boolean, className?, children}
StatBlock: props {value: ReactNode, label: string, tone?: CategoryDomain}
```

- [ ] Step 1: Write the five primitives + barrel (complete code in plan execution)
- [ ] Step 2: `npm run lint` green
- [ ] Step 3: Commit `feat(ui): add dark design-system primitives`

### Task 5: App shell rebrand

**Files:**
- Modify: `src/App.tsx` (header nav ~700-808, footer ~877-904, mobile bottom nav ~906-926, Toaster)

Mapping: header `bg-surface-container-lowest/*` → `bg-canvas/85 backdrop-blur-xl border-b border-hairline`; nav links → cream/muted ghost links; filled buttons → GhostPillButton; footer → `bg-off-black border-t border-hairline`; mobile bottom bar → `bg-off-black/95 border-hairline`; logo tile → cream-on-transparent "Z" monogram with hairline ring.

- [ ] Step 1: Apply substitutions per mapping (complete JSX during execution)
- [ ] Step 2: Lint + visual smoke via dev server
- [ ] Step 3: Commit `feat(shell): rebrand header, footer and mobile nav to dark system`

### Task 6: Landing page redesign

**Files:**
- Modify: `src/components/LandingPage.tsx` (major rework)

Structure: hero (bleed display headline clamp(64px,14vw,224px) lh .9 tracking -.02em, `{ Scholarships, matched to you }` eyebrow, subtext ≤20 words, gradient-stroke CTA + outline secondary, decorative CSS gradient blobs overlapping type, min-h-[100dvh]); stats strip (StatBlock mono); two-column feature rows split by hairlines with taxonomy CategoryLabels; showcase grid PanelCards 8px radius; final CTA band; reduced-motion-safe whileInView stagger.

- [ ] Step 1: Rewrite sections using primitives (complete code at execution)
- [ ] Step 2: Lint + dev-server visual check desktop/mobile/landscape
- [ ] Step 3: Commit `feat(landing): redesign landing page in dark display-type system`

### Task 7–10: Page-group migrations

Same substitution grammar applied group by group:

| Old pattern | New pattern |
|---|---|
| `bg-surface-container*` cards | `bg-off-black border border-hairline rounded-lg` / PanelCard |
| `text-primary` headings | `text-cream` (+ CategoryLabel hue where domain applies) |
| `text-on-surface-variant` body | `text-muted` |
| `border-outline-variant/*` | `border-hairline` |
| filled `bg-primary text-on-primary rounded-*` buttons | GhostPillButton (outline; gradient for primary intent) |
| any `shadow-*` | delete |
| `rounded-xl/2xl/3xl` | `rounded-lg` (cards/tags) or pill buttons |
| inputs `bg-surface border-outline-variant` | `bg-canvas border-hairline focus:border-accent-green focus-visible:ring-accent-green/40` |

- Task 7 public marketing: AboutPage, FAQPage, HowItWorksPage, ContactPage, PrivacyPolicy, TermsOfService, NotFoundPage, ComingSoonPage, pages/public/*. Commit `feat(public): migrate marketing + legal pages to dark system`
- Task 8 auth flows: AuthScreen, ForgotPassword, ResetPassword, ProfileSetupWizard. Commit `feat(auth): migrate auth flows to dark system`
- Task 9 student app: Dashboard, Scholarships, ApplicationTracker, DocumentVault, EssayGenerator, StudentProfile, SubscriptionPlans, ShareButton, PWAInstallPrompt. Status colors → AA-on-dark set. Commit `feat(student): migrate student app surfaces to dark system`
- Task 10 admin/mentor: AdminPortal + components/admin/*, MentorPortal; recharts themed (grid #42433d stroke, axis ticks #7c7c6f, series use taxonomy hues, tooltip bg off-black border hairline); tables: sticky header, row hairlines, mono numerals. Replace fake fallbacks ("Sarah Jenkins", "SCH-01") with real fields or em-dash placeholders. Commit `feat(admin): migrate portals, theme charts, drop fake audit data`
- Gate per task: `npm run lint` + dev-server viewport smoke (375/768/1440/landscape).

### Task 11: AI proxy + bundle slimming

**Files:**
- Create: `api/ai-generate.js`
- Modify: `src/services/ai-provider.ts` (generateContent → POST `/api/ai-generate`, same exported interface)
- Modify: `package.json` (remove axios, openai, @google/genai if unreferenced)

- [ ] Step 1: Write proxy (provider switch deepseek/gemini/openai, env keys server-side, 30s timeout, JSON errors)
- [ ] Step 2: Rewire client service to fetch proxy; keep `AiProviderResult` shape
- [ ] Step 3: `rg -l "from 'openai'|@google/genai|axios" src` → remove deps when empty
- [ ] Step 4: Build; compare initial-route gzip vs baseline; commit `perf(api): move AI calls server-side, drop client SDKs and axios`

### Task 12: Security & sync fixes

**Files:**
- Create: `supabase/migrations/2026-08-22-rls-hardening.sql`
- Create: `e2e/guards.spec.ts`, `e2e/profile-sync.spec.ts`
- Modify: AdminPortal fake-data fallbacks (done in Task 10), title helper if needed

- [ ] Step 1: RLS SQL — enable RLS + policies: payments/audit_logs/bot_ingestions/contact_submissions/recommendation_feedback/pipeline_runs (service-role write paths preserved; user read own rows); storage policy scholarship-docs owner-only read/write. Include verification queries.
- [ ] Step 2: guards.spec.ts — logged-out visits to /admin,/dashboard,/vault,/profile,/billing,/mentor redirect or show login; /admin non-role blocked
- [ ] Step 3: profile-sync.spec.ts — save profile → reload → guide state persists (confirmed_fields fix verification)
- [ ] Step 4: Run e2e suite locally; commit `fix(security): RLS hardening SQL, route-guard e2e tests, profile sync test`

### Task 13: Final verification matrix + report

- [ ] Step 1: `npm run lint && npm run build`; capture bundle numbers
- [ ] Step 2: Playwright all 5 projects green (install browsers if needed)
- [ ] Step 3: axe scan on /, /scholarships/browse, /how-it-works, auth screen — 0 critical
- [ ] Step 4: Adversarial fresh-context subagent review (blocklist tells, contrast, hallucinated APIs, regressions); fix criticals
- [ ] Step 5: Write `docs/superpowers/reports/2026-08-22-final-audit.md` (before/after table); commit `docs(audit): final verification report`
