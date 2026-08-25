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

## ✅ Ship blockers (from the audit — COMPLETED 2026-08-25, deployed + verified)

1. ✅ `ENVIRONMENT=production` secret set on `process-payment` — sandbox upgrade path closed.
2. ✅ Migration 020 applied live: profiles INSERT guard forces role='user'/plan='explorer'/status='active' for non-service-role inserts — self-promotion to super_admin is dead.
3. ✅ CORS origin allowlist deployed on ALL 8 edge functions (techsari.online + www + vercel.app previews + localhost dev; everything else defaults to www). Verified: allowlisted origin echoed, foreign origin gets default.
4. ✅ Client model override removed from `generate-essay`; `api/ai-generate.js` now has a durable 30/day per-user cap (`ai_usage_daily` table + RLS) on top of the per-minute limiter.
5. ⬜ CSP header + rotate the Supabase access token shared in chat — still open (token rotation is yours; CSP needs a careful pass).

## ✅ Design consistency pass (COMPLETED 2026-08-25)

Legacy `bg-off-black` + `text-cream` swept across ForgotPassword, ResetPassword, AdminLoginPage, ComingSoonPage, PWAInstallPrompt, MentorPortal — dark cards now render correctly (verified on ForgotPassword). Matching engine: freshly crawled listings with unspecified countries now REVIEW-pass with a visible note instead of hard-failing every student.

## 🟡 Next: product verification checklist (founder, 15 min)

- [ ] Upload a real transcript → status flips to Analyzing → Completed with P/AI/H badge; confirm extracted GPA/institution look right.
- [ ] Tracker: change stage → reload → persists; no silent failures.
- [ ] Admin → Users: plan change persists + appears in Audit tab.
- [ ] Admin → Scholarships: select 3 drafts → bulk Publish → they appear on public finder.
- [ ] AI Config → Test connection returns latency (after adding DEEPSEEK_API_KEY).
- [ ] Mobile: browse → filters toggle → detail page → no horizontal scroll anywhere.
- [ ] Vercel deploy green after env paste; PWA install prompt works on a phone.
