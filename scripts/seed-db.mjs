// Creates a seeded db.json with all persona users and password hashes
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../src/data');
const DB_PATH = path.resolve(DATA_DIR, 'db.json');

// Load .env vars if available
try {
  const { readFileSync } = await import('fs');
  const envPath = path.resolve(__dirname, '..', '.env');
  if (existsSync(envPath)) {
    const text = readFileSync(envPath, 'utf-8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
} catch {}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@zawadi.app';

async function main() {
  const hash = await bcrypt.hash('password123', 12);

  const db = {
    scholarships: [
      {
        id: 'schol-1', name: 'Mastercard Foundation Scholars Program',
        provider: 'Mastercard Foundation', host: 'University of Oxford',
        country: ['Pan-African', 'Kenya', 'Nigeria', 'Ghana', 'South Africa', 'Rwanda', 'Uganda', 'Ethiopia'],
        degree_levels: ['Masters'],
        fields: ['Computer Science', 'Engineering', 'Business', 'Public Health', 'Environmental Science'],
        funding_type: 'Full', amount: 'Full Tuition + Monthly Stipend + Flights + Visa',
        deadline: '2026-12-15',
        description: 'Scholarship for African leaders at Oxford.',
        eligibility: 'African citizen with leadership potential.',
        required_documents: ['CV / Resume', 'Academic Transcript', 'Motivation Letter', 'Passport / ID', 'Reference Letter'],
        apply_url: 'https://www.ox.ac.uk/apply', source_url: 'https://mastercardfdn.org/',
        published: true, verified_at: '2026-05-26', view_count: 142,
        host_region: 'Intra-African'
      },
      {
        id: 'schol-2', name: 'Chevening Scholarships',
        provider: 'UK Government', host: 'UK Universities',
        country: ['Global', 'Kenya', 'Nigeria', 'Ghana', 'South Africa', 'Uganda', 'Ethiopia', 'Egypt', 'Tanzania'],
        degree_levels: ['Masters'],
        fields: ['Engineering', 'Business', 'Public Health', 'Law', 'International Relations', 'Computer Science'],
        funding_type: 'Full', amount: 'Full tuition + living allowance + flights',
        deadline: '2026-11-07',
        description: 'UK Government global scholarship program.',
        eligibility: 'Citizen of Chevening-eligible country, 2+ years work experience.',
        required_documents: ['CV / Resume', 'Academic Transcript', 'Motivation Letter', 'Reference Letter'],
        apply_url: 'https://www.chevening.org/apply', source_url: 'https://www.chevening.org/',
        published: true, verified_at: '2026-05-25', view_count: 89,
        host_region: 'United Kingdom and Ireland'
      },
    ],
    users: [
      {
        email: 'amara.d@example.com', name: 'Amara Diallo', country: 'Kenya',
        date_of_birth: '1998-04-12', gender: 'Female', country_income_group: 'Developing',
        is_rural_origin: true, degree_level: 'Masters', field_of_study: 'Computer Science',
        target_fields: ['AI', 'Data Science', 'Public Health Technology'],
        gpa: 3.8, gpa_system: 'us4', degree_class: null, institution: 'University of Nairobi',
        destination_openness: 'specific', destination_regions: ['United Kingdom and Ireland'], include_fully_funded_anywhere: true,
        native_language: 'English', english_test_type: 'IELTS', english_score: '7.5',
        work_experience_years: 2, has_research: true, publications: 1, has_leadership: true,
        has_community_service: true, is_first_generation: true, financial_need_level: 'medium',
        plan: 'pro', role: 'user', status: 'active',
        confirmed_fields: ['email', 'name', 'country', 'degree_level', 'field_of_study', 'gpa'],
        joined_at: '2023-10-12', updated_at: '2026-05-29T07:28:23.230Z',
        password_hash: hash
      },
      {
        email: 'kwame.o@example.edu', name: 'Kwame Osei', country: 'Ghana',
        date_of_birth: '1997-08-23', gender: 'Male', country_income_group: 'Developing',
        is_rural_origin: false, degree_level: 'Masters', field_of_study: 'Engineering',
        target_fields: ['Renewable Energy', 'Infrastructure'],
        gpa: 3.8, gpa_system: 'us4', institution: 'Kwame Nkrumah University',
        destination_openness: 'specific', destination_regions: ['Germany, Austria, Switzerland (German-speaking)'], include_fully_funded_anywhere: true,
        native_language: 'English', english_test_type: 'IELTS', english_score: '7.0', french_level: 'A2',
        work_experience_years: 2, has_research: true, publications: 1, has_leadership: true,
        has_community_service: false, is_first_generation: false, financial_need_level: 'medium',
        plan: 'plus', role: 'user', status: 'active',
        confirmed_fields: ['email', 'name', 'country', 'degree_level', 'field_of_study', 'gpa'],
        joined_at: '2023-08-15', updated_at: '2026-05-29T05:42:41.057Z',
        password_hash: hash
      },
      {
        email: 'f.hassan99@gmail.com', name: 'Fatima Hassan', country: 'Nigeria',
        date_of_birth: '2002-01-30', gender: 'Female', country_income_group: 'LDC',
        is_rural_origin: true, degree_level: 'Bachelors', field_of_study: 'Public Health',
        target_fields: [], gpa: null, gpa_system: null, institution: null,
        destination_openness: 'specific', destination_regions: ['United States and Canada'], include_fully_funded_anywhere: true,
        native_language: 'English',
        plan: 'explorer', role: 'user', status: 'active',
        confirmed_fields: [],
        joined_at: '2023-11-20',
        password_hash: hash
      },
      {
        email: ADMIN_EMAIL, name: 'Samuel Karanja', country: 'Kenya',
        degree_level: 'PhD', field_of_study: 'Data Science', destination_openness: 'anywhere',
        native_language: 'English',
        plan: 'mentor', role: 'super_admin', status: 'active',
        confirmed_fields: [],
        joined_at: '2023-01-01',
        password_hash: hash
      }
    ],
    applications: [],
    documents: [],
    essays: [],
    bot_ingestions: [],
    payments: [],
    audit_logs: []
  };

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  console.log('Seeded db.json with 4 persona users + 2 scholarships');
  console.log('Password for all users: password123');
}

main().catch(console.error);
