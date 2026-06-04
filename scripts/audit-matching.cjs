// PART 3 + PART 4: Comprehensive scoring audit
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://dgiqyvnpmeiomvfauetw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnaXF5dm5wbWVpb212ZmF1ZXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDkxMzMsImV4cCI6MjA5NTYyNTEzM30.54iCqhxEg_Pbx6bEsAJwwmxjM62rlO0i8-Rk8zYppqk'
);

// Import matching engine functions directly
const { computeScholarshipMatch, scoreAcademicField, scoreAcademicAchievement, scoreCountrySpecificity, scoreDegreeLevelFit, scoreLanguageStrength, scoreResearchExperienceBackground, scoreDestinationPreference, scoreDocumentCompleteness, checkCountryEligibility, checkDegreeLevel, normaliseGrade } = require('./matching-engine.ts');

// The test scholarships to match against
const TARGET_IDS = ['schol-1','schol-2','schol-3','schol-4','schol-5','schol-6','schol-7'];

async function run() {
  const { data: { user }, error: signInErr } = await sb.auth.signInWithPassword({ email: 'writingdebugger@gmail.com', password: 'Test@212' });
  if (signInErr) { console.error('SIGNIN ERR:', signInErr); process.exit(1); }

  // Fetch all target scholarships
  const { data: allSchols } = await sb.from('scholarships').select('*').in('id', TARGET_IDS);
  const scholarships = TARGET_IDS.map(id => allSchols.find(s => s.id === id)).filter(Boolean);

  // Define 4 test students
  const students = [
    {
      name: 'Student A: Nigeria, Masters, CS, 3.7 GPA',
      profile: {
        country: 'Nigeria', degree_level: 'Masters', field_of_study: 'Computer Science',
        gpa: 3.7, gpa_system: 'us4',
        english_test_type: null, english_score: null,
        work_experience_years: 2, has_research: false, has_leadership: false,
        destination_openness: 'anywhere', date_of_birth: null,
      },
      docs: []
    },
    {
      name: 'Student B: Nigeria, Masters, Law, 3.7 GPA',
      profile: {
        country: 'Nigeria', degree_level: 'Masters', field_of_study: 'Law',
        gpa: 3.7, gpa_system: 'us4',
        english_test_type: null, english_score: null,
        work_experience_years: 2, has_research: false, has_leadership: false,
        destination_openness: 'anywhere', date_of_birth: null,
      },
      docs: []
    },
    {
      name: 'Student C: Nigeria, Masters, CS, 2.5 GPA',
      profile: {
        country: 'Nigeria', degree_level: 'Masters', field_of_study: 'Computer Science',
        gpa: 2.5, gpa_system: 'us4',
        english_test_type: null, english_score: null,
        work_experience_years: 2, has_research: false, has_leadership: false,
        destination_openness: 'anywhere', date_of_birth: null,
      },
      docs: []
    },
    {
      name: 'Student D: Kenya, Masters, CS, 3.7 GPA, IELTS 7.0',
      profile: {
        country: 'Kenya', degree_level: 'Masters', field_of_study: 'Computer Science',
        gpa: 3.7, gpa_system: 'us4',
        english_test_type: 'IELTS', english_score: 7.0,
        work_experience_years: 2, has_research: false, has_leadership: false,
        destination_openness: 'anywhere', date_of_birth: null,
      },
      docs: []
    },
    {
      name: 'Student E: EMPTY PROFILE (no data)',
      profile: {
        country: '', degree_level: '', field_of_study: '',
        gpa: null, gpa_system: 'us4',
        english_test_type: null, english_score: null,
        work_experience_years: null, has_research: false, has_leadership: false,
        destination_openness: 'anywhere', date_of_birth: null,
      },
      docs: []
    },
  ];

  console.log('='.repeat(120));
  console.log('MATCH SCORING AUDIT — PART 3 & 4');
  console.log('='.repeat(120));

  for (const student of students) {
    console.log('\n' + '-'.repeat(120));
    console.log('STUDENT:', student.name);
    console.log('Profile:', JSON.stringify(student.profile, null, 2));
    console.log('-'.repeat(120));

    for (const schol of scholarships) {
      const result = computeScholarshipMatch(schol, student.profile, student.docs);
      console.log(`\n${schol.id} | ${schol.name.substring(0,50)}`);
      console.log(`  SCORE: ${result.score}% | Eligible: ${result.is_eligible}`);
      console.log(`  Breakdown: country=${result.breakdown.country}% degree=${result.breakdown.degree}% field=${result.breakdown.field}% gpa=${result.breakdown.gpa}% lang=${result.breakdown.languages}% exp=${result.breakdown.experience}% dest=${result.breakdown.destination}% docs=${result.breakdown.documents}% no_ielts=${result.breakdown.no_ielts}%`);
      if (result.disqualifying_reasons.length) {
        console.log(`  DISQUALIFIED: ${result.disqualifying_reasons.join('; ')}`);
      }
    }
  }
}

run().catch(e => console.error(e));
