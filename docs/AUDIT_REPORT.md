Zawadi Website — Full Audit Report

Date: 2026-08-24
Auditor: GitHub Copilot (automated tooling + manual interactive crawl)

Summary
- I performed a comprehensive audit of the `zawadi-v2` repository and the running site at `http://localhost:5173/` (dev server). Work performed:
  - Started the dev server, crawled the site as an unauthenticated and authenticated user.
  - Executed interactive flows: Landing, Browse Scholarships, Sign-In, Dashboard, Profile setup, Document Vault, Essay Studio, Applications tracker.
  - Captured screenshots for key pages and states.
  - Ran a static code audit (automated subagent) against repository files focusing on security, secrets, auth/session handling, RLS/migrations, webhook/payment flows, and deployment readiness.
  - Attempted to run Playwright E2E and a11y tests and TypeScript checks; blocked by local environment `npm` registry permission issues (E403), so automated tests were not executed here.

Scope & Methodology
- Interactive browser exploration using embedded Playwright-like tooling to simulate user interactions and capture page snapshots and console/network events.
- Static repository scanning for sensitive patterns, environment usage, and serverless (Supabase) functions.
- Focus areas: Authentication, Authorization, Secrets management, Webhook/payment handling, Database migrations and RLS, Client-side security (XSS/CSP), Accessibility, and general production readiness.

High-level Findings (Executive)
- Architecture: The app is well-structured: React + Vite frontend, Supabase for Auth/DB/Storage, Supabase Edge Functions for server logic. This is a modern, maintainable stack.
- Production blockers / critical risks:
  1. Secrets and .env files present locally; `.env.local` exists in the workspace — rotate keys and remove tracked envs immediately.
  2. Client-side storage of tokens (`localStorage`) including an `admin_token` increases risk of privilege escalation via XSS.
  3. Payment webhook verification and replay protection need careful review and testing (Paystack-specific signature handling).
  4. Automated test runs (tsc, Playwright) could not be executed due to `npm` network policy (E403) in this environment — run them in CI or locally.

Findings — Detailed

1) Secrets & Environment (Critical)
- Files & Evidence:
  - `.env.local` present at repo root with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public), but presence of `.env*` tracked is risky.
  - `ZAWADI_AUDIT_REPORT_2026.md` references live `PAYSTACK_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` exposures historically.
- Risk: Committed envs or developer machines with secrets may lead to leak of service-role keys or payment secrets.
- Impact: Full DB/data compromise, payment fraud, account takeover.
- Remediation:
  - Remove `.env*` from version control and add to `.gitignore`.
  - Rotate all keys immediately (Supabase service role, Paystack, DeepSeek, OpenAI if used).
  - Use Supabase secrets (`supabase secrets set`) or host secret managers; never store service keys in client builds.

2) Auth/session handling (High)
- Evidence:
  - `src/App.tsx` stores tokens in `localStorage`: `localStorage.setItem('zawadi_token', session.access_token)` and `zawadi_admin_token`.
  - `AuthScreen.tsx` signs in using Supabase client on the browser and expects sessions returned.
- Risk: XSS could leak tokens; admin token in client increases blast radius.
- Remediation:
  - Move session handling to server/edge: On login, return a short-lived session cookie set via `Set-Cookie` (HttpOnly, Secure, SameSite=Strict). Use Supabase server session or proxy token handling in Edge Functions.
  - Remove any usage of `zawadi_admin_token` client-side; rely on server-side role checks for admin actions.
  - Apply CSP and sanitize all user-generated content.

3) Payment & Webhook Handling (High)
- Evidence:
  - `supabase/functions/process-payment/index.ts` verifies Paystack signatures, uses `crypto.subtle` and checks HMAC. Code comments show fallback sandbox handling.
- Risk: Improper signature verification or replay acceptance could cause fraudulent payment confirmations.
- Remediation:
  - Ensure exact signature algorithm/encoding matches Paystack docs (hex vs base64). Use raw bytes exactly as provider signs.
  - Implement idempotency: store webhook event id and reject duplicates.
  - Make environment requirement checks strict: fail deploy if Paystack secret not present in production.

4) Database & RLS Migrations (High)
- Evidence:
  - `supabase/migrations/` contains SQL migrations; `src/lib/supabase-queries.ts` assumes certain columns exist (created_at, updated_at).
- Risk: If migrations are not applied, queries will fail or RLS (Row-Level Security) might not protect data.
- Remediation:
  - Run all migrations in order as part of deploy.
  - Verify RLS policies for sensitive tables: `payments`, `audit_logs`, `bot_ingestions`, `contact_submissions`, `documents`, `profiles`.

5) Client builds and secrets (High)
- Evidence:
  - `vite.config.ts` allows inlining `import.meta.env.VITE_*` into the client. No server-only vars should be inlined.
- Risk: Accidentally inlining service-role keys into `dist/` (or committing `dist/`) leaks secrets.
- Remediation:
  - Ensure `VITE_` prefix only used for public keys. Remove `dist/` from repository if it contains built assets. Rotate secrets if leaked.

6) Automated tests & accessibility (Medium)
- Evidence:
  - `e2e/` contains Playwright tests (`a11y.spec.ts`, `smoke.spec.ts`, etc.). I could not run them due to `npm` registry restrictions (E403).
  - I ran manual a11y checks visually and page snapshots; no obvious a11y blockers surfaced in the limited scan but automated checks are required.
- Remediation:
  - Run `npx playwright test` in CI with network access; collect Axe reports. Fix color contrast, landmarks, skip links, and ARIA attributes as flagged.

7) Rate-limiting and abuse protection (Medium)
- Evidence: Public endpoints `api/waitlist.js` and similar accept POST without server-side throttling.
- Risk: Spam, DDoS, fake waitlist signups.
- Remediation:
  - Add rate-limiting (IP-based), CAPTCHA for high-risk forms, and server-side throttling.

8) Observability and logging (Medium)
- Evidence: Many places use `console.error` and return generic messages to clients.
- Risk: Harder to triage incidents; possible leak of stack traces if misconfigured.
- Remediation:
  - Add structured logs (Sentry/Log provider), error IDs in responses, and sanitize messages returned to clients.

Screenshots & Evidence Collected
- Screenshots captured and attached in session: Dashboard, Profile (Onboarding), Document Vault, Essay Studio, Applications.
- Console/network warnings captured during login: Supabase REST calls failing when Supabase endpoint unreachable, and initial `signIn` showed network `ERR_CONNECTION_CLOSED` earlier (this was because local dev cannot reach remote Supabase due to environment network or keys misconfigured).

Repro Steps & Artifacts
1. Start dev server:

```bash
npm run dev
# open http://localhost:5173
```

2. Visit `/scholarships/browse` and click 'Sign in' → submit credentials using test account.
3. After sign-in, navigate to `/dashboard`, `/profile`, `/vault`, `/essays`, `/applications`.
4. Review console/network logs; check for failed external requests.

Immediate Remediation Checklist (Actionable)
1. Remove `.env.local` from git, add `.env*` to `.gitignore`, rotate secrets.
2. Enforce server-side token handling (HttpOnly cookies) and remove `zawadi_admin_token` client-side usage.
3. Harden paystack webhook verification and add replay protection.
4. Run all Supabase migrations and verify RLS policies in staging and prod.
5. Add CI pre-deploy gate: check required secrets present, run `npx tsc --noEmit`, run tests.
6. Add rate-limiting for public endpoints and CAPTCHA for waitlist/contact.
7. Add CSP and secure headers to production hosting.

Longer-term Improvements
- Add an automated security test job that scans repo for secret patterns on every PR.
- Implement server-side session renewal with short-lived tokens and refresh flows.
- Introduce multi-factor authentication for admin accounts.

Appendix: Important file references
- src/App.tsx — session handling, token storage, data fetching flows.
- src/components/AuthScreen.tsx — sign-in/signup logic.
- src/lib/supabase.ts & src/lib/supabase-queries.ts — DB access patterns and public queries.
- supabase/functions/process-payment/index.ts — payment processing & webhook handling.
- supabase/functions/* — server-side logic that requires service-role keys and secrets.
- supabase/migrations/* — SQL migrations for RLS and schema.

Next steps I can take for you (pick any):
- Produce a PR removing `.env.local` from VCS and adding `.env*` to `.gitignore` (I can prepare the patch).
- Generate a GitHub Actions workflow that runs `npm ci`, `npx tsc --noEmit`, and `npx playwright test` in CI (requires secrets and network).
- Run a deeper secret scan (regex search for `sk_live|SUPABASE_SERVICE_ROLE|AKIA|eyJ`) and list exact matches for rotation — I can produce that now.
