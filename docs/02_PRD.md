# Zawadi v2 — Product Requirements Document (PRD)

**Document Version:** 3.0 (Rebuild)
**Date:** May 27, 2026
**Author:** Techsari Product Team
**Status:** Active — Spec-Driven Development

---

## 1. Product Overview

Zawadi is a web-based Progressive Web App (PWA) that helps African students discover, track, and successfully apply to scholarships worldwide. The platform uses AI for profile-based matching, essay generation, document intelligence, and automated application form filling.

**Target Platform:** Modern web browsers (Chrome, Firefox, Safari, Edge) on desktop and mobile. PWA for offline access.

**Tech Stack:** React 19 (Vite), Supabase (PostgreSQL + Auth + Storage), Paystack (payments), Vercel (static hosting). No Express. No serverless functions.

---

## 2. User Personas

### Persona 1: Amara — The Determined Undergraduate
- **Age:** 21, Nigeria
- **Goals:** Find fully-funded Master's in Europe
- **Pain Points:** Doesn't know which scholarships accept Nigerians, overwhelmed by 30+ applications, can't write unique essays
- **Plan:** Explorer (free) → Scholar Plus once committed

### Persona 2: Kofi — The Working Professional
- **Age:** 28, Ghana
- **Goals:** PhD in the US with full funding
- **Pain Points:** Limited time outside work, needs maximum efficiency, willing to pay for tools
- **Plan:** Application Pro from day one

### Persona 3: Fatima — The First-Generation Student
- **Age:** 19, Kenya
- **Goals:** Undergraduate scholarship abroad
- **Pain Points:** No family experience with applications, doesn't know what documents are needed, intimidated by essays
- **Plan:** Free tier with strong guidance

### Persona 4: Admin — The Platform Operator
- **Role:** Techsari team member
- **Goals:** Curate database, manage users, monitor payments, ensure data quality
- **Tools Needed:** Admin panel with CRUD, user management, analytics, bulk import

---

## 3. Functional Requirements

### 3.1 Landing Page (Public)

| ID | Requirement | Priority |
|---|---|---|
| LP-01 | Hero section with mission statement and clear CTA | P0 |
| LP-02 | Feature highlights with icons (discovery, matching, essays, tracking) | P0 |
| LP-03 | Pricing comparison table (4 tiers) with monthly/annual toggle | P0 |
| LP-04 | "Get Started" and "Sign In" CTAs prominently placed | P0 |
| LP-05 | Competitive comparison matrix (Zawadi vs alternatives) | P1 |
| LP-06 | Testimonials/social proof section | P2 |
| LP-07 | FAQ section (inline or linked) | P2 |
| LP-08 | Footer with Privacy, Terms, Contact, FAQ links | P0 |

### 3.2 Authentication & Onboarding

| ID | Requirement | Priority |
|---|---|---|
| AU-01 | Email + password registration (name, email, country, password ≥8 chars) | P0 |
| AU-02 | Email + password login using Supabase Auth | P0 |
| AU-03 | Session persistence (Supabase manages JWT + refresh tokens) | P0 |
| AU-04 | Direct user object from `signUp()`/`signInWithPassword()` response — NO second `getUser()` call | P0 |
| AU-05 | Forgot password flow (Supabase `resetPasswordForEmail`) | P1 |
| AU-06 | Logout clears session | P0 |
| AU-07 | Admin-only login endpoint (separate from user auth) | P0 |
| AU-08 | Rate limiting on auth endpoints (Supabase handles this) | P0 |
| AU-09 | Auto-create `user_profiles` row on signup (database trigger) | P0 |
| AU-10 | Email verification optional (configurable in Supabase) | P1 |

### 3.3 Scholarship Database & Discovery

| ID | Requirement | Priority |
|---|---|---|
| SD-01 | View all scholarships in a sortable, filterable grid | P0 |
| SD-02 | Filter by: country, degree level, field, funding type, deadline urgency | P0 |
| SD-03 | Match score (0-100%) based on user profile | P0 |
| SD-04 | Deadline urgency: 🔴 <14 days, 🟡 <30 days, 🟢 90+ days, 🔵 Rolling | P0 |
| SD-05 | Keyword search (name, provider, field, country) | P1 |
| SD-06 | Each listing: name, provider, countries, amount, eligibility, required documents, deadline, direct apply link | P0 |
| SD-07 | Direct application link opens in new tab — NO aggregator redirects | P0 |
| SD-08 | Export filtered results to CSV | P2 |
| SD-09 | "Published" flag — only published scholarships visible to users | P0 |
| SD-10 | View count tracking per scholarship | P2 |

### 3.4 Application Tracking & Management

| ID | Requirement | Priority |
|---|---|---|
| AT-01 | Track through 8 stages: Not Started → Saved → Drafting → Ready → Applied → Interview → Awarded → Rejected → Archived | P0 |
| AT-02 | Toggle "Applied" checkbox | P0 |
| AT-03 | Set priority: High / Normal / Low | P0 |
| AT-04 | Add notes per application (free text) | P1 |
| AT-05 | Document gap analysis — show missing docs per scholarship | P0 |
| AT-06 | Stats dashboard: total, applied, drafting, urgent, strong matches | P0 |
| AT-07 | Category filters (e.g., "AI & Data Science", "Public Health") | P1 |
| AT-08 | Unlimited applications for ALL tiers (free and paid) | P0 |

### 3.5 Document Vault

| ID | Requirement | Priority |
|---|---|---|
| DV-01 | Upload documents by type (CV, transcript, passport, certificate, etc.) | P0 |
| DV-02 | Document types: CV, Resume, Transcript, Certificate, Motivation Letter, SOP, References, Passport, Financial Evidence, Admission Letter, Essay, Other | P0 |
| DV-03 | Free tier: max 5 documents | P0 |
| DV-04 | Paid tiers: Scholar Plus 15 docs, Pro 50 docs, Mentor unlimited | P0 |
| DV-05 | Delete documents (with confirmation) | P0 |
| DV-06 | Supabase Storage with RLS (private by user) | P0 |
| DV-07 | Required documents gap list from top matched scholarships | P1 |
| DV-08 | Document intelligence: AI analysis (P1) | P1 |

### 3.6 AI Essay Generator

| ID | Requirement | Priority |
|---|---|---|
| EG-01 | 3-stage pipeline: Draft → Critique & Rewrite → Final Polish | P0 |
| EG-02 | Essay types: Personal Statement, SOP, Motivation Letter, Leadership Essay, Study Plan | P0 |
| EG-03 | AI learns user voice from uploaded writing samples | P1 |
| EG-04 | Free tier: 3 essays/day | P0 |
| EG-05 | Paid tiers: Plus 10/day, Pro 25/day, Mentor 50/day | P0 |
| EG-06 | Rate-limited API (8 req/min) | P0 |
| EG-07 | Save generated essays as application documents | P1 |
| EG-08 | Essay history — view and reuse past generations | P1 |

### 3.7 Auto-Apply Engine

| ID | Requirement | Priority |
|---|---|---|
| AA-01 | Auto-fill scholarship forms using user profile and documents | P1 |
| AA-02 | Batch auto-apply to multiple scholarships | P2 |
| AA-03 | Validate required fields before submission | P1 |
| AA-04 | Save drafts when fields can't be auto-filled | P1 |

### 3.8 Payments & Subscriptions

| ID | Requirement | Priority |
|---|---|---|
| PY-01 | Freemium model: sign up free, upgrade when limits reached | P0 |
| PY-02 | Upgrade prompt when free limits hit | P0 |
| PY-03 | Paystack subscription plans: monthly + annual for all 3 paid tiers | P0 |
| PY-04 | Payments in KES via Paystack (display USD + local currency equivalent) | P0 |
| PY-05 | Plan upgrade/downgrade with proration | P1 |
| PY-06 | Cancel subscription (access until period end) | P1 |
| PY-07 | Paystack webhook handling: subscription.create, subscription.not_renew, subscription.disable, charge.success | P0 |
| PY-08 | Webhook signature verification (HMAC SHA-512) | P0 |
| PY-09 | Monthly/annual toggle with local currency display | P0 |
| PY-10 | Payment history and invoice generation | P1 |
| PY-11 | Idempotent webhook processing — no duplicate upgrades | P0 |
| PY-12 | Downgrade prevention — paid user can't accidentally pay for lower tier | P0 |

### 3.9 Admin Panel

The admin panel is a standalone application at `/admin` with its own authentication flow, completely isolated from the main user app (zero admin code in the main bundle). Access is protected by Supabase Auth with Row-Level Security (RLS) and role-based access control (RBAC) enforced at the Edge Function layer.

#### Admin Roles & Permissions

| Role | Permissions | Use Case |
|---|---|---|
| **super_admin** | Full access: CRUD all scholarships and users, delete users, delete scholarships, view audit logs, manage other admin accounts (create/promote/demote/suspend), view all statistics and revenue data | Platform owner / tech lead |
| **content_manager** | Scholarship CRUD, bulk import, bot ingestion queue management (approve/reject/flag duplicate), publish/unpublish scholarships, view dashboard stats and analytics. **Cannot** manage users, view payments, or access audit logs | Content curator / data quality manager |
| **support_agent** | View users (list, search, detail), update user subscription plans (live dropdown), view payment/subscription history, view dashboard stats. **Cannot** modify scholarships, access bot queue, or view audit logs | Customer support / account management |

RBAC is enforced server-side via Supabase Edge Functions. The admin app queries the user's role on login and conditionally renders tabs, buttons, and sections based on the role. Attempts to call unauthorized Edge Functions return 403 Forbidden. The full RBAC matrix is defined in `docs/04_SECURITY_RULES.md`.

#### Feature Requirements

##### Authentication & Framework

| ID | Requirement | Priority | Roles |
|---|---|---|---|
| AD-01 | Admin login at `/admin/login` — completely separate auth flow from user app; dedicated admin credentials stored in `admin_users` table with Supabase Auth | P0 | All |
| AD-02 | Role resolution on login: fetch role from `admin_users` → store in session context → conditionally render UI sections | P0 | All |
| AD-03 | Session timeout: auto-logout after 30 minutes of inactivity (configurable) | P1 | All |

##### Dashboard

| ID | Requirement | Priority | Roles |
|---|---|---|---|
| AD-04 | Dashboard metrics: total scholarships (published vs unpublished), total users, active subscriptions (by plan), MRR/revenue summary, essays generated today, applications tracked | P0 | All |
| AD-05 | Quick-action cards: "Review Bot Queue" (content_manager+), "New Scholarship" (content_manager+), "View Users" (support_agent+) | P0 | All |

##### Scholarship Manager

| ID | Requirement | Priority | Roles |
|---|---|---|---|
| AD-06 | Scholarship list view: paginated table with name, provider, country, deadline, status (published/unpublished), view count. Sortable and filterable | P0 | super_admin, content_manager |
| AD-07 | Create scholarship: full form with all fields (name, provider, description, countries, degree levels, fields of study, funding type, amount, eligibility, required documents, deadline, apply link, tags) | P0 | super_admin, content_manager |
| AD-08 | Edit scholarship: inline edit or modal, all fields editable, changes logged to audit trail | P0 | super_admin, content_manager |
| AD-09 | Delete scholarship: soft-delete with confirmation dialog, reversible within 30 days. Only super_admin can hard-delete | P0 | super_admin (delete), content_manager (archive only) |
| AD-10 | Publish/Unpublish toggle: single-click toggle with immediate effect on user-facing listings. Unpublished scholarships hidden from all users | P0 | super_admin, content_manager |
| AD-11 | Bulk import: CSV/JSON upload with field mapping, validation preview (show errors before commit), deduplication check against existing entries | P0 | super_admin, content_manager |
| AD-12 | Duplicate detection: flag potential duplicates during manual creation or bulk import (fuzzy match on name + provider) | P1 | super_admin, content_manager |

##### Bot Ingestion Review Queue

| ID | Requirement | Priority | Roles |
|---|---|---|---|
| AD-13 | Queue list view: all bot-ingested scholarships (unpublished), ordered by ingestion date (newest first). Show: name, provider, country, deadline, confidence score, ingested date | P0 | super_admin, content_manager |
| AD-14 | Approve: one-click approve → scholarship is published and visible to users. Option to edit fields before approving | P0 | super_admin, content_manager |
| AD-15 | Reject: reject with optional reason (spam, irrelevant, bad data, aggregator link). Rejected entries hidden from queue but retained for audit | P0 | super_admin, content_manager |
| AD-16 | Flag as duplicate: mark as duplicate of existing scholarship, link to original. Prevents re-ingestion of same (name, host) pair | P0 | super_admin, content_manager |
| AD-17 | Batch actions: select multiple queue items → approve all, reject all, or flag all as duplicates | P1 | super_admin, content_manager |
| AD-18 | Queue stats: total pending, approved today, rejected today, flagged duplicates. Shown at top of queue | P1 | super_admin, content_manager |

##### User Management

| ID | Requirement | Priority | Roles |
|---|---|---|---|
| AD-19 | User list: paginated table with name, email, country, plan, active status, join date. Searchable by name or email. Sortable by any column | P0 | super_admin, support_agent |
| AD-20 | User detail view: full profile (name, email, country, plan, join date, last active, application count, essay count, document count) | P0 | super_admin, support_agent |
| AD-21 | Live plan switching: dropdown to change user's subscription plan (Explorer → Scholar Plus → Application Pro → Mentor). Triggers immediate plan update. Logged to audit trail | P0 | super_admin, support_agent |
| AD-22 | Suspend user: toggle to disable account access (user cannot log in). Reversible. Suspended users retain data but cannot access the platform | P0 | super_admin |
| AD-23 | Delete user: permanent account deletion (cascades to user_profiles, documents, applications). Requires confirmation + reason. Logged to audit trail. super_admin only | P0 | super_admin |

##### Subscription & Payment Viewer

| ID | Requirement | Priority | Roles |
|---|---|---|---|
| AD-24 | Payment records: view all Paystack transactions — user, plan, amount, currency, status, date. Filterable by date range, plan, status. Exportable to CSV | P1 | super_admin, support_agent |
| AD-25 | Subscription status: active, past_due, canceled, trialing. Linked to user detail view | P1 | super_admin, support_agent |

##### Audit Log Viewer

| ID | Requirement | Priority | Roles |
|---|---|---|---|
| AD-26 | Audit log: chronologically ordered list of all admin actions — who, what, when, old value, new value, IP address | P1 | super_admin |
| AD-27 | Filter audit log: by admin user, action type (create/update/delete/publish/suspend), date range, target entity (scholarship/user) | P2 | super_admin |
| AD-28 | Audit log retention: minimum 90 days, then archive to cold storage | P2 | super_admin |

##### Statistics & Analytics

| ID | Requirement | Priority | Roles |
|---|---|---|---|
| AD-29 | User analytics: signups over time (daily/weekly/monthly), active users, churn rate, plan distribution pie chart | P1 | All |
| AD-30 | Content analytics: scholarships viewed, top scholarships by views, essays generated (total + by tier), applications tracked (total + by stage) | P1 | All |
| AD-31 | Revenue analytics: MRR trend, revenue by plan, conversion rate (free → paid), churned subscriptions | P1 | super_admin, content_manager |
| AD-32 | Bot analytics: ingestion rate, approval rate, rejection reasons breakdown, queue backlog | P2 | super_admin, content_manager |

##### Role-Based UI

| ID | Requirement | Priority | Roles |
|---|---|---|---|
| AD-33 | super_admin sees all tabs: Dashboard, Scholarships, Bot Queue, Users, Payments, Audit Log, Analytics, Admin Management | P0 | super_admin |
| AD-34 | content_manager sees: Dashboard, Scholarships, Bot Queue, Analytics. Users/Payments/Audit Log/Admin Management tabs hidden | P0 | content_manager |
| AD-35 | support_agent sees: Dashboard, Users, Payments, Analytics. Scholarships/Bot Queue/Audit Log/Admin Management tabs hidden. Scholarship actions disabled | P0 | support_agent |
| AD-36 | Unauthorized Edge Function calls return 403 Forbidden with descriptive error. Admin UI gracefully handles and displays permission-denied states | P0 | All |

### 3.10 Zawadi Bot

| ID | Requirement | Priority |
|---|---|---|
| ZB-01 | Daily scholarship hunt via Hermes cron job | P0 |
| ZB-02 | Auto-POST to Supabase with INGEST_API_KEY validation | P0 |
| ZB-03 | Deduplication by (name, host) | P0 |
| ZB-04 | Link validation — reject aggregator URLs | P0 |
| ZB-05 | Urgent deadline alerts | P1 |
| ZB-06 | All fields, all African countries — no restriction to AI/ML | P0 |
| ZB-07 | New listings default to unpublished — admin reviews before publishing | P0 |

### 3.11 Public Pages

| ID | Requirement | Priority |
|---|---|---|
| PP-01 | Privacy Policy at `/privacy` | P0 |
| PP-02 | Terms of Service at `/terms` | P0 |
| PP-03 | FAQ at `/faq` | P1 |
| PP-04 | About at `/about` | P1 |
| PP-05 | Contact at `/contact` | P1 |
| PP-06 | All pages accessible from footer on every page | P0 |
| PP-07 | All pages as static HTML in `public/` (served directly by Vercel) | P0 |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement | Target |
|---|---|---|
| NF-P01 | First contentful paint | <2s on 3G |
| NF-P02 | Supabase query response | <500ms p95 |
| NF-P03 | Essay generation time | <30s per stage |
| NF-P04 | Concurrent users | 1,000 without degradation |
| NF-P05 | Time-to-interactive | <3s |
| NF-P06 | Main JS bundle | <300KB gzipped (code-split) |

### 4.2 Security

| ID | Requirement | Implementation |
|---|---|---|
| NF-S01 | Password handling | Supabase Auth (bcrypt/scrypt, never plaintext) |
| NF-S02 | Session management | Supabase JWT + refresh tokens (httpOnly in production) |
| NF-S03 | API authentication | Supabase anon key for reads, service_role for admin writes |
| NF-S04 | Rate limiting | Supabase Auth limits + app-level for essay generation |
| NF-S05 | CORS | Restricted to `https://www.techsari.online` |
| NF-S06 | Data at rest | Supabase AES-256 (PostgreSQL + Storage) |
| NF-S07 | Data in transit | TLS 1.2+ (HTTPS) |
| NF-S08 | Webhook verification | Paystack HMAC SHA-512 |
| NF-S09 | Input validation | All user inputs sanitized; parameterized queries via Supabase SDK |
| NF-S10 | Admin isolation | Separate `/admin` page; zero admin code in main bundle |
| NF-S11 | RLS on all tables | Every table has row-level security policies |
| NF-S12 | Service role key | NEVER exposed to client; admin-only Supabase client |
| NF-S13 | RBAC enforcement | Role-based access control (super_admin, content_manager, support_agent) enforced server-side via Supabase Edge Functions. Full matrix in `docs/04_SECURITY_RULES.md` |
| NF-S14 | Edge Function isolation | Admin operations run exclusively through Edge Functions with `service_role` key. Client never has direct database write access. Edge Functions validate role before executing any admin action |
| NF-S15 | Admin auth isolation | Admin login uses separate auth flow and `admin_users` table. Admin JWT claims include role for Edge Function authorization. Zero admin code in main user bundle |
| NF-S16 | Audit trail | All admin mutations (create, update, delete, publish, plan change, suspend) logged with admin ID, timestamp, old/new values, and IP address |

### 4.3 Accessibility

| ID | Requirement |
|---|---|
| NF-A01 | WCAG 2.1 AA compliance on all public pages |
| NF-A02 | Keyboard navigation for all interactive elements |
| NF-A03 | Screen reader support with ARIA labels |
| NF-A04 | Color contrast ratio ≥ 4.5:1 for text |
| NF-A05 | Responsive design (mobile-first, 320px–2560px) |

### 4.4 Reliability

| ID | Requirement | Target |
|---|---|---|
| NF-R01 | Uptime | 99.5% (Vercel + Supabase SLA) |
| NF-R02 | Data backup | Daily Supabase backups |
| NF-R03 | Error handling | User-friendly messages; never expose stack traces |
| NF-R04 | Offline support | PWA with service worker for cached access |

### 4.5 Data Privacy

| ID | Requirement |
|---|---|
| NF-P01 | Privacy Policy published and linked from every page |
| NF-P02 | Data retention: delete within 30 days of account deletion request |
| NF-P03 | Consent: clear opt-in for communications |
| NF-P04 | Right to access: users can request all stored data |
| NF-P05 | Right to deletion: users can delete account and all data |
| NF-P06 | No third-party data sharing without explicit consent |
| NF-P07 | Essential cookies only (auth session) — no tracking |

---

## 5. Feature Prioritization (MoSCoW)

### Must Have (MVP — June 2026)
- Landing page with mission + pricing
- Supabase Auth (email/password)
- Scholarship database with filtering + search
- Match scores + urgency indicators
- Application tracking (8 stages)
- Document vault (5 docs free)
- AI essay generator (3-stage, 3/day free)
- Freemium payments via Paystack (KES)
- Admin panel (standalone, role-based RBAC with 3 roles: super_admin, content_manager, support_agent):
  - Dashboard metrics and analytics
  - Scholarship manager (CRUD, publish/unpublish, bulk import)
  - Bot ingestion review queue (approve/reject/flag duplicate)
  - User management (list, search, detail, plan switching)
  - Subscription/payment viewer
  - Role-based UI (tabs gated by role)
  - Edge Function isolation for all admin mutations
- Zawadi Bot ingestion pipeline
- Privacy Policy + Terms of Service pages
- Pure static + Supabase architecture (no Express)

### Should Have (Post-MVP — July 2026)
- Forgot password flow
- Category filters on dashboard
- Document gap analysis
- Payment history + invoices
- Admin subscription/payment viewer (AD-24, AD-25)
- Admin audit log viewer (AD-26)
- Admin analytics & statistics dashboard (AD-29, AD-30, AD-31)
- Urgent deadline alerts
- FAQ page
- PWA offline support
- Code splitting for performance

### Could Have (Q3 2026)
- AI learns user voice
- Batch auto-apply
- CSV export
- Testimonials section
- Push notifications
- Admin batch bot queue operations (AD-17)
- Admin audit log filtering + retention (AD-27, AD-28)
- Admin bot analytics dashboard (AD-32)

### Won't Have (Phase 1)
- Native mobile apps
- Mentor network
- University API integrations
- French/Portuguese localization
- White-label solutions

---

## 6. User Flows

### 6.1 New User Onboarding
```
Landing Page → "Get Started" → Registration → Auto-login → Dashboard (empty state + guidance)
```

### 6.2 Scholarship Discovery → Application
```
Dashboard → Browse → Filter/Sort → View Details → "Apply Now" (external link) → Track in Dashboard
```

### 6.3 Essay Generation
```
Dashboard → Essay Generator → Select Type → Enter Prompt → Generate Draft → Critique → Polish → Copy/Save
```

### 6.4 Payment Upgrade
```
Free Limit Reached → Upgrade Prompt → Pricing Page → Select Plan → Paystack Checkout → Webhook → Plan Activated
```

---

*PRD reviewed by: _____________________ Date: _____________________*
