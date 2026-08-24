# Task Plan — Zawadi v2 Launch Hardening & Feature Completion

## Goal
Take zawadi-v2 from audited-but-incomplete state to publish-ready.

## Status: in_progress

### Phase 1 — Recon & baseline [complete]
### Phase 2 — Country + flag display [complete]
- flags.ts flagFor() already on cards/dashboard/tracker; added hero chip on detail page
### Phase 3 — Dashboard cards → real destinations [complete]
- Applied → /applications?stage=Applied (uniform tracker, verified live)
- Critical deadlines → /scholarships?sort=deadline (fixed: expired no longer first)
- Removed fabricated match %; finder cards → uniform public detail page
### Phase 4 — Compare + premium filters [complete]
- Fixed click-trap bug (stopPropagation) — compare now works logged-in (verified live)
- API exposes fields_of_study/host_region/iso2 → real comparison rows
- Filters restyled to light editorial; alerts drawer uniform + relevance-capped
### Phase 5 — SEO suite [complete]
- robots.txt ✓ sitemap.xml (dynamic /api/sitemap + vercel rewrite) ✓ unique titles/meta ✓
- Breadcrumbs component + BreadcrumbList schema on 6 static pages + browse ✓ (detail had own)
- Privacy policy routed + footer-linked ✓; FAQ answers PAA queries w/ FAQPage schema ✓
### Phase 6 — Audits [in_progress]
- Speed audit: build done (4502 KiB precache — check initial JS); run lab metrics
- Mobile friendliness: viewport screenshots + tap targets
- Security audit: subagent review of changed surface + verify RLS migration present
- agent-reach keyword validation (prior Exa research exists in docs/research/)
### Phase 7 — Production cleanliness [in_progress]
- localhost only in e2e/playwright (correct); sitemap covers all public pages
- temp QA scripts removed; committed 8c87412

## Decisions Made
| Decision | Rationale |
|---|---|
| Act on AUDIT_PRODUCTION_READINESS.md as source of truth | Newest consolidated audit |
| Single design system (Electric Editorial light) | A.4 flagged split branding |
| Finder routes to public detail instead of inline legacy detail | Uniformity (audit B-02) |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Login hung at "Please wait" | getUser() network round-trip stalled | Replaced with local getSession() |
| Compare click opened detail instead | Event bubbling to card wrapper | stopPropagation in ComparePill |
| Breadcrumbs regex edit mangled 6 static pages | `.*?</button>` over-matched | Repaired each file with exact replacements |
