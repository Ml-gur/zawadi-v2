# Plan: Auth-aware chrome, page redesigns, live data sync, compare-everywhere, brand/SEO consistency

Date: 2026-08-24
Status: DRAFT — awaiting operator approval

## Done already (this session)

- **QuickCheck bug fixed** (root cause: postgrest-js serialises arrays as Postgres literals
  `cs.{Kenya}` but `countries`/`degree_levels` are jsonb → HTTP 400). Fix: pass
  `JSON.stringify([...])` at all 4 call sites (`QuickCheck.tsx`, `supabase-queries.ts` — the
  browse-page filters were silently broken too). Failing E2E written first; now passes.

## Root findings driving this plan

1. `App.tsx:155` — on `/`, `/scholarships*`, `hideHeaderFooter=true`, so logged-in users see the
   marketing header ("Sign in / Start free") — feels logged out.
2. Two clashing design systems: app pages (Dashboard, Vault, Essays, Profile, Plans) use old
   Material tokens (`#466800` olive, font-black headings), material-symbols icon fonts;
   landing/browse use Electric Editorial (lime/ink/parchment, Inter Tight 500, lucide).
3. Brand split: "Techsari" wordmark in app chrome vs "Zawadi" in public; Logo SVG used once.
4. Compare exists only on homepage featured cards; browse page has none.
5. Value calculator uses static comp numbers, no live data.
6. 404 page exists but off-brand (accent-green, inline SVG frown, window.location nav).
7. OG: static og-home.png fine; scholarship OG generator uses navy palette ≠ brand; robots/sitemap
   conflict (`public/robots.txt` allows /scholarships, `api/robots.js` disallows it);
   favicon.svg unreferenced; dead code `src/lib/seo.ts`.

## Workstreams

### A. Unified auth-aware chrome (fixes "feels logged out")
- Extend `LandingHeader`: when logged in show workspace tabs — Dashboard · Scholarships ·
  Doc Vault · AI Essay Studio · Profile · Plans — with active-route underline states, plan-tier
  chip next to user name, Logo `<Logo/>` mark replacing bare text, sign-out via existing
  `zawadi-signout` event. Guests keep current links.
- `App.tsx`: render LandingHeader on **every** route (pass `user`); delete old Material
  TopNavBar + Techsari footer; public routes get LandingFooter, workspace routes get slim
  editorial footer line. Route-guard structure untouched (guards.spec stays green).
- `Scholarships.tsx` / `PublicScholarshipList.tsx` stop rendering their own headers; App provides it.

### B. Live-data Value Calculator
- On mount fetch 5 parallel head-counts (open published listings per destination region,
  funding_type=Full) from Supabase; show real count per destination in the select + result panel
  ("23 fully-funded open listings · Germany/EU").
- Dollar math keeps documented rates × duration; panel cites the live count + last-checked time.
- Loading skeletons; on total failure fall back to static rates with an honest note.

### C. Scholar Stories animation
- Staggered entrance (existing FadeUp), quote-mark draw-in via `[data-draw]`, hover lift +
  lime underline sweep on name, avatar ring pulse suppressed under prefers-reduced-motion.
- No marquees/bounce (blocklist).

### D. LimeBreakout → comp's "Start Your Application Cycle"
- White section containing bordered electric-lime rounded-ed card: eyebrow "START YOUR
  APPLICATION CYCLE", display headline, subcopy, ink pill primary CTA ("Create Free Profile Now")
  + white outline secondary ("Browse the directory"), centered layout per comp.

### E. Page redesigns to Electric Editorial (logic preserved)
- **SubscriptionPlans**: EE pricing cards (white/parchment/charcoal+lime accent), pill toggles,
  lucide icons, react-hot-toast instead of custom toast; Paystack/mobile-money flows untouched.
- **StudentProfile**: EE wizard — parchment steps, ink inputs, progress dots in lime/ink;
  keep a `<select>` + save button (profile-sync.spec).
- **EssayGenerator**: EE two-panel studio — charcoal left rail, white workspace, lime CTAs;
  typewriter/quota/mentor-review logic untouched.
- **DocumentVault + Dashboard**: token/icon harmonization pass (Material→EE classes,
  material-symbols→lucide) without layout rebuilds.
- Constraint honored: logged-out protected routes still show 404/login copy in main.

### F. Compare everywhere, real fields only
- Move `CompareModal` → `src/components/compare/CompareModal.tsx`; add compare store hook
  (`useCompare`) usable on homepage + browse list.
- `PublicScholarshipList`/BrowseCard: compare toggle per card, floating compare bar (n/3),
  modal rows strictly from DB fields: provider, funding type, amount, degree levels,
  deadline+days-left, No-IELTS badge, host region, detail link. No invented stipends.

### G. Content pass (pain → proof → action)
- Rewrite Hero sub, FeatureBento bodies, new LimeBreakout copy, Scholar Stories intro:
  specific verbs, real numbers, no buzzwords. One narrative: "stop paying to gamble on
  eligibility — know before you pay."

### H. Brand/SEO consistency
- Wordmark "Zawadi" everywhere (header, footers, About/HowItWorks headings); favicon.svg linked
  in index.html; static canonical added.
- Redesign 404 to EE (router Links, lucide icon).
- Restyle `api/og-scholarship.js` card to brand palette (parchment bg, ink text, lime accents).
- Reconcile robots: allow `/scholarships` + `/scholarships/browse/*` consistently in both variants;
  regenerate sitemap URLs accordingly.
- Delete dead `src/lib/seo.ts`.

## Order
1. A (chrome) → 2. D+E (redesigns) → 3. B (live calc) → 4. F (compare everywhere) →
5. C+G (motion+copy) → 6. H (SEO/brand) → lint + targeted E2E after each phase.

## Verification per phase
`npm run lint`; existing smoke/a11y/guards suites; new E2E: logged-in nav tabs visible on
/scholarships, compare on browse adds + opens, calculator shows live counts, plans/profile flows
render (select+save intact).
