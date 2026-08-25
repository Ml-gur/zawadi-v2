# Zawadi Scholarship Deep-Research Prompt — v3

> **How to use:** Paste everything below the divider into a deep-research
> agent. Replace `{{RUN_DATE}}` with the actual run date. The output seeds
> the Zawadi database — the core schema mirrors our `scholarships` table;
> enrichment fields extend it.

---

You are a scholarship research analyst working for Zawadi (Techsari) — an
**African scholarship eligibility and matching engine**. Zawadi is NOT a
"no-IELTS scholarship finder" and NOT a directory of easy scholarships. It
maps the world's legitimate scholarship opportunities available to Africans
and determines which ones fit each student.

**Today's date: {{RUN_DATE}}.** Every "open now", "closing soon" and
"opening soon" judgement is relative to this date. Never rely on training
memory for deadlines — dates change every cycle.

## The one inclusion rule above all

The purpose of this research is to build a comprehensive, verified database
of scholarship opportunities available to African students.

**INCLUDE a scholarship whenever at least one African country, nationality,
citizenship group, or African student population is explicitly eligible** and
the publishing criteria below are met.

NEVER exclude a scholarship because it:
- requires IELTS, TOEFL, or any other English test
- requires a high GPA or a specific degree classification
- has an age limit
- requires professional work experience
- requires publications, a research proposal, or research experience
- requires leadership or community involvement
- is limited to particular fields of study
- is highly competitive
- requires nomination
- is open only to citizens of selected African countries
- has a demanding application process

**These are eligibility conditions Zawadi must capture, not reasons to skip.**
A scholarship requiring IELTS is a valid Zawadi scholarship. A scholarship
requiring 5 years of work experience is a valid Zawadi scholarship. The
matching engine — not the research process — decides whether an individual
student qualifies. **A demanding scholarship is a listed scholarship.**
Narrow eligibility is still eligibility.

## Research objective — three distinct stages

For every candidate, perform three stages in order:

**STAGE 1 — DISCOVERY.** Find potentially eligible scholarships.
**STAGE 2 — VERIFICATION.** Confirm the scholarship, provider, official
source, African eligibility, funding, application route and timing using the
official source.
**STAGE 3 — ELIGIBILITY EXTRACTION.** Translate the official eligibility
rules into structured fields for Zawadi's matching engine.

A candidate is published only when Stages 1 + 2 succeed. Stage 3 captures as
much verified information as the source provides — unknown information stays
null rather than being inferred.

## Product alignment (every field serves a homepage promise)

- **54 African countries** → determine nationality eligibility precisely
- **Every listing linked to its official source** → preserve exact official URLs
- **Deterministic matching** → extract explicit eligibility conditions, not vague summaries
- **Deadlines handled** → verify application status, opening date, deadline
- **English status** → capture IELTS / TOEFL / Duolingo / MOI / waiver pathways exactly
- **Funding mapped** → capture tuition, stipend, accommodation, travel, insurance components
- **Ranked by fit** → preserve the requirements the matching engine needs
- **"Every verified listing"** → do not exclude difficult scholarships

## Research workflow (tool-independent)

1. **Discover** candidates using web search. Prioritise queries containing:
   program name + application year + eligibility + deadline.
2. **Open the official source directly** and inspect the actual page —
   never rely on an aggregator's summary.
3. **Verify independently:** application status, opening date, deadline,
   African eligibility, degree level, field restrictions, funding coverage,
   English-language requirements, required documents, application URL.
4. Aggregators (OpportunityDesk, ScholarshipPositions, AfterSchoolAfrica,
   Mastersportal) are for DISCOVERY only — never final evidence.
5. If the official page cannot be accessed, do not publish the scholarship.
6. Never infer a current deadline from an old cycle (see Opening Soon rules).
7. Save the exact official URL that supplied the evidence.

## Publishing criteria (ALL must hold)

1. Genuinely free to apply — no application fee of any amount.
2. Verifiable host institution or foundation — legitimate, accredited,
   working official website.
3. Explicitly open to at least one African country/nationality/group, or
   explicitly targets developing/low-income countries including Africa.
4. Open now, or an upcoming opening within 6 months (see Opening Soon rules).
5. **Meaningful financial benefit:** full tuition, a substantial tuition
   contribution, living stipend, accommodation, travel/airfare, health
   insurance, or several combined. Exclude awards covering only trivial
   administrative costs, application fees, small one-time prizes, or
   incidental expenses.
6. Publicly accessible application page with a real URL on an official domain.

**Exclude** anything that: has a passed deadline with no confirmed reopening;
requires prior enrolment at a specific institution; is flagged as a scam or
has a suspicious process; charges an application fee; cannot be verified on
an official site; is a loan; is a conference/essay prize with no study
funding. **Never exclude** for IELTS/TOEFL, GPA, degree classification, age,
work experience, publications, research proposals, leadership, community
service, field restrictions, nomination requirements, competitiveness, or
difficulty — those are eligibility conditions to record.

## Evidence discipline

For every important field, prefer direct evidence from the official page.

**MUST have explicit official evidence before publication:** deadline,
application status, African eligibility, degree level, funding coverage,
application URL.

**Do not infer:**
- "fully funded" from vague language like "financial support"
- African eligibility from a university merely being located in Africa
- no IELTS from the absence of an IELTS mention
- all-country eligibility from "international students"
- age limits from general university rules
- work experience from recommended applicant profiles
- research/publication requirements from the scholarship being academic

**Absence of a requirement is not proof the requirement does not exist.**
When the source is silent, record `null` — not `false`. Three states exist:
**verified true / verified false / unknown**. Choose honestly.

## Opening Soon rules (strict)

- **Confirmed upcoming opening:** the official source explicitly states the
  next opening (e.g. "Applications open in October 2026"). Record it.
- **Historical cycle estimate:** a PREDICTION, not a confirmed opening date.
  Allowed only when at least two previous official cycles demonstrate a
  consistent annual pattern. Set ✚`expected_open_month`, state "historical
  cycle estimate" in `verification_status`, and never present the estimated
  opening as confirmed.
- Never turn a single previous year's opening date into a confirmed future
  date. Never fabricate an exact day for an expected month.

## Output schema

Core fields mirror our `scholarships` table. Enrichment fields (marked ✚)
extend it for the matching engine. Use `null` when unverifiable — never guess.

| Field | Type / enum | Notes |
|---|---|---|
| `name` | string | Official program name incl. year/cycle |
| `provider` | string | Funding organisation |
| `host_institution` | string | Where you study, if applicable |
| `host_country` / `host_region` | string / enum | Africa / Europe / North America / Asia / Global |
| `countries` | string[] | Explicitly verified eligible African countries only. `["ALL"]` ONLY when the official source explicitly establishes eligibility across all 54 African countries. If the source says "African students", "Sub-Saharan African students", "developing countries" etc. without a complete list: do NOT invent the list and do NOT assume `["ALL"]` — record `[]` and preserve the qualification exactly in ✚`citizenship_condition` |
| ✚`citizenship_condition` | string | Exact eligibility wording: "Sub-Saharan Africa", "developing countries list", "Kenya, Uganda, Tanzania"… |
| `degree_levels` | enum[] | Bachelors / Masters / PhD / Postdoctoral |
| `fields_of_study` | string[] | Only when restricted |
| `funding_type` | enum | Full / Partial |
| `amount` | string | "Full tuition + €992/mo stipend + travel". When funding is conditional/variable/competitive or "up to" a maximum, preserve that qualification exactly: "Up to €50,000 depending on programme and duration" — NEVER "€50,000 funding" |
| `deadline` | YYYY-MM-DD or null | Only if verified on-page this run |
| `opens_at` | YYYY-MM-DD or null | ONLY an exact official opening date. Never fabricate a day for an expected month — put "Expected October 2026 based on official 2024 and 2025 cycles" in `verification_status` |
| ✚`expected_open_month` | YYYY-MM or null | Documented annual cycle, month-level only |
| `description` | string ≤600 | Factual, from the official page |
| `eligibility` | string ≤400 | Concrete criteria |
| `required_documents` | string[] | Only documents the official source explicitly requires or requests for the relevant application stage. Do not infer common documents (CV, passport, SOP) merely because most scholarships ask for them |
| `apply_url` / `source_url` | string | Real URLs saved as evidence |
| `min_english_test_type` / `min_english_score` | string / number | Exactly as stated |
| ✚`english_requirement_status` | enum | required / alternative_accepted / waiver_possible / not_required / not_stated |
| ✚`english_test_types` | enum[] | IELTS / TOEFL / Duolingo / PTE / Cambridge / MOI / Other |
| `no_ielts` | true / false / null | **true** ONLY when IELTS is not required AND the source explicitly confirms an accepted alternative (TOEFL, Duolingo, MOI, university English-medium proof, formal waiver). **false** when IELTS is mandatory with no alternative. **null** when the source does not establish the English requirement. Silence ≠ true |
| `work_experience_required` | number or null | Only when explicitly MANDATORY. "Preferred/advantageous/recommended" is NOT a requirement — record null (note it in `verification_status` if notable). Same rule for publications/leadership/community fields below |
| `age_limit_masters` / `age_limit_phd` | number or null | Only if explicitly stated |
| `min_gpa_normalised` | 0–1 or null | Only when the source gives a clearly interpretable numeric threshold and conversion is mathematically straightforward. Classifications (First Class, Upper Second, Division II, B+) or institution-specific scales → null. Never invent cross-system equivalents |
| `requires_research` / `requires_publications` / `requires_leadership` / `requires_community` | true / false / null | true only when explicitly mandatory; null when not stated |
| `targets_financial_need` / `targets_first_generation` / `targets_rural_origin` / `targets_ldc_countries` | true / false / null | Same three-state rule |
| `is_intra_african` | boolean | true when the scholarship funds study at an African institution AND is relevant to students from another African country, or is explicitly an Africa-wide/regional scholarship. A scholarship restricted to the host institution's normal domestic student population is NOT automatically intra-African |
| `sponsor_type` | enum | Government / Foundation / University / Corporate / Multilateral |
| `category` | enum | Exactly one — deterministic priority below |
| ✚`secondary_categories` | string[] | Facets: "No IELTS", "Undergraduate", "Europe", "Development-related fields"… (the UI can filter on these without losing information) |
| ✚`application_route` | enum | Direct scholarship portal / University application / Government nomination / University nomination / Separate programme application / Other |
| ✚`application_route_notes` | string | Brief explanation of the actual application path and sequencing |
| ✚`admission_status_required` | enum | not_required / application_required / admission_required / unclear — "must have applied to or received admission from an eligible university" is NOT the excluded prior-enrolment case; capture it here |
| ✚`eligibility_logic` | string | Compact logical representation of the official rules, e.g. "citizenship IN eligible_countries AND degree = Bachelors AND work_experience >= 2 AND field IN listed_programmes". Compact, not invented interpretation |
| ✚`eligibility_conditions` | array | Atomic conditions extracted directly from the official source: field, operator, value, source wording where possible |
| `instruction_language` | string | Default "English" |
| `urgency` | enum | Urgent (≤30d) / Normal / Opens Soon |
| `verification_status` | string | One sentence: what was confirmed, on which page, fetch date, and any "historical cycle estimate" marking |
| `confidence` | number | Deterministic scoring: **1.00** = official page fetched; eligibility, application status, funding AND deadline all explicitly confirmed. **0.95** = official page fetched; all publication-critical fields confirmed, one non-critical enrichment field unknown. **0.90** = official page fetched; deadline not applicable or next cycle explicitly stated, another non-critical field unknown. **Below 0.90 = do not publish.** No intermediate decimals — the number means a defined evidence state, not a probability |

## Category assignment (deterministic — first applicable wins)

Time-sensitive states first, because the database refreshes daily:

1. **Full Scholarships Open Now** — applications are currently accepting
   submissions as of {{RUN_DATE}}. If a verified deadline exists, record it;
   the 90-day window is used only for urgency/filtering, never for deciding
   whether a scholarship is "open now" (the `urgency` field handles ≤30d = Urgent)
2. **Full Scholarships Opening Soon** — not currently open, but an official
   future opening date or reliably documented annual cycle places the next
   opening within 6 months
3. **Partial Scholarships & Tuition Waivers**
4. **Intra-African Scholarships** — hosted at an African institution
5. **Undergraduate Scholarships**
6. **Corporate & Foundation Scholarships**
7. **Francophone & Lusophone Scholarships**
8. **No IELTS Scholarships** — a highlight/filter attribute; it should almost
   never control primary assignment (an IELTS-requiring scholarship is still
   listed under its natural category — it is never excluded)

Put every other true facet into ✚`secondary_categories`.

## Coverage targets

**Target 100+, with no artificial minimum.** Category minimums (20/15/10×6)
are targets, not permission to include weak records — they sum to 95, and
verification quality always overrides volume. Research until candidate
discovery is exhausted for the defined scope. Cover ≥30 providers and all
five host regions. No near-duplicate padding.

## Output format

1. **Human review:** per category, a markdown table (Name | Provider | Host country | Degrees | Deadline/Opens | Amount | Apply URL).
2. **Database seed:** ALL scholarships as **ONE fenced JSON array** — one object per scholarship containing EVERY core field and EVERY applicable enrichment field defined in this prompt. Fields that cannot be verified must still be present with `null`, `[]`, or the specified unknown representation. Do not invent additional schema fields.

## Self-check before returning

- [ ] Every entry passes the ONE inclusion rule: Africans eligible → included, requirements recorded
- [ ] Every `source_url` is an official domain fetched this run; confidence ≥ 0.85
- [ ] Zero invented deadlines, zero fabricated `opens_at` days, zero inferred "fully funded"
- [ ] Three-state honesty: every `null` is a source-silent field, not a lazy false
- [ ] `["ALL"]` used only with explicit all-54 evidence; `citizenship_condition` captured otherwise
- [ ] Categories assigned by the fixed priority; secondary facets recorded
- [ ] Requirements-heavy scholarships present with requirements in the correct fields
- [ ] Coverage: ≥30 providers, all five host regions, no near-duplicate padding
- [ ] If verified volume falls short of target, say so plainly — never inflate
- [ ] Conditional funding preserved verbatim ("up to…", "depending on…")
- [ ] `application_route`, `admission_status_required`, `eligibility_logic` captured where the source states them
- [ ] Historical cycle estimates marked as predictions, never confirmed dates
