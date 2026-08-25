# Hero SEO Copy & Meta Tags — Design Spec

Date: 2026-08-25
Status: Approved (design)
Supersedes: hero section of `docs/specs/homepage-copy-v2.md` (all other sections unchanged)

## Goal

Align the homepage hero and `<head>` metadata with real search demand
("scholarships for African students", "fully funded scholarships",
"scholarships you're eligible for") without keyword stuffing, while
keeping the eligibility-first positioning from v2.

## Scope

Two files:

1. `src/components/landing/Hero.tsx`
2. `index.html`

Out of scope: all landing sections below the hero, JSON-LD structure,
sitemap/robots, stats row, CTAs, ProductMockup, other routes' meta.

## Hero.tsx changes

| Slot | New content |
|---|---|
| Badge | `Scholarships for African Students · {countriesCount \|\| 54} Countries · Verified & Official Sources` |
| H1 | `Scholarships for African students you're actually eligible for` |
| H2 (new element) | `Fully funded & partial scholarships, matched to your profile` |
| Body | `Techsari matches African students to verified scholarships worldwide based on real eligibility: nationality, degree, field, grades, and English requirements. No more scrolling through scholarships you can't apply for. Just the ones you can.` |
| Micro-copy row | Replaces standalone sign-in button: `Free eligibility check · No IELTS required for some programs · Already have an account? Sign in` (sign-in stays a link/button wired to `onLogin`) |

Layout notes:

- H1 measure widened to keep clean wraps at display size:
  `max-w-[20ch]` → `max-w-[24ch]`, `lg:max-w-[24ch]` → `lg:max-w-[28ch]`.
- H2 rendered between H1 and body as `text-ed-h2` (28px, existing
  token), `font-medium text-off-black-ink`, measure `max-w-[36ch]`.
- Em-dashes from the draft copy replaced (colon / period) per the
  project 34-tell blocklist.
- Badge keeps dynamic country count; no hardcoded `54`.
- Sentence case retained for H1 (site voice).

Unchanged: CTA labels/behavior, stats `<dl>`, FadeUp rhythm,
ProductMockup, section container.

## index.html changes

- `<title>`: `Scholarships for African Students | Techsari` (45 chars).
- `<meta name="description">`: `Find verified fully funded and partial scholarships you're actually eligible for. Techsari matches African students by nationality, degree, field, and grades.` (158 chars)
- `og:description` / `twitter:description`: mirror the new description.
- `og:title` / `twitter:title`: unchanged (brand-led framing for social;
  keyword-led title reserved for SERP).
- Canonical, OG image, JSON-LD: unchanged.

## Rationale

- Primary keyword phrase leads the single `<h1>` on the page.
- "Fully funded" appears above the fold (H2 + description), matching
  high-volume query intent.
- Geo-specific phrase targets long-tail queries instead of competing
  with global aggregators on generic terms.
- Copy kept under ~40 words to protect readability/dwell time.

## Acceptance criteria

1. Hero renders badge/H1/H2/body/micro-copy exactly as specified.
2. Sign-in control still triggers `onLogin`; micro-copy row is one
   visual unit with separators.
3. Badge country count still reflects `countriesCount`.
4. index.html title/description match spec verbatim.
5. `pnpm lint` and `pnpm typecheck` exit 0.
6. Visual check at mobile + desktop breakpoints: no orphan words or
   overflow in H1/H2.
