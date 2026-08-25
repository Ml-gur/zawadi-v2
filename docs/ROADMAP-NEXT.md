# Techsari — Session Changelog & Next Steps

_Last updated: 2026-08-25. All items below are committed and pushed unless marked otherwise._

## ✅ Shipped (August 2025 sessions)

### Platform fixes (root-caused)
- **Document analysis completing again** — live DB was missing `documents.extraction_method`; every analysis died on its final write. Migration 017 applied; function redeployed.
- **Tracker stages persist** — `applications.id` had no default; every stage change failed silently. Default added; errors now toast instead of vanishing. Verified end-to-end under RLS with a real account.
- **Profile setup wizard rebuilt** on live design tokens (was a transparent card rendering the literal word "close").

### Admin portal (full rebuild)
- New `admin-api` edge function (deployed): real overview stats, timeseries, user list with engagement counts, plan/suspend/delete with audit logging, payments, audit trail, AI connection test.
- 8 rebuilt tabs: Overview (glanceable stats + "Needs attention"), Users, Scholarships (full CRUD + **bulk publish/unpublish/delete**), Bot Queue, Payments, Audit, AI Config (+ Test connection), Mentor Queue.
- 15s live polling, "updated" stamp, error banner keeping last-good data. Legacy panels deleted.

### Mobile experience
- **Bento grids everywhere**: public browse, logged-in finder, dashboard stat cards (2-up on mobile).
- **Filters collapsed** on mobile for both finders: one row = search + Filters toggle (active-count badge) + view switch.
- **Scholarship detail overflow fixed** — scrollWidth now exactly equals viewport (was 432px on 390px screens).
- **Scholar stories** → single auto-scrolling marquee row (pauses on hover, reduced-motion safe).

### Extraction & matching
- PDF extraction now reconstructs visual lines (Y-grouping + X-sort + gap-aware spaces) — fixes tabular transcripts scrambling regex patterns.
- AI fallback widened to 12k chars with transcript-aware prompt; reads provider/key from AI Config.
- Matching accepts explicit `age` (falls back to DOB for legacy rows); age-gate hint updated.
- **Profile asks Age + Gender instead of birth year** (migration 018 applied).

### Brand, legal, content
- Real logo mark powers PWA icons (192/512/maskable); full favicon set wired (android-chrome + manifest).
- Privacy Policy + Terms rewritten (user-facing, age/gender disclosed, categories-not-architecture, Kenya/ODPC/CAK-aligned). 6 realistic testimonials.
- `.env` restructured for direct copy-paste into Vercel (see file header for per-var types).

### Security audit
- Full 70-check report: `docs/security-audit-2026-08-25.md` — 38 PASS / 19 FAIL / 4 UNKNOWN / 9 N/A.

---

## 🔴 Next: ship blockers (from the audit — do before scaling spend/users)

1. **Payment sandbox bypass** — set Vercel/Supabase secret `ENVIRONMENT=production` on `process-payment`, then verify a `sandbox_` reference gets rejected.
   Verify: attempt upgrade with test ref → expect failure.
2. **Privilege escalation via profiles INSERT** — migration 013's trigger guards UPDATE only. Extend the privileged-column guard to INSERT (new migration), so a fresh auth user cannot INSERT `role='super_admin'`.
   Verify: sign up, try inserting a profile with role super_admin via anon key → expect RLS rejection.
3. **Wildcard CORS on all 7 edge functions** — replace `Access-Control-Allow-Origin: *` with the techsari.online + preview-domain allowlist.
   Verify: preflight from a foreign origin → expect no ACAO header.
4. **AI spend abuse** — `api/ai-generate.js` has in-memory-only quotas; `generate-essay` lets clients override the model string. Remove client model override; move quota to durable store (Supabase table).
   Verify: 30 rapid calls from one session → expect hard 429.
5. **Add CSP + rotate the Supabase access token shared in chat** (treat as exposed).

## 🟡 Next: design consistency pass (the "say the word" item)

**Legacy dark-token sweep** — these files still pair the dead `bg-off-black` with `text-cream` (renders transparent cards + dark-on-dark text in today's theme):
`ForgotPassword.tsx`, `ResetPassword.tsx`, `MentorPortal.tsx`, `ContactPage.tsx`, `ComingSoonPage.tsx`, `AdminLoginPage.tsx`, `PWAInstallPrompt.tsx`, `ConfirmationDialog.tsx`, `ErrorBoundary.tsx` (uses `text-status-urgent` — valid), plus `PrivacyPolicy.tsx`/`TermsOfService.tsx` legacy sections if any remain.

Recipe per file: `bg-off-black` → `bg-off-black-ink`; `text-cream` → `text-pure-white` (or `text-smoke` for secondary); `border-hairline` → `border-ash`; then screenshot the page in mobile + desktop before moving on. Do NOT blind-replace — `text-cream` on light backgrounds means `text-off-black-ink`.

## 🟡 Next: product verification checklist (founder, 15 min)

- [ ] Upload a real transcript → status flips to Analyzing → Completed with P/AI/H badge; confirm extracted GPA/institution look right.
- [ ] Tracker: change stage → reload → persists; no silent failures.
- [ ] Admin → Users: plan change persists + appears in Audit tab.
- [ ] Admin → Scholarships: select 3 drafts → bulk Publish → they appear on public finder.
- [ ] AI Config → Test connection returns latency (after adding DEEPSEEK_API_KEY).
- [ ] Mobile: browse → filters toggle → detail page → no horizontal scroll anywhere.
- [ ] Vercel deploy green after env paste; PWA install prompt works on a phone.
