# Editorial Homepage Redesign — Design Spec

**Date:** 2026-08-23
**Status:** Approved (user provided full design system + reference HTML)
**Scope:** `/` route only (`LandingPage`). All other pages keep the dark chalkboard theme.

## Goal

Replace the dark landing page with the "Electric Editorial" system: electric lime
`#beff50` as the sole chromatic voice on warm parchment `#f5f5eb` and pure white,
ink `#14140f` text, 28px radii, zero shadows, single family (Inter Tight — the
self-hosted Inter superfamily variant already shipped; explicit tracking in the
type scale makes it metric-equivalent to the spec's Inter), weights 400/500 only.

## Decisions (confirmed with operator)

1. Homepage-only retheme. Dark global tokens untouched.
2. Real Zawadi content restyled into the new structure (live Supabase featured
   scholarships, real stats, real FAQs). Reference HTML copy not adopted.
3. Landing owns its chrome: App.tsx hides the global dark header/footer when
   `pathname === '/'`. Landing ships its own light sticky nav + dark ink footer.
4. Hero laptop is a CSS/JSX product mockup (stylized match-list, score ring,
   eligibility chips). No external image hotlinks.
5. lucide-react icons replace the Material Symbols webfont (~300KB saved).
6. Brand reads "Zawadi" everywhere; TECHSARI appears only as laptop bezel text.

## Section map

| # | Section | Surface | Content |
|---|---------|---------|---------|
| 1 | Sticky nav | white, border-b ash | Wordmark · Browse / How It Works / About / FAQ ghost links · Sign in ghost + lime pill "Start free". Mobile menu panel |
| 2 | Hero | parchment | Eyebrow tag pill → H1 "Your potential. Funded." (48→90px) → graphite subcopy → lime CTA + underline link → sign-in link. Right: laptop mockup (hidden stacking on mobile below copy) |
| 3 | Feature bento | white | H2 + supporting para, then 4 cards (28px radius, min-h 400 desktop): parchment / white+ash / charcoal dark island w/ ghost link / lime |
| 4 | Featured opportunities | parchment | Live Supabase listings ×3, category chip + computed due-in chip, middle card lime, Apply Now → `/scholarships/browse/:slug`. Skeletons + empty state kept. Outline button to browse all |
| 5 | Lime breakout | electric-lime | Display H2 "No more guessing games." + ink pill CTA + methodology underline link |
| 6 | FAQ | white | 4 real FAQs, `<details>` accordions, Plus icon rotate, FAQPage JSON-LD, link to `/faq` |
| 7 | Footer | off-black-ink (dark island per spec) | White wordmark, smoke © line, white underline links (Privacy/Terms/Contact) hover lime |

Dropped from old page: program ticker marquee, stats band (key numbers folded
into bento cards), journey rail, testimonials — keeps the editorial 7-section
rhythm of the approved design.

## Token additions (index.css @theme, additive & non-colliding)

Colors: `electric-lime #beff50`, `lime-hover #aef53d`, `on-lime #344e00`,
`off-black-ink #14140f`, `parchment #f5f5eb`, `pure-white #ffffff`, `ash #d2d2c8`,
`graphite #6e6e64`, `deep-charcoal #30302a`, `stone #919183`, `smoke #b9b9b7`,
`ed-error #ba1a1a`.
Type scale (`ed-*` namespaced to avoid the existing dark-theme scale):
eyebrow 10/1.4/+1px/500 · caption 12/1.33/+1.2px/500 · body-sm 14/1.29 ·
body 16/1.5 · sub 22/1.18 · h2 28/1.14/−0.56px · h1-sm 36 · h1 60/1/−1.8px ·
hero-sm 48/1/−1.44px · hero 90/0.89/−2.7px (all weight 500 for heads).
Radius: `--radius-ed: 28px`.

## Files

- `src/index.css` — token additions only
- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/Hero.tsx`
- `src/components/landing/ProductMockup.tsx`
- `src/components/landing/FeatureBento.tsx`
- `src/components/landing/FeaturedOpportunities.tsx`
- `src/components/landing/LimeBreakout.tsx`
- `src/components/landing/FaqSection.tsx`
- `src/components/landing/LandingFooter.tsx`
- `src/components/LandingPage.tsx` — rewritten composition (keeps SEO, schemas,
  Supabase query, props interface unchanged)
- `src/App.tssx` — one-line hideHeaderFooter change for `/`
- `e2e/smoke.spec.ts` — dark-canvas assertion scoped to routes ≠ `/`

## Quality bar

- Contrast AA: graphite-on-parchment 4.8:1, ink-on-lime 12.5:1, on-lime(#344e00)
  on lime 6.3:1, smoke-on-ink 8.9:1, ed-error on white 5.9:1.
- Motion: FadeUp primitive only (transform/opacity, reduced-motion safe).
  Hover lifts ≤ translate-y-2 / scale-[1.02], 150–300ms.
- No shadows anywhere. Tonal separation only.
- Focus-visible ring stays accent-green globally (visible on light surfaces);
  interactive elements ≥44px (global rule).
- Verify: `npm run lint` (tsc --noEmit), build check via vite, Playwright smoke +
  a11y suites if browsers installed.
