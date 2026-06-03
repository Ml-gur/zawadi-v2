# Zawadi v2 — Lessons Learned from v1

**Document Version:** 4.0 (Complete Reference)
**Date:** May 27, 2026
**Author:** Techsari Product Team
**Status:** Active — **MUST READ before any code is written**

---

> **READ THIS FIRST.** Every issue documented here was discovered the hard way — through hours of debugging, failed deployments, and user-facing crashes. The v2 architecture exists specifically to prevent every single one of these failures. If you find yourself writing code that resembles any v1 pattern below, **stop**. You are about to reintroduce a known bug.

---

## Table of Contents

1. [A. Architecture Mistakes](#a-architecture-mistakes)
2. [B. Authentication Bugs](#b-authentication-bugs)
3. [C. Data Shape Crashes](#c-data-shape-crashes)
4. [D. React State Issues](#d-react-state-issues)
5. [E. Environment Variables](#e-environment-variables)
6. [F. Deployment](#f-deployment)
7. [G. Payments](#g-payments)
8. [H. UI/UX](#h-uiux)
9. [I. Admin Panel](#i-admin-panel)
10. [J. Documentation](#j-documentation)
11. [K. Bot Ingestion](#k-bot-ingestion)

---

## A. Architecture Mistakes

### A1. Express.js on Vercel Serverless Functions

**Symptom:** API endpoints returned 404 in production. `DOMMatrix is not defined` errors at runtime. `pdf-parse` and `mammoth` packages failed with CJS/ESM `createRequire` errors.

**Root Cause:** Vercel serverless functions are not Express servers. They run in a cold-start, single-invocation model. The v1 approach wrapped an entire Express app (`api/src/server.js`) inside a single Vercel function entry point — meaning every request had to cold-start Express before routing. Browser-only packages (`DOMMatrix`) were bundled into the server bundle because no proper exclusion was defined. `pdf-parse`/`mammoth` (CommonJS) conflicted with the project's ESM module system.

**v2 Solution:** **No backend server at all.** The React SPA talks directly to Supabase from the browser using the `@supabase/supabase-js` client anon key. Server-side logic that requires secrets (Paystack webhooks, AI API keys, admin operations, bot ingestion) runs as **Supabase Edge Functions** (Deno runtime) — isolated, single-purpose, no Express dependency. Every function is self-contained and deployed independently.

**v1 Broken Code:**

```js
// api/src/server.js — Express app wrapped as Vercel serverless function
import express from 'express';
import cors from 'cors';
import { config } from './config.js';       // CJS/ESM conflict with dotenv
import { verifyAuth } from './middleware/auth.js';
import adminRoutes from './routes/admin/index.js';
import userRoutes from './routes/user/index.js';
import publicRoutes from './routes/public/index.js';
import botRoutes from './routes/bot/index.js';

const app = express();
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

app.use('/api/admin', verifyAuth, adminRoutes);
app.use('/api/user', verifyAuth, userRoutes);
app.use('/api', publicRoutes);
app.use('/api/bot', botRoutes);

// Every cold start executes ALL of this before a single request is handled
const PORT = process.env.API_PORT || 3001;
const server = app.listen(PORT, () => { /* ... */ });
export default app;  // Vercel entry point: entire Express app per invocation
```

```json
// vercel.json — routing every /api/* request through the monolith
{
  "functions": {
    "api/src/server.js": {
      "runtime": "nodejs18.x",
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/src/server.js" }
  ]
}
```

**v2 Fixed Code:**

```js
// src/lib/supabase.js — Browser-only Supabase client, no Express
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// All CRUD goes through this client. RLS handles authorization.
// No API server, no routing middleware, no cold starts.
```

```typescript
// supabase/functions/paystack-webhook/index.ts
// Single-purpose Edge Function. Deployed independently.
// Deno runtime, no Express, no npm install needed.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { HmacSHA512 } from "https://esm.sh/crypto-js@4";

serve(async (req) => {
  // Single function handles ONE thing: Paystack webhook verification
  const signature = req.headers.get("x-paystack-signature") || "";
  const body = await req.text();
  // HMAC verify, process payment, return 200
  return new Response(JSON.stringify({ status: "received" }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

```json
// vercel.json — No functions, pure static deployment
{
  "routes": [
    { "src": "/privacy", "dest": "/privacy.html" },
    { "src": "/terms", "dest": "/terms.html" },
    { "src": "/faq", "dest": "/faq.html" },
    { "handle": "filesystem" },
    { "src": "/assets/(.*)", "dest": "/assets/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

---

### A2. Iterating on Broken Patterns (3+ Failed Deployments)

**Symptom:** Three consecutive deployments to Vercel failed with the same class of errors (CJS/ESM conflicts, DOMMatrix). Each deployment consumed 40–60 seconds of cold-start + build time. Total wasted: ~2.5 hours.

**Root Cause:** We kept tweaking the Express server code (adding `createRequire` polyfills, try/catching DOMMatrix, adjusting `vercel.json` function configs) instead of asking whether the entire pattern was wrong. **Sunk-cost fallacy in deployment.**

**v2 Solution:** **Two-strike rule.** If a deployment pattern fails twice for the same root cause, immediately pivot to an alternative architecture. Do not attempt a third iteration on the same failing approach. The Supabase + Edge Functions pattern was validated in <5 minutes because it has no build-time module resolution or browser-vs-server package conflicts.

---

### A3. No Proper Backend Definition

**Symptom:** The v1 "API" was an ad-hoc `api()` function in `client/src/main.jsx` that used an `if/else if` chain to route everything — ~400 lines of inline route handling inside the React component file. No separation of concerns. No server-side validation for mutations. Admin operations and public reads shared the same code path.

**Root Cause:** We defined the backend as "whatever the Express server happens to handle" instead of specifying a clear API contract upfront. This meant:
- No documentation of request/response shapes
- No input validation at the API boundary
- Admin operations interleaved with user operations
- Impossible to write tests against

**v2 Solution:** **Explicit Edge Function catalog** with documented contracts. Every server-side operation is a named, independently deployable Edge Function. The client never calls `api(path, method)` — it calls `supabase.from(table).select()` for reads and invokes specific Edge Functions for writes.

**v1 Broken Code:**

```js
// client/src/main.jsx — 400+ line if/else chain as "API layer"
async function api(path, options = {}) {
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : {};

  if (path === "/api/config") return { ... };
  if (path === "/api/me") {
    // 30 lines of inline auth + profile logic
  }
  if (path === "/api/scholarships" || path === "/api/scholarships/filtered") {
    // 15 lines of inline query + normalization
  }
  if (method === "GET" && path === "/api/documents") {
    // 10 lines of inline document query
  }
  if (path === "/api/auth/login" || path === "/api/auth/register") {
    return { user: null }; // Handled directly in AuthScreen
  }
  if (method === "POST" && path === "/api/essays/generate") {
    // 20 lines of inline essay generation
  }
  if (method === "PATCH" && path === "/api/profile") {
    // 50 lines of inline profile update
  }
  if (path === "/api/billing/checkout" || path === "/api/payment/initiate") {
    throw new Error("Paystack integration coming soon.");
  }
  // ... 20 more if/else blocks

  throw new Error("Route not found: " + path);
}
```

**v2 Fixed Code:**

```js
// src/lib/api/scholarships.js — Single-responsibility module
import { supabase } from '../supabase';

export async function fetchScholarships(filters = {}) {
  let query = supabase
    .from('scholarships')
    .select('*, applications!inner(*)')
    .eq('published', true);

  if (filters.country) query = query.contains('country', [filters.country]);
  if (filters.degree_level) query = query.contains('degree_levels', [filters.degree_level]);
  // ... explicit, typed filters

  const { data, error } = await query.order('deadline', { ascending: true });
  if (error) throw new ApiError('Failed to fetch scholarships', error);
  return normalizeScholarships(data || []);
}
```

```typescript
// supabase/functions/admin-operations/index.ts
// Defines the API contract via type-safe handler dispatch

interface AdminRequest {
  action: 'update_scholarship' | 'delete_scholarship' | 'approve_ingestion' | 'update_user_plan';
  payload: Record<string, unknown>;
}

const handlers: Record<string, (payload: any, admin: AdminUser) => Promise<any>> = {
  update_scholarship: async (payload, admin) => { /* ... */ },
  delete_scholarship: async (payload, admin) => { /* ... */ },
  approve_ingestion: async (payload, admin) => { /* ... */ },
  update_user_plan: async (payload, admin) => { /* ... */ },
};

// Single entry point dispatches to typed handlers with role checks
serve(async (req) => {
  const { action, payload } = await req.json() as AdminRequest;
  const handler = handlers[action];
  if (!handler) return error(400, `Unknown action: ${action}`);
  const result = await handler(payload, admin);
  return ok(result);
});
```

---

## B. Authentication Bugs

### B1. `getUser()` after `signIn()` Returns `null` → Blank Page

**Symptom:** After a successful `signInWithPassword()`, calling `supabase.auth.getUser()` returned `null` for the user. This was passed to `onAuthed(null)` → the app rendered nothing → **blank white page.** The bug was timing-dependent and appeared only in production.

**Root Cause:** `supabase.auth.signInWithPassword()` sets session cookies asynchronously. `getUser()` reads those cookies. In Vercel's serverless environment, the cookie propagation delay was long enough that `getUser()` executed before the cookie was written. The v1 code (`main.jsx` line 157-176) made a second `getUser()` call inside `api("/api/me")` after the initial sign-in, hitting this gap every time.

**v2 Solution:** **Never call `getUser()` after sign-in.** Use `data.user` directly from the `signInWithPassword()` response — it is always available synchronously. The v2 `AuthContext` eliminates the entire `api("/api/me")` pattern; it stores the user object from the sign-in response directly.

**v1 Broken Code:**

```js
// client/src/main.jsx lines 157-176 — api("/api/me") calls getUser() after sign-in
if (path === "/api/me") {
  if (!supabase) return { user: null };
  const { data: { user: au } } = await supabase.auth.getUser();
  //                        ^^^^^^^^^ timing gap: returns null if cookie not yet set
  if (!au) return { user: null };      // <-- blank page

  let pr = null;
  try {
    const r = await supabase.from("user_profiles")
      .select("*").eq("id", au.id).maybeSingle();
    pr = r.data;
  } catch { /* table may not exist — another bug */ }

  return {
    user: {
      id: au.id, email: au.email,
      name: pr?.name || metadata.name || "",
      // ... 10 more lines of inline profile construction
    }
  };
}
```

```js
// client/src/main.jsx lines 483-491 — bootstrap() also calls getUser()
async function bootstrap() {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const me = await api("/api/me");  // getUser() again — timing gap
      if (me.user) {
        setUser(me.user);
        await loadScholarships();
      }
    }
  }
}
```

**v2 Fixed Code:**

```js
// src/context/AuthContext.jsx — v2: user from sign-in response, no getUser() gap
export function AuthProvider({ children }) {
  const { user, session, loading } = useSupabaseAuth(); // custom hook

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password,
    });
    if (error) throw error;

    // ✅ data.user is ALWAYS available from the sign-in response
    // No second getUser() call. No timing gap. No blank page.
    return data.user;
  }

  // Session persistence handled by Supabase's built-in auto-refresh
  // onAuthStateChange listener updates context when tokens refresh
  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

```js
// src/hooks/useSupabaseAuth.js — Supabase manages session lifecycle
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabaseAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session (Supabase auto-refreshes the JWT)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
```

---

### B2. `user_profiles` Table Doesn't Exist → Crash

**Symptom:** `api("/api/me")` crashed when querying `user_profiles` because the migration SQL had not been run yet in the Supabase dashboard. The `try/catch` in v1 code was present (line 162) but only caught the table-missing error — the subsequent code still tried to access `pr.country`, `pr.plan`, etc. on the `null` fallback.

**Root Cause:** The migration SQL and application deployment were not coupled. v1 had no `handle_new_user()` trigger to auto-create profiles on signup — the `user_profiles` table was an afterthought.

**v2 Solution:**
1. **Database trigger** `handle_new_user()` fires on `auth.users` INSERT — automatically creates a `user_profiles` row with defaults for every new signup. The table is guaranteed to exist for every authenticated user.
2. The migration SQL is part of `docs/12_SUPABASE_SCHEMA.md` and is **Checkpoint 0** — must be run before any application code executes.
3. Profile reads use defensive `maybeSingle()` with full fallback to `auth.users` metadata.

**v1 Broken Code:**

```js
// client/src/main.jsx lines 162-176 — fragile profile read
let pr = null;
try {
  const r = await supabase.from("user_profiles")
    .select("*").eq("id", au.id).maybeSingle();
  pr = r.data; // pr is null if table doesn't exist or row not found
} catch {
  /* table may not exist yet — use auth metadata */
}
// ⚠️ pr is null here! Next lines access pr?.country, pr?.plan, etc.
// These return undefined, which downstream code may not handle.

const profile = metadata.profile || {
  country: pr?.country || metadata.country || "Kenya",  // undefined → "Kenya" (fallback saves us here but not always)
  targetLevel: "Masters",
  fieldInterests: [],
  studyCountries: [],
};
```

**v2 Fixed Code:**

```sql
-- supabase/migrations/001_handle_new_user.sql
-- Runs BEFORE any application code. Guarantees user_profiles row for every auth.user.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_country TEXT;
BEGIN
  user_country := COALESCE(
    NEW.raw_user_meta_data ->> 'country',
    'Kenya'
  );

  INSERT INTO public.user_profiles (id, name, email, country, plan, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    user_country,
    'explorer',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent: won't fail if row already exists

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

```js
// src/hooks/useProfile.js — Defensive profile read with guaranteed row
export async function fetchProfile(user) {
  if (!user) return null;

  // The trigger guarantees this row exists, but we still handle edge cases
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !profile) {
    // Fallback: construct from auth metadata (should never happen post-trigger)
    return {
      id: user.id,
      name: user.user_metadata?.name || 'User',
      email: user.email,
      country: user.user_metadata?.country || 'Kenya',
      plan: 'explorer',
      role: 'user',
    };
  }

  return profile;
}
```

---

### B3. No Session Management Plan

**Symptom:** Session state was managed imperatively in `main.jsx` with `useState` and manual `onAuthStateChange` handling. The session was not available to deeply nested components except through prop drilling. Logout required calling `api("/api/auth/logout")` AND `supabase.auth.signOut()` redundantly (line 543-544).

**Root Cause:** No centralized auth state management. The `App` component owned all auth state and passed it down as props. This meant every component that needed the user had to be wired through `Portal` → `{view}Workspace` → child components.

**v2 Solution:** `AuthContext` + `useAuth()` hook. Any component anywhere in the tree can call `const { user, signIn, signOut } = useAuth()`. Supabase's `onAuthStateChange` listener is set up once in the provider. Logout is a single `supabase.auth.signOut()` call.

**v1 Broken Code:**

```js
// client/src/main.jsx — Auth state lived in App component, prop-drilled everywhere
function App() {
  const [user, setUser] = React.useState(null);
  // ... 50 lines of state

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();    // redundant call #1
    await api("/api/auth/logout", { method: "POST" }); // redundant call #2
    setUser(null);
    setRows([]);
    setDocuments([]);
    setStats(emptyStats());
  }

  // Pass handleLogout through: Portal → each workspace → each child
  return (
    <Portal
      user={user}
      onLogout={handleLogout}
      onRefresh={loadScholarships}
      // ... 8 more props drilled through 3+ component levels
    />
  );
}
```

**v2 Fixed Code:**

```js
// src/context/AuthContext.jsx — Single source of truth for auth
import { createContext, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { user, session, loading } = useSupabaseAuth();

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }, []);

  const signUp = useCallback(async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    // ✅ Single call. onAuthStateChange listener handles state cleanup.
    await supabase.auth.signOut();
  }, []);

  const value = { user, session, loading, signIn, signUp, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Any component can access auth without prop drilling
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

```js
// src/components/UserMenu.jsx — Component accesses auth directly
import { useAuth } from '../context/AuthContext';

export function UserMenu() {
  const { user, signOut } = useAuth();  // No props needed

  return (
    <div className="user-menu">
      <span>{user?.email}</span>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

---

## C. Data Shape Crashes

### C1. Supabase Flat Rows vs. Nested Objects → `undefined.property` → Blank Page

**Symptom:** The v1 Express API returned nested JSON like `{ application: { applied: false, status: "Not started" }, match: { score: 75, urgency: { tone: "normal" } } }`. When we switched to Supabase direct queries, the returned rows were **flat** — no `application` or `match` fields. Accessing `row.application.applied` threw `TypeError: Cannot read properties of undefined (reading 'applied')` → React error boundary caught it → **blank page.**

**Root Cause:** The rendering code (`DashboardHome`, `ScholarshipWorkspace`, `MatchCard`) accessed nested properties without any normalization at the API boundary. The normalization that existed (lines 192-195) was partial and only ran for the `/api/scholarships` path — not for any other data source.

**v2 Solution:** **Normalize ALL data at the API boundary.** Every Supabase query result is immediately transformed through a `normalize*()` function that sets safe defaults for every nested property. No component ever receives raw Supabase rows — they always receive normalized objects.

**v1 Broken Code:**

```js
// client/src/main.jsx — DashboardHome accesses nested properties without guards
function DashboardHome({ rows, stats, documents }) {
  // ⚠️ Accessing row.match.missingDocuments — crashes if match is undefined
  const missingDocs = [...new Set(
    topMatches.flatMap((row) => row.match.missingDocuments)
  )].slice(0, 5);

  return (
    <>
      <section className="metrics">
        <MetricCard label="Scholarships" value={stats.total} />   {/* stats might be incomplete */}
        <MetricCard label="Strong matches" value={stats.strongMatches} />
      </section>
      {/* ... */}
    </>
  );
}

// computeStats() accesses nested properties — crashes if data shape is wrong
function computeStats(rows) {
  return {
    total: rows.length,
    applied: rows.filter((row) => row?.application?.applied).length,  // optional chaining added LATER as a bandaid
    drafting: rows.filter((row) => row?.application?.status === "Drafting").length,
    urgent: rows.filter((row) => row?.match?.urgency?.tone === "urgent").length,
    strongMatches: rows.filter((row) => (row?.match?.score ?? 0) >= 75).length,
  };
}
```

**v2 Fixed Code:**

```js
// src/lib/normalize.js — Centralized normalization for ALL data sources
const DEFAULT_APPLICATION = {
  applied: false,
  status: 'Not started',
  priority: 'Normal',
  notes: '',
};

const DEFAULT_MATCH = {
  score: 0,
  urgency: { tone: 'normal', label: 'Normal' },
  reasons: [],
  missingDocuments: [],
};

export function normalizeScholarship(row) {
  if (!row) return null;
  return {
    ...row,
    // Required fields with safe defaults
    name: row.name || 'Unknown Scholarship',
    provider: row.provider || 'Unknown Provider',
    host: row.host || 'Unknown Host',
    country: Array.isArray(row.country) ? row.country : [],
    degree_levels: Array.isArray(row.degree_levels) ? row.degree_levels : [],
    fields: Array.isArray(row.fields) ? row.fields : [],
    funding_type: row.funding_type || 'Unknown',
    deadline: row.deadline || null,
    apply_url: row.apply_url || '#',

    // ✅ Nested objects ALWAYS initialized — no undefined.property crashes
    application: {
      ...DEFAULT_APPLICATION,
      ...(row.application || {}),
    },
    match: {
      ...DEFAULT_MATCH,
      ...(row.match || {}),
      urgency: {
        ...DEFAULT_MATCH.urgency,
        ...(row.match?.urgency || {}),
      },
    },
  };
}

export function normalizeScholarships(rows) {
  return (rows || []).map(normalizeScholarship).filter(Boolean);
}
```

```js
// src/hooks/useScholarships.js — All data goes through normalizer
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeScholarships } from '../lib/normalize';

export function useScholarships(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      const { data: rows, error: queryError } = await supabase
        .from('scholarships')
        .select('*')
        .eq('published', true);

      if (!cancelled) {
        if (queryError) setError(queryError);
        // ✅ Normalize BEFORE setting state — components never see raw Supabase data
        else setData(normalizeScholarships(rows));
        setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [JSON.stringify(filters)]);

  return { data, loading, error };
}
```

---

### C2. `computeStats()` Crash on Missing Fields

**Symptom:** Even with partial optional chaining added later (the `?.` operators), `computeStats()` would return stats with `NaN` values when rows contained unexpected shapes. The dashboard rendered `NaN` in metric cards.

**Root Cause:** `computeStats()` was called with `rows` from multiple sources — after filtering, after CSV import, after bot ingestion. Each source could produce slightly different shapes. The function had no input validation.

**v2 Solution:** `computeStats()` is replaced by `deriveStats(normalizedRows)` which takes already-normalized data. Since the normalizer guarantees every field exists, stats computation is safe. Additionally, all `NaN` values are replaced with `0` at the output boundary.

**v1 Broken Code:**

```js
function computeStats(rows) {
  return {
    total: rows.length,
    applied: rows.filter((row) => row?.application?.applied).length,
    drafting: rows.filter((row) => row?.application?.status === "Drafting").length,
    notApplied: rows.filter((row) => !row?.application?.applied).length,
    urgent: rows.filter((row) => row?.match?.urgency?.tone === "urgent").length,
    strongMatches: rows.filter((row) => (row?.match?.score ?? 0) >= 75).length,
  };
}
// Called from multiple places with potentially unnormalized data:
// - applyRows(nextRows) → setStats(computeStats(nextRows))  [line 529]
// - After CSV upload: onRowsChanged([...incoming, ...rows])  [line 1289]
```

**v2 Fixed Code:**

```js
// src/lib/stats.js — Stats derived from ALREADY normalized data
import { normalizeScholarships } from './normalize';

export function deriveStats(rows) {
  // Ensure data is normalized even if caller forgot
  const normalized = normalizeScholarships(rows);

  const stats = {
    total: normalized.length,
    applied: 0,
    drafting: 0,
    notApplied: 0,
    urgent: 0,
    strongMatches: 0,
  };

  for (const row of normalized) {
    if (row.application.applied) stats.applied++;
    else stats.notApplied++;

    if (row.application.status === 'Drafting') stats.drafting++;
    if (row.match.urgency.tone === 'urgent') stats.urgent++;
    if (row.match.score >= 75) stats.strongMatches++;
  }

  // ✅ Defensive: replace NaN with 0 (shouldn't happen, but safe)
  for (const key of Object.keys(stats)) {
    if (typeof stats[key] !== 'number' || isNaN(stats[key])) {
      stats[key] = 0;
    }
  }

  return stats;
}
```

---

### C3. No Normalization at API Boundary

**Symptom:** Each component that consumed data from Supabase needed its own defensive null checks. Some components had them, some didn't. Adding a new field to the schema could silently break any component that accessed it.

**Root Cause:** Data flow was: Supabase row → React state → component render. There was no transformation layer. Components had to trust the database schema.

**v2 Solution:** **Data transformation layer.** Data flows: Supabase row → `normalize*()` → React state → component render. Components trust the normalizer output — never raw database rows. If the schema changes, only the normalizer needs updating.

```js
// src/lib/api/scholarships.js
async function fetchScholarships(filters) {
  const { data: raw, error } = await supabase
    .from('scholarships')
    .select('*')
    .eq('published', true);

  if (error) throw error;

  // ✅ Transform happens HERE — once, before any component sees the data
  return {
    scholarships: normalizeScholarships(raw),
    stats: deriveStats(raw),
  };
}
```

---

## D. React State Issues

### D1. Async Callback as React Prop Throws → Entire Tree Unmounts → Blank Page

**Symptom:** If `loadScholarships()` threw an error inside the `onAuthed` callback passed to `AuthScreen`, the entire React tree unmounted. The user saw only a white screen with no error message. This happened silently — no console error was visible in production.

**Root Cause:** React's error boundary catches errors from rendering, but **not from async event handlers.** When an async function passed as a prop throws, React propagates the error up to the nearest error boundary. If no boundary exists (v1 had none), the entire tree unmounts. The v1 `onAuthed` callback (line 574) had a `try/catch` ONLY for the inner `loadScholarships()`, but the `api("/api/me")` call in `AuthScreen`'s sign-in handler (line 777) had no such protection.

**v2 Solution:**
1. Every async event handler is wrapped in `try/catch` at the **call site**, not inside the component receiving the prop.
2. A top-level `<ErrorBoundary>` wraps the entire application — catches rendering errors and shows a "Something went wrong" fallback instead of a white screen.
3. All async operations inside `useEffect` hooks have cleanup functions and error state.

**v1 Broken Code:**

```js
// client/src/main.jsx line 574-577 — onAuthed is async, no top-level error boundary
onAuthed={async (nextUser) => {
  setUser(nextUser);
  try {
    await loadScholarships();
  } catch (e) {
    showToast("Scholarship data loading, please wait…");
  }
}}

// client/src/main.jsx line 777 — AuthScreen calls onAuthed without try/catch
onAuthed(nextUser);
//        ^^^^^^^^^ If this throws (because onAuthed runs async operations),
//                  the error propagates out of the submit() handler → uncaught.
```

```js
// v1 had NO error boundary component at all.
// Any uncaught error → white screen with no fallback UI.
```

**v2 Fixed Code:**

```js
// src/components/ErrorBoundary.jsx — Catches ALL rendering errors
import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    // Could send to monitoring service here
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

```js
// src/main.jsx — Error boundary wraps entire app
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>
);
```

```js
// src/pages/LoginPage.jsx — Every async handler wrapped at call site
export function LoginPage() {
  const { signIn } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      // ✅ Navigation happens via router, not callback prop
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}
      {/* ... */}
    </form>
  );
}
```

---

### D2. No Loading States, No Error States, No Empty States

**Symptom:** Users saw blank sections while data loaded. When Supabase queries failed, there was no visible error — just silence. When filter combinations produced no results, the scholarship grid showed nothing.

**Root Cause:** Every data-fetching code path used a simple `data ? render(data) : null` pattern. No concept of a "loading" state distinct from "no data yet" and "error occurred."

**v2 Solution:** Every async operation produces a **tri-state:** `loading`, `error`, and `data`. Components render:

| State | UI |
|-------|----|
| `loading === true` | Skeleton loaders (pulsing placeholders) |
| `error !== null` | Error card with retry button |
| `data.length === 0` | Empty state with illustration + CTA |
| `data.length > 0` | Actual content |

**v1 Broken Code:**

```js
// v1: No distinction between loading, error, and empty
function ScholarshipWorkspace({ rows }) {
  // If rows is an empty array, user sees nothing in the grid
  // If the API call failed, user sees nothing — no error message
  return (
    <div className="scholarship-grid">
      {rows.map((row) => <ScholarshipCard key={row.id} row={row} />)}
      {/* ⚠️ No loading skeletons, no error message, no empty state */}
    </div>
  );
}
```

**v2 Fixed Code:**

```js
// src/components/ScholarshipGrid.jsx
import { useScholarships } from '../hooks/useScholarships';
import { ScholarshipCard } from './ScholarshipCard';
import { SkeletonCard } from './SkeletonCard';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

export function ScholarshipGrid({ filters }) {
  const { data, loading, error, retry } = useScholarships(filters);

  // ✅ Loading state
  if (loading) {
    return (
      <div className="scholarship-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <ErrorState
        message="Could not load scholarships"
        details={error.message}
        onRetry={retry}
      />
    );
  }

  // ✅ Empty state
  if (!data.length) {
    return (
      <EmptyState
        icon={<Search size={48} />}
        title="No scholarships found"
        description="Try adjusting your filters or browse all opportunities."
        action={{ label: "Clear Filters", onClick: () => clearFilters() }}
      />
    );
  }

  // ✅ Data state
  return (
    <div className="scholarship-grid">
      {data.map((row) => (
        <ScholarshipCard key={row.id} scholarship={row} />
      ))}
    </div>
  );
}
```

```js
// src/components/SkeletonCard.jsx — Pulsing placeholder during load
export function SkeletonCard() {
  return (
    <div className="scholarship-card skeleton">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-subtitle" />
      <div className="skeleton-line skeleton-tag" />
      <div className="skeleton-line skeleton-action" />
    </div>
  );
}
```

```js
// src/components/EmptyState.jsx — Friendly empty state with optional CTA
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="primary-btn" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
```

---

## E. Environment Variables

### E1. Non-`VITE_` Prefixed Variables Are `undefined` in Browser

**Symptom:** `import.meta.env.SUPABASE_URL` and `import.meta.env.SUPABASE_ANON_KEY` returned `undefined` in the browser. The Supabase client failed to initialize → all API calls failed silently.

**Root Cause:** Vite **only** exposes environment variables prefixed with `VITE_` to client-side code. The v1 `.env` file had `SUPABASE_URL` (no prefix) for the Express backend and `VITE_SUPABASE_URL` for the client. The Express `config.js` correctly used `process.env.SUPABASE_URL` (server-side), but the v1 fallback code in `main.jsx` tried `import.meta.env.SUPABASE_URL` as well — it was always `undefined`.

**v2 Solution:**
1. `.env` contains **only** `VITE_`-prefixed variables for client use.
2. Server-side secrets (service role key, Paystack secret, AI API key) **never** appear in `.env` — they live exclusively in Supabase Edge Function environment variables (the Supabase Vault or Edge Function `.env`).
3. A CI check (`npm run build` check) verifies that no non-`VITE_` variables are accessed via `import.meta.env`.

**v1 Broken Code:**

```bash
# .env — v1 had a mix of VITE_ and non-VITE_ prefixed vars
PORT=5173

# Admin console and bot ingestion
ADMIN_EMAIL=admin@zawadi.app
INGEST_API_KEY=replace-with-a-long-random-bot-token

# Supabase (Vite only exposes VITE_ prefixed vars to browser)
VITE_SUPABASE_URL=https://efvxtcxhjlbzzsixfrvo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...cjkQ

# Paystack
PAYSTACK_SECRET_KEY=sk_liv...9a38          # ⚠️ Visible in .env file!
```

```js
// client/src/main.jsx line 48-49 — Only VITE_ vars work in browser
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
// If VITE_ prefix was accidentally omitted, these would be undefined
```

```js
// api/src/config.js — Express backend used process.env (server-side, works)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
// Fallback to VITE_ vars was brittle and confusing
```

**v2 Fixed Code:**

```bash
# .env — v2 contains ONLY client-side VITE_ variables
VITE_SUPABASE_URL=https://efvxtcxhjlbzzsixfrvo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...  # anon key (safe for browser)
VITE_PAYSTACK_PUBLIC_KEY=pk_test_...  # public key only (safe for browser)
# That's it. No secrets. No service role. No API keys.
```

```bash
# .env.example — Template for new developers
# Copy this to .env and fill in values
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key

# ⚠️ SECRETS GO IN SUPABASE VAULT, NEVER HERE:
# SUPABASE_SERVICE_ROLE_KEY → Supabase Dashboard → Edge Functions → Secrets
# PAYSTACK_SECRET_KEY      → Supabase Dashboard → Edge Functions → Secrets
# DEEPSEEK_API_KEY         → Supabase Dashboard → Edge Functions → Secrets
```

```typescript
// supabase/functions/paystack-webhook/index.ts
// Secrets injected by Supabase at Edge Function runtime — never in client bundle
const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
```

---

### E2. Service Role Key in `.env` (One Typo from Disaster)

**Symptom:** The v1 `.env` file contained `PAYSTACK_SECRET_KEY` (non-`VITE_` prefixed). If any developer accidentally added a `VITE_` prefix (e.g., `VITE_SUPABASE_SERVICE_ROLE=...`), that key would be bundled into the client build and shipped to every browser — granting anyone with DevTools full admin access to the Supabase database.

**Root Cause:** The `.env` file mixed client and server secrets in the same file. No automated check prevented server-side variables from being exposed to Vite.

**v2 Solution:**
1. **Server secrets never appear in `.env`.** Period. They are stored in:
   - Supabase Edge Function environment variables (set via `supabase secrets set`)
   - OR Supabase Vault (for database-level secrets)
2. A **pre-build check** (`scripts/check-env.js`) verifies that `import.meta.env` only accesses `VITE_`-prefixed variables and that no sensitive key patterns (`SERVICE_ROLE`, `SECRET_KEY`, `_API_KEY`) appear with a `VITE_` prefix.
3. `.gitignore` includes `.env` and `.env.local` so secrets are never committed.

**v1 Broken Code:**

```bash
# .env — Service role key and Paystack secret visible in the same file as VITE_ vars
PAYSTACK_SECRET_KEY=sk_liv...9a38      # ⚠️ One typo (VITE_PAYSTACK_SECRET_KEY) → ships to browser
SUPABASE_SERVICE_ROLE_KEY=...          # ⚠️ One typo → full database bypass
AI_API_KEY=sk-you...-key               # ⚠️ API key leak
```

**v2 Fixed Code:**

```js
// scripts/check-env.js — Pre-build CI check
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const lines = envContent.split('\n');

const FORBIDDEN_PATTERNS = [
  /VITE_.*SERVICE_ROLE/i,
  /VITE_.*SECRET_KEY/i,
  /VITE_.*API_KEY/i,
  /VITE_.*PRIVATE/i,
];

for (const line of lines) {
  const [key] = line.split('=');
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(key || '')) {
      console.error(`❌ SECURITY: Forbidden variable "${key.trim()}" found in .env`);
      console.error('   Server secrets must NEVER be prefixed with VITE_');
      console.error('   Secrets go in Supabase Edge Function env vars, not .env');
      process.exit(1);
    }
  }
}

console.log('✅ .env security check passed');
```

---

## F. Deployment

### F1. Static Pages Return 404

**Symptom:** `/privacy`, `/terms`, `/faq` returned 404 errors in production. The HTML files existed in `public/` but Vercel routed all requests to the Express function before reaching the filesystem.

**Root Cause:** The v1 `vercel.json` used `routes` (correct approach) but the Express function's 404 handler (line 119-125) caught unmatched paths BEFORE the SPA fallback could serve them. The `"handle": "filesystem"` directive was correctly placed, but the Express catch-all returned JSON `{ error: "ROUTE_NOT_FOUND" }` instead of falling through to static files.

Additionally, the build command (`npm run vercel-build`) was building the client with Vite, but Vercel's serverless function setup was intercepting all requests before they reached the static assets.

**v2 Solution:**
1. **Pure static deployment.** No serverless functions. Vercel serves everything as static files.
2. `vercel.json` uses `routes` with `"handle": "filesystem"` BEFORE the SPA fallback. Static pages get explicit routes mapping `/privacy` → `/privacy.html`.
3. Checkpoint 8 verifies that all static pages (privacy, terms, FAQ, about, contact) return 200.

**v1 Broken Code:**

```json
// vercel.json — Express function intercepts requests before filesystem
{
  "functions": {
    "api/src/server.js": {
      "runtime": "nodejs18.x",
      "maxDuration": 60
    }
  },
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/src/server.js" },
    { "src": "/privacy", "dest": "/privacy.html" },
    { "src": "/terms", "dest": "/terms.html" },
    { "src": "/faq", "dest": "/faq.html" },
    { "handle": "filesystem" },
    { "src": "/assets/(.*)", "dest": "/assets/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

```js
// api/src/server.js lines 119-125 — Express 404 handler catches ALL unmatched paths
app.use((req, res) => {
  res.status(404).json({
    error: 'ROUTE_NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});
// ⚠️ This returns JSON 404 instead of falling through to static files
```

**v2 Fixed Code:**

```json
// vercel.json — No functions, pure static with correct route priority
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
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

---

### F2. Git-Tracked `dist/` Folder

**Symptom:** Stale build files in `dist/` caused confusion — developers weren't sure if changes were picked up. Build output was accidentally committed.

**Root Cause:** `dist/` was not in `.gitignore` in early v1 development. The folder was committed once and then kept showing up in git status.

**v2 Solution:** `dist/` (or `build/`) is in `.gitignore` from project initialization (Checkpoint 0). Vercel runs `npm run build` during `vercel-build`, generating fresh output in its own CI environment.

```gitignore
# .gitignore — v2
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

---

## G. Payments

### G1. User Can Pay for Same or Lower Tier

**Symptom:** A user on the "Pro" plan could click "Pay with Paystack" on the "Plus" plan — paying $5/month for a downgrade they already had access to via their Pro plan. Paystack would process the payment and the webhook would override the user's plan to "plus" — effectively downgrading them while charging them money.

**Root Cause:** The v1 pricing UI (line 2297) had a client-side `isIncluded` check `planRank(plan.id) < planRank(user.plan)` that disabled the button — but this was purely cosmetic. The `planRank()` function was defined but used inconsistently. There was no **server-side** check on tier validity.

**v2 Solution:**
1. **Client-side guard:** Button is disabled with clear messaging when the plan is not an upgrade.
2. **Edge Function enforcement:** The `paystack-webhook` Edge Function checks the new tier against the user's current tier BEFORE applying the upgrade. If `new_tier <= current_tier`, the webhook returns 200 (to ack Paystack) but does NOT modify the user's plan — and logs a warning.
3. **Tier hierarchy** is defined in a single source of truth (`src/config/plans.js`) and shared between client and Edge Function.

**v1 Broken Code:**

```js
// client/src/main.jsx line 426-432 — planRank defined but used only on client
function planRank(planId = "free") {
  return { free: 0, plus: 1, pro: 2, mentor: 3 }[planId] ?? 0;
}

function isPaid(user) {
  return user?.is_paid || (user?.plan && user.plan !== "free");
}

// line 2297 — client-only check, no server validation
const isIncluded = isPaid(user) && planRank(plan.id) < planRank(user.plan);
```

```js
// api/src/services/payment.js lines 48-63 — Webhook has NO tier validation
// Simply maps amount to tier with no check against current user tier
let tier = metadata?.tier || 'plus';
const tierPrices = { plus: 500, pro: 1200, mentor: 9900 };
if (!metadata?.tier) {
  for (const [t, price] of Object.entries(tierPrices)) {
    if (amount >= price * 100) {
      tier = t;
      break;
    }
  }
}
// ⚠️ No check: is this tier an upgrade from what the user already has?
```

**v2 Fixed Code:**

```js
// src/config/plans.js — Single source of truth for tier hierarchy
export const PLAN_HIERARCHY = {
  explorer: 0,
  plus: 1,
  pro: 2,
  mentor: 3,
};

export function isUpgrade(currentPlan, selectedPlan) {
  return (PLAN_HIERARCHY[selectedPlan] || 0) > (PLAN_HIERARCHY[currentPlan] || 0);
}
```

```js
// src/components/PricingWorkspace.jsx — Client-side guard
import { isUpgrade } from '../config/plans';

function PricingCard({ plan, userPlan }) {
  const isCurrentPlan = plan.id === userPlan;
  const isDowngrade = !isUpgrade(userPlan, plan.id) && !isCurrentPlan;

  return (
    <article className="price-card">
      {/* ... */}
      <button
        disabled={isCurrentPlan || isDowngrade || plan.id === 'explorer'}
        onClick={() => handleCheckout(plan.id)}
      >
        {isCurrentPlan
          ? 'Current Plan'
          : isDowngrade
            ? 'Already Included'
            : plan.id === 'explorer'
              ? 'Free Forever'
              : 'Upgrade'}
      </button>
    </article>
  );
}
```

```typescript
// supabase/functions/paystack-webhook/index.ts — Server-side enforcement
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PLAN_HIERARCHY: Record<string, number> = {
  explorer: 0, plus: 1, pro: 2, mentor: 3,
};

async function handleChargeSuccess(event: PaystackEvent) {
  const email = event.data.customer.email;
  const newTier = event.data.metadata?.tier || 'plus';

  // 1. Get user profile
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan')
    .eq('email', email)
    .single();

  if (!profile) return ok('User not found, webhook acknowledged');

  const currentTier = profile.plan || 'explorer';

  // 2. ✅ Server-side tier validation — block downgrades
  if ((PLAN_HIERARCHY[newTier] || 0) <= (PLAN_HIERARCHY[currentTier] || 0)) {
    console.warn(
      `[PAYSTACK] Downgrade attempt blocked: ${email} tried ${newTier} (current: ${currentTier})`
    );
    return ok('Webhook acknowledged — no tier change (downgrade blocked)');
  }

  // 3. Apply upgrade
  await supabaseAdmin
    .from('user_profiles')
    .update({ plan: newTier, plan_expires_at: calculateExpiry(newTier) })
    .eq('email', email);

  return ok('Upgrade applied');
}
```

---

### G2. No Webhook Idempotency → Duplicate Events

**Symptom:** Paystack could send the same webhook event twice (network retries). The v1 webhook handler processed each event independently, creating duplicate payment records and potentially double-applying subscription upgrades.

**Root Cause:** The v1 `payments` table had no `UNIQUE` constraint on the webhook event ID. The handler checked for an existing subscription but not for an already-processed event.

**v2 Solution:**
1. **Database constraint:** `payments.webhook_event_id` has a `UNIQUE` constraint.
2. **Idempotent handler:** Before processing, check if `webhook_event_id` already exists. If it does, return 200 immediately (acknowledge receipt) without re-processing.
3. The `paystack-webhook` Edge Function always acknowledges Paystack with 200 — even for duplicates — to prevent Paystack from retrying indefinitely.

**v1 Broken Code:**

```js
// api/src/services/payment.js lines 83-97 — No idempotency check
const { error: paymentError } = await supabaseAdmin
  .from('payments')
  .insert({
    user_id: user.id,
    subscription_id: subscription.id,
    reference,         // Paystack reference — NOT unique!
    amount,
    currency: 'NGN',
    provider: 'paystack',
    status: 'completed',
    metadata: {
      customer_email: customer.email,
      tier
    }
  });
// ⚠️ If Paystack sends this webhook twice, we insert two payment records
```

```sql
-- v1 table had no UNIQUE constraint on webhook event or reference
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID,
  reference TEXT,         -- ❌ No UNIQUE constraint
  amount INTEGER,
  status TEXT
);
```

**v2 Fixed Code:**

```sql
-- supabase/migrations/001_schema.sql — UNIQUE constraint prevents duplicates
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paystack_reference TEXT NOT NULL UNIQUE,     -- ✅ Unique: no duplicate references
  paystack_subscription_code TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'KES',
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  webhook_event_id TEXT UNIQUE,                -- ✅ Unique: no duplicate webhook processing
  created_at TIMESTAMPTZ DEFAULT now()
);
```

```typescript
// supabase/functions/paystack-webhook/index.ts — Idempotent handler
async function handleWebhook(event: PaystackEvent) {
  const eventId = String(event.id || event.eventId || '');

  // ✅ Check: already processed this event?
  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('webhook_event_id', eventId)
    .maybeSingle();

  if (existing) {
    console.log(`[PAYSTACK] Duplicate event ${eventId} — acknowledged, not processed`);
    return ok('Already processed');  // Always return 200 to Paystack
  }

  // First-time event → process normally
  if (event.event === 'charge.success') {
    await handleChargeSuccess(event, eventId);
  }

  return ok('Processed');
}
```

---

### G3. Plan Mismatch Between Paystack and Database

**Symptom:** The v1 payment handler mapped Paystack amounts to tiers using hardcoded price thresholds that didn't match either the displayed pricing or the actual Paystack plan codes. A $15 Pro payment could be mistaken for Plus because the threshold check was ordered incorrectly.

**Root Cause:** Three separate sources of truth for pricing:
1. `PRICING_PLANS` in `main.jsx` (client display) — had `monthlyUsd: 15` for Pro
2. `tierPrices` in `payment.js` (webhook handler) — had `pro: 1200` (12 USD in cents)
3. Actual Paystack plan codes — configured in Paystack dashboard

These diverged. The webhook relied on amount-matching as a fallback instead of using the `metadata.tier` field or Paystack plan codes.

**v2 Solution:**
1. **Single source of truth:** `src/config/plans.js` defines all pricing. The Paystack checkout session sends `metadata: { tier: planId }` which the webhook reads directly — no amount-based guessing.
2. **Paystack plan codes** are stored as environment variables in the Edge Function and mapped to internal tier IDs.
3. Cross-reference: the webhook logs a warning if `metadata.tier` doesn't match the expected tier for the given Paystack plan code.

**v1 Broken Code:**

```js
// api/src/services/payment.js — Amount-based tier guessing
const tierPrices = {
  plus: 500,    // 5 USD — but client shows $5 for Plus ✓
  pro: 1200,    // 12 USD — but client shows $15 for Pro ✗ MISMATCH
  mentor: 9900  // 99 USD — but client shows $50 for Mentor ✗ MISMATCH
};

if (!metadata?.tier) {
  for (const [t, price] of Object.entries(tierPrices)) {
    if (amount >= price * 100) {  // First match wins — ordered wrong
      tier = t;
      break;                       // ⚠️ $15 Pro would match `plus` threshold first since 1500 >= 500
    }
  }
}
```

**v2 Fixed Code:**

```js
// src/config/plans.js — Single source of truth
export const PLANS = {
  explorer: { id: 'explorer', name: 'Explorer', monthlyUsd: 0, annualUsd: 0 },
  plus:     { id: 'plus',     name: 'Scholar Plus', monthlyUsd: 5,  annualUsd: 50 },
  pro:      { id: 'pro',      name: 'App Pro', monthlyUsd: 12, annualUsd: 120 },
  mentor:   { id: 'mentor',   name: 'Mentor Review', monthlyUsd: 29, annualUsd: 290 },
};

export function getPlan(planId) {
  return PLANS[planId] || PLANS.explorer;
}
```

```typescript
// supabase/functions/paystack-webhook/index.ts — Uses metadata, not amount guessing
async function handleChargeSuccess(event: PaystackEvent) {
  // ✅ Read tier directly from metadata — no amount guessing
  const tier = event.data.metadata?.tier;

  if (!tier || !PLAN_HIERARCHY[tier]) {
    console.error(`[PAYSTACK] Unknown tier in metadata: ${tier}`);
    return ok('Unknown tier — webhook acknowledged, no action');
  }

  // Optional: cross-reference with Paystack plan code for audit
  const planCode = event.data.plan?.plan_code;
  if (planCode) {
    const expectedTier = PLAN_CODE_MAP[planCode];
    if (expectedTier && expectedTier !== tier) {
      console.warn(
        `[PAYSTACK] Tier mismatch: metadata=${tier}, plan_code=${planCode} (expected ${expectedTier})`
      );
      // Log for manual review but trust metadata (explicit user intent)
    }
  }

  // Rest of processing...
}
```

---

## H. UI/UX

### H1. No Upgrade Path from Limits

**Symptom:** Free users hit the 3-essay daily limit with no indication of how to increase it. The "Upgrade to unlock" link (line 1731) was a `<span>` styled as a button but with `onClick` that only showed a toast message — it didn't open the pricing page. The actual upgrade modal was only accessible from the sidebar "Pricing" tab, which users had to discover on their own.

**Root Cause:** The filter panel had an "Upgrade to unlock all filters" link that didn't navigate to pricing. The `DocumentsWorkspace` had `onUpgrade` callbacks but they were only wired in from the parent — inconsistently.

**v2 Solution:**
1. **Contextual upgrade prompts:** When a user hits a limit, an `<UpgradeModal>` appears inline with the specific upgrade that would solve their problem ("You've used 3/3 essays today. Upgrade to Pro for 25/day").
2. **Consistent upgrade entry points:** Every limit-gated feature has a visible "Upgrade" button that opens the pricing page.
3. **Banner on dashboard:** Free users see a persistent but dismissible banner showing what they're missing.

**v1 Broken Code:**

```js
// client/src/main.jsx line 1725-1733 — "Upgrade" link doesn't do anything useful
{!isPaid(user) && (
  <button
    className="upgrade-link"
    onClick={() => onToast && onToast("Opening pricing... please wait")}
    // ⚠️ Shows toast but doesn't actually open pricing or upgrade modal
    style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}
    title="Click to upgrade your plan"
  >
    <Lock size={13} /> Upgrade to unlock all filters
  </button>
)}
```

**v2 Fixed Code:**

```js
// src/components/UsageLimitBanner.jsx — Contextual upgrade prompt
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PLAN_LIMITS } from '../config/plans';

export function UsageLimitBanner({ resource, current, limit }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || user.plan === 'mentor') return null; // Mentor = unlimited

  const upgradePlan = findUpgradePlan(user.plan, resource, limit);

  return (
    <div className="limit-banner">
      <div className="limit-banner-content">
        <AlertTriangle size={20} />
        <span>
          You've used <strong>{current}/{limit}</strong> {resource} today.
          Upgrade to <strong>{upgradePlan.name}</strong> for {upgradePlan.limits[resource]}/day.
        </span>
      </div>
      <button
        className="primary-btn"
        onClick={() => navigate('/pricing', { state: { highlight: upgradePlan.id } })}
      >
        Upgrade → {upgradePlan.name}
      </button>
    </div>
  );
}

function findUpgradePlan(currentPlan, resource, currentLimit) {
  const plans = Object.values(PLANS);
  const currentRank = PLAN_HIERARCHY[currentPlan];
  return plans.find(
    (p) => PLAN_HIERARCHY[p.id] > currentRank && p.limits[resource] > currentLimit
  ) || plans.find((p) => p.id === 'plus'); // Fallback to Plus
}
```

---

### H2. Broken Links in Footer

**Symptom:** Footer links to `/privacy`, `/terms`, `/faq` in the AuthScreen went to 404 pages on Vercel. Users saw a JSON error response or a blank page.

**Root Cause:** See **F1** — the Express function's 404 handler intercepted all non-API routes before the static files could be served.

**v2 Solution:** See **F1** — static HTML pages with explicit `vercel.json` routes, verified at Checkpoint 8. Additionally, all footer links use `<Link>` or `<a>` with proper `href` values that match the `vercel.json` routes exactly.

**v1 Broken Code:**

```js
// client/src/main.jsx lines 1036-1038 — Hardcoded links that returned 404
<footer className="landing-footer">
  <a href="/privacy">Privacy</a>
  <a href="/terms">Terms</a>
  <a href="/faq">FAQ</a>
</footer>
```

**v2 Fixed Code:**

```js
// src/components/Footer.jsx — Verified routes matching vercel.json
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-links">
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Service</Link>
        <Link to="/faq">FAQ</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
      </div>
      <p className="footer-copy">
        &copy; {new Date().getFullYear()} Techsari. Built for African students everywhere.
      </p>
    </footer>
  );
}
```

```json
// vercel.json — Routes verified at Checkpoint 8
{
  "routes": [
    { "src": "/privacy", "dest": "/privacy.html" },   // ← Footer link 1
    { "src": "/terms",   "dest": "/terms.html" },     // ← Footer link 2
    { "src": "/faq",     "dest": "/faq.html" },       // ← Footer link 3
    { "src": "/about",   "dest": "/about.html" },
    { "src": "/contact", "dest": "/contact.html" },
    { "handle": "filesystem" },
    { "src": "/assets/(.*)", "dest": "/assets/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

---

### H3. Mobile Unresponsive

**Symptom:** The v1 layout used a fixed sidebar + workspace pattern with no responsive breakpoints. On mobile, the sidebar occupied the full screen width, and the scholarship grid was completely hidden below the fold. The filter toolbar overflowed horizontally.

**Root Cause:** No mobile-first CSS. The `main.jsx` file contained inline styles (250+ lines) with no media queries. The `styles.css` file used fixed widths and `flex` without wrapping.

**v2 Solution:** Tailwind CSS 4 with mobile-first responsive utilities (`sm:`, `md:`, `lg:`). Layout: sidebar collapses to a hamburger drawer on mobile. Filter toolbar stacks vertically. Scholarship grid uses `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.

**v1 Broken Code:**

```js
// client/src/main.jsx — Fixed sidebar, no responsive handling
return (
  <main className="app-shell">
    <aside className="sidebar">
      {/* Sidebar content — takes ~280px, never collapses */}
    </aside>
    <section className="workspace">
      {/* Workspace content — hidden on mobile */}
    </section>
  </main>
);
```

```css
/* styles.css — No media queries */
.app-shell { display: flex; }  /* No flex-direction change for mobile */
.sidebar { width: 280px; }     /* Fixed width, never collapses */
```

**v2 Fixed Code:**

```jsx
// src/components/Layout.jsx — Responsive with hamburger drawer
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar — hidden on mobile, slide-in drawer when open */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-72 bg-white border-r
          transform transition-transform duration-200 z-40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Sidebar content */}
      </aside>

      {/* Main content — full width on mobile, offset on desktop */}
      <main className="lg:ml-72 p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
```

---

## I. Admin Panel

### I1. Admin Code Leaked to Main Bundle

**Symptom:** Admin-only components (`Intake` button, `ScholarshipEditor` in edit mode, bulk upload) were bundled into the main JavaScript payload — visible to every user via DevTools, even though only admins could interact with them. The admin.html page was a separate entry point but duplicated logic from the main app.

**Root Cause:** All components lived in a single `main.jsx` file (2,808 lines). The `canManageScholarships` check (line 1080) was a runtime check — but the admin code was still in the bundle regardless of the user's role. The bundle contained:
- `UploadModal` — bulk scholarship ingestion form
- `ScholarshipEditor` — full CRUD form with all fields
- `parseZawadiBlocks()` — bot output parser
- Delete scholarship logic
- Admin filter bypasses

A malicious user could extract the admin API patterns from the bundle and attempt to use them.

**v2 Solution:**
1. **Separate Vite entry point** for admin: `admin/main.jsx` with its own `vite.config.js` or multi-page build. The admin bundle is only loaded when navigating to `/admin`.
2. **Zero admin code in the main user bundle.** The user app contains no admin components, no admin API calls, no admin route handlers.
3. Admin operations go through Edge Functions with `service_role` auth — the client never has direct admin database access.

**v1 Broken Code:**

```js
// client/src/main.jsx — ALL code in one file, admin components interleaved
function Portal({ user }) {
  const canManageScholarships = user?.role === "admin"; // Runtime check only

  return (
    <main>
      <aside>
        {/* Admin UI visible to everyone in bundle */}
        {canManageScholarships && (
          <button onClick={() => setUploadOpen(true)}>
            <FileUp /> Intake
          </button>
        )}
        {canManageScholarships && (
          <button onClick={() => { window.location.href = "/admin"; }}>
            <ShieldCheck /> Admin
          </button>
        )}
      </aside>

      {/* UploadModal — full bulk ingestion form, in every user's bundle */}
      {uploadOpen && <UploadModal onImported={...} />}

      {/* ScholarshipEditor — full CRUD, in every user's bundle */}
      {editing && <ScholarshipEditor row={editing} onSaved={...} />}
    </main>
  );
}

// parseZawadiBlocks() — bot output parser, in every user's bundle (lines 2541-2580)
function parseZawadiBlocks(text) { /* 40 lines of bot output parsing */ }
```

**v2 Fixed Code:**

```js
// vite.config.js — Multi-page build with separate admin entry
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin/index.html',  // Separate entry point
      },
    },
  },
});
```

```
// Project structure — admin code is completely separate
src/
├── main.jsx              // User app entry — NO admin code
├── App.jsx
├── components/           // User-facing components only
├── context/              // User auth context
├── hooks/                // User hooks
└── config/               // Shared config (pricing, countries)

admin/                    // Separate admin app
├── index.html            // Admin HTML entry
├── main.jsx              // Admin app entry
├── components/           // Admin-only components
│   ├── AdminDashboard.jsx
│   ├── ScholarshipReview.jsx
│   ├── IngestionQueue.jsx
│   ├── UserManagement.jsx
│   └── AuditLogViewer.jsx
└── api/                  // Admin API calls → Edge Functions
    └── adminClient.js    // Calls supabase/functions/admin-operations
```

```typescript
// supabase/functions/admin-operations/index.ts — Admin API
// All admin operations go through this Edge Function with service_role authentication.
// The user app NEVER has the service_role key — it cannot bypass RLS.

serve(async (req) => {
  // 1. Verify caller is authenticated
  const authHeader = req.headers.get('Authorization');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
    authHeader?.replace('Bearer ', '') || ''
  );
  if (authError || !user) return error(401, 'Unauthorized');

  // 2. Verify caller has admin role (checked in user_profiles, not client-side)
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role === 'user') {
    return error(403, 'Admin access required');
  }

  // 3. Execute the requested admin operation
  const { action, payload } = await req.json();
  return handleAdminAction(action, payload, profile);
});
```

---

### I2. No Audit Trail

**Symptom:** When a bot-found scholarship was published with incorrect data, there was no record of who approved it, when, or what the original bot output looked like. When a user's plan was changed, there was no log of who made the change.

**Root Cause:** The v1 `audit_logs` table existed (`api/src/services/audit.js`) but was only called from the bot ingestion endpoint — not from admin CRUD operations on scholarships, users, or subscriptions.

**v2 Solution:**
1. **`audit_logs` table** with columns: `admin_email`, `action`, `target_type`, `target_id`, `details` (JSONB), `ip_address`, `created_at`.
2. **Every admin Edge Function call** writes to `audit_logs` BEFORE executing the action. Failed actions are also logged (with `success: false` in details).
3. The audit log is **append-only** — no UPDATE or DELETE policies for any role except `service_role`.

**v1 Broken Code:**

```js
// api/src/routes/admin/scholarships.js — No audit logging
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data, error } = await supabaseAdmin
    .from('scholarships')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  // ⚠️ No audit log written — no record of who changed this scholarship
  return res.json({ scholarship: data });
});
```

**v2 Fixed Code:**

```sql
-- audit_logs table with append-only RLS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users can read their own audit entries; service_role reads all; no UPDATE/DELETE
CREATE POLICY "Users read own audit entries" ON public.audit_logs
  FOR SELECT USING (auth.uid()::text = target_id);

CREATE POLICY "Service role manages audit logs" ON public.audit_logs
  FOR ALL USING (auth.role() = 'service_role');
```

```typescript
// supabase/functions/admin-operations/index.ts — Audit logging wrapper
async function withAudit(
  action: string,
  targetType: string,
  targetId: string,
  adminEmail: string,
  ipAddress: string,
  fn: () => Promise<any>
) {
  const startTime = Date.now();

  try {
    const result = await fn();

    // ✅ Log successful action
    await supabaseAdmin.from('audit_logs').insert({
      admin_email: adminEmail,
      action,
      target_type: targetType,
      target_id: targetId,
      details: {
        success: true,
        duration_ms: Date.now() - startTime,
        result_summary: summarize(result),
      },
      ip_address: ipAddress,
    });

    return result;
  } catch (err) {
    // ✅ Log failed action
    await supabaseAdmin.from('audit_logs').insert({
      admin_email: adminEmail,
      action,
      target_type: targetType,
      target_id: targetId,
      details: {
        success: false,
        error: err.message,
        duration_ms: Date.now() - startTime,
      },
      ip_address: ipAddress,
    });

    throw err;
  }
}

// Usage
async function handleUpdateScholarship(payload, admin) {
  return withAudit(
    'update_scholarship',
    'scholarships',
    payload.id,
    admin.email,
    admin.ip,
    async () => {
      const { data, error } = await supabaseAdmin
        .from('scholarships')
        .update(payload.updates)
        .eq('id', payload.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  );
}
```

---

### I3. Bot Findings Published Without Review

**Symptom:** Bot-ingested scholarships went directly into the published scholarship feed with `published: false` being a database-level default that could be overridden in the API call. There was no admin review queue — the `published` flag had to be manually checked in the Supabase dashboard.

**Root Cause:** See **K2** — the bot ingestion endpoint set `published: false` as a default, but the admin UI (UploadModal) did NOT respect this. The CSV/JSON upload path had no `published` flag at all — all uploaded scholarships were immediately visible.

**v2 Solution:** See **K1, K2, K3.**

---

## J. Documentation

### J1. Specs Scattered Across Multiple Docs, Contradictory

**Symptom:** Requirements were split across the BRD (`01_BRD.md`), PRD (`02_PRD.md`), Checkpoints (`07_CHECKPOINTS.md`), and a separate Production Audit document. Features described differently in each. No developer knew which document was authoritative.

**Root Cause:** Documents were written independently at different times without cross-referencing. The BRD described v1 features that were never built. The PRD described v2 features that contradicted the BRD. Checkpoints referenced both.

**v2 Solution:**
1. **Single `docs/` folder** numbered in reading order. Each document has a clear, non-overlapping scope:
   - `00_MISSION_AND_VISION.md` — Why this exists
   - `01_BRD.md` — Business requirements
   - `02_PRD.md` — Product specification
   - `03_ARCHITECTURE.md` — Technical architecture (authoritative for devs)
   - `04_SECURITY_RULES.md` — Security specification
   - `05_PAYMENT_PLANS.md` — Pricing & monetization
   - `06_WORKFLOW.md` — Development process
   - `07_CHECKPOINTS.md` — Implementation gates
   - `08_PRIVACY_POLICY.md` — Legal
   - `09_TERMS_OF_SERVICE.md` — Legal
   - `10_FAQ.md` — User-facing FAQ
   - `11_DESIGN_SYSTEM.md` — UI/UX spec
   - `12_SUPABASE_SCHEMA.md` — Database migration
   - `13_LESSONS_LEARNED.md` — **This document** (read FIRST)
2. **If two docs contradict, the higher-numbered doc wins** (later docs supersede earlier ones for specific technical details).
3. Each doc states its audience and dependencies.

**v1 Approach (Broken):**
```
Zawadi/
├── docs/
│   ├── BRD.md              ← Described v1 features
│   ├── PRD.md              ← Described v2 features, contradicted BRD
│   ├── checkpoints.md      ← Mixed v1 and v2 requirements
│   └── production-audit.md ← Found post-launch issues not in any spec
└── README.md               ← Out of date, referenced Express ("API on port 3001")
```

**v2 Approach (Fixed):**
```
Zawadi-v2/docs/
├── 00_MISSION_AND_VISION.md
├── 01_BRD.md
├── 02_PRD.md
├── 03_ARCHITECTURE.md       ← Authoritative for developers
├── 04_SECURITY_RULES.md
├── 05_PAYMENT_PLANS.md
├── 06_WORKFLOW.md
├── 07_CHECKPOINTS.md
├── 08_PRIVACY_POLICY.md
├── 09_TERMS_OF_SERVICE.md
├── 10_FAQ.md
├── 11_DESIGN_SYSTEM.md
├── 12_SUPABASE_SCHEMA.md
└── 13_LESSONS_LEARNED.md   ← READ FIRST
```

---

### J2. Legal Pages Missing at Launch

**Symptom:** Privacy Policy, Terms of Service, and FAQ pages existed as HTML files in `public/` but returned 404 in production (see **F1**). Even if they had been accessible, they were not linked consistently across the application.

**Root Cause:** The legal pages were an afterthought — created after the main app was built, with no deployment verification. No checkpoint required them to be accessible.

**v2 Solution:**
1. Legal pages are **Checkpoint 8** — must pass before Checkpoint 12 (Launch).
2. Each legal page is a complete static HTML file in `public/` with proper styling, content, and navigation.
3. `vercel.json` has explicit routes for each page (verified at checkpoint).
4. Every footer in the application links to these pages.
5. During signup, the registration form includes a required checkbox: "I agree to the Terms of Service and Privacy Policy."

**v1 Broken (Late, Untested):**

```html
<!-- public/privacy.html — Existed but returned 404 in production -->
<!doctype html>
<html lang="en">
  <!-- ... valid privacy content ... -->
</html>
```

**v2 Fixed (Checkpoint-Gated):**

```md
# Checkpoint 8: Legal & Static Pages

| Gate | Criteria |
|------|----------|
| CP8.1 | /privacy returns 200 with valid HTML |
| CP8.2 | /terms returns 200 with valid HTML |
| CP8.3 | /faq returns 200 with valid HTML |
| CP8.4 | /about returns 200 with valid HTML |
| CP8.5 | /contact returns 200 with valid HTML |
| CP8.6 | All pages link to each other (privacy ↔ terms) |
| CP8.7 | Registration form requires Terms acceptance checkbox |
| CP8.8 | Footer on every page links to Privacy & Terms |
| CP8.9 | Meta tags (description, theme-color) present on each page |
```

---

## K. Bot Ingestion

### K1. Unvetted Content Going Live

**Symptom:** Bot-found scholarships appeared immediately in the public feed. Some had incorrect deadlines (e.g., "2025-01-01" for a 2026 scholarship), broken `apply_url` links, or wrong funding amounts. Users saw unreliable data.

**Root Cause:** The v1 bot ingestion endpoint (`api/src/routes/bot/index.js` line 78) set `published: false` by default, but the CSV/JSON upload path in the admin panel did NOT (line 358-363). The `ScholarshipEditor` had no draft/preview mode — saving immediately published. And the main scholarship query only filtered `published !== false` client-side (line 190), meaning any misconfigured rows could leak through.

**v2 Solution:**
1. **All bot-ingested scholarships default to `published = false`.** This is enforced at the database level (`DEFAULT false` in schema).
2. **CSV uploads also default to `published = false`.** They appear in the **admin ingestion review queue**, not the public feed.
3. **The public scholarship query enforces `published = true` at the database level** via RLS policy — client-side filtering is NOT relied upon.
4. Admin reviews each entry in the `bot_ingestions` table before publishing.

**v1 Broken Code:**

```js
// client/src/main.jsx lines 189-190 — Client-side published filter (brittle)
const scholarships = (s || []).filter(row => row.published !== false);
// ⚠️ If `published` is undefined (not explicitly false), it passes through
// ⚠️ If a row has published: null, it's visible to everyone

// client/src/main.jsx lines 357-363 — CSV upload has NO published flag
if (method === "PATCH" && path.startsWith("/api/scholarships/")) {
  const id = path.split("/").pop();
  const { error } = await supabase.from("scholarships")
    .update(body).eq("id", id);
  // ⚠️ If body doesn't include published, it stays whatever it was
  return { ok: true };
}
```

**v2 Fixed Code:**

```sql
-- Database-level enforcement
CREATE TABLE IF NOT EXISTS public.scholarships (
  -- ...
  published BOOLEAN DEFAULT false,  -- ✅ Default: NOT visible
  -- ...
);

-- ✅ RLS policy enforces published filter at database level
CREATE POLICY "Anyone can read published scholarships" ON public.scholarships
  FOR SELECT USING (published = true);
-- Even if a client somehow queries without the filter, RLS blocks unpublished rows
```

```typescript
// supabase/functions/ingest-scholarship/index.ts — All ingestions default to unpublished
serve(async (req) => {
  const { scholarships } = await req.json();

  const rows = scholarships.map((s: any) => ({
    ...normalizeIngestedScholarship(s),
    published: false,                      // ✅ Always unpublished
    created_by: 'bot-ingestion',
    created_at: new Date().toISOString(),
  }));

  // Insert into scholarships table (not visible due to RLS)
  const { error: insertError } = await supabaseAdmin
    .from('scholarships')
    .insert(rows);

  if (insertError) return error(500, 'Insert failed');

  // Also log to bot_ingestions review queue
  await supabaseAdmin.from('bot_ingestions').insert(
    rows.map((r: any) => ({
      scholarship_name: r.name,
      host: r.host,
      source_url: r.apply_url,
      status: 'pending',                   // ✅ Awaiting admin review
    }))
  );

  return ok({ count: rows.length, message: `${rows.length} scholarships queued for review` });
});
```

---

### K2. Deduplication Missing Edge Cases

**Symptom:** The same scholarship appeared multiple times with slightly different names: "Rhodes Scholarship 2026" and "The Rhodes Scholarship — 2026" and "Rhodes Scholarship (2026 intake)." Users saw duplicate entries in the scholarship grid.

**Root Cause:** The v1 bot ingestion had no deduplication logic. The `scholarships` table had no `UNIQUE` constraint on `(name, host)`. The CSV upload parsed columns independently without checking for existing entries.

**v2 Solution:**
1. **Database constraint:** `UNIQUE(scholarship_name, host)` on the `bot_ingestions` table.
2. **Normalized comparison before insert:** Lowercase both name and host, strip special characters (`-`, `(`, `)`, `—`, multiple spaces), and compare.
3. **Fuzzy matching** for names that differ by only punctuation or common suffixes like `" 2026"`.
4. The ingest Edge Function checks existing `(name, host)` before inserting. If a match is found, it logs the duplicate and skips insert.

**v1 Broken Code:**

```js
// api/src/routes/bot/index.js lines 85-93 — No dedup check
const { data: inserted, error: insertError } = await supabaseAdmin
  .from('scholarships')
  .insert(validated)          // ⚠️ Blind insert — duplicates possible
  .select();
```

```sql
-- v1 schema — No UNIQUE constraint on name+host
CREATE TABLE scholarships (
  id UUID PRIMARY KEY,
  name TEXT,
  host TEXT
  -- ❌ No UNIQUE(name, host)
);
```

**v2 Fixed Code:**

```sql
-- Unique constraint prevents exact duplicates
ALTER TABLE public.scholarships
  ADD CONSTRAINT unique_scholarship_name_host UNIQUE (name, host);
```

```typescript
// supabase/functions/ingest-scholarship/index.ts — Dedup logic
function normalizeForDedup(text: string): string {
  return text
    .toLowerCase()
    .replace(/[—–\-\(\)\[\]]/g, ' ')   // Replace dashes/parens with spaces
    .replace(/\s+/g, ' ')              // Collapse multiple spaces
    .replace(/\b\d{4}\b/g, '')         // Remove years (2025, 2026)
    .replace(/\bintake\b/gi, '')       // Remove "intake"
    .trim();
}

async function deduplicateScholarships(scholarships: any[]) {
  const deduped = [];
  const seen = new Set();

  for (const s of scholarships) {
    const dedupKey = `${normalizeForDedup(s.name)}|||${normalizeForDedup(s.host)}`;

    if (seen.has(dedupKey)) {
      console.log(`[DEDUP] Skipped duplicate: "${s.name}" (${s.host})`);
      continue;
    }
    seen.add(dedupKey);

    // Also check against existing database entries
    const { data: existing } = await supabaseAdmin
      .from('scholarships')
      .select('id, name')
      .ilike('name', `%${s.name.slice(0, 20)}%`)
      .ilike('host', `%${s.host.slice(0, 20)}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[DEDUP] Skipped DB duplicate: "${s.name}" matches existing "${existing[0].name}"`);
      continue;
    }

    deduped.push(s);
  }

  return deduped;
}
```

---

### K3. No Admin Review Queue

**Symptom:** There was no list view where admins could see pending bot ingestions, review them, and either approve (publish) or reject (archive). The only way to manage bot content was through the regular scholarship editor.

**Root Cause:** The `bot_ingestions` table existed (in v1's Supabase) but had no admin UI. The admin panel (`admin.html`) was a placeholder. The main app's `UploadModal` was the only bulk upload interface, and it published immediately.

**v2 Solution:**
1. **`bot_ingestions` table** with columns: `scholarship_name`, `host`, `source_url`, `status` (`pending | approved | rejected`), `admin_notes`, `created_at`, `reviewed_at`.
2. **Admin review UI** in the admin panel: a paginated list of pending ingestions with "Approve" and "Reject" buttons. Approve → sets `published = true` on the scholarship. Reject → sets status to `rejected` with admin notes.
3. The admin Edge Function `admin-operations` handles `approve_ingestion` and `reject_ingestion` actions.
4. Dashboard shows "N pending reviews" badge for admin users.

**v1 Broken (No Review Queue):**

```
// v1 admin flow:
// Bot posts → scholarships table (published: false) → ??? → admin manually finds them
// No UI for this. Admins had to use Supabase dashboard SQL queries.
```

**v2 Fixed Code:**

```sql
-- bot_ingestions table serves as the review queue
CREATE TABLE IF NOT EXISTS public.bot_ingestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_name TEXT NOT NULL,
  host TEXT NOT NULL,
  source_url TEXT,
  status TEXT DEFAULT 'pending',     -- pending | approved | rejected
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(scholarship_name, host)    -- Dedup at DB level
);
```

```jsx
// admin/components/IngestionQueue.jsx — Admin review UI
import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../api/adminClient';
import { Check, X, ExternalLink } from 'lucide-react';

export function IngestionQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabaseAdmin
        .from('bot_ingestions')
        .select('*, scholarships!inner(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setItems(data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  async function handleApprove(ingestion) {
    await supabaseAdmin.functions.invoke('admin-operations', {
      body: { action: 'approve_ingestion', payload: { ingestionId: ingestion.id } },
    });
    setItems(items.filter((i) => i.id !== ingestion.id));
  }

  async function handleReject(ingestion, notes) {
    await supabaseAdmin.functions.invoke('admin-operations', {
      body: {
        action: 'reject_ingestion',
        payload: { ingestionId: ingestion.id, notes },
      },
    });
    setItems(items.filter((i) => i.id !== ingestion.id));
  }

  if (loading) return <SkeletonQueue />;

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <h3>No pending reviews</h3>
        <p>All bot ingestions have been reviewed. Great work!</p>
      </div>
    );
  }

  return (
    <div className="ingestion-queue">
      <h2>Pending Reviews ({items.length})</h2>
      {items.map((item) => (
        <div key={item.id} className="ingestion-card">
          <div className="ingestion-info">
            <h4>{item.scholarship_name}</h4>
            <p>Host: {item.host}</p>
            <a href={item.source_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} /> Source
            </a>
            <span className="timestamp">
              Submitted: {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="ingestion-actions">
            <button className="approve-btn" onClick={() => handleApprove(item)}>
              <Check size={16} /> Approve
            </button>
            <button className="reject-btn" onClick={() => handleReject(item, 'Not relevant')}>
              <X size={16} /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Summary: v1 vs v2 — Side by Side

| # | Category | v1 Problem | v2 Solution |
|---|----------|-----------|-------------|
| A1 | Architecture | Express.js on Vercel → CJS/ESM conflicts, DOMMatrix, 404s | Pure static SPA + Supabase Edge Functions |
| A2 | Architecture | 3+ failed deployments on same broken pattern | Two-strike rule: pivot after 2 failures |
| A3 | Architecture | Ad-hoc 400-line `if/else` API in React file | Explicit Edge Function catalog with typed contracts |
| B1 | Auth | `getUser()` after `signIn()` → null → blank page | Use `data.user` from sign-in response directly |
| B2 | Auth | `user_profiles` table doesn't exist → crash | DB trigger creates profile on signup; defensive fallback |
| B3 | Auth | No session management plan, prop drilling everywhere | `AuthContext` + `useAuth()` hook |
| C1 | Data Shape | Supabase flat rows vs nested objects → undefined.property | Normalize ALL data at API boundary before state |
| C2 | Data Shape | `computeStats()` crashes on missing fields | `deriveStats()` on already-normalized data |
| C3 | Data Shape | No normalization layer | `normalize*()` functions as data transformation layer |
| D1 | React State | Async callback throws → tree unmounts → blank page | `<ErrorBoundary>` + try/catch at every call site |
| D2 | React State | No loading/error/empty states | Tri-state pattern: skeleton → error → empty → data |
| E1 | Env Vars | Non-VITE vars = undefined in browser | `.env` contains ONLY `VITE_`-prefixed variables |
| E2 | Env Vars | Service role in `.env` — one typo from disaster | Secrets in Edge Function env vars only; pre-build check |
| F1 | Deployment | Static pages 404 (rewrites routing) | `vercel.json` with `handle: filesystem`; pure static |
| F2 | Deployment | `dist/` in git (stale builds committed) | `dist/` in `.gitignore` from Checkpoint 0 |
| G1 | Payments | User pays for same/lower tier | Client + Edge Function tier validation |
| G2 | Payments | No webhook idempotency → duplicate events | `webhook_event_id UNIQUE`; idempotent handler |
| G3 | Payments | Plan mismatch: Paystack vs DB vs UI | Single `plans.js` config; metadata-driven tier mapping |
| H1 | UI/UX | No upgrade path from limits | Contextual upgrade modals with specific benefit messaging |
| H2 | UI/UX | Footer links broken (404) | Static HTML pages + verified `vercel.json` routes |
| H3 | UI/UX | Mobile unresponsive | Tailwind responsive utilities; hamburger drawer sidebar |
| I1 | Admin | Admin code leaked to user bundle | Separate Vite entry point; zero admin code in user app |
| I2 | Admin | No audit trail | `audit_logs` table; every admin action logged |
| I3 | Admin | Bot findings published without review | `bot_ingestions` review queue; `published: false` default |
| J1 | Docs | Specs scattered, contradictory | Numbered `docs/` folder; later docs supersede earlier |
| J2 | Docs | Legal pages missing at launch | Checkpoint 8: legal pages gated before launch |
| K1 | Bot | Unvetted content going live | RLS `published = true` filter; all ingestions default unpublished |
| K2 | Bot | Dedup missing edge cases | `UNIQUE(name, host)` + normalized fuzzy comparison |
| K3 | Bot | No admin review queue | `bot_ingestions` table + admin review UI with approve/reject |

---

*Every line of this document was paid for with real debugging hours. A developer who reads this before writing code saves 40+ hours of debugging. Don't repeat v1.*
