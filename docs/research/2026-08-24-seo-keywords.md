# SEO Keyword & Content-Gap Research — techsari.online

Date: 2026-08-24 · Method: 13 Exa searches (mcporter) + r.jina.ai page fetches of top-ranking results. Exa worked for all queries except one ("Mastercard Foundation Scholars Program eligibility apply"), which failed twice after retries; Mastercard data was captured incidentally via other queries. All page fetches via r.jina.ai succeeded.

## 1. Keyword Clusters

| Cluster | Example queries | Intent | Difficulty signal | Notes |
|---|---|---|---|---|
| Country + level + year | "fully funded scholarships for Kenyan students 2026", "masters scholarships for Nigerian students 2026" | Transactional | Medium — won by news blogs (kenyans.co.ke, tuko.co.ke) + university sites (usiu.ac.ke), not big edu portals | Fresh, dated listings win. Kenya cluster is dominated by local news covering individual calls ([example](https://www.kenyans.co.ke/news/122147-slovakia-opens-fully-funded-scholarships-kenyans-20262027-academic-year)). A browsable, always-current directory beats one-off news posts |
| No-IELTS / MOI | "scholarships without IELTS", "scholarships that accept MOI medium of instruction" | Info → transactional | Low-medium — thin blogs rank ([africanbase](https://africanbase.com.ng/scholarships-no-ielts-african-students/), [scholarshipscentral](https://www.scholarshipscentral.com/blog/scholarships-without-ielts-2026)); no authoritative African-focused source | Highest-opportunity cluster. Tables comparing "MOI accepted?" per program rank well. See gaps §3 |
| Flagship programs | "chevening requirements Kenya", "DAAD EPOS requirements", "Erasmus Mundus apply" | Info/navigational | High for official (.org/.de/eu) pages; low for "requirements explained simply" angles | Official pages are exhaustive but dense ([Chevening eligibility](https://www.chevening.org/resource-hub/guidance/eligibility/); [DAAD EPOS](https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50076777)) — plain-language eligibility checkers can win long-tail |
| Process / how-to | "how to get a fully funded scholarship from Africa" | Info | Low-medium — SEO consultancies and aggregators ([striveconsultancyhub](https://striveconsultancyhub.com/fully-funded-scholarship-guide-africans/), [studyandmarket guide](https://www.studyandmarket.com/2025/11/scholarships-for-african-international-students.html)) | Winners use step-by-step timelines, document checklists, month-by-month calendars |
| Trust & scams | "is scholarship application free", "scholarship scam agent fee" | Info | Very low — mostly US sources ([UNM](https://scholarships.unm.edu/Resources/scams.html), [BBB](https://www.bbb.org/article/news-releases/16922-bbb-tip-scholarship-scams)); Nigeria-specific content exists but is fragmented ([theoracle.ng](https://www.theoracle.ng/fellowships/10-common-scholarship-scams-in-nigeria-and-how-to-avoid-them/)) | No platform owns this. Strong differentiator; pairs naturally with a verification/trust story |
| Grades & conversion | "KCSE to GPA converter", "WAEC to GPA" | Info/tool | Low — generic converters ([unicompass](https://unicompass.info/grading.php), [gpacalculatorhq WAEC](https://gpacalculatorhq.com/waec-to-gpa/)), none embedded in a scholarship matcher | Tool-type content; links directly into matching profiles |
| Undergrad Africa-wide | "undergraduate scholarships for African students fully funded" | Transactional | Medium — university pages (birmingham.ac.uk, stir.ac.uk) + government PDFs ([Mauritius MASS](https://www.uom.ac.mu/images/FILES/Scholarship/2026/MASS/Guidelines_for_Applicants_undergraduate_2026.pdf)) | PDF-only government calls = aggregation opportunity |

## 2. Question-Style Queries Worth Answering Directly (PAA-style)

1. Can I get a fully funded scholarship without IELTS?
2. Which scholarships accept a Medium of Instruction (MOI) letter instead of IELTS? ([evidence](https://scholarwing.com/moi-certificate-for-scholarships/))
3. How do I get an MOI certificate from my university?
4. What GPA do I need for a fully funded scholarship? ([evidence](https://striveconsultancyhub.com/fully-funded-scholarship-guide-africans/))
5. Do you have to pay to apply for a scholarship? ([evidence](https://scholarships.unm.edu/Resources/scams.html))
6. Is the Chevening scholarship open to Kenyans without work experience? ([no — 2,800 hrs required](https://www.chevening.org/scholarships/who-can-apply/work-experience/))
7. Does DAAD accept MOI letters instead of IELTS? ([mixed — course-dependent](https://www2.daad.de/medien/deutschland/stipendien/formulare/epos_faq_en.pdf))
8. What does "fully funded" actually cover? ([evidence](https://scholar.africa/scholarships/fully-funded))
9. Can I apply for multiple scholarships at once? ([evidence](https://striveconsultancyhub.com/fully-funded-scholarship-guide-africans/))
10. How do I convert KCSE/WAEC grades to a 4.0 GPA? ([evidence](https://gpacalculatorhq.com/waec-to-gpa/))
11. How do I spot a fake scholarship agent in Nigeria/Kenya? ([evidence](https://checkscam.com.ng/scholarship-and-study-abroad-scams-targeting-nigerian-students-how-to-know-the-real-from-the-fake/))
12. When do major scholarship applications open and close each year? ([Oct–Feb clustering](https://striveconsultancyhub.com/fully-funded-scholarship-guide-africans/))
13. Do I need admission before applying for Chevening/DAAD? ([yes/unconditional offer](https://www.chevening.org/resource-hub/guidance/application-criteria/); DAAD applies direct to courses)
14. Am I still eligible for Erasmus Mundus if I studied in Europe before? (~12-month residence rule, [CASRAI guide](https://casrai.org/guides/erasmus-mundus-joint-masters-scholarship))
15. Are there scholarships for undergraduate African students that don't require IELTS? ([evidence](https://campuscybercafe.com/blog/post/fully-funded-scholarships-for-african-students-undergraduate-without-ielts/))
16. Can final-year students apply for scholarships?
17. Which countries give free preparatory language years instead of requiring English tests? ([Türkiye/MEXT/GKS/CSC table](https://truescho.com/en/blog/fully-funded-scholarships-without-ielts))

## 3. Content Gaps Competitors Miss

1. **MOI per-program database.** Blogs assert "DAAD accepts MOI" while DAAD's own FAQ says only "check with the course"; some UK universities reject MOI even where the funder allows it ([scholarwing claims vs DAAD PDF](https://www2.daad.de/medien/deutschland/stipendien/formulare/epos_faq_en.pdf)). Nobody maintains a verified, per-program MOI-accepted matrix. Techsari could attach an MOI flag to each listing.
2. **GPA conversion for African grading systems inside a matcher.** Converters exist standalone ([Scholaro](https://www.scholaro.com/gpa-calculator/), [WAEC→GPA](https://gpacalculatorhq.com/waec-to-gpa/) — noting "an A1 starts at 75%… a strong African student can look 'average'"), but no scholarship platform lets students enter KCSE/WAEC grades and see eligible awards.
3. **Scam-check as product trust.** Scam guides are scattered blog posts; even the best ([auditnaija](https://auditnaija.com/verify-scholarship-offers-nigeria/)) aren't integrated into a directory. Scholar Africa gestures at it ([verification policy](https://scholar.africa/trust)) but its checks are partially "on the roadmap". A "never pay to apply" promise + report button is ownable.
4. **Kenya government funding clarity.** HEF/Universities Fund details live in press releases ([universitiesfund.go.ke](https://www.universitiesfund.go.ke/universities-fund-urges-first-year-public-university-students-to-apply-for-government-scholarships-for-the-2026-2027-academic-year/)); no aggregator structures HEF vs external scholarships for KCSE leavers.
5. **Deadline calendars by nationality.** Competitors list deadlines ad hoc; nobody offers "closing soon for Kenyans/Nigerians" filtered views (scholar.africa has countdowns but not nationality-filtered urgency).
6. **Airfare/upfront-cost reality checks.** Even "fully funded" calls exclude flights (~Ksh 120–150k for Slovakia, [kenyans.co.ke](https://www.kenyans.co.ke/news/122147-slovakia-opens-fully-funded-scholarships-kenyans-20262027-academic-year)) or require $1,000+ on arrival ([Mauritius MASS PDF](https://www.uom.ac.mu/images/FILES/Scholarship/2026/MASS/Guidelines_for_Applicants_undergraduate_2026.pdf)). Hidden-cost labels would be unique.

## 4. Recommended On-Page Targets

| Page | Target clusters | Rationale |
|---|---|---|
| `/` | Brand + "scholarship platform for African students", trust/scams headline claim ("free forever, never pay to apply") | Homepage must carry the free/verified positioning that competitors' FAQs prove demand for ([scholar.africa FAQ](https://scholar.africa/)) |
| `/scholarships/browse` | Country+level+year transactional cluster; undergrad & masters Africa-wide; add filters: deadline, funding coverage, **MOI accepted**, hidden costs | This is the money page for "fully funded scholarships for Kenyan/Nigerian students 2026"-type queries; needs crawlable, dated, per-listing pages |
| `/how-it-works` | Process/how-to cluster; step-by-step timeline; document checklists; grade-conversion explainer | Matches winning format of [striveconsultancyhub guide](https://striveconsultancyhub.com/fully-funded-scholarship-guide-africans/); embed KCSE/WAEC→GPA tool here |
| `/faq` | All PAA-style questions §2; MOI explainer; scam red flags; "is application free?" | Structured FAQPage schema targets PAA boxes; grounded answers in §5 |
| `/about` | Trust cluster: verification process, no-fees policy, team, scam-reporting commitment | Converts the scam-gap (§3.3) into brand equity; supports E-E-A-T for YMYL finance-adjacent topic |

## 5. Ten FAQPage Entries (grounded in fetched sources)

1. **Do I ever have to pay to apply for a scholarship?** No. Legitimate scholarships are free to apply for; any "registration", "processing" or "refundable" fee is the classic scam signal flagged by universities and consumer agencies alike ([source](https://scholarships.unm.edu/Resources/scams.html)).
2. **Can I get a fully funded scholarship without IELTS?** Yes. Programs like Türkiye Bursları, MEXT, CSC China, GKS Korea and Stipendium Hungaricum accept alternatives such as MOI letters, interviews, Duolingo, or a funded language-prep year ([source](https://www.scholarshipscentral.com/blog/scholarships-without-ielts-2026)).
3. **What is a Medium of Instruction (MOI) certificate?** An official letter from your school's registrar, on letterhead and stamped, stating your degree was taught entirely in English. Your university issues it free, and many funders accept it instead of IELTS ([source](https://scholarwing.com/moi-certificate-for-scholarships/)).
4. **Does DAAD accept an MOI letter instead of IELTS?** It varies by course. DAAD's standard EPOS requirement is IELTS band 6 or TOEFL 80, but some courses accept alternatives — always confirm with the specific program ([source](https://www2.daad.de/medien/deutschland/stipendien/formulare/epos_faq_en.pdf)).
5. **What are the basic Chevening requirements?** You need citizenship of an eligible country, an undergraduate degree, at least 2,800 hours (≈2 years) of post-degree work experience, three UK course choices with one unconditional offer, and a commitment to return home for two years ([source](https://www.chevening.org/resource-hub/guidance/eligibility/)).
6. **What does "fully funded" cover?** Typically full tuition plus a monthly stipend, airfare, and health insurance. Beware "tuition-only" awards — living costs abroad make them unaffordable without extra funding ([source](https://striveconsultancyhub.com/fully-funded-scholarship-guide-africans/)).
7. **Can I apply for several scholarships at the same time?** Yes, and you should: successful applicants typically run 5–8 tailored applications per cycle across competitive and moderately competitive programs ([source](https://striveconsultancyhub.com/fully-funded-scholarship-guide-africans/)).
8. **How do I convert KCSE or WAEC grades to a US GPA?** Use letter-grade mapping rather than raw percentages — e.g., WAEC A1 (75–100%) maps to 4.0 and C6 to 2.3 — because strict African marking scales otherwise understate your record ([source](https://gpacalculatorhq.com/waec-to-gpa/)).
9. **How do I know if a scholarship offer is fake?** Verify independently: find the provider's official domain yourself, confirm the award exists through contacts listed there, and never pay or share bank/OTP details to "release" an award. Real sponsors never use personal accounts ([source](https://auditnaija.com/verify-scholarship-offers-nigeria/)).
10. **When should I start applying for next year's intake?** Start 12 months ahead: most deadlines cluster between October and February (Chevening Nov, Erasmus Mundus Oct–Jan, Türkiye Feb, CSC Mar–Apr), and transcripts take weeks to obtain ([sources](https://striveconsultancyhub.com/fully-funded-scholarship-guide-africans/), [erasmus-plus.ec.europa.eu](https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters)).

---
*Word count ≈1,450.*
