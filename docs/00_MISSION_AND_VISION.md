# Zawadi v2 — Mission, Vision & Guiding Principles

**Document Version:** 3.0 (Rebuild)
**Date:** May 27, 2026
**Author:** Techsari Product Team
**Status:** Active — Spec-Driven Development

---

## 1. Mission Statement

> **Zawadi exists to ensure that no African student misses a life-changing scholarship opportunity because of information gaps, missed deadlines, or lack of application support.**

In Swahili, *zawadi* means "gift." We are the gift that stands between a capable African student and a missed opportunity that could have changed everything.

Talent is evenly distributed across Africa — but opportunity is not. A brilliant student in Nairobi, Lagos, Accra, or Addis Ababa should have the same shot at a fully-funded master's in London or a PhD in Toronto as a student who grew up knowing these opportunities exist. Zawadi closes that gap.

---

## 2. Vision

**Become the default scholarship platform for every African student** — the first place they look, the tool they rely on, and the community that supports them from discovery to acceptance. Within 3 years, we aim to be the platform that processes 50% of all scholarship applications by African students globally.

---

## 3. The Problem (Research-Backed)

### 3.1 Scale

| Statistic | Value | Source |
|---|---|---|
| African students studying abroad | 400,000+ globally; 56,780 in US alone | UNESCO, IIE Open Doors 2024 |
| Largest cohort (Nigeria) | ~85,000 (30% of African total) | WENR 2024 |
| Annual growth rate of African student mobility | 8-12% YoY | ICEF Monitor |
| Students who miss deadlines due to poor tracking | ~40% (self-reported) | Techsari survey (n=200) |
| Scholarship listings that are expired/misleading | ~35% | Internal audit of aggregator sites |

### 3.2 Six Core Problems

1. **Information Fragmentation** — Scholarships scattered across 500+ websites. No single Africa-first source.
2. **Eligibility Blindness** — 70% of generic search results are irrelevant to any given African student.
3. **Deadline Chaos** — Students track deadlines in spreadsheets or memory. 40% miss at least one deadline per year.
4. **Application Overwhelm** — 15-30 simultaneous applications with zero tooling.
5. **Essay & Document Burden** — 5-8 unique essays per cycle. No access to editors or mentors.
6. **Trust Deficit** — 35% of aggregator listings have broken links or expired deadlines.

---

## 4. Our Solution

Zawadi is an **AI-powered scholarship matching and application management platform** purpose-built for African students. We combine:

1. **Curated Database** — Every listing verified for African eligibility with direct application links
2. **AI Matching** — Profile-based matching with 0-100% scores
3. **Application Tracker** — 8-stage pipeline with urgency indicators and stats
4. **AI Essay Generator** — 3-stage pipeline: Draft → Critique → Polish
5. **Document Vault** — Upload once, reuse across applications with gap analysis
6. **Auto-Apply Engine** — Form auto-fill and batch submission
7. **Zawadi Bot** — Automated daily scholarship ingestion and verification

**Our moat:** No other platform combines AI matching, essay generation, application tracking, and document intelligence in one product built specifically for African students.

---

## 5. Goals

### 5.1 Short-Term (0–6 months)

| # | Goal | Target |
|---|---|---|
| 1 | Verified scholarship database | 500+ active listings with direct links |
| 2 | Product-market fit | 1,000 active users across 15+ African countries |
| 3 | Zawadi Bot as primary ingestion engine | <24hr time-to-live on new listings |
| 4 | Freemium payments via Paystack | Seamless KES upgrade path |
| 5 | Match accuracy | >85% user satisfaction |

### 5.2 Medium-Term (6–18 months)

1. Scale to 10,000 users across all 54 African countries
2. Track and publish scholarship win rates (Zawadi users vs. general applicants)
3. University partnerships — direct integration with admissions offices
4. Mentor network — connect winners with applicants
5. Native mobile apps (iOS/Android)

### 5.3 Long-Term (18+ months)

1. Become the default scholarship platform for African students
2. Expand to fellowships, internships, research grants
3. Build an alumni network of Zawadi scholars
4. Use aggregate data to advocate for more African-inclusive policies
5. Pan-African localization (French, Portuguese, Arabic)

---

## 6. Guiding Principles

These principles govern every product decision:

1. **Africa-first, always.** Every feature starts with: "Does this serve African students better?"
2. **Verify before we publish.** No scholarship goes live without confirmed eligibility, deadline, and direct link.
3. **Build for the student who has nothing.** The free tier must be genuinely useful — not a teaser.
4. **Earn trust through transparency.** Show match scores, data sources, last-verified timestamps.
5. **Every link must work.** A broken link is a broken promise. Automated link validation.
6. **Privacy is a right, not a feature.** Collect only what's needed, protect it, let users delete it.
7. **Ship fast, don't break trust.** Rapid iteration is good; shipping bad data is unforgivable.
8. **Learn from outcomes.** Track which applications succeed. Feed that back to help the next student.
9. **No Express. No serverless functions.** Pure static + Supabase. Proven architecture.
10. **Spec-driven development.** Every feature starts with a spec. Implementation follows the spec.

---

## 7. Brand Promise

> **"Your scholarship journey, from discovery to acceptance — all in one place."**

We promise:
- **Relevance:** Every scholarship verified for African eligibility
- **Recency:** Deadlines current, links live, information verified
- **Support:** AI tools that genuinely improve application quality
- **Transparency:** No hidden fees, no bait-and-switch, no dead-end links
- **Access:** Generous free tier so cost is never the barrier
- **Privacy:** Your data is yours — we never sell it

---

## 8. Competitive Positioning

| Feature | Zawadi | Scholars4Dev | After School Africa | Bold.org |
|---|---|---|---|---|
| Africa-first eligibility filter | ✅ | Partial | Partial | ❌ |
| AI essay generation | ✅ | ❌ | ❌ | ❌ |
| Application tracker (8 stages) | ✅ | ❌ | ❌ | ❌ |
| Document intelligence | ✅ | ❌ | ❌ | ❌ |
| Direct application links | ✅ | Mixed | Mixed | ✅ |
| Deadline urgency system | ✅ | ❌ | ❌ | ❌ |
| Auto-apply engine | ✅ | ❌ | ❌ | ❌ |
| Freemium with local currency | ✅ | Free | Free | Free |
| Automated discovery (Bot) | ✅ | ❌ | ❌ | ❌ |
| Built for Africa, in Africa | ✅ | ❌ | ✅ | ❌ |

---

## 9. Success Metrics (KPIs)

| Metric | 6-Month | 12-Month | Measurement |
|---|---|---|---|
| Active Users | 1,000 | 10,000 | Weekly active count |
| Scholarships in DB | 500 | 1,500 | Verified, active listings |
| Applications Tracked | 5,000 | 75,000 | Status changes |
| AI Essays Generated | 10,000 | 200,000 | Generation API calls |
| Match Accuracy | >85% | >90% | User feedback |
| Free-to-Paid Conversion | 5% | 8% | Payment webhooks |
| User NPS | >50 | >60 | Quarterly survey |
| Countries Represented | 15 | 35 | Registration data |
| Dead Link Rate | <2% | <1% | Automated checker |
| Bot Ingestion Speed | <24hrs | <6hrs | Time discovery→live |

---

*Zawadi — Because every African student deserves a fair shot at the education that could change their life.*
