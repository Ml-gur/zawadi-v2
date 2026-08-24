# Plan: Port comp features into the landing homepage

Date: 2026-08-24
Source comp: single-file HTML prototype (Electric Lime editorial system — same tokens as `DESIGN.md`)

## Goal

Bring five pieces of the approved comp into the React landing page without breaking the existing
design language or data flow:

1. Quick Eligibility Check (instant check) — real Supabase-backed match count
2. Hero metrics strip — 54 African Passports · $42M+ Funding Mapped · 0% AI Hallucination
3. Scholar Stories section — three scholar testimonials from the comp
4. Working Compare feature — select up to 3 featured scholarships, side-by-side modal table
5. Grant Value Calculator — duration × destination × MOI-waiver estimator
6. Auth popup restyled to the comp's auth card concept (dark blurred backdrop + centered white
   28px-radius card, lime pill submit) while keeping all existing Supabase logic

## Non-goals

- No GPA Standardizer, no announcement bar, no extra FAQ entries (operator declined)
- No changes to browse/detail pages beyond reusing them as link targets
- No backend/schema changes

## Design decisions

- **QuickCheck runs a real query**, not a canned number: on submit it counts published,
  deadline-open listings filtered by passport country (`countries @> [x]`), degree level
  (`degree_levels @> [x]`), and — when English status is MOI/Duolingo/None — `no_ielts = true`.
  Loading, empty ("no matches") and error states are designed; result banner links to
  `/scholarships/browse`.
- **Compare state lives in `LandingPage`** and flows down: `FeaturedOpportunities` gets a
  compare toggle per card (stretched-link refactor so buttons are not nested inside the anchor)
  plus a header "Compare (n)" button; new `CompareModal` renders the side-by-side table.
  Max 3 with `react-hot-toast` feedback (Toaster already mounted in App).
- **Metrics strip** goes under the hero CTAs (hairline above), using the existing `CountUp`
  primitive; "54" follows the `countriesCount` prop when present.
- **Auth modal**: restyle only. App.tsx overlay becomes ink/65 + blur centered flex;
  AuthScreen drops its dark full-page wrapper for a white `rounded-[28px]` card with X inside,
  parchment inputs, electric-lime pill submit, mode-toggle footer line. Validation, error
  banner, forgot-password flow unchanged.
- **Section order** (new components marked ✚):
  Hero (+metrics) → FeatureBento → ✚QuickCheck → ✚ValueCalculator → FeaturedOpportunities
  (+compare) → ✚ScholarStories → LimeBreakout → FAQ → Footer
- Icons stay lucide-react (comp uses FontAwesome — not ported). No emoji as icons.

## Tasks

1. `Hero.tsx`: add metrics strip (CountUp 54 passports, $42M+ mapped, 0% hallucination).
2. New `landing/QuickCheck.tsx` + mount in `LandingPage.tsx`; accepts `countries` prop.
3. New `landing/ValueCalculator.tsx` + mount in `LandingPage.tsx`.
4. Refactor `FeaturedOpportunities.tsx`: stretched-link cards, compare toggle buttons,
   header compare button; lift compare state to `LandingPage`.
5. New `landing/CompareModal.tsx`: accessible dialog (Escape close, aria-modal, focus close btn),
   comparison rows: provider, funding, degree levels, deadline countdown, No-IELTS badge, region.
6. New `landing/ScholarStories.tsx` + mount between FeaturedOpportunities and LimeBreakout.
7. Restyle auth overlay (`App.tsx`) + `AuthScreen.tsx` to comp card design; keep all logic.
8. Verify: `npm run lint` (tsc --noEmit); dev-server smoke via Playwright smoke spec if env allows.

## Verification

- `npm run lint` exits 0
- `npx playwright test e2e/smoke.spec.ts` against dev build (if registry allows)
- Manual checklist: quick-check states, compare add/remove/cap at 3, calculator math matches
  comp formulas, auth modal opens/closes via X, backdrop click and Escape

## Risks / notes

- `button` inside `a` is invalid markup — solved by stretched-link pattern (relative article +
  absolute anchor overlay), which also keeps keyboard order sane.
- Comp testimonial personas have no profile links (blocklist tell) — operator explicitly
  requested these stories; ported as written minus emoji. Logged here per AGENTS.md rule.
