# Task Plan: Disable Document Extraction & Improve Matching Algorithm

## Goal
Disable the document text extraction/OCR pipeline (keep Document Vault as pure storage) and improve the scholarship matching algorithm to work purely from user-provided profile data. The matching system should use an AHP-inspired weighted scoring approach with hard eligibility gates followed by soft scoring.

## Research Summary

### AHP (Analytical Hierarchy Process) for Scholarship Matching
- Structure criteria hierarchically: hard gates → soft scoring
- No single criterion should dominate (max weight ~25%)
- Country eligibility is the strongest predictor of match quality
- Field of study alignment is critical — same field = much higher relevance
- Language proficiency is a hard gate (if required, must meet minimum)
- GPA functions as a threshold, not a differentiator
- Destination preference matters but should not override eligibility

### Key Insight from Research
"No major scholarship publishes an exact points breakdown... eligibility and basic completeness are checked first, and only applications that clear that stage get evaluated on the factors above."

## Phases

### Phase 1: Disable Document Extraction
- [ ] Remove `invokeDocAnalysis` calls from upload handler in App.tsx
- [ ] Remove `invokeDocAnalysis` calls from re-analyze handler in App.tsx
- [ ] Remove `renderedPages` / OCR code from text-extractor.ts (or leave dormant)
- [ ] Document stays in vault but no analysis_status/analysis_error fields updated
- [ ] Keep DocumentVault component for file storage only

### Phase 2: Remove doc_*_extracted Fallbacks from Matching Engine
- [ ] In `scoreAcademicAchievement`: remove `doc_gpa_normalised_extracted` fallback, use only `user.gpa` + `user.gpa_system` + `user.degree_class`
- [ ] In `scoreResearchExperienceBackground`: remove `doc_work_years_extracted`, `doc_has_research_extracted`, `doc_publication_count_extracted`, `doc_has_leadership_extracted` fallbacks
- [ ] Use only user-provided: `work_experience_years`, `has_research`, `publications`, `has_leadership`

### Phase 3: Reweight Matching Dimensions (AHP-Inspired)
Current → New weights:
- Country eligibility: 22% → 25% (strongest hard gate)
- Field of study: 22% → 18% (still critical but not equal to country)
- GPA: 14% → 8% (threshold, not differentiator)
- Degree level: 8% → 15% (hard gate, must match)
- Language: 9% → 12% (important for non-Anglophone)
- Experience: 7% → 5% (supplementary)
- Destination: 6% → 15% (user preference matters)
- Documents: 4% → 2% (preparation indicator only)

### Phase 4: Improve Destination Preference Scoring
- Add finer granularity for "specific" mode
- Reward scholarships in user's top-choice country vs just region
- Boost fully-funded anywhere for "anywhere" users
- Better scoring for "intra_african" preference

### Phase 5: Improve Language Scoring
- Give meaningful score for no-IELTS scholarships (currently just boolean)
- Score language surplus above minimum (user has C1 but only B2 needed)
- Better handling of bilingual programs

### Phase 6: Build & Verify
- TypeScript compilation check
- Build test
- Commit and push

## Files to Modify
1. `src/App.tsx` — remove doc analysis calls from upload + re-analyze
2. `src/lib/matching-engine.ts` — reweight, remove doc_* fallbacks, improve scoring
3. `src/services/text-extractor.ts` — optional: clean up OCR code

## Decisions
- Document Vault remains as storage-only feature
- All matching relies on user profile fields (what they tell us)
- AHP-inspired: hard gates first, then soft weighted scoring
- No single dimension exceeds 25% weight
