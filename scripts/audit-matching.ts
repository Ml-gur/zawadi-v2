// Audit script - imports matching engine directly
import { createClient } from '@supabase/supabase-js';
import { computeScholarshipMatch } from '../src/lib/matching-engine';

const sb = createClient(
  'https://dgiqyvnpmeiomvfauetw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnaXF5dm5wbWVpb212ZmF1ZXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDkxMzMsImV4cCI6MjA5NTYyNTEzM30.54iCqhxEg_Pbx6bEsAJwwmxjM62rlO0i8-Rk8zYppqk'
);

const TARGET_IDS = ['schol-1','schol-2','schol-3','schol-4','schol-5','schol-6','schol-7','schol-8'];

const students = [
  {
    name: 'Student A: Nigeria, Masters, CS, 3.7 GPA',
    profile: { country: 'Nigeria', degree_level: 'Masters', field_of_study: 'Computer Science', gpa: 3.7, gpa_system: 'us4', english_test_type: null, english_score: null, work_experience_years: 2, has_research: false, has_leadership: false, destination_openness: 'anywhere', date_of_birth: null },
    docs: []
  },
  {
    name: 'Student B: Nigeria, Masters, Law, 3.7 GPA',
    profile: { country: 'Nigeria', degree_level: 'Masters', field_of_study: 'Law', gpa: 3.7, gpa_system: 'us4', english_test_type: null, english_score: null, work_experience_years: 2, has_research: false, has_leadership: false, destination_openness: 'anywhere', date_of_birth: null },
    docs: []
  },
  {
    name: 'Student C: Nigeria, Masters, CS, 2.5 GPA',
    profile: { country: 'Nigeria', degree_level: 'Masters', field_of_study: 'Computer Science', gpa: 2.5, gpa_system: 'us4', english_test_type: null, english_score: null, work_experience_years: 2, has_research: false, has_leadership: false, destination_openness: 'anywhere', date_of_birth: null },
    docs: []
  },
  {
    name: 'Student D: Kenya, Masters, CS, 3.7 GPA, IELTS 7.0',
    profile: { country: 'Kenya', degree_level: 'Masters', field_of_study: 'Computer Science', gpa: 3.7, gpa_system: 'us4', english_test_type: 'IELTS', english_score: 7.0, work_experience_years: 2, has_research: false, has_leadership: false, destination_openness: 'anywhere', date_of_birth: null },
    docs: []
  },
  {
    name: 'Student E: EMPTY PROFILE (no data)',
    profile: { country: '', degree_level: '', field_of_study: '', gpa: null, gpa_system: 'us4', english_test_type: null, english_score: null, work_experience_years: null, has_research: false, has_leadership: false, destination_openness: 'anywhere', date_of_birth: null },
    docs: []
  },
];

async function main() {
  const { data: { user }, error: signInErr } = await sb.auth.signInWithPassword({ email: 'writingdebugger@gmail.com', password: 'Test@212' });
  if (signInErr) { console.error('SIGNIN ERR:', signInErr); process.exit(1); }

  const { data: allSchols } = await sb.from('scholarships').select('*').in('id', TARGET_IDS);
  const scholarships = TARGET_IDS.map(id => allSchols.find(s => s.id === id)).filter(Boolean);

  console.log('='.repeat(140));
  console.log('MATCH SCORING AUDIT');
  console.log('='.repeat(140));

  for (const student of students) {
    console.log('\n' + '='.repeat(140));
    console.log('STUDENT:', student.name);
    console.log('Profile:', JSON.stringify(student.profile));
    console.log('-'.repeat(140));

    for (const schol of scholarships) {
      const result = computeScholarshipMatch(schol, student.profile, student.docs);
      console.log(`${schol.id.padEnd(9)} ${String(result.score).padStart(3)}% | ${result.is_eligible ? 'ELIGIBLE ' : 'INELIGIBLE'} | cntry=${String(result.breakdown.country).padStart(3)} deg=${String(result.breakdown.degree).padStart(3)} field=${String(result.breakdown.field).padStart(3)} gpa=${String(result.breakdown.gpa).padStart(3)} lang=${String(result.breakdown.languages).padStart(3)} exp=${String(result.breakdown.experience).padStart(3)} | ${schol.name.substring(0,45)}`);
    }
  }

  // PART 4: Search for hardcoded values
  console.log('\n\n' + '='.repeat(140));
  console.log('PART 4: Dimension-level analysis for Student A against each scholarship');
  console.log('='.repeat(140));

  const studentA = students[0];
  for (const schol of scholarships) {
    const r = computeScholarshipMatch(schol, studentA.profile, studentA.docs);
    console.log(`\n${schol.id} | ${schol.name.substring(0,45)}`);
    console.log(`  field_of_study check: [${schol.fields_of_study?.join(', ') || 'none'}]`);
    console.log(`  min_gpa_normalised: ${schol.min_gpa_normalised}`);
    console.log(`  no_ielts: ${schol.no_ielts}`);
    console.log(`  stem_focus: ${schol.stem_focus} dev_focus: ${schol.development_focus}`);
  }
}

main();
