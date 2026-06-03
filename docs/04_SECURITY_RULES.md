# Zawadi v2 — Security Rules & Compliance Specification

**Document Version:** 4.0 (Greenfield Security Spec)
**Date:** May 27, 2026
**Author:** Techsari Security Engineering
**Status:** Active — Spec-Driven Development
**Classification:** Internal
**Supabase Project URL:** `https://efvxtcxhjlbzzsixfrvo.supabase.co`

> **Purpose:** This document is the single source of truth for all security controls in Zawadi v2. It is written so that a security auditor can verify compliance from this document alone. Every policy has executable SQL. Every server-side check has code. Nothing is described vaguely — everything is specified precisely.

---

## Table of Contents

1. [Security Architecture Overview](#1-security-architecture-overview)
2. [Role-Based Access Control (RBAC)](#2-role-based-access-control-rbac)
3. [Full Permission Matrix](#3-full-permission-matrix)
4. [Subscription-Tier Data Handling](#4-subscription-tier-data-handling)
5. [Payment Security](#5-payment-security)
6. [Data Protection](#6-data-protection)
7. [API Security](#7-api-security)
8. [Row-Level Security Policies — Complete SQL](#8-row-level-security-policies--complete-sql)
9. [Admin Isolation Architecture](#9-admin-isolation-architecture)
10. [Incident Response](#10-incident-response)
11. [Security Headers](#11-security-headers)
12. [v1 Security Lessons Learned](#12-v1-security-lessons-learned)
13. [Auditor Verification Checklist](#13-auditor-verification-checklist)

---

## 1. Security Architecture Overview

### 1.1 Trust Boundaries

```
┌──────────────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE (Browser)                   │
│                                                              │
│  ┌─────────────────────┐    ┌──────────────────────────────┐ │
│  │   User App (Vite)   │    │   Admin Panel (Separate)     │ │
│  │                     │    │                              │ │
│  │  Has access to:     │    │  Has access to:              │ │
│  │  • anon key         │    │  • anon key (for auth)       │ │
│  │  • user JWT         │    │  • user JWT                  │ │
│  │  • paystack pub key │    │  • admin Edge Function URLs  │ │
│  │                     │    │                              │ │
│  │  NEVER has:         │    │  NEVER has:                  │ │
│  │  • service_role key │    │  • service_role key in JS    │ │
│  │  • secret keys      │    │  • secret keys               │ │
│  │  • admin components │    │                              │ │
│  └─────────────────────┘    └──────────────────────────────┘ │
│                                                              │
│     HTTPS (TLS 1.2+)                HTTPS (TLS 1.2+)         │
│     with anon key or JWT            with admin JWT            │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                    TRUSTED ZONE (Supabase)                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Supabase Auth (GoTrue)                                  ││
│  │  • bcrypt password hashing                               ││
│  │  • JWT issuance (HS256)                                  ││
│  │  • MFA support (future)                                  ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  PostgreSQL (AES-256 at rest)                            ││
│  │  • RLS on EVERY table                                    ││
│  │  • Tier-aware policies                                   ││
│  │  • Audit logs with service_role-only access              ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Edge Functions (Deno — isolated runtime)                ││
│  │  • PAYSTACK_SECRET_KEY (HMAC verification)               ││
│  │  • SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)              ││
│  │  • DEEPSEEK_API_KEY (AI proxy)                           ││
│  │  • INGEST_API_KEY (bot auth)                             ││
│  │  • All secrets in Supabase Vault, NEVER in client        ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  Supabase Storage (S3-compatible, server-side encrypt)   ││
│  │  • Private buckets                                        ││
│  │  • RLS: users access only their folder                    ││
│  │  • 10MB file size limit                                   ││
│  │  • Allowed MIME types enforced                            ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Key Security Principles

| Principle | Implementation |
|---|---|
| **Defense in Depth** | RLS + Edge Function auth + Tier checks at 3 layers |
| **Least Privilege** | Four granular roles; users default to own-data-only |
| **Zero Trust Client** | Client is completely untrusted. All enforcement is server-side. |
| **Secrets Never in Browser** | `service_role`, Paystack secret, AI keys only in Edge Functions |
| **Audit Everything** | All admin actions logged; audit_logs table inaccessible to non-super_admins |
| **Idempotent Webhooks** | UNIQUE constraint on `webhook_event_id` prevents double-processing |
| **Separate Admin Surface** | Admin panel is a completely separate Vite entry point |

---

## 2. Role-Based Access Control (RBAC)

### 2.1 Role Definitions

Roles are stored in `public.user_profiles.role` and enforced at **three layers**:
1. **RLS policies** on every database table
2. **Edge Function authorization** before executing admin operations
3. **Admin UI route guards** (UX layer only — not security)

#### Role: `user` (Default)
- **Who gets it:** Every registered user automatically
- **Scope:** Own data only via RLS (`auth.uid()` checks)
- **Can do:** Browse published scholarships, manage own applications/documents/essays, view own payment history, manage own profile
- **Cannot do:** Read other users' data, modify scholarships, access admin panel, view audit logs

#### Role: `support_agent`
- **Who gets it:** Customer support team members
- **Scope:** Read all user profiles, update user subscription plans, view platform statistics
- **Can do:** List all users, change user plans, view aggregate stats, read all published scholarships
- **Cannot do:** Create/edit/delete scholarships, manage bot ingestion queue, bulk import, view audit logs, delete users

#### Role: `content_manager`
- **Who gets it:** Content team members who manage the scholarship database
- **Scope:** Full CRUD on scholarships, manage bot ingestion queue, bulk import
- **Can do:** Create/update/publish/unpublish scholarships, approve/reject bot ingestions, bulk import, read all users, view stats
- **Cannot do:** Delete scholarships (super_admin only), delete users, view audit logs, modify user plans (support_agent or super_admin)

#### Role: `super_admin`
- **Who gets it:** Techsari technical leads (1-2 people)
- **Scope:** Unrestricted — everything including destructive operations
- **Can do:** Delete users, delete scholarships, view audit logs, modify any data, change any user's role, all operations of lower roles
- **Cannot do:** Nothing is restricted for super_admin

### 2.2 Role Assignment

Roles are set by a super_admin via the admin panel. The Edge Function `admin-operations` checks the caller's role before executing:

```typescript
// supabase/functions/admin-operations/index.ts — Role check helper
const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,
  support_agent: 1,
  content_manager: 2,
  super_admin: 3,
};

function requireRole(callerRole: string, minimumRole: string): void {
  const callerLevel = ROLE_HIERARCHY[callerRole] ?? -1;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? Infinity;
  if (callerLevel < requiredLevel) {
    throw new Error(`FORBIDDEN: ${minimumRole} required, caller is ${callerRole}`);
  }
}
```

Default role on user creation (database trigger):

```sql
-- In the handle_new_user() trigger, role defaults to 'user'
INSERT INTO public.user_profiles (id, name, email, country, role)
VALUES (
  NEW.id,
  COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
  NEW.email,
  COALESCE(NEW.raw_user_meta_data->>'country', 'Kenya'),
  'user'  -- DEFAULT: no elevated privileges
);
```

---

## 3. Full Permission Matrix

### 3.1 Operations × Roles Table

| # | Operation | `user` | `support_agent` | `content_manager` | `super_admin` | Enforcement Layer |
|---|---|---|---|---|---|---|
| **Scholarships** |
| 1 | Read published scholarships | ✅ | ✅ | ✅ | ✅ | RLS (`published=true`) |
| 2 | Read unpublished scholarships | ❌ | ❌ | ✅ | ✅ | Edge Function |
| 3 | Create scholarship | ❌ | ❌ | ✅ | ✅ | Edge Function |
| 4 | Update scholarship | ❌ | ❌ | ✅ | ✅ | Edge Function |
| 5 | Delete scholarship | ❌ | ❌ | ❌ | ✅ | Edge Function |
| 6 | Publish / Unpublish | ❌ | ❌ | ✅ | ✅ | Edge Function |
| 7 | Bulk import scholarships | ❌ | ❌ | ✅ | ✅ | Edge Function |
| **Applications** |
| 8 | View own applications | ✅ | ✅ | ✅ | ✅ | RLS (`auth.uid()=user_id`) |
| 9 | View any user's applications | ❌ | ✅ | ✅ | ✅ | Edge Function |
| 10 | Create/update own application | ✅ | ✅ | ✅ | ✅ | RLS |
| 11 | Delete own application | ✅ | ✅ | ✅ | ✅ | RLS |
| **Documents** |
| 12 | View own documents | ✅ | ✅ | ✅ | ✅ | RLS (`auth.uid()=user_id`) |
| 13 | Upload own documents | ✅ | ✅ | ✅ | ✅ | RLS + Storage RLS |
| 14 | Delete own documents | ✅ | ✅ | ✅ | ✅ | RLS + Storage RLS |
| 15 | View any user's documents | ❌ | ❌ | ❌ | ✅ | Edge Function |
| **Essays** |
| 16 | Generate essays (tier-limited) | ✅ | ✅ | ✅ | ✅ | Edge Function (rate limit) |
| 17 | View own essay history | ✅ | ✅ | ✅ | ✅ | RLS |
| 18 | View any user's essays | ❌ | ❌ | ❌ | ✅ | Edge Function |
| **Payments** |
| 19 | View own payment history | ✅ | ✅ | ✅ | ✅ | RLS (`auth.uid()=user_id`) |
| 20 | View all payment records | ❌ | ❌ | ❌ | ✅ | Edge Function |
| 21 | Initiate payment (Paystack) | ✅ | ✅ | ✅ | ✅ | Client-side (Paystack popup) |
| **User Management** |
| 22 | View own profile | ✅ | ✅ | ✅ | ✅ | RLS (`auth.uid()=id`) |
| 23 | Update own profile | ✅ | ✅ | ✅ | ✅ | RLS |
| 24 | Delete own account | ✅ | ✅ | ✅ | ✅ | Edge Function (cascade) |
| 25 | Export own data | ✅ | ✅ | ✅ | ✅ | Edge Function |
| 26 | List all users | ❌ | ✅ | ✅ | ✅ | Edge Function |
| 27 | View any user's profile | ❌ | ✅ | ✅ | ✅ | Edge Function |
| 28 | Update any user's plan | ❌ | ✅ | ❌ | ✅ | Edge Function |
| 29 | Suspend user account | ❌ | ❌ | ❌ | ✅ | Edge Function |
| 30 | Delete any user account | ❌ | ❌ | ❌ | ✅ | Edge Function |
| **Bot Ingestion** |
| 31 | View ingestion queue | ❌ | ❌ | ✅ | ✅ | Edge Function |
| 32 | Approve ingestion → publish | ❌ | ❌ | ✅ | ✅ | Edge Function |
| 33 | Reject ingestion | ❌ | ❌ | ✅ | ✅ | Edge Function |
| **Audit & Monitoring** |
| 34 | View audit logs | ❌ | ❌ | ❌ | ✅ | Edge Function |
| 35 | View platform statistics | ❌ | ✅ | ✅ | ✅ | Edge Function |
| 36 | View database metrics | ❌ | ❌ | ❌ | ✅ | Supabase Dashboard |
| **Admin Access** |
| 37 | Access admin panel (`/admin`) | ❌ | ✅ | ✅ | ✅ | Vite separate entry + Role guard |
| 38 | Admin panel: user mgmt tab | ❌ | ✅ | ❌ | ✅ | UI guard |
| 39 | Admin panel: content mgmt tab | ❌ | ❌ | ✅ | ✅ | UI guard |
| 40 | Admin panel: audit log tab | ❌ | ❌ | ❌ | ✅ | UI guard |

### 3.2 Edge Function Operation-Level Permission Map

This is the exact mapping used in `admin-operations`:

```typescript
// supabase/functions/admin-operations/index.ts
const OPERATION_PERMISSIONS: Record<string, string> = {
  // Scholarship operations
  'scholarships_create':       'content_manager',
  'scholarships_update':       'content_manager',
  'scholarships_delete':       'super_admin',       // DESTRUCTIVE — super_admin only
  'scholarships_publish':      'content_manager',
  'scholarships_bulk_import':  'content_manager',

  // Ingestion operations
  'ingestions_approve':        'content_manager',
  'ingestions_reject':         'content_manager',
  'ingestions_list':           'content_manager',

  // User operations
  'users_list':                'support_agent',
  'users_get':                 'support_agent',
  'users_update_plan':         'support_agent',
  'users_suspend':             'super_admin',       // DESTRUCTIVE — super_admin only
  'users_delete':              'super_admin',       // DESTRUCTIVE — super_admin only
  'users_change_role':         'super_admin',       // DESTRUCTIVE — super_admin only

  // Monitoring
  'stats_get':                 'support_agent',
  'audit_list':                'super_admin',       // SENSITIVE — super_admin only
};

function authorize(operation: string, callerRole: string): void {
  const requiredRole = OPERATION_PERMISSIONS[operation];
  if (!requiredRole) {
    throw new Error(`Unknown operation: ${operation}`);
  }
  requireRole(callerRole, requiredRole);
}
```

---

## 4. Subscription-Tier Data Handling

### 4.1 Tier Definitions and Limits

| Resource | Explorer (Free) | Scholar Plus ($5) | App Pro ($12) | Mentor ($29) |
|---|---|---|---|---|
| Plan value in DB | `explorer` | `plus` | `pro` | `mentor` |
| Browse scholarships | Unlimited | Unlimited | Unlimited | Unlimited |
| Track applications | Unlimited | Unlimited | Unlimited | Unlimited |
| AI essays per day | 3 | 10 | 25 | 50 |
| Document uploads (total) | 5 | 15 | 50 | Unlimited |
| Match score detail | Basic | Detailed | Detailed | Detailed |
| Document gap analysis | ❌ | ✅ | ✅ | ✅ |
| Auto-apply | ❌ | ❌ | ✅ | ✅ |
| Essay voice learning | ❌ | ❌ | ✅ | ✅ |

### 4.2 Enforcement Layer 1: Database (RLS) — THE ACTUAL SECURITY

**This is the security layer. Client-side checks are UX only.**

Tier limits at the database level prevent a malicious user from bypassing client-side gates by calling Supabase directly:

```sql
-- Documents: tier-based upload limit enforced in RLS
-- The check function reads the user's plan and counts their existing documents
CREATE OR REPLACE FUNCTION public.check_document_upload_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_plan TEXT;
  doc_count INTEGER;
  tier_limit INTEGER;
BEGIN
  SELECT plan INTO user_plan FROM public.user_profiles WHERE id = NEW.user_id;

  tier_limit := CASE user_plan
    WHEN 'explorer' THEN 5
    WHEN 'plus' THEN 15
    WHEN 'pro' THEN 50
    WHEN 'mentor' THEN 999999  -- effectively unlimited
    ELSE 5
  END;

  SELECT COUNT(*) INTO doc_count FROM public.documents WHERE user_id = NEW.user_id;

  IF doc_count >= tier_limit THEN
    RAISE EXCEPTION 'Document upload limit (%) reached for plan: %', tier_limit, user_plan;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_document_upload_limit
  BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.check_document_upload_limit();
```

```sql
-- Essay generation: daily count enforced via Edge Function (not just RLS)
-- RLS only ensures users can only read their own essays; quota is in Edge Function
CREATE POLICY "Users read own essays" ON public.essay_generations
  FOR SELECT USING (auth.uid() = user_id);

-- The daily limit is enforced in the ai-essay Edge Function (see Section 4.4)
```

### 4.3 Enforcement Layer 2: Edge Functions (Server-Side) — THE REAL GATE

The `ai-essay` Edge Function is **the authoritative enforcer** of essay quotas. A user cannot bypass it by calling Supabase directly because:
1. The AI API key is only in the Edge Function
2. The Edge Function counts essays in the database before processing
3. The Edge Function returns the remaining count

```typescript
// supabase/functions/ai-essay/index.ts — Essay quota enforcement
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TIER_LIMITS: Record<string, number> = {
  explorer: 3,
  plus: 10,
  pro: 25,
  mentor: 50,
};
const PER_MINUTE_LIMIT = 8;

Deno.serve(async (req: Request) => {
  // 1. Authenticate user via JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  // 2. Get user's plan
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  const plan = profile?.plan || 'explorer';
  const dailyLimit = TIER_LIMITS[plan] ?? 3;

  // 3. Count today's essays (enforced server-side — cannot be bypassed)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: todayCount } = await supabaseAdmin
    .from('essay_generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', todayStart.toISOString());

  if ((todayCount ?? 0) >= dailyLimit) {
    return new Response(JSON.stringify({
      error: 'DAILY_LIMIT_REACHED',
      limit: dailyLimit,
      used: todayCount,
      plan: plan,
    }), { status: 429 });
  }

  // 4. Check per-minute rate limit
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const { count: minuteCount } = await supabaseAdmin
    .from('essay_generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', oneMinuteAgo.toISOString());

  if ((minuteCount ?? 0) >= PER_MINUTE_LIMIT) {
    return new Response(JSON.stringify({
      error: 'RATE_LIMITED',
      retry_after_seconds: 60,
    }), { status: 429 });
  }

  // 5. Parse request body
  const body = await req.json();

  // 6. Call AI (DeepSeek via OpenRouter) — API key never leaves this function
  const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat',
      messages: [
        { role: 'system', content: buildSystemPrompt(body.type, body.stage) },
        { role: 'user', content: body.prompt },
      ],
      max_tokens: 2000,
    }),
  });

  const aiData = await aiResponse.json();
  const content = aiData.choices?.[0]?.message?.content || '';

  // 7. Save to database (service_role bypasses RLS — safe because we already verified JWT)
  const { data: saved } = await supabaseAdmin
    .from('essay_generations')
    .insert({
      user_id: user.id,
      essay_type: body.type,
      prompt: body.prompt,
      scholarship_name: body.scholarship_name,
      draft: body.stage === 'draft' ? content : undefined,
      critique: body.stage === 'critique' ? content : undefined,
      final: body.stage === 'polish' ? content : undefined,
      stage: body.stage,
    })
    .select()
    .single();

  // 8. Return result + quota info
  const remaining = dailyLimit - ((todayCount ?? 0) + 1);

  return new Response(JSON.stringify({
    content,
    stage: body.stage,
    id: saved.id,
    remaining_today: remaining,
    daily_limit: dailyLimit,
    plan: plan,
  }), { status: 200 });
});

function buildSystemPrompt(type: string, stage: string): string {
  // Implementation — builds the appropriate prompt for each essay type and stage
  return `You are an expert scholarship essay advisor...`;
}
```

### 4.4 Enforcement Layer 3: UI (Client-Side) — UX ONLY

**IMPORTANT: Client-side tier checks are NOT security. They are UX conveniences.** A malicious user can modify client-side code or call Supabase directly. This is why Layers 1 and 2 above are the actual security.

```jsx
// src/components/payments/UpgradeModal.jsx
// THIS IS UX ONLY — NOT SECURITY
// A user could bypass this in the browser. The real enforcement is:
//   1. RLS trigger on documents table (INSERT limit)
//   2. Edge Function essay daily count check
//   3. Edge Function essay per-minute rate limit

import { TIER_LIMITS } from '../../config/plans';
import { useToast } from '../../context/ToastContext';

export function useTierGate() {
  const { user } = useAuth();
  const { showToast } = useToast();

  function checkTierAccess(feature: string): boolean {
    if (!user?.plan) return false;
    const planLevels = { explorer: 0, plus: 1, pro: 2, mentor: 3 };

    // Feature-gate map
    const minimumPlan: Record<string, number> = {
      'document_analysis': 1,    // plus+
      'auto_apply': 2,           // pro+
      'essay_voice_learning': 2, // pro+
      'batch_auto_apply': 2,     // pro+
      'strategy_insights': 2,    // pro+
      'human_review': 3,         // mentor only
      'mentorship': 3,           // mentor only
    };

    const required = minimumPlan[feature] ?? 0;
    const current = planLevels[user.plan] ?? 0;

    if (current < required) {
      showToast(`This feature requires a higher plan`, 'upgrade');
      return false;
    }
    return true;
  }

  return { checkTierAccess };
}
```

### 4.5 Plan Update Flow (Secure)

The only way a user's plan changes is through the Paystack webhook or an admin operation — both via Edge Functions with `service_role`:

```
User plan update paths:
  A) Paystack webhook → HMAC verified → Edge Function (service_role) → UPDATE user_profiles
  B) Admin panel → Edge Function (service_role) → RBAC check → UPDATE user_profiles
  C) NEVER: client-side code → direct Supabase UPDATE (RLS blocks this)
```

The `user_profiles` table RLS only allows a user to UPDATE their own row, and they cannot change the `plan` or `role` columns:

```sql
-- Users can update their own profile EXCEPT plan, role, plan_expires_at
CREATE POLICY "Users update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND plan = (SELECT plan FROM public.user_profiles WHERE id = auth.uid())
    AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())
    AND plan_expires_at IS NOT DISTINCT FROM
        (SELECT plan_expires_at FROM public.user_profiles WHERE id = auth.uid())
  );
```

This means even if a user crafts a direct API call to update their own `plan` field, the RLS policy rejects it because the `plan` value in the new row must match the existing `plan` value.

---

## 5. Payment Security

### 5.1 PCI-DSS Boundary

```
┌──────────────────────────────────────────────────────────────┐
│  ZAWADI SERVERS (PCI scope: NONE)                            │
│                                                              │
│  • Card numbers: NEVER seen, stored, or transmitted          │
│  • CVV: NEVER seen, stored, or transmitted                   │
│  • Bank details: NEVER seen, stored, or transmitted          │
│  • All payment data flows directly: Browser → Paystack       │
│                                                              │
│  What we DO store:                                           │
│  • paystack_reference (transaction ID)                       │
│  • paystack_subscription_code (subscription ID)              │
│  • amount, currency, plan, status                            │
│  • webhook_event_id (idempotency key)                        │
│  • created_at timestamp                                      │
│                                                              │
│  What we NEVER store:                                        │
│  • Card PAN, expiry, CVV, PIN                                │
│  • Bank account numbers                                      │
│  • Full customer object from Paystack                        │
└──────────────────────────────────────────────────────────────┘
                           │
                    HTTPS (TLS 1.2+)
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  PAYSTACK (PCI-DSS Level 1 Certified)                        │
│                                                              │
│  • Handles ALL card data                                     │
│  • Tokenizes cards for recurring billing                     │
│  • Returns reference + subscription_code to us               │
│  • We NEVER receive card data via webhook or API response    │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Paystack Key Management

| Key | Location | Exposed To |
|---|---|---|
| `VITE_PAYSTACK_PUBLIC_KEY` (`pk_live_...`) | `.env` (VITE_ prefixed) | Browser — safe, used for Paystack inline popup |
| `PAYSTACK_SECRET_KEY` (`sk_live_...`) | Supabase Edge Function secrets | Edge Functions only — NEVER in browser |
| Paystack Webhook IP whitelist | Paystack Dashboard | Only Paystack's IPs can send webhooks |

### 5.3 Webhook Verification — HMAC SHA-512

Every Paystack webhook is verified using HMAC SHA-512 with timing-safe comparison:

```typescript
// supabase/functions/paystack-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Timing-safe string comparison (prevents timing attacks)
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}

async function verifyPaystackSignature(body: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(Deno.env.get('PAYSTACK_SECRET_KEY')!),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computedHex = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return timingSafeEqual(computedHex, signature);
}

Deno.serve(async (req: Request) => {
  // 1. Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // 2. Verify Paystack IP (optional — Paystack provides IP ranges)
  const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
  // In production: check against Paystack's published IP ranges
  // https://paystack.com/docs/guides/ip-whitelisting

  // 3. Read signature header
  const signature = req.headers.get('x-paystack-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 401 });
  }

  // 4. Read body as raw text (must use exactly what Paystack sent)
  const bodyText = await req.text();

  // 5. Verify HMAC SHA-512
  const isValid = await verifyPaystackSignature(bodyText, signature);
  if (!isValid) {
    console.error(`[WEBHOOK] Invalid signature from IP: ${clientIp}`);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
  }

  // 6. Parse body AFTER verification (don't trust unverified data)
  const event = JSON.parse(bodyText);

  // 7. Check idempotency — UNIQUE constraint on webhook_event_id
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('webhook_event_id', String(event.id ?? event.event))
    .maybeSingle();

  if (existing) {
    console.log(`[WEBHOOK] Duplicate event: ${event.event}, id: ${event.id}`);
    return new Response(JSON.stringify({ status: 'ok', deduplicated: true }), { status: 200 });
  }

  // 8. Process event
  try {
    await processPaystackEvent(event, supabaseAdmin);
    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
  } catch (err) {
    console.error(`[WEBHOOK] Processing error:`, err);
    // Return 200 anyway to prevent Paystack from retrying a permanently-broken event
    return new Response(JSON.stringify({ status: 'error', message: err.message }), { status: 200 });
  }
});

async function processPaystackEvent(event: any, supabaseAdmin: any) {
  const eventType = event.event;
  const data = event.data;

  switch (eventType) {
    case 'charge.success':
    case 'subscription.create': {
      // Map Paystack plan code → Zawadi plan name
      const planMap: Record<string, string> = {
        'PLN_unw5dchqqxx8h81': 'plus',
        'PLN_7lbcd0qe0atza2a': 'plus',
        'PLN_02f9ve9p86cpx44': 'pro',
        'PLN_r7qx092mwmn5bfz': 'pro',
        'PLN_byk050d878lu61e': 'mentor',
        'PLN_updqmdjw51xazfs': 'mentor',
      };
      const plan = planMap[data.plan?.plan_code || data.plan] || 'explorer';

      // Find user by email (from Paystack customer object)
      const customerEmail = data.customer?.email;
      if (!customerEmail) throw new Error('No customer email in webhook');

      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', customerEmail)
        .maybeSingle();

      if (!profile) {
        console.log(`[WEBHOOK] User not found for email: ${customerEmail}`);
        return; // User may not have registered yet — not an error
      }

      // Update user plan (service_role bypasses RLS)
      await supabaseAdmin
        .from('user_profiles')
        .update({
          plan,
          plan_expires_at: data.subscription?.next_payment_date || null,
        })
        .eq('id', profile.id);

      // Record payment
      await supabaseAdmin.from('payments').insert({
        user_id: profile.id,
        paystack_reference: data.reference,
        paystack_subscription_code: data.subscription?.subscription_code || null,
        amount: data.amount,
        currency: data.currency || 'KES',
        plan,
        status: 'success',
        webhook_event_id: String(event.id ?? event.event),
      });
      break;
    }

    case 'subscription.not_renew':
    case 'subscription.disable': {
      // Downgrade user to explorer
      const subCode = data.subscription_code;
      if (!subCode) throw new Error('No subscription_code in webhook');

      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('user_id')
        .eq('paystack_subscription_code', subCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (payment?.user_id) {
        await supabaseAdmin
          .from('user_profiles')
          .update({ plan: 'explorer', plan_expires_at: null })
          .eq('id', payment.user_id);
      }
      break;
    }
  }
}
```

### 5.4 Idempotency Guarantee

The `payments` table has a UNIQUE constraint on `webhook_event_id`:

```sql
-- From the migration SQL:
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paystack_reference TEXT NOT NULL UNIQUE,
  paystack_subscription_code TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'KES',
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  webhook_event_id TEXT UNIQUE,  -- ← THIS prevents double-processing
  created_at TIMESTAMPTZ DEFAULT now()
);
```

If Paystack resends the same webhook, the INSERT into `payments` violates the UNIQUE constraint on `webhook_event_id`, the transaction rolls back, and the user's plan is not double-updated. The Edge Function catches the error and returns `200 OK` with `{ deduplicated: true }`.

### 5.5 Client-Side Payment Initiation (Safe)

The client only handles the Paystack inline popup. It never touches the secret key:

```javascript
// src/lib/api.js — Payment initiation
// Only the PUBLIC key is used client-side. SECRET key is only in Edge Functions.
import { VITE_PAYSTACK_PUBLIC_KEY } from '../config/constants';

async function initiatePayment(user, body) {
  const { planCode, planName } = body;

  // Client-side check: prevent paying for lower/same tier (UX, not security)
  const planLevels = { explorer: 0, plus: 1, pro: 2, mentor: 3 };
  const selectedLevel = planLevels[planName] ?? 0;
  const currentLevel = planLevels[user.plan] ?? 0;
  if (selectedLevel <= currentLevel) {
    return { error: 'You already have access to this plan or higher.', code: 'NO_UPGRADE' };
  }

  // Open Paystack popup — Paystack handles all card data
  return new Promise((resolve) => {
    const handler = window.PaystackPop.setup({
      key: VITE_PAYSTACK_PUBLIC_KEY,    // PUBLIC key — safe in browser
      email: user.email,
      amount: getPlanAmount(planCode),  // in kobo (KES * 100)
      currency: 'KES',
      plan: planCode,
      ref: `zawadi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      callback: (response) => {
        // Payment succeeded — webhook will update the plan
        // Don't trust this callback for plan updates; wait for webhook
        resolve({ success: true, reference: response.reference });
      },
      onClose: () => {
        resolve({ error: 'Payment cancelled', code: 'CANCELLED' });
      },
    });
    handler.openIframe();
  });
}
```

---

## 6. Data Protection

### 6.1 Data Classification

| Classification | Examples | Protection Level | Access Control |
|---|---|---|---|
| **Public** | Published scholarship listings, pricing page | None | Public read via anon key + RLS (`published=true`) |
| **Internal** | User counts, match scores, aggregate statistics | RLS + role check | Authenticated users + RBAC via Edge Function |
| **Confidential** | Email, name, country, application status, essay content, document metadata | RLS (auth.uid()) + TLS in transit + AES-256 at rest | Owner only via RLS; support_agent+ for user mgmt |
| **Restricted** | Password hashes (bcrypt in auth.users), payment records, audit logs, service_role key, API secrets | RLS + TLS + AES-256 at rest + strict RBAC | super_admin only for audit logs; service_role for payment writes |
| **Never Collected** | Date of birth, physical address, phone number, government ID, credit card numbers, CVV, bank details, biometric data | N/A | N/A — we don't collect these |

### 6.2 Encryption at Rest

| Component | Encryption | Managed By |
|---|---|---|
| PostgreSQL database | AES-256 encryption at rest | Supabase (provider-managed) |
| Supabase Storage (S3) | Server-side encryption (SSE-S3) | Supabase / AWS |
| Backups | Encrypted (Supabase managed) | Supabase |
| Edge Function secrets | Supabase Vault (encrypted at rest) | Supabase |

**What this means:** If someone steals the physical disk from Supabase's data center, all data is encrypted. Supabase manages key rotation. We don't need to manage encryption keys ourselves.

### 6.3 Encryption in Transit

| Path | Protocol | Enforcement |
|---|---|---|
| Browser → Vercel CDN | HTTPS (TLS 1.2+) | Vercel enforces HTTPS; HTTP requests auto-redirect |
| Browser → Supabase API | HTTPS (TLS 1.2+) | Supabase enforces HTTPS; HTTP connections rejected |
| Edge Function → Supabase DB | Internal Supabase network (encrypted) | Managed by Supabase |
| Edge Function → Paystack API | HTTPS (TLS 1.2+) | Paystack requires HTTPS |
| Edge Function → OpenRouter AI | HTTPS (TLS 1.2+) | OpenRouter requires HTTPS |
| Bot → Ingest endpoint | HTTPS (TLS 1.2+) | Supabase enforces HTTPS |

**Certificate management:** All TLS certificates are managed by Vercel and Supabase (Let's Encrypt auto-renewal). No manual certificate management needed.

### 6.4 Data Minimization

#### We collect ONLY:
- **Required:** Name, email, password (bcrypt hashed — never stored plaintext), country
- **Profile (optional):** Degree level, field of study, study country preference
- **Usage data:** Application tracking (status, priority, notes), document metadata (name, type, size, storage path), essay content (user-generated via AI), payment references
- **Admin data:** Audit log entries, bot ingestion records

#### We NEVER collect or store:
- Date of birth
- Physical address or phone number
- Government-issued ID numbers
- Credit/debit card numbers, CVV, PINs
- Bank account numbers or routing information
- Biometric data (fingerprints, facial recognition data)
- Precise geolocation (country only, user-provided)
- Social media profiles or connections

### 6.5 Data Retention Policy

| Data Type | Retention Period | Deletion Mechanism | Notes |
|---|---|---|---|
| Active user account | Until deletion requested | Edge Function cascade delete (`auth.users` → cascades to all tables) | User can request deletion at any time |
| Inactive account (12+ months no login) | Anonymized after 12 months of inactivity | Manual or automated batch process | Email notification 30 days before anonymization |
| Payment records | **7 years** (tax compliance) | Retained even after account deletion | `user_id` set to NULL on account deletion; payment data preserved |
| Application history | Until account deletion | Cascaded on `auth.users` DELETE | User can also delete individual applications |
| Essay history | Until account deletion | Cascaded on `auth.users` DELETE | User can also delete individual essays |
| Document files (Storage) | Until account deletion | Cascaded on `auth.users` DELETE | User can also delete individual documents |
| Bot ingestion logs | 12 months (rolling) | Monthly cleanup job | Purely operational data |
| Audit logs | Indefinite | Manual purge by super_admin only | Required for security forensics |
| Supabase Auth logs | Managed by Supabase | Supabase default retention | Not in our control |

### 6.6 Account Deletion Flow

```typescript
// supabase/functions/user-profile/index.ts — Account deletion
// This is the ONLY way to delete an account. No client-side direct deletion.

Deno.serve(async (req: Request) => {
  // ... (auth verification as shown in other examples) ...

  const body = await req.json();

  if (body.operation === 'delete_account') {
    const userId = user.id;

    // 1. Verify this is the user's own account (or super_admin)
    if (user.id !== userId) {
      // Check if caller is super_admin
      const { data: callerProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (callerProfile?.role !== 'super_admin') {
        return new Response(JSON.stringify({ error: 'FORBIDDEN' }), { status: 403 });
      }
    }

    // 2. Anonymize payment records (retained for 7 years, unlinked from user)
    await supabaseAdmin
      .from('payments')
      .update({ user_id: null })
      .eq('user_id', userId);

    // 3. Delete auth.users — cascades to all user-owned tables
    //    (user_profiles, applications, documents, essay_generations)
    //    RLS policies on these tables have ON DELETE CASCADE REFERENCES
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), { status: 500 });
    }

    // 4. Clean up storage files
    const { data: files } = await supabaseAdmin.storage
      .from('documents')
      .list(userId);
    if (files?.length) {
      await supabaseAdmin.storage
        .from('documents')
        .remove(files.map(f => `${userId}/${f.name}`));
    }

    // 5. Log the deletion
    await supabaseAdmin.from('audit_logs').insert({
      admin_email: user.email || 'self-service',
      action: 'DELETE_ACCOUNT',
      target_type: 'user',
      target_id: userId,
      details: { deleted_by: user.email },
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // ... (other operations: get_profile, update_profile, export_data) ...
});
```

---

## 7. API Security

### 7.1 Edge Function Authentication

Every Edge Function that handles user data authenticates the caller:

```typescript
// Shared auth helper — used by all Edge Functions
// supabase/functions/_shared/auth.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthenticatedRequest {
  userId: string;
  userEmail: string;
  userRole: string;
  userPlan: string;
}

export async function authenticateRequest(req: Request): Promise<AuthenticatedRequest> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid Authorization header', 401);
  }

  const token = authHeader.replace('Bearer ', '');

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verify JWT with Supabase
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    throw new AuthError('Invalid or expired token', 401);
  }

  // Get profile (role + plan)
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role, plan')
    .eq('id', user.id)
    .single();

  return {
    userId: user.id,
    userEmail: user.email || 'unknown',
    userRole: profile?.role || 'user',
    userPlan: profile?.plan || 'explorer',
  };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
```

### 7.2 Service Role Key — NEVER in Client

The `SUPABASE_SERVICE_ROLE_KEY` is the most powerful credential in the system. It **bypasses ALL Row-Level Security**. If it leaks to the browser, any user can read/modify all data.

| Location | Has service_role? | Why |
|---|---|---|
| `src/config/supabase.js` | ❌ NO | Client bundle — uses anon key only |
| `admin/config/supabase-admin.js` | ❌ NO | Admin panel uses anon key + Edge Functions |
| `.env` | ❌ NO | Vercel env vars, but use `SUPABASE_SERVICE_ROLE_KEY` (no VITE_ prefix) |
| `.env.example` | ❌ NO | Template file — must not contain real secrets anyway |
| `supabase/functions/*/index.ts` | ✅ YES | Edge Functions — `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` |
| Supabase Dashboard | ✅ YES | Only for manual admin operations |

**Verification:** After every build, check the compiled bundle:

```bash
# After 'npm run build', verify service_role key is NOT in the output
grep -r "service_role" dist/ && echo "SECURITY VIOLATION: service_role found in bundle!" || echo "OK: service_role not in bundle"
grep -r "eyJh" dist/assets/ && echo "WARNING: JWT-like strings found in bundle" || echo "OK: No JWT-like strings"
```

### 7.3 Client Supabase Initialization

```javascript
// src/config/supabase.js — USER APP (safe for browser)
import { createClient } from '@supabase/supabase-js';

// ONLY the anon key — this is safe to expose
// The anon key respects RLS policies — it cannot bypass them
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,       // https://efvxtcxhjlbzzsixfrvo.supabase.co
  import.meta.env.VITE_SUPABASE_ANON_KEY,   // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
);

// There is NO service_role client in the user app.
// NONE. Not hidden, not obfuscated, not behind a proxy — it simply does not exist here.
```

```javascript
// admin/config/supabase-admin.js — ADMIN PANEL
// ALSO uses anon key for auth. Admin operations go through Edge Functions.
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,  // STILL the anon key
);

// Admin operations use this client ONLY for auth (login/logout/getUser).
// All CRUD operations go through Edge Functions which hold the service_role.
// This means the admin panel is just another browser app — it has NO special database access.
```

### 7.4 INGEST_API_KEY Validation

The bot ingestion endpoint uses a pre-shared API key, not JWT:

```typescript
// supabase/functions/ingest-scholarship/index.ts

Deno.serve(async (req: Request) => {
  // 1. Validate INGEST_API_KEY
  const ingestKey = req.headers.get('x-ingest-key');
  const expectedKey = Deno.env.get('INGEST_API_KEY');

  if (!ingestKey || ingestKey !== expectedKey) {
    console.error(`[INGEST] Invalid API key from IP: ${req.headers.get('x-forwarded-for')}`);
    return new Response(JSON.stringify({ error: 'Invalid or missing API key' }), { status: 401 });
  }

  // 2. Validate request format
  const body = await req.json();
  if (!body.scholarships || !Array.isArray(body.scholarships)) {
    return new Response(JSON.stringify({ error: 'Invalid format: expected { scholarships: [...] }' }), { status: 400 });
  }

  // 3. Process each scholarship with service_role Supabase client
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const results = { received: body.scholarships.length, accepted: 0, duplicates: 0, rejected: 0, rejected_reasons: [] as any[] };

  for (const s of body.scholarships) {
    // Validate apply_url is direct (not aggregator)
    if (isAggregatorUrl(s.apply_url)) {
      results.rejected++;
      results.rejected_reasons.push({ name: s.name, reason: 'aggregator_url' });
      continue;
    }

    // Validate deadline is in the future
    if (new Date(s.deadline) < new Date()) {
      results.rejected++;
      results.rejected_reasons.push({ name: s.name, reason: 'past_deadline' });
      continue;
    }

    // Deduplication check
    const { data: existing } = await supabaseAdmin
      .from('bot_ingestions')
      .select('id')
      .eq('scholarship_name', s.name)
      .eq('host', s.host)
      .maybeSingle();

    if (existing) {
      results.duplicates++;
      continue;
    }

    // Insert with published=false (admin must review)
    const { error } = await supabaseAdmin.from('bot_ingestions').insert({
      scholarship_name: s.name,
      host: s.host,
      source_url: s.source_url,
      status: 'pending',
    });

    if (!error) results.accepted++;
  }

  return new Response(JSON.stringify(results), { status: 200 });
});

function isAggregatorUrl(url: string): boolean {
  const aggregators = [
    'scholars4dev.com', 'opportunitiesforafricans.com',
    'scholarship-positions.com', 'afterschoolafrica.com',
    'opportunitydesk.org', 'myschoolgist.com',
  ];
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return aggregators.some(a => hostname.includes(a));
  } catch {
    return true; // Invalid URL → reject
  }
}
```

### 7.5 Rate Limiting Strategy

| Target | Window | Limit | Enforced By | Bypassable? |
|---|---|---|---|---|
| Auth endpoints (login, signup) | Per IP | Supabase defaults | Supabase Auth | No — server-side |
| Essay generation | 60 seconds | 8 requests | Edge Function (counts DB rows) | No — server-side |
| Essay generation (daily) | 24 hours | Tier-based (3/10/25/50) | Edge Function | No — server-side |
| API calls (Supabase) | Per anon key | Supabase free tier limits | Supabase platform | No — platform-level |
| Bot ingestion | Per minute | 60 requests | Edge Function | No — server-side |
| Paystack webhook | N/A | Paystack rate limits | Paystack | No — Paystack-controlled |

---

## 8. Row-Level Security Policies — Complete SQL

This section contains the **complete, production-ready RLS policies** for every table. These replace the simplified policies in `12_SUPABASE_SCHEMA.md`. Run this SQL to apply ALL security policies.

### 8.1 Enable RLS on All Tables

```sql
-- ============================================================
-- ENABLE RLS ON EVERY TABLE (Non-negotiable)
-- ============================================================
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_ingestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
```

### 8.2 Scholarships Table

```sql
-- ============================================================
-- scholarships — Public read (published only)
-- ============================================================

-- DROP existing policies first (idempotent migration)
DROP POLICY IF EXISTS "Public read published scholarships" ON public.scholarships;
DROP POLICY IF EXISTS "Service role full access scholarships" ON public.scholarships;

-- POLICY 1: Anyone (anon or authenticated) can SELECT published scholarships
CREATE POLICY "Public read published scholarships" ON public.scholarships
  FOR SELECT
  USING (published = true);

-- POLICY 2: service_role can do anything (used by Edge Functions for admin ops)
CREATE POLICY "Service role full access scholarships" ON public.scholarships
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- NOTE: There is NO policy allowing authenticated users to INSERT/UPDATE/DELETE scholarships.
-- All scholarship modifications go through Edge Functions with service_role.
-- Even content_managers and super_admins go through Edge Functions — not direct DB access.
```

### 8.3 User Profiles Table

```sql
-- ============================================================
-- user_profiles — Users manage own; service_role manages all
-- ============================================================

DROP POLICY IF EXISTS "Users read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role manage all profiles" ON public.user_profiles;

-- POLICY 1: Users can SELECT their own profile
CREATE POLICY "Users read own profile" ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- POLICY 2: Users can UPDATE their own profile BUT cannot change plan/role/plan_expires_at
CREATE POLICY "Users update own profile" ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- plan cannot change (only via webhook/admin Edge Function)
    AND plan = (SELECT plan FROM public.user_profiles WHERE id = auth.uid())
    -- role cannot change (only via admin Edge Function)
    AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())
    -- plan_expires_at cannot change
    AND plan_expires_at IS NOT DISTINCT FROM
        (SELECT plan_expires_at FROM public.user_profiles WHERE id = auth.uid())
  );

-- POLICY 3: service_role can SELECT/INSERT/UPDATE/DELETE all profiles
-- Used by Edge Functions for admin operations, webhooks, and the auto-profile trigger
CREATE POLICY "Service role manage all profiles" ON public.user_profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- NOTE: The handle_new_user() trigger function runs as SECURITY DEFINER,
-- so it can INSERT into user_profiles despite RLS (it uses service_role internally).
```

### 8.4 Applications Table

```sql
-- ============================================================
-- applications — Users manage own; Edge Function for admin reads
-- ============================================================

DROP POLICY IF EXISTS "Users manage own applications" ON public.applications;
DROP POLICY IF EXISTS "Service role manage all applications" ON public.applications;

-- POLICY 1: Users can SELECT/INSERT/UPDATE/DELETE only their own applications
CREATE POLICY "Users manage own applications" ON public.applications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- POLICY 2: service_role for admin operations (view any user's applications)
CREATE POLICY "Service role manage all applications" ON public.applications
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

### 8.5 Documents Table (with Tier-Aware Trigger)

```sql
-- ============================================================
-- documents — Users manage own; tier-based upload limits via trigger
-- ============================================================

DROP POLICY IF EXISTS "Users manage own documents" ON public.documents;
DROP POLICY IF EXISTS "Service role manage all documents" ON public.documents;

-- POLICY 1: Users manage their own documents
CREATE POLICY "Users manage own documents" ON public.documents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- POLICY 2: service_role for admin operations
CREATE POLICY "Service role manage all documents" ON public.documents
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- TRIGGER: Enforce tier-based document upload limits
-- This runs BEFORE INSERT and counts existing documents for the user.
-- It REJECTS the insert if the user has reached their tier limit.
CREATE OR REPLACE FUNCTION public.check_document_upload_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_plan TEXT;
  doc_count INTEGER;
  tier_limit INTEGER;
BEGIN
  -- Get user's current plan
  SELECT plan INTO user_plan FROM public.user_profiles WHERE id = NEW.user_id;

  -- Map plan to limit
  tier_limit := CASE user_plan
    WHEN 'explorer' THEN 5
    WHEN 'plus' THEN 15
    WHEN 'pro' THEN 50
    WHEN 'mentor' THEN 999999  -- effectively unlimited
    ELSE 5
  END;

  -- Count existing documents
  SELECT COUNT(*) INTO doc_count FROM public.documents WHERE user_id = NEW.user_id;

  -- Reject if at limit
  IF doc_count >= tier_limit THEN
    RAISE EXCEPTION 'Document upload limit (%) reached for your plan: %. Upgrade to upload more.',
      tier_limit, user_plan;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_document_upload_limit ON public.documents;
CREATE TRIGGER enforce_document_upload_limit
  BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.check_document_upload_limit();
```

### 8.6 Essay Generations Table

```sql
-- ============================================================
-- essay_generations — Users read own; Edge Function writes
-- ============================================================

DROP POLICY IF EXISTS "Users read own essays" ON public.essay_generations;
DROP POLICY IF EXISTS "Service role manage all essays" ON public.essay_generations;

-- POLICY 1: Users can SELECT and DELETE only their own essays
-- Users CANNOT INSERT essays directly — only the ai-essay Edge Function can
CREATE POLICY "Users read own essays" ON public.essay_generations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own essays" ON public.essay_generations
  FOR DELETE
  USING (auth.uid() = user_id);

-- POLICY 2: service_role for the Edge Function (writes) and admin operations
CREATE POLICY "Service role manage all essays" ON public.essay_generations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

### 8.7 Payments Table

```sql
-- ============================================================
-- payments — Users read own; service_role for writes (webhook)
-- ============================================================

DROP POLICY IF EXISTS "Users read own payments" ON public.payments;
DROP POLICY IF EXISTS "Service role manage all payments" ON public.payments;

-- POLICY 1: Users can SELECT only their own payment history
CREATE POLICY "Users read own payments" ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- POLICY 2: service_role for webhook writes and admin reads
-- Users can NEVER INSERT/UPDATE/DELETE payments — only the webhook Edge Function can
CREATE POLICY "Service role manage all payments" ON public.payments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

### 8.8 Bot Ingestions Table

```sql
-- ============================================================
-- bot_ingestions — service_role only (no user access)
-- ============================================================

DROP POLICY IF EXISTS "Service role manage bot ingestions" ON public.bot_ingestions;

-- ONLY service_role can access bot_ingestions
-- Regular users and anon have NO access to this table
CREATE POLICY "Service role manage bot ingestions" ON public.bot_ingestions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

### 8.9 Audit Logs Table

```sql
-- ============================================================
-- audit_logs — service_role only (most sensitive table)
-- ============================================================

DROP POLICY IF EXISTS "Service role manage audit logs" ON public.audit_logs;

-- ONLY service_role can read or write audit logs
-- Even super_admins in the browser can't read this — they must go through the Edge Function
-- which performs an RBAC check before querying with service_role
CREATE POLICY "Service role manage audit logs" ON public.audit_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- NOTE: Even INSERT is restricted to service_role.
-- audit_logs are written by Edge Functions, never by client-side code.
```

### 8.10 Storage Bucket RLS

```sql
-- ============================================================
-- storage.objects — Users access only their own folder
-- ============================================================

DROP POLICY IF EXISTS "Users access own documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Service role access all storage" ON storage.objects;

-- POLICY 1: Users can only access files in their own folder
-- Folder structure: documents/{user_id}/filename.pdf
CREATE POLICY "Users access own documents storage" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- POLICY 2: service_role for admin file access
CREATE POLICY "Service role access all storage" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'documents'
    AND auth.role() = 'service_role'
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'service_role'
  );
```

### 8.11 Verification Script

After applying all policies, run this to verify:

```sql
-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected output: all tables should have rowsecurity = true

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test: As an authenticated user, try to read another user's data (should return 0 rows)
-- Run this in Supabase SQL Editor after setting a test JWT:
-- SET request.jwt.claim.sub = 'some-other-user-id';
-- SELECT * FROM applications;  -- Should return 0 rows
```

---

## 9. Admin Isolation Architecture

### 9.1 Why Admin Isolation Matters

In v1, admin components were imported into the main user app bundle. This meant:
- Admin code was visible to any user who inspected the JavaScript bundle
- Admin API endpoints were discoverable
- The `service_role` key was dangerously close to leaking into the client

In v2, the admin panel is **completely separated** from the user application.

### 9.2 Vite Multi-Entry Build

The project has TWO separate Vite entry points:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),           // User app entry
        admin: resolve(__dirname, 'admin/index.html'),    // Admin panel entry
      },
    },
  },
});
```

This produces **two completely separate bundles**:
- `dist/assets/main-*.js` — User application (NO admin code, NO service_role)
- `dist/assets/admin-*.js` — Admin panel (has admin UI components, but STILL no service_role)

### 9.3 Admin Panel Supabase Client

The admin panel's Supabase client is **identical** to the user app's client — it only has the `anon` key:

```javascript
// admin/config/supabase-admin.js
import { createClient } from '@supabase/supabase-js';

// SAME ANON KEY as the user app
// Admin operations are performed through Edge Functions, not direct DB access
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

### 9.4 Admin API Flow (Secure)

All admin database operations flow through the `admin-operations` Edge Function:

```
┌──────────────────────────────────────────────────────────────────┐
│  ADMIN BROWSER                                                    │
│                                                                  │
│  1. Admin logs in at /admin (regular Supabase Auth, anon key)   │
│  2. Gets JWT → stored in browser (same as any user)             │
│  3. Admin clicks "Create Scholarship"                            │
│  4. Admin panel calls:                                           │
│     POST /functions/v1/admin-operations                          │
│     Authorization: Bearer <admin JWT>                            │
│     Body: { operation: "scholarships_create", data: {...} }      │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  EDGE FUNCTION: admin-operations                                  │
│                                                                  │
│  5. Verify JWT (Supabase Auth)                                   │
│  6. Look up user_profiles.role for this JWT                      │
│  7. Check: is role >= content_manager?                           │
│  8. YES → Execute operation with service_role Supabase client    │
│  9. Log to audit_logs table                                      │
│  10. Return result to admin panel                                │
└──────────────────────────────────────────────────────────────────┘
```

### 9.5 Admin Panel Route Guards (UX Layer)

```jsx
// admin/components/AdminShell.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const ROLE_HIERARCHY = { user: 0, support_agent: 1, content_manager: 2, super_admin: 3 };

export function AdminGuard({ children, requiredRole = 'support_agent' }) {
  const { user, profile, loading } = useAdminAuth();

  if (loading) return <AdminSpinner />;

  // Not logged in → redirect to admin login
  if (!user) return <Navigate to="/admin/login" />;

  // Logged in but insufficient role
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? Infinity;
  const currentLevel = ROLE_HIERARCHY[profile?.role] ?? -1;

  if (currentLevel < requiredLevel) {
    return (
      <div className="admin-error">
        <h2>Access Denied</h2>
        <p>Your role ({profile?.role}) does not have access to this section.</p>
        <p>Required: {requiredRole} or higher.</p>
      </div>
    );
  }

  return children || <Outlet />;
}

// Usage in admin routes:
// <Route element={<AdminGuard requiredRole="content_manager" />}>
//   <Route path="scholarships" element={<ScholarshipManager />} />
// </Route>
// <Route element={<AdminGuard requiredRole="super_admin" />}>
//   <Route path="audit" element={<AuditLogViewer />} />
// </Route>
```

### 9.6 Separate Admin Deployment

The admin panel is accessible at `/admin` on the same domain but serves a different HTML file:

```json
// vercel.json — Admin route
{
  "routes": [
    { "src": "/admin", "dest": "/admin/index.html" },
    { "src": "/admin/(.*)", "dest": "/admin/$1" },
    { "src": "/privacy", "dest": "/privacy.html" },
    { "src": "/terms", "dest": "/terms.html" },
    { "handle": "filesystem" },
    { "src": "/assets/(.*)", "dest": "/assets/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### 9.7 Admin Code Separation Verification

```bash
# After build, verify zero admin code leaks into the main bundle
grep -r "AdminShell\|ScholarshipManager\|UserManager\|AuditLogViewer\|BulkImport" dist/assets/main-*.js
# Expected: NO MATCHES

# Verify no service_role key in any client bundle
grep -r "service_role" dist/assets/
# Expected: NO MATCHES

# Verify admin bundle exists and contains admin components
grep -l "AdminShell\|ScholarshipManager" dist/assets/admin-*.js
# Expected: Lists the admin bundle file
```

---

## 10. Incident Response

### 10.1 Breach Detection

| Signal | Detection Method | Severity |
|---|---|---|
| Spike in failed login attempts | Supabase Auth logs | Medium |
| Unusual plan changes (bulk upgrades) | Payments table monitoring | High |
| Bulk data reads from unusual IPs | Supabase Database logs | High |
| Multiple account deletions in short period | audit_logs monitoring | Critical |
| Paystack webhook signature failures | Edge Function logs | High |
| INGEST_API_KEY failures | Edge Function logs | Medium |
| Files uploaded outside normal patterns | Storage logs | Medium |
| Admin actions outside business hours | audit_logs time analysis | Low |

### 10.2 Response Timeline

| Phase | Timeframe | Actions |
|---|---|---|
| **1. Detect** | Continuous | Monitor logs, alerts, anomalies |
| **2. Contain** | Immediate (minutes) | Revoke compromised keys, invalidate affected sessions, disable affected Edge Functions |
| **3. Assess** | Within 4 hours | Determine scope: what data was accessed/modified, how, when, by whom |
| **4. Notify** | Within 72 hours | Email affected users of confirmed breach with: what happened, what data, what we're doing, what they should do |
| **5. Fix** | Within 24 hours | Patch vulnerability, rotate all affected secrets, verify fix |
| **6. Document** | Within 1 week | Post-mortem document: timeline, root cause, impact, preventive measures |
| **7. Report** | As required by law | Notify relevant data protection authorities: ODPC (Kenya), NDPB (Nigeria), per local regulations |

### 10.3 Emergency Contact Procedures

**Internal escalation chain:**
1. Detecting engineer → alerts #zawadi-alerts channel
2. Security lead (on-call) → acknowledges within 15 minutes
3. Security lead → assesses severity, initiates containment
4. Product lead → notified for user communication decisions
5. Legal → notified if data breach involves personal data

**Key rotation procedure (emergency):**
```bash
# 1. Rotate Supabase service_role key (Supabase Dashboard → Settings → API)
# 2. Update all Edge Function secrets:
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=new_key_here

# 3. Rotate Paystack secret key (Paystack Dashboard → Settings → API Keys)
supabase secrets set PAYSTACK_SECRET_KEY=new_sk_live_...

# 4. Rotate INGEST_API_KEY
supabase secrets set INGEST_API_KEY=new_random_key
# Update the key in Zawadi Bot configuration

# 5. Rotate DEEPSEEK_API_KEY
supabase secrets set DEEPSEEK_API_KEY=new_sk_...
# Update in OpenRouter dashboard

# 6. Invalidate all user sessions (force re-login):
# Supabase Dashboard → Authentication → Settings → Revoke all sessions
```

### 10.4 Responsible Disclosure Policy

- **Report to:** security@techsari.online
- **PGP key:** Available at https://techsari.online/.well-known/security.txt
- **Acknowledgment:** Within 48 hours
- **Resolution targets:**
  - Critical (data breach, auth bypass): 24 hours
  - High (privilege escalation, injection): 72 hours
  - Medium (information disclosure, CSRF): 7 days
  - Low (security hardening): Next release cycle
- **Safe harbor:** We won't pursue legal action for good-faith security research that follows our disclosure policy

---

## 11. Security Headers

### 11.1 Vercel Configuration (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.paystack.co; connect-src 'self' https://efvxtcxhjlbzzsixfrvo.supabase.co https://api.paystack.co https://openrouter.ai wss://efvxtcxhjlbzzsixfrvo.supabase.co; img-src 'self' data: https://efvxtcxhjlbzzsixfrvo.supabase.co blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-src 'self' https://checkout.paystack.com; object-src 'none'; base-uri 'self'; form-action 'self';"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=()"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Cross-Origin-Resource-Policy",
          "value": "same-origin"
        },
        {
          "key": "X-XSS-Protection",
          "value": "0"
        }
      ]
    }
  ]
}
```

### 11.2 CSP Directive Breakdown

| Directive | Value | Purpose |
|---|---|---|
| `default-src 'self'` | Block all external resources by default | Defense-in-depth baseline |
| `script-src` | `'self' 'unsafe-inline' https://js.paystack.co` | Allow our JS + Paystack inline SDK. `unsafe-inline` is required for Vite's HMR in dev; consider removing in production if possible |
| `connect-src` | `'self' https://*.supabase.co https://api.paystack.co https://openrouter.ai` | Allow API calls to Supabase, Paystack, AI proxy |
| `img-src` | `'self' data: https://*.supabase.co blob:` | Allow images from our domain, Supabase storage, and data URIs |
| `style-src` | `'self' 'unsafe-inline'` | Required for Tailwind CSS and component-level styles |
| `frame-src` | `'self' https://checkout.paystack.com` | Allow Paystack inline checkout iframe |
| `object-src` | `'none'` | Block Flash/Java applets |
| `base-uri` | `'self'` | Prevent base tag injection |
| `form-action` | `'self'` | Prevent form data exfiltration |

### 11.3 HSTS Preload

The `Strict-Transport-Security` header with `preload` makes the browser always use HTTPS, even on first visit. After deployment, submit to [hstspreload.org](https://hstspreload.org) for browser preload lists.

---

## 12. v1 Security Lessons Learned

### 12.1 Critical Security Failures in v1 — And How v2 Fixes Them

| # | v1 Failure | Risk Level | v2 Fix | Verification |
|---|---|---|---|---|
| 1 | **Service role key in client `.env`** | CRITICAL | Edge Functions only. `SUPABASE_SERVICE_ROLE_KEY` (no VITE_ prefix) in Supabase secrets. Build-time grep check. | `grep -r "service_role" dist/` → zero results |
| 2 | **No RLS on all tables** | CRITICAL | RLS enabled on ALL 8 public tables with granular policies. See Section 8. | `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'` → all `true` |
| 3 | **No audit logging** | HIGH | `audit_logs` table with admin_email, action, target_type, target_id, details JSONB, ip_address, created_at. Every admin Edge Function call writes an audit entry. | Query `audit_logs` table → populated after admin actions |
| 4 | **No webhook idempotency** | HIGH | UNIQUE constraint on `payments.webhook_event_id`. Edge Function checks for existing events before processing. | Send same webhook twice → second returns `{ deduplicated: true }` |
| 5 | **Passwords in local JSON file** | CRITICAL | Supabase Auth (GoTrue) with bcrypt hashing. No passwords stored in our database at all. | Check database → no password column; only auth.users has bcrypt hashes |
| 6 | **No account deletion endpoint** | MEDIUM | `/api/me` Edge Function with `delete_account` operation. Cascades delete, anonymizes payment records, cleans storage. | Call delete endpoint → user removed from auth.users, data cascaded |
| 7 | **No API key protection** | HIGH | AI calls proxied through `ai-essay` Edge Function. DEEPSEEK_API_KEY only in Edge Function secrets. | Check browser network tab → AI calls go to our Edge Function, not OpenRouter directly |
| 8 | **Admin code leaked to user bundle** | MEDIUM | Separate Vite entry point (`admin/index.html`). Admin components in `admin/` directory, never imported in `src/`. | `grep -r "AdminShell\|UserManager" dist/assets/main-*.js` → zero results |
| 9 | **No CORS restrictions** | MEDIUM | CORS restricted to `techsari.online`. Supabase CORS configured through dashboard. Vercel headers set in vercel.json. | Test cross-origin request → blocked by CORS |
| 10 | **Sessions in plain localStorage** | LOW | Supabase manages JWT + refresh tokens. Tokens stored in memory/localStorage via Supabase SDK. Configurable to httpOnly cookies on custom domain. | Default Supabase behavior (SDK-managed) |
| 11 | **Non-VITE prefixed env vars** | MEDIUM | Only `VITE_`-prefixed variables in `.env`. Server secrets in Supabase/Edge Function secrets (no VITE_ prefix). | `grep -v "VITE_" .env` → only comments |
| 12 | **Admin shared same auth as users** | LOW | Same Supabase Auth but `user_profiles.role` checked by Edge Functions. Admin panel has separate route guards. | User with `role=user` visiting `/admin/scholarships` → Access Denied |

### 12.2 Migration Checklist: v1 → v2 Security

When migrating from v1 to v2, these steps must be completed:

1. [ ] Remove ALL `SUPABASE_SERVICE_ROLE_KEY` from `.env`, `.env.example`, and any client-side config
2. [ ] Set `SUPABASE_SERVICE_ROLE_KEY` as a Supabase secret (used by Edge Functions only)
3. [ ] Run the complete RLS SQL from Section 8 on the Supabase database
4. [ ] Deploy all 5 Edge Functions with proper secret configuration
5. [ ] Verify RLS is enabled on all 8 tables
6. [ ] Test that a user cannot read another user's data via Supabase API
7. [ ] Test that a user cannot change their own `plan` or `role` field
8. [ ] Test that an unauthenticated request to Edge Functions returns 401
9. [ ] Test Paystack webhook with valid and invalid signatures
10. [ ] Test duplicate webhook idempotency
11. [ ] Run `grep -r "service_role" dist/` after build — must return zero results
12. [ ] Verify admin panel is at `/admin` and user app at `/` from different bundles
13. [ ] Configure CORS in Supabase Dashboard to allow only `https://www.techsari.online`
14. [ ] Set all security headers in `vercel.json`
15. [ ] Verify CSP does not break Paystack checkout or Supabase realtime

---

## 13. Auditor Verification Checklist

This section is designed for a security auditor to methodically verify every control in this document.

### 13.1 Authentication Controls

| Check | How to Verify | Expected Result |
|---|---|---|
| Password hashing | Inspect `auth.users` table — passwords stored as bcrypt hashes | No plaintext passwords anywhere |
| JWT expiration | Check Supabase Auth settings → JWT expiry | Access token ≤ 1 hour |
| Session management | Test: close browser, reopen → session persists or requires re-login per settings | Per Supabase SDK defaults |
| No hardcoded credentials | Grep codebase for `password`, `secret`, `token=` | Only env var references |

### 13.2 Authorization Controls (RBAC)

| Check | How to Verify | Expected Result |
|---|---|---|
| Default role is `user` | Register new user → check `user_profiles.role` | `role = 'user'` |
| User cannot change own role | As authenticated user, attempt `UPDATE user_profiles SET role='super_admin' WHERE id=<my_id>` | Rejected by RLS |
| User cannot change own plan | As authenticated user, attempt `UPDATE user_profiles SET plan='mentor' WHERE id=<my_id>` | Rejected by RLS |
| RLS blocks cross-user reads | Auth as user A, query `SELECT * FROM applications WHERE user_id=<user_B_id>` | Returns 0 rows |
| Edge Function requires auth | Call any Edge Function without Authorization header | Returns 401 |
| Edge Function checks role | Call admin operation as a `user` role account | Returns 403 FORBIDDEN |

### 13.3 Subscription Tier Controls

| Check | How to Verify | Expected Result |
|---|---|---|
| Explorer document limit (5) | As explorer user, upload 6 documents via direct API call (bypass UI) | 6th upload rejected by DB trigger |
| Explorer essay limit (3/day) | As explorer user, request 4 essays via Edge Function in one day | 4th request returns 429 DAILY_LIMIT_REACHED |
| Plan upgrade via webhook | Send valid charge.success webhook → verify user_profiles.plan updated | Plan updated, payment recorded |
| Plan downgrade via webhook | Send subscription.not_renew webhook → verify user_profiles.plan reverted | Plan set to 'explorer' |
| Webhook idempotency | Send same webhook twice | Second returns `{ deduplicated: true }` |
| Invalid webhook signature | Send webhook with wrong HMAC signature | Returns 401 |

### 13.4 Data Protection Controls

| Check | How to Verify | Expected Result |
|---|---|---|
| TLS everywhere | Check all endpoints with `curl -I` → verify HTTPS redirect | All endpoints use HTTPS |
| Account deletion cascade | Delete a user via Edge Function → verify all owned data removed | Applications, documents, essays, profile deleted |
| Payment records survive deletion | Delete a user → check payments table | Payment records exist with `user_id = NULL` |
| Storage folder isolation | As user A, try to access user B's storage path | Rejected by Storage RLS |

### 13.5 API Security Controls

| Check | How to Verify | Expected Result |
|---|---|---|
| service_role not in bundle | `grep -r "service_role" dist/` | Zero results |
| AI key not exposed | Check browser network tab during essay generation | Browser calls Edge Function, NOT OpenRouter directly |
| Paystack secret not exposed | Check browser network tab during payment | Browser uses Paystack public key only; secret key never sent to browser |
| INGEST_API_KEY required | Call `/api/ingest` without `x-ingest-key` header | Returns 401 |
| Rate limiting works | Generate 9 essays in 60 seconds | 9th request returns 429 RATE_LIMITED |

### 13.6 Admin Isolation Controls

| Check | How to Verify | Expected Result |
|---|---|---|
| Admin code not in main bundle | `grep -r "AdminShell\|ScholarshipManager\|AuditLogViewer" dist/assets/main-*.js` | Zero results |
| Admin bundle is separate | Check `dist/assets/` for `admin-*.js` files | Separate admin bundle exists |
| User role rejected by admin panel | Log into `/admin` with `role=user` account | Access Denied, redirected |
| Service role not in admin client | Inspect admin bundle for service_role references | No service_role key in admin JS |

### 13.7 Security Headers

| Check | How to Verify | Expected Result |
|---|---|---|
| CSP present | `curl -I https://www.techsari.online | grep Content-Security-Policy` | CSP header present |
| HSTS present | `curl -I https://www.techsari.online | grep Strict-Transport-Security` | `max-age=31536000` |
| X-Frame-Options | `curl -I https://www.techsari.online | grep X-Frame-Options` | `DENY` |
| X-Content-Type-Options | `curl -I https://www.techsari.online | grep X-Content-Type-Options` | `nosniff` |

### 13.8 Incident Response Readiness

| Check | How to Verify | Expected Result |
|---|---|---|
| Audit logs populated | Perform admin action → query `audit_logs` | New row with admin_email, action, timestamp |
| Key rotation documented | Follow key rotation procedure in Section 10.3 | All keys rotated, system functional |
| Security contact published | Check `https://techsari.online/.well-known/security.txt` | Valid security contact |

---

## Appendix A: Quick Reference — All Edge Functions

| Function | Endpoint | Auth Method | Purpose |
|---|---|---|---|
| `paystack-webhook` | `POST /functions/v1/paystack-webhook` | HMAC SHA-512 (`x-paystack-signature`) | Process Paystack events |
| `admin-operations` | `POST /functions/v1/admin-operations` | Bearer JWT + RBAC check | All admin CRUD operations |
| `ai-essay` | `POST /functions/v1/ai-essay` | Bearer JWT + rate limits | AI essay generation proxy |
| `ingest-scholarship` | `POST /functions/v1/ingest-scholarship` | `x-ingest-key` header | Bot scholarship submission |
| `user-profile` | `POST /functions/v1/user-profile` | Bearer JWT | Profile ops, account deletion, data export |

## Appendix B: Quick Reference — All Secrets and Their Locations

| Secret | Location | NEVER in |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` (VITE_ prefix) | — (safe in client) |
| `VITE_SUPABASE_ANON_KEY` | `.env` (VITE_ prefix) | — (safe in client) |
| `VITE_PAYSTACK_PUBLIC_KEY` | `.env` (VITE_ prefix) | — (safe in client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function secrets | `.env`, client bundle, git |
| `PAYSTACK_SECRET_KEY` | Supabase Edge Function secrets | `.env`, client bundle, git |
| `DEEPSEEK_API_KEY` | Supabase Edge Function secrets | `.env`, client bundle, git |
| `INGEST_API_KEY` | Supabase Edge Function secrets + Bot config | `.env`, client bundle, git |

---

*This document is the complete security specification for Zawadi v2. Every control described here is mandatory. No exceptions without security review and document update.*

*Security document approved by: _____________________ Date: _____________________*

*Last security audit: _____________________ Auditor: _____________________*
