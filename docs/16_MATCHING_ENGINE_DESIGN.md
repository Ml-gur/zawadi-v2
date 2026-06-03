# Matching Engine Design: 100% Deterministic Filtering

## The Problem

Existing mass scholarship directories (Fastweb, Scholarships.com, etc.) use simple, broad filters to show students hundreds or thousands of potential awards. This creates an **illusion of opportunity**, but in reality it forces students to manually read through the fine print of each listing only to realise they are disqualified by a single hyper-specific requirement. This creates a **"low-signal, high-effort"** environment that leads to severe information overload, wasted time, and application fatigue.

## The Solution: Deterministic Matching

Zawadi's matching engine is an **algorithmic filtering system** designed to map a student's specific profile data (nationality, GPA, desired field of study, etc.) directly against the exact fine-print requirements of scholarship providers.

It is **deterministic** because it relies on strict, absolute logic rather than loose or probabilistic keyword matching. The engine acts as an **expert gatekeeper**:

1. It automatically evaluates a student's academic records and financial needs
2. It ensures students are **only shown scholarships where they meet every single eligibility criterion**
3. If a student does not meet **100% of the rules** for a specific award, that scholarship is completely filtered out of their view

## Benchmark: MySCU (African Edtech)

The African edtech startup **MySCU** is a successful benchmark for this model. MySCU built an AI advisor named **Mavi** that:

- Predicts admission outcomes
- Matches students to universities and scholarships based strictly on their specific budgets and goals

By prioritising **Match Accuracy Rate** over sheer volume, the engine prevents wasted application effort for students and drastically reduces manual sorting costs for the institutions providing the funding.

## Implementation

The matching engine lives in `src/lib/matching-engine.ts` and uses a multi-stage pipeline:

1. **Hard gates** — absolute requirements (degree level, field of study, country eligibility, language, No-IELTS flag). Failure of any gate yields a zero match.
2. **Soft scoring** — 9 dimensions (country affinity, degree alignment, field match, GPA grade, language strength, experience, target country, documents, No-IELTS bonus) each scored 0-1 and weighted.

See the source for the full scoring model and gate logic.
