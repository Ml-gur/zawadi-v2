#!/usr/bin/env npx tsx
// scripts/test-matching.mts
// Quick smoke test for the matching engine with realistic profiles.

import { computeScholarshipMatch } from '../src/lib/matching-engine';

// ─── Sample Scholarships ─────────────────────────────────────

const chevening = {
  name: 'Chevening Scholarship',
  countries: ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Tanzania', 'Uganda', 'Rwanda'],
  degree_levels: ['Masters', 'Master'],
  fields_of_study: ['All fields'],
  min_gpa_normalised: 0.70,
  instruction_language: 'English',
  no_ielts: false,
  min_english_score: '6.5',
  min_english_test_type: 'IELTS',
  funding_type: 'Full',
  required_documents: ['Academic Transcript', 'CV / Resume', 'Motivation Letter', 'Reference Letter', 'Passport / ID'],
  age_limit_masters: 35,
  host_region: 'Europe',
  countries_iso2: ['NG', 'GH', 'KE', 'ZA', 'TZ', 'UG', 'RW'],
};

const daad = {
  name: 'DAAD EPOS Scholarship',
  countries: ['Nigeria', 'Ghana', 'Kenya', 'Ethiopia', 'Tanzania', 'Mozambique'],
  degree_levels: ['Masters', 'Master'],
  fields_of_study: ['Development Studies', 'Economics', 'Social Sciences', 'Engineering'],
  min_gpa_normalised: 0.75,
  instruction_language: 'English',
  no_ielts: false,
  min_english_score: '6.0',
  min_english_test_type: 'IELTS',
  funding_type: 'Full',
  required_documents: ['Academic Transcript', 'CV / Resume', 'Motivation Letter', 'Reference Letter'],
  host_region: 'Europe',
  countries_iso2: ['NG', 'GH', 'KE', 'ET', 'TZ', 'MZ'],
};

const mastersCardiff = {
  name: 'Commonwealth Shared Scholarship',
  countries: ['Nigeria', 'Ghana', 'Kenya', 'Sierra Leone', 'Tanzania', 'Uganda', 'Zambia', 'Zimbabwe'],
  degree_levels: ['Masters', 'Master'],
  fields_of_study: ['All fields'],
  min_gpa_normalised: 0.70,
  instruction_language: 'English',
  no_ielts: true,
  funding_type: 'Full',
  required_documents: ['Academic Transcript', 'CV / Resume', 'Motivation Letter'],
  host_region: 'Europe',
  countries_iso2: ['NG', 'GH', 'KE', 'SL', 'TZ', 'UG', 'ZM', 'ZW'],
};

const ruforum = {
  name: 'RUFORUM Scholarship Programme',
  countries: ['ALL'],
  degree_levels: ['Masters', 'Master', 'PhD'],
  fields_of_study: ['Agriculture & Food Systems', 'Environment & Climate', 'Engineering'],
  min_gpa_normalised: 0.65,
  instruction_language: 'English',
  no_ielts: true,
  funding_type: 'Partial',
  required_documents: ['Academic Transcript', 'CV / Resume'],
  host_region: 'Africa',
  is_intra_african: true,
};

const mastersSouthAfrica = {
  name: 'University of Cape Town Masters Scholarship',
  countries: ['South Africa'],
  degree_levels: ['Masters', 'Master'],
  fields_of_study: ['Engineering', 'Computer Science & Technology'],
  min_gpa_normalised: 0.75,
  instruction_language: 'English',
  no_ielts: false,
  min_english_score: '6.5',
  min_english_test_type: 'IELTS',
  funding_type: 'Full',
  required_documents: ['Academic Transcript', 'CV / Resume', 'Motivation Letter', 'Reference Letter'],
  countries_iso2: ['ZA'],
};

const erasmus = {
  name: 'Erasmus Mundus Joint Masters',
  countries: ['ALL'],
  degree_levels: ['Masters', 'Master'],
  fields_of_study: ['All fields'],
  min_gpa_normalised: 0.80,
  instruction_language: 'English',
  no_ielts: false,
  min_english_score: '6.5',
  min_english_test_type: 'IELTS',
  funding_type: 'Full',
  required_documents: ['Academic Transcript', 'CV / Resume', 'Motivation Letter', 'Reference Letter', 'English Test'],
  host_region: 'Europe',
};

// ─── Sample Profiles ────────────────────────────────────────

const nigerianCsMasters = {
  country: 'Nigeria',
  degree_level: 'Masters',
  field_of_study: 'Computer Science',
  target_fields: [],
  gpa: '4.2',
  gpa_system: 'us4',
  english_test_type: 'IELTS',
  english_score: '7.0',
  work_experience_years: '3',
  has_research: false,
  has_leadership: true,
  publications: '0',
  destination_openness: 'anywhere',
  age: 26,
  french_level: null,
  arabic_level: null,
};

const kenyanAgriPhd = {
  country: 'Kenya',
  degree_level: 'PhD',
  field_of_study: 'Agriculture & Food Systems',
  target_fields: [],
  gpa: '3.8',
  gpa_system: 'us4',
  english_test_type: 'IELTS',
  english_score: '6.5',
  work_experience_years: '5',
  has_research: true,
  has_leadership: false,
  publications: '2',
  destination_openness: 'intra_african',
  age: 30,
  french_level: null,
  arabic_level: null,
};

const francophoneCamerEcon = {
  country: 'Cameroon',
  degree_level: 'Masters',
  field_of_study: 'Economics',
  target_fields: ['Development Studies'],
  gpa: '15',
  gpa_system: 'mention_fr',
  english_test_type: null,
  english_score: null,
  french_level: 'C1',
  french_test_type: null,
  work_experience_years: '2',
  has_research: false,
  has_leadership: true,
  publications: '0',
  destination_openness: 'specific',
  destination_regions: ['Europe'],
  include_fully_funded_anywhere: true,
  age: 24,
  arabic_level: null,
};

const southAfricanEng = {
  country: 'South Africa',
  degree_level: 'Masters',
  field_of_study: 'Engineering',
  target_fields: [],
  gpa: '72',
  gpa_system: 'za_pct',
  english_test_type: 'Native',
  english_score: null,
  work_experience_years: '4',
  has_research: false,
  has_leadership: true,
  publications: '0',
  destination_openness: 'specific',
  destination_regions: ['Africa'],
  include_fully_funded_anywhere: false,
  age: 28,
  french_level: null,
  arabic_level: null,
};

const nigerianNoEnglish = {
  country: 'Nigeria',
  degree_level: 'Masters',
  field_of_study: 'Computer Science',
  target_fields: [],
  gpa: '3.5',
  gpa_system: 'us4',
  english_test_type: null,
  english_score: null,
  work_experience_years: '1',
  has_research: false,
  has_leadership: false,
  publications: '0',
  destination_openness: 'anywhere',
  age: 23,
  french_level: null,
  arabic_level: null,
};

// ─── Run Tests ──────────────────────────────────────────────

interface TestCase {
  label: string;
  profile: any;
  scholarship: any;
  expectedRange: [number, number];
}

const tests: TestCase[] = [
  // Nigerian CS Masters → Chevening (UK, English, Masters, all fields)
  {
    label: 'Nigerian CS Masters → Chevening (good match)',
    profile: nigerianCsMasters,
    scholarship: chevening,
    expectedRange: [70, 95],
  },
  // Nigerian CS Masters → DAAD EPOS (Nigeria IS in list, CS is adjacent to dev studies)
  {
    label: 'Nigerian CS Masters → DAAD EPOS (country match, field adjacent)',
    profile: nigerianCsMasters,
    scholarship: daad,
    expectedRange: [60, 90],
  },
  // Nigerian CS Masters → Commonwealth (no IELTS, good match)
  {
    label: 'Nigerian CS Masters → Commonwealth (no IELTS, good match)',
    profile: nigerianCsMasters,
    scholarship: mastersCardiff,
    expectedRange: [70, 95],
  },
  // Kenyan Agri PhD → RUFORUM (intra-African, agriculture, PhD)
  {
    label: 'Kenyan Agri PhD → RUFORUM (intra-African, agriculture, PhD)',
    profile: kenyanAgriPhd,
    scholarship: ruforum,
    expectedRange: [70, 95],
  },
  // Kenyan Agri PhD → Chevening (PhD not eligible — degree mismatch reduces score)
  {
    label: 'Kenyan Agri PhD → Chevening (PhD vs Masters mismatch)',
    profile: kenyanAgriPhd,
    scholarship: chevening,
    expectedRange: [60, 80],
  },
  // Francophone Cameroon Econ → DAAD EPOS (Cameroon not listed → hard disqualify)
  {
    label: 'Francophone Cameroon Econ → DAAD EPOS (disqualified — country not listed)',
    profile: francophoneCamerEcon,
    scholarship: daad,
    expectedRange: [0, 0],
  },
  // Francophone Cameroon Econ → Chevening (Cameroon not listed → hard disqualify)
  {
    label: 'Francophone Cameroon Econ → Chevening (disqualified — country not listed)',
    profile: francophoneCamerEcon,
    scholarship: chevening,
    expectedRange: [0, 0],
  },
  // South African Eng → UCT (exact match: country, field, level)
  {
    label: 'South African Eng → UCT (exact country+field match)',
    profile: southAfricanEng,
    scholarship: mastersSouthAfrica,
    expectedRange: [70, 95],
  },
  // South African Eng → Chevening (SA IS in Chevening list — good match)
  {
    label: 'South African Eng → Chevening (country match, good match)',
    profile: southAfricanEng,
    scholarship: chevening,
    expectedRange: [65, 90],
  },
  // Nigerian no English → Commonwealth (no IELTS required, genuine benefit)
  {
    label: 'Nigerian no English → Commonwealth (no IELTS, saves money)',
    profile: nigerianNoEnglish,
    scholarship: mastersCardiff,
    expectedRange: [60, 90],
  },
  // Nigerian no English → Chevening (Anglophone country, no IELTS needed)
  {
    label: 'Nigerian no English → Chevening (Anglophone country exempt)',
    profile: nigerianNoEnglish,
    scholarship: chevening,
    expectedRange: [75, 95],
  },
  // Nigerian CS Masters → Erasmus (high GPA bar, IELTS needed)
  {
    label: 'Nigerian CS Masters → Erasmus (GPA 0.80 bar, IELTS needed)',
    profile: nigerianCsMasters,
    scholarship: erasmus,
    expectedRange: [60, 85],
  },
  // Francophone with no English → Erasmus (non-Anglophone, no IELTS → language penalty)
  {
    label: 'Francophone Cameroon → Erasmus (no English, language penalty)',
    profile: francophoneCamerEcon,
    scholarship: erasmus,
    expectedRange: [30, 60],
  },
];

let passed = 0;
let failed = 0;

console.log('\n' + '═'.repeat(80));
console.log('  MATCHING ENGINE SMOKE TEST');
console.log('═'.repeat(80));

for (const t of tests) {
  const result = computeScholarshipMatch(t.scholarship, t.profile, []);
  const score = result.score;
  const inRange = score !== null && score >= t.expectedRange[0] && score <= t.expectedRange[1];

  const status = inRange ? '✅ PASS' : '❌ FAIL';
  if (inRange) passed++; else failed++;

  console.log(`\n${status}  ${t.label}`);
  console.log(`  Score: ${score ?? 'null'}  (expected ${t.expectedRange[0]}-${t.expectedRange[1]})`);
  if (result.disqualifying_reasons.length > 0) {
    console.log(`  Disqualifiers: ${result.disqualifying_reasons.join('; ')}`);
  }
  if (result.reasons.length > 0) {
    console.log(`  Reasons: ${result.reasons.slice(0, 3).join('; ')}`);
  }
  console.log(`  Breakdown: country=${result.breakdown.country} field=${result.breakdown.field} degree=${result.breakdown.degree} gpa=${result.breakdown.gpa} lang=${result.breakdown.languages} dest=${result.breakdown.destination} exp=${result.breakdown.experience}`);
}

console.log('\n' + '─'.repeat(80));
console.log(`  Results: ${passed}/${passed + failed} passed`);
if (failed > 0) {
  console.log(`  ⚠️  ${failed} test(s) outside expected range — review weights or test expectations`);
}
console.log('═'.repeat(80) + '\n');

process.exit(failed > 0 ? 1 : 0);
