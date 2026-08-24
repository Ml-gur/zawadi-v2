# Task Plan — Zawadi v2 Launch Hardening & Feature Completion

## Goal
Take zawadi-v2 from audited-but-incomplete state to publish-ready:
features (flags+country, applied scholarships page, critical deadlines deep-link,
compare with premium filters), SEO suite (robots/sitemap/titles/meta/breadcrumbs/
internal links/privacy), perf+mobile+security audits, keyword research via
agent-reach, and removal of localhost/staging leftovers.

## Status: in_progress

### Phase 1 — Recon & baseline [complete]
- Read repo structure, prior audit reports, DESIGN.md
- Run build + typecheck baseline

### Phase 2 — Country + flag display on scholarship cards/detail [pending]
- Reuse src/lib/flags.ts + country-graph.ts conventions
- Cards, detail pages, compare table show country name + flag emoji/image

### Phase 3 — Dashboard cards → real destinations [pending]
- Applied Scholarships card → /dashboard/applications page (uniform design)
- Critical Deadlines "View all" → /scholarships?sort=deadline_asc or dedicated
  filtered view with near-deadline first
- All dashboard stat cards route to meaningful uniform pages

### Phase 4 — Compare feature (logged-in) + premium filters [pending]
- Wire existing compare/useCompare into authed finder
- Real fields: country(+flag), amount, eligible countries/regions,
  courses covered, deadline, level; sticky compare bar; side-by-side table
- Premium filter UX (chips, multi-select, saved filters feel)

### Phase 5 — SEO suite [pending]
- robots.txt, sitemap.xml (dynamic-ish), unique <title>/meta per route (SEO.tsx),
  breadcrumbs component w/ schema.org BreadcrumbList, internal links pass,
  PrivacyPolicy exists → verify routed + linked in footer everywhere

### Phase 6 — Audits [pending]
- Lighthouse-style speed audit (build + measure)
- Mobile friendliness audit (viewport, tap targets)
- Security audit skill run
- agent-reach keyword research → findings.md

### Phase 7 — Production cleanliness [pending]
- grep localhost/127.0.0.1/staging URLs; remove or gate behind env
- verify vercel.json, .env.example, console logs, dev-only flags
- final build + e2e smoke

## Decisions Made
| Decision | Rationale |
|---|---|
| Act on AUDIT_PRODUCTION_READINESS.md as source of truth | Newest consolidated audit |
| Keep single design system (Electric Editorial light) | A.4 flagged split branding |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
