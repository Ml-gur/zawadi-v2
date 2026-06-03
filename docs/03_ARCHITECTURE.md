# Techsari-Zawadi — Technical Architecture

**Document Version:** 1.0 (Greenfield)
**Date:** May 27, 2026
**Author:** Techsari Engineering
**Status:** Spec-Driven Development
**Audience:** Developers — this document alone + sub-documents should enable a developer to build the entire system

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Backend: Supabase Edge Functions](#4-backend-supabase-edge-functions)
5. [Frontend: React SPA](#5-frontend-react-spa)
6. [Database: PostgreSQL Schema](#6-database-postgresql-schema)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [API Layer: Complete Reference](#8-api-layer-complete-reference)
9. [Data Flows](#9-data-flows)
10. [Deployment](#10-deployment)
11. [Environment Variables](#11-environment-variables)
12. [Scaling Strategy](#12-scaling-strategy)
13. [Monitoring & Observability](#13-monitoring--observability)

---

## 1. Architecture Overview

Techsari-Zawadi uses a **hybrid architecture**: the React SPA talks directly to Supabase for simple CRUD operations, while **Supabase Edge Functions** handle server-side logic that requires secrets, elevated database permissions, or third-party API calls.

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │         Vercel CDN (Static Hosting)                │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  React 19 SPA (Vite Build)                   │  │  │
│  │  │  - Landing Page (public/)                    │  │  │
│  │  │  - Authenticated App (src/)                  │  │  │
│  │  │  - Admin Panel (/admin - separate entry)     │  │  │
│  │  │  - Static Pages (privacy, terms, faq, etc.)  │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                               │
│          ┌───────────────┼───────────────┐               │
│          │               │               │               │
│     HTTPS (Public)  HTTPS (Auth)   HTTPS (Admin)         │
│     anon key        user JWT       service_role key      │
└──────────────────────────────────────────────────────────┘
           │               │               │
           ▼               ▼               ▼
┌──────────────────────────────────────────────────────────┐
│                   BACKEND LAYER                           │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │           Supabase Cloud                            │  │
│  │                                                     │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │  Auth    │  │  PostgreSQL   │  │  Storage    │  │  │
│  │  │ (GoTrue) │  │  (Database)   │  │  (S3)       │  │  │
│  │  │          │  │  - RLS        │  │  - Private  │  │  │
│  │  │ - JWT    │  │  - Indexes    │  │  - RLS      │  │  │
│  │  │ - MFA    │  │  - Triggers   │  │             │  │  │
│  │  └──────────┘  └──────────────┘  └─────────────┘  │  │
│  │                                                     │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │       Edge Functions (Deno Runtime)           │  │  │
│  │  │                                              │  │  │
│  │  │  /api/paystack-webhook  → HMAC verify        │  │  │
│  │  │  /api/admin/*           → service_role ops   │  │  │
│  │  │  /api/ai/essay          → AI proxy (hides key)│  │  │
│  │  │  /api/ingest            → Bot ingestion      │  │  │
│  │  │  /api/me                → Profile (elevated) │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
           │
           │ HTTPS
           ▼
┌──────────────────────────────────────────────────────────┐
│                 EXTERNAL SERVICES                         │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  Paystack  │  │  OpenRouter  │  │  Hermes Cron    │  │
│  │ (Payments) │  │  (AI/DeepSeek)│  │  (Zawadi Bot)   │  │
│  └────────────┘  └──────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Why This Architecture?

| Decision | Why |
|---|---|
| Supabase for database/auth/storage | Managed PostgreSQL, built-in auth, RLS, storage. No server to maintain. |
| Edge Functions for backend logic | Server-side operations (webhooks, admin, AI proxy) need secrets. Edge Functions run on Deno, deploy with Supabase, no separate hosting. |
| React SPA on Vercel static | Zero server cost, global CDN, auto-deploy from git. |
| Direct Supabase from browser for reads | Simple CRUD doesn't need a backend proxy. RLS handles authorization. |
| Edge Functions for writes needing elevation | Paystack webhook verification, admin operations, AI API key protection — these MUST be server-side. |

### What We Explicitly Reject (v1 Lessons)

| Rejected Pattern | Why | v1 Lesson |
|---|---|---|
| Express.js on Vercel serverless | CJS/ESM conflicts, DOMMatrix errors, unreliable routing | Failed 3+ deployments |
| All-in-one monolith API server | Unnecessary complexity for this use case | Added attack surface |
| Custom auth implementation | Supabase Auth is free, secure, maintained | Why rebuild? |
| Server-rendered pages | No SEO benefit for a dashboard app | Added latency |
| `getUser()` after `signIn()` | Async timing gap causes blank pages | v1 auth bug |
| Unnormalized API responses | Data shape mismatch crashes React | v1 blank page bug |

---

## 2. Technology Stack

### Frontend

| Layer | Technology | Why |
|---|---|---|
| Framework | React 19 | Latest, stable, huge ecosystem |
| Build | Vite 6 | Fast HMR, optimized builds, ESM-native |
| Styling | Tailwind CSS 4 | Utility-first, zero runtime CSS |
| Routing | React Router 7 | SPA routing, lazy loading |
| Icons | Lucide React | Tree-shakeable, consistent |
| State | React Context + useReducer | Lightweight, no external deps |
| HTTP | `@supabase/supabase-js` | Direct Supabase calls |
| PWA | `vite-plugin-pwa` | Offline support, installable |
| Forms | Native HTML5 validation + custom hooks | No form library needed |

### Backend (Supabase Edge Functions)

| Function | Runtime | Purpose |
|---|---|---|
| `paystack-webhook` | Deno | Verify HMAC, process subscription events |
| `admin-operations` | Deno | CRUD with service_role (bypasses RLS) |
| `ai-essay` | Deno | Proxy AI calls, hide API key, rate limit |
| `ingest-scholarship` | Deno | Bot ingestion endpoint, validate+deduplicate |
| `user-profile` | Deno | Profile operations with elevated access |

### Database & Infrastructure

| Service | Provider | Plan |
|---|---|---|
| PostgreSQL | Supabase | Free (upgrade to Pro at 1K+ users) |
| Auth | Supabase Auth (GoTrue) | Email/password, JWT |
| Storage | Supabase Storage (S3) | Private bucket, 10MB/file |
| Edge Functions | Supabase | 500K invocations/month free |
| Hosting (Frontend) | Vercel | Static, auto-deploy |
| Payments | Paystack | Subscription API |
| AI | OpenRouter → DeepSeek | Pay-per-token |
| Monitoring | Supabase Dashboard + Vercel Analytics | Built-in |

### NOT in the Stack

| Excluded | Reason |
|---|---|
| TypeScript | Added complexity for MVP; add later |
| Redux/Zustand | Overkill — Context + useReducer sufficient |
| Next.js | Unnecessary SSR complexity for dashboard app |
| GraphQL | REST (Supabase SDK) is simpler for this use case |
| Docker | No containerization needed — Supabase is managed |
| Redis | Not needed at MVP scale; Supabase caching sufficient |
| WebSockets | Not needed; Supabase Realtime optional later |

---

## 3. Project Structure

```
zawadi-v2/
├── public/                      # Static files served by Vercel
│   ├── privacy.html             # Privacy Policy
│   ├── terms.html               # Terms of Service
│   ├── faq.html                 # FAQ
│   ├── about.html               # About page
│   ├── contact.html             # Contact page
│   └── sw.js                    # Service Worker (PWA)
│
├── src/                         # React application source
│   ├── main.jsx                 # App entry point
│   ├── App.jsx                  # Root component with router
│   │
│   ├── config/                  # Configuration
│   │   ├── supabase.js          # Supabase client initialization
│   │   ├── plans.js             # Pricing plans, feature limits
│   │   ├── constants.js         # Countries, degree levels, fields
│   │   └── routes.js            # Route definitions
│   │
│   ├── context/                 # React Context providers
│   │   ├── AuthContext.jsx      # Auth state, login/logout/signup
│   │   ├── ScholarshipContext.jsx # Scholarship data, filters
│   │   └── ToastContext.jsx     # Toast notifications
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useApi.js            # api() wrapper with Supabase
│   │   ├── useAuth.js           # Auth operations
│   │   ├── useScholarships.js   # Scholarship queries, filters
│   │   ├── useApplications.js   # Application CRUD
│   │   ├── useDocuments.js      # Document upload/delete
│   │   ├── useEssays.js         # Essay generation
│   │   └── usePayments.js       # Payment operations
│   │
│   ├── lib/                     # Utility functions
│   │   ├── api.js               # Client-side API router → Supabase
│   │   ├── normalize.js         # Data normalization (CRITICAL)
│   │   ├── match.js             # Match scoring algorithm
│   │   ├── urgency.js           # Deadline urgency calculation
│   │   ├── validation.js        # Form validation
│   │   └── format.js            # Currency, date, text formatting
│   │
│   ├── components/              # Reusable UI components
│   │   ├── ui/                  # Base components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── Spinner.jsx
│   │   │   ├── Skeleton.jsx
│   │   │   └── EmptyState.jsx
│   │   │
│   │   ├── layout/              # Layout components
│   │   │   ├── Header.jsx       # Public header (landing)
│   │   │   ├── Footer.jsx       # Public footer
│   │   │   ├── AppShell.jsx     # Authenticated layout
│   │   │   ├── Sidebar.jsx      # Navigation sidebar
│   │   │   └── MobileNav.jsx    # Mobile bottom nav
│   │   │
│   │   ├── auth/                # Auth components
│   │   │   ├── SignInForm.jsx
│   │   │   ├── SignUpForm.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   └── AuthGuard.jsx    # Route protection wrapper
│   │   │
│   │   ├── scholarships/        # Scholarship components
│   │   │   ├── ScholarshipGrid.jsx
│   │   │   ├── ScholarshipCard.jsx
│   │   │   ├── ScholarshipFilters.jsx
│   │   │   ├── ScholarshipDetail.jsx
│   │   │   ├── MatchScore.jsx
│   │   │   └── UrgencyBadge.jsx
│   │   │
│   │   ├── applications/        # Application tracking
│   │   │   ├── ApplicationTracker.jsx
│   │   │   ├── ApplicationRow.jsx
│   │   │   ├── StatusDropdown.jsx
│   │   │   ├── PrioritySelector.jsx
│   │   │   └── StatsBar.jsx
│   │   │
│   │   ├── documents/           # Document vault
│   │   │   ├── DocumentVault.jsx
│   │   │   ├── DocumentUpload.jsx
│   │   │   ├── DocumentCard.jsx
│   │   │   └── DocumentGapList.jsx
│   │   │
│   │   ├── essays/              # AI Essay Generator
│   │   │   ├── EssayGenerator.jsx
│   │   │   ├── EssayTypeSelector.jsx
│   │   │   ├── EssayEditor.jsx
│   │   │   ├── CritiquePanel.jsx
│   │   │   └── EssayHistory.jsx
│   │   │
│   │   ├── payments/            # Payments & subscriptions
│   │   │   ├── PricingPage.jsx
│   │   │   ├── PlanCard.jsx
│   │   │   ├── UpgradeModal.jsx
│   │   │   └── PaymentHistory.jsx
│   │   │
│   │   └── landing/             # Landing page sections
│   │       ├── HeroSection.jsx
│   │       ├── FeaturesSection.jsx
│   │       ├── PricingSection.jsx
│   │       ├── ComparisonSection.jsx
│   │       └── TestimonialsSection.jsx
│   │
│   ├── pages/                   # Page-level components
│   │   ├── LandingPage.jsx      # Public landing
│   │   ├── DashboardPage.jsx    # Main dashboard (authenticated)
│   │   ├── ScholarshipsPage.jsx # Browse scholarships
│   │   ├── ApplicationsPage.jsx # Track applications
│   │   ├── DocumentsPage.jsx    # Document vault
│   │   ├── EssaysPage.jsx       # Essay generator
│   │   ├── PricingPage.jsx      # Plans & upgrade
│   │   ├── ProfilePage.jsx      # User settings
│   │   └── NotFoundPage.jsx     # 404
│   │
│   └── styles/
│       └── index.css            # Tailwind directives + custom styles
│
├── admin/                       # Admin panel (COMPLETELY SEPARATE)
│   ├── index.html               # Admin entry point
│   ├── main.jsx                 # Admin app entry
│   ├── App.jsx                  # Admin router
│   ├── config/
│   │   └── supabase-admin.js    # Supabase client with service_role
│   ├── context/
│   │   └── AdminAuthContext.jsx # Admin auth state
│   ├── components/
│   │   ├── AdminLogin.jsx
│   │   ├── AdminShell.jsx       # Admin layout + sidebar
│   │   ├── AdminDashboard.jsx   # Overview metrics
│   │   ├── ScholarshipManager.jsx
│   │   ├── ScholarshipForm.jsx
│   │   ├── BulkImport.jsx
│   │   ├── IngestionQueue.jsx   # Bot review queue
│   │   ├── UserManager.jsx
│   │   ├── UserDetail.jsx
│   │   ├── SubscriptionManager.jsx
│   │   ├── AuditLogViewer.jsx
│   │   └── StatisticsPanel.jsx
│   └── styles/
│       └── admin.css
│
├── supabase/                    # Supabase configuration
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # Complete database setup
│   └── functions/               # Edge Functions
│       ├── paystack-webhook/
│       │   └── index.ts         # Webhook handler
│       ├── admin-operations/
│       │   └── index.ts         # Admin CRUD
│       ├── ai-essay/
│       │   └── index.ts         # AI proxy
│       ├── ingest-scholarship/
│       │   └── index.ts         # Bot ingestion
│       └── user-profile/
│           └── index.ts         # Elevated profile ops
│
├── docs/                        # All specification documents
│   ├── 00_MISSION_AND_VISION.md
│   ├── 01_BRD.md
│   ├── 02_PRD.md
│   ├── 03_ARCHITECTURE.md       # ← THIS FILE
│   ├── 04_SECURITY_RULES.md
│   ├── 05_PAYMENT_PLANS.md
│   ├── 06_WORKFLOW.md
│   ├── 07_CHECKPOINTS.md
│   ├── 08_PRIVACY_POLICY.md
│   ├── 09_TERMS_OF_SERVICE.md
│   ├── 10_FAQ.md
│   ├── 11_DESIGN_SYSTEM.md
│   ├── 12_SUPABASE_SCHEMA.md
│   ├── 13_LESSONS_LEARNED.md
│   └── SKILL.md
│
├── index.html                   # Main app entry (Vite)
├── vite.config.js               # Vite configuration
├── vercel.json                  # Vercel deployment config
├── tailwind.config.js           # Tailwind configuration
├── package.json                 # Dependencies
├── .env.example                 # Environment variable template
├── .gitignore
└── README.md
```

### Key Structural Decisions

1. **Admin is a separate Vite entry point** (`admin/index.html`). Zero admin code appears in the main user bundle. This was a v1 issue where admin components leaked into the user app.
2. **Edge Functions in `supabase/functions/`** — deploy with `supabase functions deploy`. Each function is independent.
3. **`src/lib/api.js` is the single API boundary** — every component calls `api('/api/scholarships')` which routes to Supabase or Edge Functions. This is the layer where normalization happens.
4. **`src/lib/normalize.js` is mandatory** — every API response passes through normalization with safe defaults before reaching any component.

---

## 4. Backend: Supabase Edge Functions

Edge Functions are the server-side layer. They run on Deno, deploy globally on Supabase's edge network, and have access to environment secrets.

### 4.1 `paystack-webhook`

**Purpose:** Receive and verify Paystack webhook events. Update user subscription plans.

**Endpoint:** `POST /api/paystack-webhook`

**Why Edge Function:** Needs `PAYSTACK_SECRET_KEY` for HMAC verification. Cannot be done client-side.

```
Request:
  Headers: x-paystack-signature: <hmac-sha512>
  Body: { event: "charge.success", data: { reference, amount, customer, plan, subscription } }

Processing:
  1. Verify HMAC signature (timing-safe comparison)
  2. Check idempotency → query payments WHERE webhook_event_id = body.event
  3. If charge.success or subscription.create:
     a. Find user by email → user_profiles table
     b. Update user_profiles.plan = mapped_plan
     c. INSERT into payments table
  4. If subscription.not_renew or subscription.disable:
     a. Downgrade user to 'explorer'
  5. Return 200 { status: "ok" }

Response: { status: "ok" } | { status: "error", message: "..." }
```

### 4.2 `admin-operations`

**Purpose:** All admin CRUD operations. Uses service_role key to bypass RLS.

**Endpoint:** `POST /api/admin`

**Why Edge Function:** Needs `SUPABASE_SERVICE_ROLE_KEY`. Admin operations must bypass user-level RLS. Never expose service_role to browser.

```
Request:
  Headers: Authorization: Bearer <admin_jwt>
  Body: {
    operation: "create_scholarship" | "update_scholarship" | "delete_scholarship" |
              "publish_scholarship" | "bulk_import" |
              "update_user_plan" | "suspend_user" | "delete_user" |
              "approve_ingestion" | "reject_ingestion",
    data: { ... }
  }

Processing:
  1. Verify admin JWT (check user_profiles.role IN ('super_admin', 'content_manager', 'support_agent'))
  2. Check operation-specific permissions:
     - delete_scholarship, delete_user → super_admin only
     - bulk_import → super_admin, content_manager
     - approve_ingestion → super_admin, content_manager
     - update_user_plan → super_admin, support_agent
  3. Execute operation using service_role Supabase client
  4. Log to audit_logs table
  5. Return result

Response: { success: true, data: {...} } | { success: false, error: "..." }
```

### 4.3 `ai-essay`

**Purpose:** Proxy AI essay generation calls. Hides API key from client. Enforces rate limits.

**Endpoint:** `POST /api/ai/essay`

**Why Edge Function:** Needs `DEEPSEEK_API_KEY`. Rate limiting must be server-enforced (client-side limits can be bypassed).

```
Request:
  Headers: Authorization: Bearer <user_jwt>
  Body: {
    type: "personal_statement" | "sop" | "motivation_letter" | "leadership" | "study_plan",
    prompt: "...",
    scholarship_name: "...",
    stage: "draft" | "critique" | "polish",
    previous_content: "..."  // for critique/polish stages
  }

Processing:
  1. Verify user JWT
  2. Check rate limits:
     - Daily: 3 (explorer), 10 (plus), 25 (pro), 50 (mentor)
     - Per-minute: 8 requests (all plans)
  3. Build AI prompt based on type + stage
  4. Call OpenRouter API with DeepSeek model
  5. Save to essay_generations table
  6. Return generated content

Response: {
  content: "...",
  stage: "draft",
  remaining_today: 2
}
```

### 4.4 `ingest-scholarship`

**Purpose:** Endpoint for Zawadi Bot to submit found scholarships.

**Endpoint:** `POST /api/ingest`

**Why Edge Function:** Needs `INGEST_API_KEY` validation. Deduplication requires database query.

```
Request:
  Headers: x-ingest-key: <INGEST_API_KEY>
  Body: {
    scholarships: [{
      name, provider, host, country[], degree_levels[], fields[],
      funding_type, amount, deadline, description, eligibility,
      required_documents[], apply_url, source_url
    }]
  }

Processing:
  1. Verify INGEST_API_KEY
  2. For each scholarship:
     a. Validate: apply_url is direct (not aggregator), deadline is future
     b. Check dedup: SELECT FROM scholarships WHERE name ILIKE %name% AND host = host
     c. If duplicate → log to bot_ingestions with status='duplicate'
     d. If valid → INSERT with published=false
     e. Log to bot_ingestions with status='pending'
  3. Return summary

Response: {
  received: 12,
  accepted: 8,
  duplicates: 3,
  rejected: 1,
  rejected_reasons: [{ name: "...", reason: "aggregator_url" }]
}
```

### 4.5 `user-profile`

**Purpose:** Elevated profile operations (account deletion, data export, plan status).

**Endpoint:** `POST /api/me`

**Why Edge Function:** Account deletion requires cascade operations. Data export needs to aggregate across tables.

```
Request:
  Headers: Authorization: Bearer <user_jwt>
  Body: {
    operation: "get_profile" | "update_profile" | "delete_account" | "export_data"
  }

Processing:
  1. Verify user JWT
  2. Based on operation:
     get_profile: Query user_profiles + auth.users → return merged
     update_profile: Update user_profiles row
     delete_account: Delete auth.user (cascades to all tables)
     export_data: Aggregate all user data across tables → JSON
  3. Return result

Response: { success: true, data: {...} }
```

### 4.6 Edge Function Deployment

```bash
# Deploy all functions
supabase functions deploy paystack-webhook
supabase functions deploy admin-operations
supabase functions deploy ai-essay
supabase functions deploy ingest-scholarship
supabase functions deploy user-profile

# Set secrets
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...
supabase secrets set DEEPSEEK_API_KEY=sk-...
supabase secrets set INGEST_API_KEY=zawadi_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

---

## 5. Frontend: React SPA

### 5.1 Client-Side API Layer (`src/lib/api.js`)

This is the **single point of contact** between components and the backend. Every data operation flows through this module.

```js
// src/lib/api.js — THE API BOUNDARY
// Every component calls api(path, options) instead of supabase directly.
// This ensures consistent error handling, data normalization, and auth.

import { supabase } from '../config/supabase';
import { normalizeScholarships, normalizeUser, normalizeDocuments } from './normalize';
import { EDGE_FUNCTIONS_URL } from '../config/constants';

export async function api(path, options = {}) {
  const method = options.method || 'GET';
  const body = options.body;

  // ─── PUBLIC ROUTES (no auth) ───
  if (path === '/api/config') return getPublicConfig();
  if (path === '/api/health') return { status: 'ok' };

  // ─── AUTH ROUTES ───
  if (path === '/api/auth/signup') return handleSignUp(body);
  if (path === '/api/auth/signin') return handleSignIn(body);
  if (path === '/api/auth/signout') return handleSignOut();
  if (path === '/api/auth/reset-password') return handleResetPassword(body);

  // ─── AUTHENTICATED ROUTES ───
  // All routes below require a valid session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Authentication required', code: 401 };

  // ─── USER PROFILE ───
  if (path === '/api/me') return getUserProfile(user);

  // ─── SCHOLARSHIPS ───
  if (path === '/api/scholarships') return getScholarships(options.params);

  // ─── APPLICATIONS ───
  if (path === '/api/applications') {
    if (method === 'GET') return getApplications(user.id);
    if (method === 'POST') return upsertApplication(user.id, body);
    if (method === 'DELETE') return deleteApplication(user.id, body.id);
  }

  // ─── DOCUMENTS ───
  if (path === '/api/documents') {
    if (method === 'GET') return getDocuments(user.id);
    if (method === 'POST') return uploadDocument(user.id, body);
    if (method === 'DELETE') return deleteDocument(user.id, body.id);
  }

  // ─── ESSAYS (calls Edge Function) ───
  if (path === '/api/essays/generate') return generateEssay(user, body);
  if (path === '/api/essays/history') return getEssayHistory(user.id);

  // ─── PAYMENTS ───
  if (path === '/api/payments/initiate') return initiatePayment(user, body);
  if (path === '/api/payments/history') return getPaymentHistory(user.id);

  // ─── ADMIN ROUTES (calls Edge Function) ───
  if (path.startsWith('/api/admin')) return adminOperation(user, path, method, body);

  return { error: 'Unknown endpoint', code: 404 };
}
```

### 5.2 Routing (`src/config/routes.js`)

```js
// Public routes (no auth required)
<Route path="/" element={<LandingPage />} />
<Route path="/signin" element={<SignInPage />} />
<Route path="/signup" element={<SignUpPage />} />
<Route path="/forgot-password" element={<ForgotPassword />} />

// Authenticated routes (require login)
<Route element={<AuthGuard />}>
  <Route element={<AppShell />}>
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/scholarships" element={<ScholarshipsPage />} />
    <Route path="/scholarships/:id" element={<ScholarshipDetail />} />
    <Route path="/applications" element={<ApplicationsPage />} />
    <Route path="/documents" element={<DocumentsPage />} />
    <Route path="/essays" element={<EssaysPage />} />
    <Route path="/pricing" element={<PricingPage />} />
    <Route path="/profile" element={<ProfilePage />} />
  </Route>
</Route>

// 404
<Route path="*" element={<NotFoundPage />} />
```

### 5.3 Component State Requirements

Every data-fetching component MUST implement three states:

```jsx
function ScholarshipGrid() {
  const { data, loading, error } = useScholarships(filters);

  // 1. LOADING STATE
  if (loading) return <ScholarshipGridSkeleton />;

  // 2. ERROR STATE
  if (error) return (
    <ErrorState
      message="Couldn't load scholarships"
      detail="Check your connection and try again"
      onRetry={() => refetch()}
    />
  );

  // 3. EMPTY STATE
  if (!data || data.length === 0) return (
    <EmptyState
      icon={<Search />}
      title="No scholarships found"
      description="Try adjusting your filters or check back later"
      action={{ label: "Clear Filters", onClick: clearFilters }}
    />
  );

  // 4. DATA STATE
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map(scholarship => (
        <ScholarshipCard key={scholarship.id} scholarship={scholarship} />
      ))}
    </div>
  );
}
```

---

## 6. Database: PostgreSQL Schema

See `12_SUPABASE_SCHEMA.md` for the complete migration SQL. Key design decisions:

| Table | Purpose | Key Design |
|---|---|---|
| `scholarships` | Verified scholarship listings | `published` boolean — admin gates visibility |
| `user_profiles` | Extended user data | Auto-created by trigger on `auth.users` INSERT |
| `applications` | User's tracked applications | UNIQUE(user_id, scholarship_id) — one per user per scholarship |
| `documents` | Upload metadata | Links to Storage; type enum for categorization |
| `essay_generations` | Essay history | Tracks 3-stage pipeline progress |
| `payments` | Payment records | Paystack reference + webhook_event_id for idempotency |
| `bot_ingestions` | Bot activity log | UNIQUE(name, host) for dedup; status tracking |
| `audit_logs` | Admin action trail | JSONB details; IP tracking |

### Critical RLS Policies

```sql
-- Scholarships: Public reads published; service_role writes
CREATE POLICY "Public read published" ON scholarships
  FOR SELECT USING (published = true);

-- Applications: Users see only their own
CREATE POLICY "Users own applications" ON applications
  FOR ALL USING (auth.uid() = user_id);

-- Documents: Users see only their own
CREATE POLICY "Users own documents" ON documents
  FOR ALL USING (auth.uid() = user_id);

-- Storage: Users access only their folder
CREATE POLICY "Users own storage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 7. Authentication & Authorization

### 7.1 Auth Flow

```
Sign Up:
  1. User submits: name, email, country, password (≥8 chars)
  2. Client: supabase.auth.signUp({ email, password, options: { data: { name, country } } })
  3. Supabase: Creates auth.users row → trigger creates user_profiles row
  4. Client: Receives { data: { user, session } }
  5. Store user directly (NO second getUser() call — v1 lesson)
  6. Redirect to dashboard

Sign In:
  1. User submits: email, password
  2. Client: supabase.auth.signInWithPassword({ email, password })
  3. Client: Use data.user directly — do NOT call getUser()
  4. Redirect to dashboard

Session:
  - Supabase manages JWT + refresh tokens
  - onAuthStateChange listener updates React context
  - AuthGuard component checks session before rendering protected routes
```

### 7.2 User Roles

| Role | Access Level | Who Gets It |
|---|---|---|
| `user` (default) | Own data only | Every registered user |
| `support_agent` | Read all users, update plans | Support team |
| `content_manager` | CRUD scholarships, manage bot queue, bulk import | Content team |
| `super_admin` | Everything — including delete users, delete scholarships | Techsari leads |

### 7.3 Admin Authentication

Admins log in at `/admin` with Supabase Auth (same auth system). Their `user_profiles.role` determines permissions:

```js
// Admin route guard
function AdminGuard({ children, requiredRole }) {
  const { user, profile, loading } = useAdminAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/admin/login" />;

  const roleLevels = { super_admin: 3, content_manager: 2, support_agent: 1, user: 0 };
  if (roleLevels[profile.role] < roleLevels[requiredRole]) {
    return <AccessDenied required={requiredRole} current={profile.role} />;
  }

  return children;
}
```

---

## 8. API Layer: Complete Reference

### 8.1 Public Endpoints (No Auth)

| Method | Path | Returns | Source |
|---|---|---|---|
| GET | `/api/config` | Supabase config, pricing plans, countries | Client-side |
| GET | `/api/health` | `{ status: "ok" }` | Client-side |
| POST | `/api/auth/signup` | `{ user, session }` | Supabase Auth |
| POST | `/api/auth/signin` | `{ user, session }` | Supabase Auth |
| POST | `/api/auth/signout` | `{ success: true }` | Supabase Auth |
| POST | `/api/auth/reset-password` | `{ success: true }` | Supabase Auth |

### 8.2 Authenticated User Endpoints

| Method | Path | Returns | Source |
|---|---|---|---|
| GET | `/api/me` | `{ user: { id, email, name, country, plan, ... } }` | Edge Function |
| GET | `/api/scholarships?country=&degree=&field=` | `{ scholarships: [...], stats: {...} }` | Supabase DB |
| GET | `/api/applications` | `{ applications: [...] }` | Supabase DB |
| POST | `/api/applications` | `{ application: {...} }` | Supabase DB |
| DELETE | `/api/applications` | `{ success: true }` | Supabase DB |
| GET | `/api/documents` | `{ documents: [...] }` | Supabase DB |
| POST | `/api/documents` | `{ document: {...} }` | Supabase Storage + DB |
| DELETE | `/api/documents` | `{ success: true }` | Supabase Storage + DB |
| POST | `/api/essays/generate` | `{ content, stage, remaining_today }` | Edge Function |
| GET | `/api/essays/history` | `{ essays: [...] }` | Supabase DB |
| POST | `/api/payments/initiate` | `{ paystack_url }` | Paystack |
| GET | `/api/payments/history` | `{ payments: [...] }` | Supabase DB |

### 8.3 Admin Endpoints (All via Edge Function)

| Method | Path | Required Role | Description |
|---|---|---|---|
| POST | `/api/admin/scholarships/create` | content_manager | Create scholarship |
| POST | `/api/admin/scholarships/update` | content_manager | Update scholarship |
| POST | `/api/admin/scholarships/delete` | super_admin | Delete scholarship |
| POST | `/api/admin/scholarships/publish` | content_manager | Toggle published |
| POST | `/api/admin/scholarships/bulk-import` | content_manager | Bulk CSV/JSON import |
| POST | `/api/admin/ingestions/approve` | content_manager | Approve bot find |
| POST | `/api/admin/ingestions/reject` | content_manager | Reject bot find |
| POST | `/api/admin/users/list` | support_agent | List all users |
| POST | `/api/admin/users/update-plan` | support_agent | Change user plan |
| POST | `/api/admin/users/suspend` | super_admin | Suspend account |
| POST | `/api/admin/users/delete` | super_admin | Delete account |
| POST | `/api/admin/audit/list` | super_admin | View audit logs |
| POST | `/api/admin/stats` | support_agent | Platform statistics |

### 8.4 Webhook Endpoint

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/paystack-webhook` | HMAC SHA-512 | Paystack event processing |

### 8.5 Bot Endpoint

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/ingest` | `x-ingest-key` header | Submit found scholarships |

---

## 9. Data Flows

### 9.1 Scholarship Lifecycle

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  ZAWADI BOT  │     │  ADMIN QUEUE │     │  LIVE SITE   │     │  ARCHIVE     │
│  (Hermes)    │     │  (Review)    │     │  (Published) │     │  (Expired)   │
├──────────────┤     ├──────────────┤     ├──────────────┤     ├──────────────┤
│              │     │              │     │              │     │              │
│ 1. Hunt      │     │ 3. Review    │     │ 5. Students  │     │ 7. Deadline  │
│    Daily 9AM  │────▶│    Admin     │────▶│    browse,   │────▶│    passes →  │
│    EAT        │     │    checks:   │     │    filter,   │     │    unpublish │
│              │     │    - Link    │     │    apply     │     │              │
│ 2. POST to   │     │    - Date    │     │              │     │              │
│    /api/ingest│     │    - Eligibility│  │              │     │              │
│    status:    │     │              │     │ 6. Tracked   │     │              │
│    pending    │     │ 4. Approve → │     │    in app    │     │              │
│              │     │    published  │     │    tracker   │     │              │
│              │     │    = true     │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 9.2 User Application Flow

```
User browses scholarships (published=true, RLS allows public read)
  │
  ├─ Views details (match score, urgency, docs needed)
  │
  ├─ Clicks "Save" → UPSERT applications (user_id, scholarship_id)
  │    Status: "saved"
  │
  ├─ Works on application → Status: "drafting"
  │
  ├─ Generates essay (Edge Function → AI → essay_generations table)
  │
  ├─ Uploads documents (Supabase Storage → documents table)
  │
  ├─ Ready to submit → Status: "ready"
  │
  ├─ Submits externally → Clicks "Apply Now" (new tab, official URL)
  │    Toggles applied=true, Status: "applied"
  │
  ├─ Gets interview → Status: "interview"
  │
  ├─ Gets awarded → Status: "awarded" 🎉
  │
  └─ Gets rejected → Status: "rejected" → can archive
```

### 9.3 Payment Flow

```
User hits limit (e.g., 4th essay) → UpgradeModal shown
  │
  ├─ Views Pricing Page → Selects plan
  │
  ├─ Clicks "Upgrade" → api('/api/payments/initiate')
  │    Client creates Paystack transaction
  │
  ├─ Paystack popup → User pays (card, M-Pesa, bank)
  │
  ├─ Paystack sends webhook → POST /api/paystack-webhook (Edge Function)
  │    1. Verify HMAC signature
  │    2. Check idempotency (webhook_event_id)
  │    3. Update user_profiles.plan
  │    4. INSERT into payments
  │
  └─ Client polls /api/me until plan updates → Shows "Activated!" 🎉
```

---

## 10. Deployment

### 10.1 Vercel (Frontend)

```json
// vercel.json
{
  "version": 2,
  "routes": [
    { "src": "/privacy", "dest": "/privacy.html" },
    { "src": "/terms", "dest": "/terms.html" },
    { "src": "/faq", "dest": "/faq.html" },
    { "src": "/about", "dest": "/about.html" },
    { "src": "/contact", "dest": "/contact.html" },
    { "handle": "filesystem" },
    { "src": "/assets/(.*)", "dest": "/assets/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

```bash
# Build & Deploy
npm run build        # vite build → dist/
git push origin main # Vercel auto-deploys
```

### 10.2 Supabase (Backend)

```bash
# Deploy Edge Functions
supabase functions deploy paystack-webhook
supabase functions deploy admin-operations
supabase functions deploy ai-essay
supabase functions deploy ingest-scholarship
supabase functions deploy user-profile

# Set secrets
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...
supabase secrets set DEEPSEEK_API_KEY=sk-...
supabase secrets set INGEST_API_KEY=zawadi_...

# Run database migration
# Copy 12_SUPABASE_SCHEMA.md SQL → Supabase SQL Editor → Execute
```

### 10.3 Zawadi Bot (Hermes Cron)

```bash
# Schedule via Hermes
cronjob create \
  --name "Zawadi Bot — Daily Hunt" \
  --schedule "0 9 * * *" \
  --prompt "Hunt for new African scholarships..." \
  --skill scholarship-scout \
  --deliver telegram
```

---

## 11. Environment Variables

### Frontend (.env — VITE_ prefixed only)

```env
VITE_SUPABASE_URL=https://efvxtcxhjlbzzsixfrvo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...
VITE_EDGE_FUNCTIONS_URL=https://efvxtcxhjlbzzsixfrvo.supabase.co/functions/v1
```

### Backend (Supabase Secrets — never in client)

```env
SUPABASE_SERVICE_ROLE_KEY=eyJh...
PAYSTACK_SECRET_KEY=sk_live_...
DEEPSEEK_API_KEY=sk-...
INGEST_API_KEY=zawadi_aea7f39282771f497d46303943a909e24677d76b12fac43d
```

---

## 12. Scaling Strategy

| Users | Infrastructure | Monthly Cost |
|---|---|---|
| 0–1,000 | Supabase Free + Vercel Free | $0 |
| 1,000–10,000 | Supabase Pro ($25) + Vercel Pro ($20) | ~$45 |
| 10,000–50,000 | Supabase Team ($599) + Vercel Pro | ~$620 |
| 50,000+ | Supabase Enterprise + dedicated | Custom |

### Performance Optimizations
- GIN indexes on array columns (`country`, `degree_levels`, `fields`)
- B-tree indexes on foreign keys and filter columns
- Client-side scholarship list caching (refresh every 5 min)
- Code-split admin panel, essay generator, auto-apply
- Skeleton loaders for perceived performance

---

## 13. Monitoring & Observability

| What | How |
|---|---|
| API errors | Supabase Edge Function logs |
| Auth failures | Supabase Auth logs |
| Payment webhooks | Paystack Dashboard |
| Bot ingestion status | `bot_ingestions` table query |
| Frontend errors | Vercel Analytics + custom error boundary |
| Database performance | Supabase Dashboard → Query Performance |
| Uptime | Vercel + Supabase status pages |

---

*Architecture document provides everything a developer needs to understand the system, set up their environment, and start building. For implementation order, see `07_CHECKPOINTS.md`.*
