# Zawadi v2 — Business Requirements Document (BRD)

**Document Version:** 3.0 (Rebuild)
**Date:** May 27, 2026
**Author:** Techsari Product Team
**Status:** Active — Spec-Driven Development
**Classification:** Internal — Confidential

---

## 1. Executive Summary

Techsari Zawadi is an AI-powered scholarship discovery and application management platform purpose-built for African students. It addresses the acute market failure where talented African students miss life-changing educational opportunities due to fragmented information, eligibility blindness, deadline chaos, and lack of application support tools.

The v2 rebuild replaces the Express.js backend architecture with a **pure static + Supabase** architecture, eliminating the core deployment and reliability issues that plagued v1. Every lesson from v1's development (documented in `13_LESSONS_LEARNED.md`) is baked into this specification.

The platform combines a verified scholarship database, AI-driven matching, application tracking, AI essay generation, document intelligence, and an auto-apply engine — all accessible via a freemium model starting at $5/month via Paystack.

---

## 2. Business Case

### 2.1 Market Opportunity

| Metric | Value | Source |
|---|---|---|
| Sub-Saharan African students abroad | 56,780 (US alone), ~400,000+ globally | IIE Open Doors, UNESCO |
| Nigerian students abroad | ~85,000 (30% of African total) | WENR 2024 |
| Annual growth rate of African student mobility | 8-12% YoY | ICEF Monitor |
| Scholarships available for Africans annually | 5,000-8,000 distinct programs | Cross-referenced aggregator analysis |
| Average applications per serious African student | 15-30 per year | Techsari user research |
| Africa EdTech market size (2024) | $3.2B, 15% CAGR | HolonIQ |

### 2.2 Problem Quantification

1. **Information fragmentation** — Scholarships across 500+ websites with no Africa-first filter
2. **Eligibility blindness** — 70% of results irrelevant to any given African student
3. **Application overwhelm** — 15-30 applications with zero tooling
4. **Essay burden** — 5-8 unique essays per cycle; most students submit generic copy-paste
5. **Trust crisis** — 35% of listings expired, inaccurate, or misleading

### 2.3 Revenue Model

| Tier | Price (Monthly) | Price (Annual) | Target Segment |
|---|---|---|---|
| Explorer (Free) | $0 | $0 | Discovery-only; students testing the platform |
| Scholar Plus | $5/mo | $50/yr | Active applicants needing premium matching + documents |
| Application Pro | $12/mo | $120/yr | Power users managing 15+ applications |
| Mentor Review | $29/mo | $290/yr | Students needing expert review + strategy |

**Revenue projections (Year 1):**
- Target: 1,000 users → 5% conversion → 50 paid users
- ARPU: ~$8/month (blended)
- Year 1 ARR: ~$4,800
- Year 2: 10,000 users, 8% conversion → ~$76,800 ARR

---

## 3. Stakeholders

### 3.1 Primary

| Stakeholder | Role | Key Concerns |
|---|---|---|
| African Students (18-35) | End users | Discovery, matching accuracy, application success |
| Techsari (Company) | Product owner | Revenue, user growth, market share |
| Scholarship Providers | Content partners | Reach qualified African applicants |
| Universities | Ecosystem partners | Pre-qualified applicant pipeline |

### 3.2 Secondary

| Stakeholder | Role | Key Concerns |
|---|---|---|
| Parents/Guardians | Financial backers | ROI on applications |
| NGOs & Youth Organizations | Distribution partners | Tools for beneficiaries |
| African Governments | Policy stakeholders | Student mobility data |

---

## 4. Scope

### 4.1 In Scope (v2 MVP)

- Static React SPA (Vite + React 19) deployed on Vercel
- Supabase as sole backend: auth, database, storage
- No Express.js, no serverless functions, no API server
- Scholarship database with 100+ verified listings at launch (500+ target)
- AI-powered profile matching with match scores
- Application tracking dashboard (8 stages, priority, notes)
- AI essay generator (3-stage pipeline)
- Document vault with Supabase Storage + RLS
- Auto-apply engine (form auto-fill)
- Freemium payments via Paystack (KES, recurring subscriptions)
- Zawadi Bot — automated daily scholarship ingestion via Hermes cron
- Admin panel at `/admin` — fully separate, Supabase service_role backend
- Landing page with mission, pricing, competitive comparison
- Privacy Policy, Terms of Service, FAQ pages (static HTML)
- PWA support for offline access
- Responsive design (mobile-first, 320px–2560px)
- Support for 1,000 concurrent users

### 4.2 Out of Scope (Phase 1)

- Native mobile apps (iOS/Android) — Phase 2
- Mentor matching network — Phase 3
- University API integrations — Phase 2
- French/Portuguese localization — Phase 3
- Affiliate/referral program — Phase 2
- White-label for universities — Phase 3

---

## 5. Constraints & Assumptions

### 5.1 Constraints

- Must process payments in KES via Paystack (subscription API)
- Must support all 54 African countries at launch
- Free tier must be genuinely useful — not a crippled teaser
- All scholarship listings must have verified direct application links
- Must work on low-bandwidth connections (3G)
- Admin panel must be fully separate from main app
- No Express.js, no serverless functions — pure static + Supabase

### 5.2 Assumptions

- Paystack can process recurring subscriptions in KES
- Supabase free tier sufficient for MVP (<1,000 users); upgrade at scale
- AI model costs (essay generation) manageable at projected volumes
- Users have access to smartphones or computers with internet
- Scholarship providers will not block automated ingestion

---

## 6. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Scholarship data becomes stale | High | High | Zawadi Bot daily hunts; automated link checker; admin verification required |
| Paystack subscription failures | Medium | High | Webhook monitoring; fallback one-time payments; idempotency checks |
| AI essay quality complaints | Medium | Medium | 3-stage pipeline; user review before submission; disclaimer |
| Competitor launches similar product | Medium | High | Build moat: AI essay + auto-apply + Africa-first + 500+ verified listings |
| Supabase rate limits at scale | Low | High | Connection pooling; query optimization; upgrade to pro plan at 1,000+ users |
| User data privacy breach | Low | Critical | AES-256 encryption; RLS on all tables; audit logging; no PII storage beyond minimum |
| Regulatory changes (data laws) | Medium | Medium | Privacy-by-design; Kenya DPA + GDPR compliant from day one |
| Vercel deployment issues | None (v2) | — | Pure static deployment — no serverless functions to break |
| Blank page after auth | None (v2) | — | Direct user object from sign-in; no second getUser() call |
| Data shape mismatch crashes | None (v2) | — | Normalize ALL data at API boundary with safe defaults |

---

## 7. Architecture Decision: Why Pure Static + Supabase

v1 used Express.js on Vercel serverless functions. This caused:
- 404 errors on API endpoints
- CJS/ESM module conflicts (pdf-parse, mammoth)
- DOMMatrix errors in Node.js runtime
- 3+ failed deployments before we pivoted

**v2 architecture**: Pure static React SPA + Supabase for everything.
- **Vercel**: Static file hosting only (`vite build` → `dist/`)
- **Supabase**: Auth, database (PostgreSQL), storage
- **No serverless functions, no Express, no API routes**

This is the proven architecture that worked in v1's final iteration and eliminates the #1 source of deployment failures.

---

## 8. Timeline & Milestones

| Milestone | Target | Deliverables |
|---|---|---|
| Spec Completion | May 27, 2026 | All 15 documents in this folder |
| Core Rebuild | June 1, 2026 | Auth, database, scholarship browsing, matching |
| Full Feature Set | June 8, 2026 | Essays, documents, auto-apply, payments, admin |
| Bot Integration | June 10, 2026 | Zawadi Bot cron job for daily ingestion |
| Testing & Hardening | June 12, 2026 | Security audit, accessibility, performance, edge cases |
| Beta Launch | June 15, 2026 | 50 beta users across 5 countries |
| Public Launch | June 20, 2026 | Open registration, marketing push |
| 100 Verified Scholarships | June 30, 2026 | Quality over quantity; every listing vetted |
| 500 Active Users | August 2026 | Marketing across African university networks |
| 1,000 Users | October 2026 | Scale infrastructure; 500+ scholarships |

---

*BRD approved by: _____________________ Date: _____________________*
