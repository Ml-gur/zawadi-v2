# Zawadi v2 — Scholarship Recommendation & Matching System

**Document:** 16_RECOMMENDATION_SYSTEM.md  
**Version:** 2.0 (Pan-African Rewrite)  
**Date:** May 28, 2026  
**Author:** Techsari Engineering  
**Status:** Implementation Spec — Phase 1  

---

## 🚀 Backend Implementation Checklist

This checklist tracks the implementation of the Phase 1 Pan-African Recommendation and Matching system.

### 1. Database & Reference Data
- [x] Run schema extension (re-implemented using local DB architecture)
- [x] Integrate all 54 African countries across 4 language groups in `african-countries.ts`
- [x] Set up GPA systems configs (all 9 systems) in `gpa-systems.ts`
- [x] Group codes for `REGION_CODES`, `OIC_MEMBER_CODES`, `COMMONWEALTH_CODES`, `FRANCOPHONE_CODES`, `LUSOPHONE_CODES`, `ARABOPHONE_CODES`

### 2. Matching Engine & Scoring
- [x] Hard Eligibility Gates (Phase A):
  - G1: Country eligibility check (handles ALL, region, language group, organization memberships)
  - G2: Degree level check
  - G5: Language proficiency check
- [x] Eight Soft Scoring Dimensions (Phase B):
  - D1: Country specificity weighting
  - D2: Field of study alignment with Africa-inclusive taxonomy
  - D3: Academic achievement GPA check
  - D4: Degree level proximity fit
  - D5: Language strength
  - D6: Experience (work years, research, publications) + special backgrounds (LDC, rural, first-gen, financial need)
  - D7: Study destination preference (with intra-African study logic support)
  - D8: Document completeness
- [x] Profile completeness metric computing

### 3. Document Intelligence Pipeline
- [x] Language-first document extraction using Gemini API
- [x] Multi-language prompts (English, French, Arabic, Portuguese) for Transcript extraction
- [x] Multi-language prompts for CV / Resume extraction

---

## Technical Details

Refer to the full design spec documentation for formulas, coefficients, and algorithm flow details.
