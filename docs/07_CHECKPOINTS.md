# Techsari-Zawadi — Developer-Buildable Implementation Checkpoints

**Document Version:** 1.0 (Greenfield)
**Date:** May 27, 2026
**Audience:** Developer — work through this document linearly to build the entire platform

---

## How To Use This Document

1. Start at Phase 0. Complete every gate before moving to the next phase.
2. Each gate has: **what to build**, **exact files**, **verification command**, **expected result**.
3. Commit after each phase: `git add . && git commit -m "Phase N: description"`
4. Read `13_LESSONS_LEARNED.md` before starting — it catalogs every v1 mistake.

---

## Phase 0: Project Scaffold

### Gate 0.1 — Create Vite + React Project

```bash
cd C:\Users\samka\Downloads\HermesProjects
mkdir Zawadi-v2 && cd Zawadi-v2
npm create vite@latest . -- --template react
npm install
```

**Verify:** `npm run dev` → opens browser at localhost:5173

### Gate 0.2 — Install Dependencies

```bash
npm install @supabase/supabase-js react-router-dom lucide-react
npm install -D tailwindcss @tailwindcss/vite
```

**Verify:** `ls node_modules/@supabase/supabase-js` → exists

### Gate 0.3 — Configure Tailwind CSS

**File:** `src/index.css`
```css
@import "tailwindcss";
```

**File:** `vite.config.js`
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

**Verify:** Add `<h1 class="text-3xl font-bold text-green-800">Zawadi</h1>` to App.jsx → green text in browser

### Gate 0.4 — Supabase Client

**File:** `.env`
```env
VITE_SUPABASE_URL=https://efvxtcxhjlbzzsixfrvo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdnh0Y3hoamxienpzaXhmcnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjE0MTIsImV4cCI6MjA5NTAzNzQxMn0.irDvr2saErnDcWl6FBB30Cd3OEO2iHCwbiwc4YZcjkQ
```

**File:** `src/config/supabase.js`
```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**Verify:** `npm run build` → no errors. `VITE_` vars are resolved.

### Gate 0.5 — Git & Vercel Setup

```bash
git init
git add .
git commit -m "Phase 0: Project scaffold"
# Push to GitHub (create repo first)
git remote add origin https://github.com/Ml-gur/zawadi.git
git push -u origin main
```

**File:** `vercel.json`
```json
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

**File:** `.gitignore` — ensure `dist/`, `node_modules/`, `.env` are ignored

**Verify:** Push to GitHub → Vercel auto-deploys → visit the URL → app loads

### Gate 0.6 — Create Project Folder Structure

Create all directories from the Architecture document's project structure (Section 3):

```bash
mkdir -p src/{config,context,hooks,lib,components/{ui,layout,auth,scholarships,applications,documents,essays,payments,landing},pages,styles}
mkdir -p admin/{config,context,components,styles}
mkdir -p public
mkdir -p supabase/{migrations,functions/{paystack-webhook,admin-operations,ai-essay,ingest-scholarship,user-profile}}
```

**Verify:** `find . -type d | wc -l` → ~40+ directories

---

## Phase 1: Database & Backend

### Gate 1.1 — Run Migration SQL

**Action:** Open Supabase Dashboard → SQL Editor → Paste content of `docs/12_SUPABASE_SCHEMA.md` → Execute

**Verify:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: scholarships, user_profiles, applications, documents, essay_generations, payments, bot_ingestions, audit_logs
```

### Gate 1.2 — Verify RLS Policies

```sql
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
-- Expected: 12+ policies across all tables
```

### Gate 1.3 — Verify Auto-Profile Trigger

**Test:** Sign up a user via Supabase Dashboard → Auth → Users → Add User
**Query:** `SELECT * FROM user_profiles WHERE id = '<new-user-id>';`
**Expected:** One row with name and country from metadata

### Gate 1.4 — Deploy Edge Functions

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref efvxtcxhjlbzzsixfrvo

# Set secrets
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...
supabase secrets set DEEPSEEK_API_KEY=sk-...
supabase secrets set INGEST_API_KEY=zawadi_aea7f39282771f497d46303943a909e24677d76b12fac43d
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<from-dashboard>

# Deploy
supabase functions deploy paystack-webhook
supabase functions deploy admin-operations
supabase functions deploy ai-essay
supabase functions deploy ingest-scholarship
supabase functions deploy user-profile
```

**Verify:** `supabase functions list` → 5 functions deployed

### Gate 1.5 — Create Admin User

**Action:** Register at `techsari.online` with `admin@zawadi.app`
**SQL:**
```sql
UPDATE user_profiles SET role = 'super_admin' WHERE email = 'admin@zawadi.app';
```

**Verify:** `SELECT email, role FROM user_profiles WHERE role = 'super_admin';` → 1 row

---

## Phase 2: Authentication

### Gate 2.1 — AuthContext

**File:** `src/context/AuthContext.jsx`

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user);
      else setProfile(null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(authUser) {
    try {
      const { data } = await supabase.from('user_profiles')
        .select('*').eq('id', authUser.id).maybeSingle();
      setProfile(data || { name: authUser.user_metadata?.name, country: authUser.user_metadata?.country });
    } catch { setProfile({}); }
  }

  // CRITICAL v1 FIX: use data.user directly, NO second getUser() call
  async function signUp(email, password, name, country) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, country } }
    });
    if (error) throw error;
    // data.user is available immediately — use it directly
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

**Verify:** Wrap App in `<AuthProvider>`. No console errors. `useAuth()` returns context.

### Gate 2.2 — SignUp Form

**File:** `src/components/auth/SignUpForm.jsx`
- Fields: Name, Email, Country (dropdown, all 54 African countries), Password (≥8 chars), Confirm Password
- Validation: password match, min length, email format
- On submit: `signUp(email, password, name, country)` → redirect to /dashboard

**Verify:** Fill form → submit → redirected to dashboard (auto-logged in)

### Gate 2.3 — SignIn Form

**File:** `src/components/auth/SignInForm.jsx`
- Fields: Email, Password
- Error: "Invalid email or password" (no user enumeration — same message for wrong email AND wrong password)
- On submit: `signIn(email, password)` → redirect to /dashboard

**Verify:** Sign in with correct credentials → dashboard. Sign in with wrong password → error message.

### Gate 2.4 — AuthGuard (Protected Routes)

**File:** `src/components/auth/AuthGuard.jsx`
```jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui/Spinner';

export function AuthGuard() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/signin" />;
  return <Outlet />;
}
```

**Verify:** Visit /dashboard while logged out → redirected to /signin

### Gate 2.5 — Router Setup

**File:** `src/App.jsx` — Set up all routes per Architecture Section 5.2

**Verify:** All routes render correct components. 404 page for unknown routes.

### Gate 2.6 — Sign Out

**File:** Add signOut button to sidebar/header → calls `signOut()` → redirects to /

**Verify:** Sign in → click sign out → redirected to landing → can't access /dashboard

---

## Phase 3: Core Layout

### Gate 3.1 — AppShell (Authenticated Layout)

**File:** `src/components/layout/AppShell.jsx`
- Sidebar (desktop) + hamburger (mobile) + main content area
- Sidebar nav items: Dashboard, Scholarships, Applications, Documents, Essays, Pricing, Profile
- Active route highlighted
- User name + plan badge at bottom of sidebar

**Verify:** Log in → sidebar visible → click items → routes change → active item highlighted

### Gate 3.2 — Mobile Navigation

**File:** `src/components/layout/MobileNav.jsx`
- Bottom nav bar on mobile (<768px): Dashboard, Scholarships, Applications, More (menu)
- Hidden on desktop

**Verify:** Resize to 375px width → bottom nav appears → sidebar collapses to hamburger

### Gate 3.3 — Header & Footer (Public)

**File:** `src/components/layout/Header.jsx` — Logo, nav links (Features, Pricing, FAQ), Sign In button
**File:** `src/components/layout/Footer.jsx` — Links: Privacy, Terms, FAQ, About, Contact. Copyright.

**Verify:** Landing page shows header and footer. All links work.

---

## Phase 4: Scholarship Database

### Gate 4.1 — API Layer (Critical)

**File:** `src/lib/api.js` — Build the client-side API router per Architecture Section 5.1

Include the `/api/scholarships` handler:
```js
if (path === '/api/scholarships') {
  const { data } = await supabase.from('scholarships')
    .select('*').eq('published', true)
    .order('deadline', { ascending: true });

  // CRITICAL: Normalize ALL rows before returning
  return {
    scholarships: normalizeScholarships(data || []),
    stats: computeStats(data || [])
  };
}
```

### Gate 4.2 — Normalization (Critical v1 Fix)

**File:** `src/lib/normalize.js`
```js
export function normalizeScholarships(rows) {
  return rows.map(row => ({
    ...row,
    application: row.application || {
      applied: false, status: 'Not started', priority: 'Normal', notes: ''
    },
    match: row.match || {
      score: 0, urgency: { tone: 'normal', label: 'Normal' },
      reasons: [], missingDocuments: []
    }
  }));
}
```

**Verify:** Even if Supabase returns flat rows without application/match, components don't crash.

### Gate 4.3 — Scholarship Grid

**File:** `src/components/scholarships/ScholarshipGrid.jsx`
- Fetch from `api('/api/scholarships')`
- Display as responsive grid (1 col mobile, 2 cols tablet, 3 cols desktop)
- **Loading state:** Skeleton cards (3-6 gray rectangles)
- **Error state:** "Couldn't load scholarships" with retry button
- **Empty state:** "No scholarships match your filters" with clear filters button

### Gate 4.4 — Scholarship Card

**File:** `src/components/scholarships/ScholarshipCard.jsx`
- Shows: name, provider, amount, countries (flags/badges), deadline with urgency indicator
- Match score bar (0-100%)
- "Save" button → POST /api/applications
- "Apply Now" → opens apply_url in new tab

### Gate 4.5 — Filters & Search

**File:** `src/components/scholarships/ScholarshipFilters.jsx`
- Country dropdown (multi-select)
- Degree level: Bachelors, Masters, PhD
- Field of study: STEM, Humanities, Business, Medicine, Law, etc.
- Funding type: Full, Partial, Tuition-only
- Keyword search (name, provider, field)
- "Clear Filters" button

**Verify:** Select "Kenya" → only Kenya-eligible scholarships shown. Select "Masters" → further filtered.

### Gate 4.6 — Match Scoring

**File:** `src/lib/match.js`
- Compare user profile (country, degree_level, field_of_study, study_country_preference) against scholarship requirements
- Score 0-100%
- Display on each card

**Verify:** Update profile → match scores recalculate

### Gate 4.7 — Urgency Badges

**File:** `src/lib/urgency.js` + `src/components/scholarships/UrgencyBadge.jsx`
- 🔴 < 14 days until deadline → "Urgent"
- 🟡 < 30 days → "Approaching"
- 🟢 > 90 days → "Open"
- 🔵 Rolling deadline → "Rolling"

---

## Phase 5: Application Tracking

### Gate 5.1 — Application Tracker

**File:** `src/components/applications/ApplicationTracker.jsx`
- Fetch from `api('/api/applications')`
- Display as sortable list/table
- **Loading:** Skeleton rows
- **Error:** "Couldn't load applications" + retry
- **Empty:** "No tracked applications yet" → CTA to browse scholarships

### Gate 5.2 — Application Row

**File:** `src/components/applications/ApplicationRow.jsx`
- Scholarship name (clickable → detail)
- Status dropdown: Not Started, Saved, Drafting, Ready, Applied, Interview, Awarded, Rejected, Archived
- Priority selector: High (orange), Normal (gray), Low (blue)
- Applied toggle checkbox
- Notes field (expandable)
- "Apply Now" link

### Gate 5.3 — Stats Bar

**File:** `src/components/applications/StatsBar.jsx`
- Total scholarships | Applied | Drafting | Urgent (<14d) | Strong Matches (>80%)

**Verify:** Change application statuses → stats update immediately

### Gate 5.4 — Document Gap Analysis

**File:** `src/components/documents/DocumentGapList.jsx`
- For top 3 matched scholarships, show which required documents the user is missing
- Compare `scholarship.required_documents` against user's `documents[].type`

---

## Phase 6: Document Vault

### Gate 6.1 — Document Upload

**File:** `src/components/documents/DocumentUpload.jsx`
- File input (PDF, DOCX, JPG, PNG, TXT, max 10MB)
- Type dropdown: CV, Resume, Transcript, Certificate, SOP, References, Passport, Financial Evidence, Admission Letter, Essay, Other
- Upload: `supabase.storage.from('documents').upload(path, file)` → INSERT into documents table
- **Loading:** Progress bar during upload
- **Error:** "Upload failed — file may be too large or wrong format"

### Gate 6.2 — Document Vault List

**File:** `src/components/documents/DocumentVault.jsx`
- Fetch from `api('/api/documents')`
- Show: document name, type badge, size, upload date, delete button
- **Empty:** "No documents yet" → CTA to upload

### Gate 6.3 — Tier Limit Enforcement

**Verify:** Upload 6th document on free tier → error from database trigger (server-side enforcement)

---

## Phase 7: AI Essay Generator

### Gate 7.1 — Essay Generator UI

**File:** `src/components/essays/EssayGenerator.jsx`
- 3-tab interface: Draft | Critique | Polish
- Essay type selector (5 types)
- Prompt textarea
- Scholarship context (name, requirements)

### Gate 7.2 — Edge Function Integration

**File:** `src/hooks/useEssays.js`
```js
async function generateEssay(type, prompt, scholarshipName, stage) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${EDGE_FUNCTIONS_URL}/ai-essay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ type, prompt, scholarship_name: scholarshipName, stage })
  });
  return res.json();
}
```

### Gate 7.3 — Three-Stage Pipeline

1. **Draft:** Generate initial essay → show in editor → "Continue to Critique"
2. **Critique:** AI reviews draft → shows critique + rewritten version → "Accept Rewrite"
3. **Polish:** AI polishes language → final version → Copy / Save as Document

### Gate 7.4 — Essay History

**File:** `src/components/essays/EssayHistory.jsx`
- Fetch from `api('/api/essays/history')`
- List of past generations with type, date, scholarship

---

## Phase 8: Payments

### Gate 8.1 — Pricing Page

**File:** `src/components/payments/PricingPage.jsx`
- 4 plan cards: Explorer (free), Scholar Plus ($5/mo), App Pro ($12/mo), Mentor ($29/mo)
- Monthly/Annual toggle
- Feature comparison list per plan
- USD + KES prices

### Gate 8.2 — Paystack Integration

**File:** `src/hooks/usePayments.js`
- Initialize Paystack transaction with plan code
- Open Paystack popup
- Handle callback

### Gate 8.3 — Upgrade Modal

**File:** `src/components/payments/UpgradeModal.jsx`
- Shown when user hits a tier limit
- Shows current plan, what they hit, what upgrading gives them
- CTA to pricing page

### Gate 8.4 — Webhook Verification

**Test:** Use Paystack test webhook → verify plan updates in database

---

## Phase 9: Admin Panel

### Gate 9.1 — Admin Entry Point

**File:** `admin/index.html` — Separate Vite entry
**File:** `admin/main.jsx` — Admin app bootstrap
**File:** `vite.config.js` — Add admin to build:
```js
build: {
  rollupOptions: {
    input: {
      main: resolve(__dirname, 'index.html'),
      admin: resolve(__dirname, 'admin/index.html')
    }
  }
}
```

### Gate 9.2 — Admin Auth

**File:** `admin/context/AdminAuthContext.jsx`
- Separate auth flow from main app
- Check `user_profiles.role` — must be 'super_admin', 'content_manager', or 'support_agent'
- Redirect to /admin/login if not authenticated

### Gate 9.3 — Admin Dashboard

**File:** `admin/components/AdminDashboard.jsx`
- Total scholarships (published / pending)
- Total users
- Active subscriptions
- Monthly revenue
- Recent bot ingestions waiting review

### Gate 9.4 — Scholarship Manager

**File:** `admin/components/ScholarshipManager.jsx`
- Table of all scholarships (published + unpublished)
- Add new (form), Edit (inline), Delete (super_admin only), Publish/Unpublish toggle
- Bulk import (JSON upload)

### Gate 9.5 — Bot Ingestion Queue

**File:** `admin/components/IngestionQueue.jsx`
- List of pending bot submissions
- Review: view details, verify link, check eligibility
- Approve → published=true
- Reject → mark status, add notes
- Mark duplicate

### Gate 9.6 — User Management

**File:** `admin/components/UserManager.jsx`
- Searchable table: name, email, country, plan, join date
- View detail: profile, applications count, documents count
- Update plan (dropdown)
- Suspend/Delete (super_admin only)

### Gate 9.7 — Audit Logs

**File:** `admin/components/AuditLogViewer.jsx`
- Filterable by admin, action, date
- Shows: timestamp, admin, action, target, details

### Gate 9.8 — Role-Based UI

- super_admin: sees all tabs
- content_manager: sees Dashboard, Scholarships, Bot Queue, Stats
- support_agent: sees Dashboard, Users, Subscriptions, Stats

---

## Phase 10: Public Pages

### Gate 10.0 — Install Marked (MD→HTML Converter)

```bash
npm install marked
```

### Gate 10.1 — Source Content as Markdown (Codex Can Read)

The public pages live as `.md` files in `docs/`. Codex can read these. During build, a script converts them to `.html` in `public/`:

| Source (.md) | Output (.html) | URL |
|---|---|---|
| `docs/08_PRIVACY_POLICY.md` | `public/privacy.html` | `/privacy` |
| `docs/09_TERMS_OF_SERVICE.md` | `public/terms.html` | `/terms` |
| `docs/10_FAQ.md` | `public/faq.html` | `/faq` |
| `docs/14_ABOUT.md` | `public/about.html` | `/about` |
| `docs/15_CONTACT.md` | `public/contact.html` | `/contact` |

**Verify:** Read the source files from `docs/` (they're `.md`, Codex can read them). The build script at `scripts/build-public-pages.js` handles conversion.

### Gate 10.2 — Build Script

Add to `package.json`:
```json
"scripts": {
  "build:public": "node scripts/build-public-pages.js",
  "build": "npm run build:public && vite build"
}
```

**Verify:** `npm run build:public` → creates all 5 `.html` files in `public/`

### Gate 10.3 — Vercel Routes

Already configured in `vercel.json` (Phase 0.6). Each `/privacy`, `/terms`, `/faq`, `/about`, `/contact` route maps to its `.html` file.

**Verify:** `npm run build` → deploy → visit `/privacy` → page loads without JavaScript

---

## Phase 11: Landing Page

### Gate 11.1 — Hero Section

**File:** `src/components/landing/HeroSection.jsx`
- Mission statement: "Your scholarship journey, from discovery to acceptance — all in one place."
- Subtitle: "AI-powered scholarship matching built for African students"
- CTA: "Get Started" (→ /signup) and "Browse Scholarships" (→ /signin or /dashboard)

### Gate 11.2 — Feature Highlights

**File:** `src/components/landing/FeaturesSection.jsx`
- 4-6 cards: Discovery, AI Matching, Essay Generator, Application Tracker, Document Vault, Auto-Apply
- Icons (Lucide) + short description

### Gate 11.3 — Pricing Section

**File:** `src/components/landing/PricingSection.jsx`
- Reuse PricingPage component or inline 4 plan cards
- Monthly/Annual toggle
- CTA per plan

### Gate 11.4 — Competitive Comparison

**File:** `src/components/landing/ComparisonSection.jsx`
- Table: Zawadi vs Scholars4Dev vs Bold.org vs After School Africa
- Feature rows with checkmarks

---

## Phase 12: Production Hardening

### Gate 12.1 — Security Headers

Add to `vercel.json`:
```json
"headers": [
  { "source": "/(.*)", "headers": [
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "X-Frame-Options", "value": "DENY" },
    { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
    { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
  ]}
]
```

### Gate 12.2 — Code Splitting

Lazy-load heavy routes:
```jsx
const EssaysPage = lazy(() => import('./pages/EssaysPage'));
const AdminApp = lazy(() => import('../admin/App'));
```

### Gate 12.3 — PWA

Install `vite-plugin-pwa` and configure manifest + service worker.

### Gate 12.4 — Error Boundary

**File:** `src/components/ErrorBoundary.jsx`
- Catches React render errors
- Shows friendly error page with "Reload" button
- Logs error details to console (not to user)

### Gate 12.5 — Accessibility Audit

- Run axe DevTools on all pages
- Fix all critical and serious violations
- Verify keyboard navigation works on all interactive elements

---

## Phase 13: Testing

### Gate 13.1 — Auth Flow Test
- Register new user → auto-login → dashboard loads
- Logout → redirected to landing
- Login → dashboard with existing data
- Wrong password → error message
- <8 char password → validation error
- Existing email → "account already exists"

### Gate 13.2 — Scholarship Flow Test
- Browse → filter by country → results update
- Save scholarship → appears in tracker
- Change status → stats update
- Click "Apply Now" → opens correct URL in new tab

### Gate 13.3 — Payment Flow Test
- Free user hits essay limit → upgrade modal shown
- Click upgrade → pricing page
- Select plan → Paystack popup
- Complete payment → plan updates

### Gate 13.4 — Admin Flow Test
- Login at /admin with admin credentials
- Dashboard loads with metrics
- Add scholarship → appears in user-facing grid after publish
- Review bot ingestion → approve → appears live
- Change user plan → reflected in user's profile

### Gate 13.5 — Mobile Test
- Resize to 375px → all pages work
- Touch targets ≥ 44px
- No horizontal scroll
- Bottom nav works

### Gate 13.6 — Performance Test
- Lighthouse score ≥ 90 (Performance, Accessibility, Best Practices, SEO)
- Main bundle <300KB gzipped
- First contentful paint <2s on 3G

---

## Phase 14: Launch

### Gate 14.1 — Pre-Launch Verification
- [ ] All 13 phases complete
- [ ] RLS policies verified on production Supabase
- [ ] Edge Functions deployed and tested
- [ ] Privacy Policy, Terms, FAQ live at their URLs
- [ ] 50+ verified scholarships in database
- [ ] Paystack live mode tested (one real subscription)
- [ ] Admin credentials working
- [ ] Custom domain (www.techsari.online) configured
- [ ] HTTPS enforced
- [ ] All footer links working (no 404s)
- [ ] Mobile responsive
- [ ] No console errors in production build

### Gate 14.2 — Bot Cron Job
```bash
# Schedule via Hermes
cronjob create \
  --name "Zawadi Bot — Daily Scholarship Hunt" \
  --schedule "0 9 * * *" \
  --prompt "Search for new scholarships for African students..." \
  --skill scholarship-scout \
  --deliver telegram
```

### Gate 14.3 — Monitoring
- [ ] Vercel Analytics enabled
- [ ] Supabase Dashboard monitoring configured
- [ ] Paystack webhook health monitoring

### Gate 14.4 — Launch 🚀
- [ ] Final git push → Vercel auto-deploy
- [ ] Verify production URL loads
- [ ] Run through all acceptance tests on production
- [ ] Announce launch

---

*Checkpoints document provides a linear, executable path from zero to production. A developer with this document, the Architecture doc, and the Schema doc can build the entire platform.*
