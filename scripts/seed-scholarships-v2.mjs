// Zawadi Scholarship Seeder v2 — batch insert with duplicate detection
// Usage: node scripts/seed-scholarships-v2.mjs
// Requires .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env');
  if (!existsSync(envPath)) {
    console.error('ERROR: .env file not found');
    process.exit(1);
  }
  const text = readFileSync(envPath, 'utf-8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Quality assessment scores: [Accessibility, FinancialValue, Reach, Competitiveness]
const q = (a, f, r, c) => ({ accessibility: a, financial_value: f, reach: r, competitiveness: c, average: +((a + f + r + c) / 4).toFixed(2) });

const CATEGORIES = {
  'Full Scholarships Open Now': [
    { name: 'Fulbright South African Research Scholar Program', provider: 'US Government', host: 'USA', countries: '["South Africa"]', degrees: '["Postdoc"]', deadline: '2026-08-30', url: 'https://exchanges.state.gov', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United States and Canada', hostCountry: '["united states"]', iso2: 'US', quality: q(2,5,1,1), workExp: null, ageLimit: null },
    { name: 'Rhodes Scholarship for Kenya', provider: 'Rhodes Trust', host: 'University of Oxford', countries: '["Kenya"]', degrees: '["Masters", "PhD"]', deadline: '2026-08-27', url: 'https://www.rhodeshouse.ox.ac.uk', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(1,5,1,1), workExp: null, ageLimit: 27 },
    { name: 'Mastercard Foundation Scholars Program (Postgrad) – UP', provider: 'Mastercard Foundation / University of Pretoria', host: 'University of Pretoria', countries: '["Pan-African"]', degrees: '["Masters", "PhD"]', deadline: '2026-09-30', url: 'https://www.up.ac.za/mastercard-foundation-scholars-program', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["south africa"]', iso2: 'ZA', quality: q(4,5,5,3), workExp: null, ageLimit: null },
    { name: 'Mastercard Foundation Scholars Program (Undergrad) – UP', provider: 'Mastercard Foundation / University of Pretoria', host: 'University of Pretoria', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2026-08-31', url: 'https://www.up.ac.za/mastercard-foundation-scholars-program', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["south africa"]', iso2: 'ZA', quality: q(4,5,5,3), workExp: null, ageLimit: null },
    { name: 'DAAD Postgraduate Studies in Architecture', provider: 'DAAD Germany', host: 'German Universities', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2026-09-23', url: 'https://www.daad.de', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Germany, Austria, Switzerland (German-speaking)', hostCountry: '["germany"]', iso2: 'DE', quality: q(3,5,5,2), workExp: null, ageLimit: null },
    { name: 'DAAD Research Grants / Doctoral Programmes', provider: 'DAAD Germany', host: 'German Universities', countries: '["Pan-African"]', degrees: '["PhD"]', deadline: '2026-09-24', url: 'https://www.daad.de', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Germany, Austria, Switzerland (German-speaking)', hostCountry: '["germany"]', iso2: 'DE', quality: q(2,5,5,2), workExp: null, ageLimit: null },
    { name: 'GCUB International Mobility Program (GCUB-Mob)', provider: 'GCUB / OAS', host: 'Brazilian Universities', countries: '["Pan-African"]', degrees: '["Masters", "PhD"]', deadline: '2026-07-06', url: 'https://gcub.org.br', funding: 'Full', amount: 'Full funding including living costs', noIelts: true, hostRegion: 'South America', hostCountry: '["brazil"]', iso2: 'BR', quality: q(5,4,5,4), workExp: null, ageLimit: null },
    { name: 'Brazil PEC-PG (Full Master\'s & Doctoral)', provider: 'CAPES / CNPq', host: 'Brazilian Universities', countries: '["Pan-African"]', degrees: '["Masters", "PhD"]', deadline: '2026-09-29', url: 'https://www.gov.br/mre', funding: 'Full', amount: 'Full funding including living costs', noIelts: true, hostRegion: 'South America', hostCountry: '["brazil"]', iso2: 'BR', quality: q(4,4,5,3), workExp: null, ageLimit: null },
    { name: 'DAAD STEM Master\'s Scholarships', provider: 'DAAD Germany', host: 'German Universities', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2026-12-31', url: 'https://www.daad.de', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Germany, Austria, Switzerland (German-speaking)', hostCountry: '["germany"]', iso2: 'DE', quality: q(3,5,5,2), workExp: null, ageLimit: null },
    { name: 'MEXT Embassy Recommendation Scholarship', provider: 'Japanese Government', host: 'Japanese Universities', countries: '["Pan-African"]', degrees: '["Undergraduate", "Masters", "PhD"]', deadline: '2026-12-31', url: 'https://www.studyinjapan.go.jp', funding: 'Full', amount: 'Full funding including living costs', noIelts: true, hostRegion: 'Japan and South Korea', hostCountry: '["japan"]', iso2: 'JP', quality: q(3,5,5,2), workExp: null, ageLimit: null },
    { name: 'Australia Awards Short Courses for Africa', provider: 'Australian Government', host: 'Australian Universities', countries: '["Pan-African"]', degrees: '["Short Course"]', deadline: '2026-12-31', url: 'https://www.australiaawardsafrica.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Australia and New Zealand', hostCountry: '["australia"]', iso2: 'AU', quality: q(2,5,3,2), workExp: 5, ageLimit: null },
    { name: 'Hubert H. Humphrey Fellowship', provider: 'US Government', host: 'US Universities', countries: '["Pan-African"]', degrees: '["Professional Development"]', deadline: '2026-12-31', url: 'https://www.humphreyfellowship.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United States and Canada', hostCountry: '["united states"]', iso2: 'US', quality: q(2,5,5,1), workExp: 5, ageLimit: null },
    { name: 'Mandela Washington Fellowship', provider: 'US Government', host: 'US Universities', countries: '["Pan-African"]', degrees: '["Professional Development"]', deadline: '2026-09-10', url: 'https://www.mandelawashingtonfellowship.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United States and Canada', hostCountry: '["united states"]', iso2: 'US', quality: q(3,5,5,1), workExp: null, ageLimit: '25-35' },
    { name: 'Global Health Summer School Grants – DAAD / Heidelberg', provider: 'DAAD / Heidelberg University', host: 'Heidelberg University', countries: '["Pan-African"]', degrees: '["Short Course"]', deadline: '2026-12-31', url: 'https://www.daad.de', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Germany, Austria, Switzerland (German-speaking)', hostCountry: '["germany"]', iso2: 'DE', quality: q(4,5,5,3), workExp: null, ageLimit: null },
  ],
  'Full Scholarships Opening Soon': [
    { name: 'Commonwealth Shared Scholarship', provider: 'UK Government', host: 'UK Universities', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-12-31', url: 'https://cscuk.fcdo.gov.uk', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(3,5,5,2), workExp: null, ageLimit: null },
    { name: 'Commonwealth PhD Scholarship', provider: 'UK Government', host: 'UK Universities', countries: '["Pan-African"]', degrees: '["PhD"]', deadline: '2027-12-31', url: 'https://cscuk.fcdo.gov.uk', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'Swiss Government Excellence Scholarships', provider: 'Swiss Government', host: 'Swiss Universities', countries: '["Pan-African"]', degrees: '["Masters", "PhD"]', deadline: '2027-11-30', url: 'https://www.sbfi.admin.ch', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Germany, Austria, Switzerland (German-speaking)', hostCountry: '["switzerland"]', iso2: 'CH', quality: q(2,5,5,2), workExp: null, ageLimit: 34 },
    { name: 'SI Scholarship for Global Professionals', provider: 'Swedish Institute', host: 'Swedish Universities', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-02-28', url: 'https://www.si.se', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Rest of Europe', hostCountry: '["sweden"]', iso2: 'SE', quality: q(2,5,5,2), workExp: null, ageLimit: null },
    { name: 'GKS Korean Government Scholarship', provider: 'South Korean Government', host: 'Korean Universities', countries: '["Pan-African"]', degrees: '["Masters", "PhD"]', deadline: '2027-09-30', url: 'https://www.studyinkorea.go.kr', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Japan and South Korea', hostCountry: '["south korea"]', iso2: 'KR', quality: q(3,5,5,2), workExp: null, ageLimit: 40 },
    { name: 'Erasmus Mundus Joint Masters', provider: 'European Union', host: 'European Universities', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-02-28', url: 'https://erasmus-plus.ec.europa.eu', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Rest of Europe', hostCountry: '["multiple"]', iso2: '', quality: q(3,5,5,2), workExp: null, ageLimit: null },
    { name: 'McCall MacBain Scholarships', provider: 'McCall MacBain Foundation', host: 'McGill University (Canada)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-09-30', url: 'https://www.mccallmacbainscholars.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United States and Canada', hostCountry: '["canada"]', iso2: 'CA', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'Knight-Hennessy Scholars', provider: 'Stanford University', host: 'Stanford University', countries: '["Pan-African"]', degrees: '["Masters", "PhD"]', deadline: '2027-10-01', url: 'https://knight-hennessy.stanford.edu', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United States and Canada', hostCountry: '["united states"]', iso2: 'US', quality: q(1,5,5,1), workExp: null, ageLimit: null },
    { name: 'Clarendon Fund Scholarships', provider: 'Oxford University', host: 'University of Oxford', countries: '["Pan-African"]', degrees: '["Masters", "PhD"]', deadline: '2027-01-10', url: 'https://www.ox.ac.uk/clarendon', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(1,5,5,1), workExp: null, ageLimit: null },
    { name: 'VLIR-UOS Scholarship Program', provider: 'Belgian Government', host: 'Flemish Universities (Belgium)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-02-01', url: 'https://www.vliruos.be', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'France and Belgium', hostCountry: '["belgium"]', iso2: 'BE', quality: q(3,5,3,2), workExp: null, ageLimit: null },
    { name: 'ETH Excellence Scholarship', provider: 'ETH Zurich', host: 'ETH Zurich', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2026-12-15', url: 'https://www.ethz.ch', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Germany, Austria, Switzerland (German-speaking)', hostCountry: '["switzerland"]', iso2: 'CH', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'Boustany Foundation MBA/Astronomy', provider: 'Boustany Foundation', host: 'Cambridge / Harvard / Universities', countries: '["Pan-African"]', degrees: '["Masters", "PhD"]', deadline: '2027-05-01', url: 'https://www.boustany-foundation.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Global', hostCountry: '["multiple"]', iso2: '', quality: q(2,5,5,1), workExp: null, ageLimit: null },
  ],
  'Partial Scholarships & Tuition Waivers': [
    { name: 'Coventry University Africa Merit Scholarship', provider: 'Coventry University', host: 'Coventry University (UK)', countries: '["Nigeria", "Ghana", "Kenya"]', degrees: '["Undergraduate"]', deadline: '2027-08-31', url: 'https://www.coventry.ac.uk', funding: 'Partial', amount: 'Partial tuition waiver', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(4,2,2,4), workExp: null, ageLimit: null },
    { name: 'University of Sussex Africa Scholarship', provider: 'University of Sussex', host: 'University of Sussex (UK)', countries: '["Nigeria", "Ghana", "Kenya"]', degrees: '["Undergraduate"]', deadline: '2027-08-31', url: 'https://www.sussex.ac.uk', funding: 'Partial', amount: 'Partial tuition waiver', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(4,2,2,3), workExp: null, ageLimit: null },
    { name: 'Bristol University Think Big Scholarship', provider: 'University of Bristol', host: 'University of Bristol (UK)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-03-31', url: 'https://www.bristol.ac.uk', funding: 'Partial', amount: 'Partial tuition waiver', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(4,3,5,3), workExp: null, ageLimit: null },
    { name: 'GREAT Scholarships (British Council)', provider: 'British Council', host: 'UK Universities', countries: '["Nigeria", "Kenya", "Ghana", "Egypt"]', degrees: '["Masters"]', deadline: '2027-05-31', url: 'https://study-uk.britishcouncil.org', funding: 'Partial', amount: '£10,000 Tuition', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(3,2,3,3), workExp: null, ageLimit: null },
    { name: 'Sydney Scholars India/Africa Scholarship', provider: 'University of Sydney', host: 'University of Sydney (Australia)', countries: '["Pan-African"]', degrees: '["Undergraduate", "Masters"]', deadline: '2027-02-28', url: 'https://www.sydney.edu.au', funding: 'Partial', amount: 'Partial tuition waiver', noIelts: false, hostRegion: 'Australia and New Zealand', hostCountry: '["australia"]', iso2: 'AU', quality: q(4,2,5,3), workExp: null, ageLimit: null },
    { name: 'Melbourne International Undergraduate Scholarship', provider: 'University of Melbourne', host: 'University of Melbourne (Australia)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-05-31', url: 'https://www.unimelb.edu.au', funding: 'Partial', amount: 'Partial tuition waiver', noIelts: false, hostRegion: 'Australia and New Zealand', hostCountry: '["australia"]', iso2: 'AU', quality: q(4,2,5,3), workExp: null, ageLimit: null },
    { name: 'Emile Boutmy Scholarship (Sciences Po)', provider: 'Sciences Po', host: 'Sciences Po (France)', countries: '["Pan-African"]', degrees: '["Undergraduate", "Masters"]', deadline: '2027-02-28', url: 'https://www.sciencespo.fr', funding: 'Partial', amount: 'Partial tuition waiver', noIelts: false, hostRegion: 'France and Belgium', hostCountry: '["france"]', iso2: 'FR', quality: q(3,3,5,2), workExp: null, ageLimit: null },
    { name: 'Bocconi Merit Award', provider: 'Bocconi University', host: 'Bocconi University (Italy)', countries: '["Pan-African"]', degrees: '["Undergraduate", "Masters"]', deadline: '2027-03-31', url: 'https://www.unibocconi.eu', funding: 'Partial', amount: 'Partial tuition waiver', noIelts: false, hostRegion: 'Italy and Mediterranean', hostCountry: '["italy"]', iso2: 'IT', quality: q(3,3,5,2), workExp: null, ageLimit: null },
    { name: 'Holland Scholarship', provider: 'Dutch Government', host: 'Dutch Universities', countries: '["Pan-African"]', degrees: '["Undergraduate", "Masters"]', deadline: '2027-02-01', url: 'https://www.studyinnl.org', funding: 'Partial', amount: '€5,000 Tuition', noIelts: false, hostRegion: 'Rest of Europe', hostCountry: '["netherlands"]', iso2: 'NL', quality: q(4,2,5,4), workExp: null, ageLimit: null },
    { name: 'UAL International Postgraduate Scholarship', provider: 'University of Arts London', host: 'University of Arts London (UK)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-05-31', url: 'https://www.arts.ac.uk', funding: 'Partial', amount: '£5,000 Tuition', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(4,2,5,3), workExp: null, ageLimit: null },
    { name: 'Radboud Scholarship Programme', provider: 'Radboud University', host: 'Radboud University (Netherlands)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-01-31', url: 'https://www.ru.nl', funding: 'Partial', amount: 'Partial tuition waiver', noIelts: false, hostRegion: 'Rest of Europe', hostCountry: '["netherlands"]', iso2: 'NL', quality: q(3,3,5,2), workExp: null, ageLimit: null },
    { name: 'Maastricht University Holland-High Potential', provider: 'Maastricht University', host: 'Maastricht University (Netherlands)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-05-01', url: 'https://www.maastrichtuniversity.nl', funding: 'Partial', amount: 'Partial tuition + living costs', noIelts: false, hostRegion: 'Rest of Europe', hostCountry: '["netherlands"]', iso2: 'NL', quality: q(3,3,5,2), workExp: null, ageLimit: null },
    { name: 'Sheffield International Merit Scholarship', provider: 'University of Sheffield', host: 'University of Sheffield (UK)', countries: '["Pan-African"]', degrees: '["Undergraduate", "Masters"]', deadline: '2027-05-31', url: 'https://www.sheffield.ac.uk', funding: 'Partial', amount: 'Partial tuition waiver', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(4,2,5,3), workExp: null, ageLimit: null },
    { name: 'Developing Solutions Scholarship (Nottingham)', provider: 'University of Nottingham', host: 'University of Nottingham (UK)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-05-31', url: 'https://www.nottingham.ac.uk', funding: 'Partial', amount: 'Partial tuition waiver', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(3,3,5,3), workExp: null, ageLimit: null },
  ],
  'Intra-African Scholarships': [
    { name: 'MCF at Carnegie Mellon University Africa', provider: 'Mastercard Foundation', host: 'Carnegie Mellon University Africa (Rwanda)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-05-01', url: 'https://www.africa.engineering.cmu.edu', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["rwanda"]', iso2: '', quality: q(3,5,5,2), workExp: null, ageLimit: null },
    { name: 'DAAD In-Region UCT (Urban Studies)', provider: 'DAAD / University of Cape Town', host: 'University of Cape Town (South Africa)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-06-30', url: 'https://www.daad.de', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["south africa"]', iso2: 'ZA', quality: q(3,5,5,3), workExp: null, ageLimit: null },
    { name: 'DAAD In-Region Pretoria (Mathematics)', provider: 'DAAD / University of Pretoria', host: 'University of Pretoria (South Africa)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-06-30', url: 'https://www.daad.de', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["south africa"]', iso2: 'ZA', quality: q(3,5,5,3), workExp: null, ageLimit: null },
    { name: 'DAAD In-Region FUNAAB (Physics)', provider: 'DAAD / FUNAAB', host: 'Federal University of Agriculture Abeokuta (Nigeria)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-06-30', url: 'https://www.daad.de', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["nigeria"]', iso2: '', quality: q(3,5,5,3), workExp: null, ageLimit: null },
    { name: 'MCF at Kwame Nkrumah University of Science and Technology', provider: 'Mastercard Foundation', host: 'KNUST (Ghana)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-06-30', url: 'https://www.knust.edu.gh', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["ghana"]', iso2: '', quality: q(4,5,5,3), workExp: null, ageLimit: null },
    { name: 'MCF at 2iE (International Institute for Water & Environmental Engineering)', provider: 'Mastercard Foundation', host: '2iE (Burkina Faso)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-06-30', url: 'https://www.2ie-edu.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["burkina faso"]', iso2: '', quality: q(4,5,5,3), workExp: null, ageLimit: null },
    { name: 'MCF at Ashesi University', provider: 'Mastercard Foundation', host: 'Ashesi University (Ghana)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-06-30', url: 'https://www.ashesi.edu.gh', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["ghana"]', iso2: '', quality: q(3,5,5,3), workExp: null, ageLimit: null },
    { name: 'Mandela Rhodes Scholarship', provider: 'Mandela Rhodes Foundation', host: 'South African Universities', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-04-30', url: 'https://www.mandelarhodes.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["south africa"]', iso2: 'ZA', quality: q(3,5,5,2), workExp: null, ageLimit: 26 },
    { name: 'RUFORUM Scholarship Programme', provider: 'RUFORUM', host: 'RUFORUM Member Universities (Africa)', countries: '["Pan-African"]', degrees: '["Masters", "PhD"]', deadline: '2027-06-30', url: 'https://www.ruforum.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["multiple"]', iso2: '', quality: q(3,5,5,3), workExp: null, ageLimit: null },
    { name: 'Wits Vice-Chancellor\'s Scholarship', provider: 'University of the Witwatersrand', host: 'University of the Witwatersrand (South Africa)', countries: '["Pan-African"]', degrees: '["Masters", "PhD"]', deadline: '2027-06-30', url: 'https://www.wits.ac.za', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["south africa"]', iso2: 'ZA', quality: q(3,5,5,2), workExp: null, ageLimit: null },
    { name: 'UJ Orange Carpet Scholarship', provider: 'University of Johannesburg', host: 'University of Johannesburg (South Africa)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-06-30', url: 'https://www.uj.ac.za', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["south africa"]', iso2: 'ZA', quality: q(4,5,5,3), workExp: null, ageLimit: null },
    { name: 'Ashinaga African Initiative', provider: 'Ashinaga Foundation', host: 'Various (Africa)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-03-31', url: 'https://www.ashinaga.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["multiple"]', iso2: '', quality: q(3,5,5,2), workExp: null, ageLimit: 23 },
  ],
  'No IELTS Scholarships': [
    { name: 'MAECI Scholarships (Italy)', provider: 'Italian Government (MAECI)', host: 'Italian Universities', countries: '["Pan-African"]', degrees: '["Masters", "PhD"]', deadline: '2027-03-31', url: 'https://studyinitaly.esteri.it', funding: 'Full', amount: 'Full funding including living costs', noIelts: true, hostRegion: 'Italy and Mediterranean', hostCountry: '["italy"]', iso2: 'IT', quality: q(3,4,5,3), workExp: null, ageLimit: null },
  ],
  'Undergraduate Scholarships': [
    { name: 'Westminster Full International Scholarship', provider: 'University of Westminster', host: 'University of Westminster (UK)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-04-30', url: 'https://www.westminster.ac.uk', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'Wells Mountain Initiative Scholarship', provider: 'WMI Foundation', host: 'Any (Home/Region)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-03-01', url: 'https://www.wellsmountaininitiative.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Global', hostCountry: '["multiple"]', iso2: '', quality: q(4,3,5,2), workExp: null, ageLimit: null },
    { name: 'CASNR Undergraduate Scholarship (Nebraska)', provider: 'University of Nebraska', host: 'University of Nebraska (USA)', countries: '["Rwanda"]', degrees: '["Undergraduate"]', deadline: '2027-06-30', url: 'https://www.unl.edu', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United States and Canada', hostCountry: '["united states"]', iso2: 'US', quality: q(3,5,1,2), workExp: null, ageLimit: null },
    { name: 'Tunisia Undergraduate Scholarship', provider: 'US Department of State', host: 'US Universities', countries: '["Tunisia"]', degrees: '["Undergraduate"]', deadline: '2027-06-30', url: 'https://exchanges.state.gov', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United States and Canada', hostCountry: '["united states"]', iso2: 'US', quality: q(3,5,1,2), workExp: null, ageLimit: null },
    { name: 'MCF at EARTH University', provider: 'Mastercard Foundation', host: 'EARTH University (Costa Rica)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-06-30', url: 'https://www.earth.ac.cr', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'South America', hostCountry: '["costa rica"]', iso2: '', quality: q(3,5,5,2), workExp: null, ageLimit: null },
    { name: 'Berea College Scholarships', provider: 'Berea College', host: 'Berea College (USA)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-01-15', url: 'https://www.berea.edu', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United States and Canada', hostCountry: '["united states"]', iso2: 'US', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'NYU Abu Dhabi Scholarships', provider: 'NYU Abu Dhabi', host: 'NYU Abu Dhabi (UAE)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-01-15', url: 'https://www.nyuad.nyu.edu', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Middle East and Turkey', hostCountry: '["united arab emirates"]', iso2: 'AE', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'Lester B. Pearson Scholarship (Toronto)', provider: 'University of Toronto', host: 'University of Toronto (Canada)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2026-11-30', url: 'https://future.utoronto.ca', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United States and Canada', hostCountry: '["canada"]', iso2: 'CA', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'UBC International Scholars (British Columbia)', provider: 'University of British Columbia', host: 'University of British Columbia (Canada)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2026-12-01', url: 'https://you.ubc.ca', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United States and Canada', hostCountry: '["canada"]', iso2: 'CA', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'Clark Global Scholars (Clark University)', provider: 'Clark University', host: 'Clark University (USA)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-01-15', url: 'https://www.clarku.edu', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United States and Canada', hostCountry: '["united states"]', iso2: 'US', quality: q(3,5,5,2), workExp: null, ageLimit: null },
    { name: 'American University EGL Scholarship', provider: 'American University', host: 'American University (USA)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-01-15', url: 'https://www.american.edu', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United States and Canada', hostCountry: '["united states"]', iso2: 'US', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'Boston University Presidential Scholarship', provider: 'Boston University', host: 'Boston University (USA)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2026-12-01', url: 'https://www.bu.edu', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United States and Canada', hostCountry: '["united states"]', iso2: 'US', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'Ashinaga Global 100', provider: 'Ashinaga Foundation', host: 'Global (partner universities)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-03-31', url: 'https://www.ashinaga.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Global', hostCountry: '["multiple"]', iso2: '', quality: q(3,5,5,2), workExp: null, ageLimit: 23 },
  ],
  'Corporate & Foundation Scholarships': [
    { name: 'J-PAL African Scholars Program', provider: 'J-PAL / MIT', host: 'Various (Africa)', countries: '["Pan-African"]', degrees: '["Postdoc"]', deadline: '2027-12-31', url: 'https://www.povertyactionlab.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Global', hostCountry: '["multiple"]', iso2: '', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'Heinrich Böll Foundation Scholarships', provider: 'Heinrich Böll Foundation', host: 'German Universities', countries: '["Pan-African"]', degrees: '["Masters", "PhD"]', deadline: '2027-03-01', url: 'https://www.boell.de', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Germany, Austria, Switzerland (German-speaking)', hostCountry: '["germany"]', iso2: 'DE', quality: q(3,5,5,2), workExp: null, ageLimit: null },
    { name: 'Joint Japan/World Bank Scholarship', provider: 'World Bank', host: 'Various (USA/Europe/Japan)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-03-31', url: 'https://www.worldbank.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Global', hostCountry: '["multiple"]', iso2: '', quality: q(2,5,5,1), workExp: 3, ageLimit: null },
    { name: 'KOICA Youth Leaders Program', provider: 'KOICA (South Korea)', host: 'Korean Universities', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-03-31', url: 'https://www.koica.go.kr', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Japan and South Korea', hostCountry: '["south korea"]', iso2: 'KR', quality: q(3,5,2,2), workExp: null, ageLimit: null },
    { name: 'elea Talent Program', provider: 'elea Foundation', host: 'South Africa', countries: '["South Africa"]', degrees: '["Masters"]', deadline: '2027-06-30', url: 'https://www.elea.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["south africa"]', iso2: 'ZA', quality: q(4,3,1,3), workExp: null, ageLimit: null },
    { name: 'Mo Ibrahim Foundation (University of Birmingham)', provider: 'Mo Ibrahim Foundation', host: 'University of Birmingham (UK)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-03-31', url: 'https://www.birmingham.ac.uk', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(3,5,5,1), workExp: null, ageLimit: null },
    { name: 'Mo Ibrahim Foundation (SOAS)', provider: 'Mo Ibrahim Foundation', host: 'SOAS University of London (UK)', countries: '["Pan-African"]', degrees: '["PhD"]', deadline: '2027-03-31', url: 'https://www.soas.ac.uk', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'Microsoft Research EMEA PhD Fellowship', provider: 'Microsoft', host: 'Global (host universities)', countries: '["Pan-African"]', degrees: '["PhD"]', deadline: '2027-03-31', url: 'https://www.microsoft.com', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Global', hostCountry: '["multiple"]', iso2: '', quality: q(1,5,5,1), workExp: null, ageLimit: null },
    { name: 'Eni Scholarships (Oxford)', provider: 'Eni / Oxford University', host: 'University of Oxford (UK)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-03-31', url: 'https://www.ox.ac.uk', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'Standard Bank Africa Chairman\'s Scholarship', provider: 'Standard Bank', host: 'UK Universities', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-03-31', url: 'https://www.standardbank.com', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'Baillie Gifford Scholarships (Edinburgh)', provider: 'Baillie Gifford', host: 'University of Edinburgh (UK)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-03-31', url: 'https://www.ed.ac.uk', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'United Kingdom and Ireland', hostCountry: '["united kingdom"]', iso2: 'GB', quality: q(2,5,5,1), workExp: null, ageLimit: null },
  ],
  'Francophone & Lusophone Scholarships': [
    { name: 'Portugal Government PALOP Scholarship', provider: 'Portuguese Government', host: 'Portuguese Universities', countries: '["Angola", "Cape Verde", "Guinea-Bissau", "Mozambique", "Sao Tome and Principe"]', degrees: '["Masters"]', deadline: '2026-09-30', url: 'https://gulbenkian.pt', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Italy and Mediterranean', hostCountry: '["portugal"]', iso2: 'PT', quality: q(4,5,2,3), workExp: null, ageLimit: null },
    { name: 'France Excellence Major Scholarship', provider: 'French Government / AEFE', host: 'French Universities', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-03-31', url: 'https://www.aefe.fr', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'France and Belgium', hostCountry: '["france"]', iso2: 'FR', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'Tunisian Engineering Mobility (French Embassy)', provider: 'French Embassy', host: 'French Universities', countries: '["Tunisia"]', degrees: '["Masters"]', deadline: '2027-03-31', url: 'https://www.campusfrance.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'France and Belgium', hostCountry: '["france"]', iso2: 'FR', quality: q(3,5,1,2), workExp: null, ageLimit: null },
    { name: 'Bourses Concorde (Gabon)', provider: 'French/Gabonese Government', host: 'French Universities', countries: '["Gabon"]', degrees: '["Undergraduate", "Masters"]', deadline: '2026-12-31', url: 'https://www.campusfrance.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'France and Belgium', hostCountry: '["france"]', iso2: 'FR', quality: q(3,5,1,2), workExp: null, ageLimit: null },
    { name: 'MCF at Sciences Po (France)', provider: 'Mastercard Foundation', host: 'Sciences Po (France)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2027-06-30', url: 'https://www.sciencespo.fr', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'France and Belgium', hostCountry: '["france"]', iso2: 'FR', quality: q(2,5,5,1), workExp: null, ageLimit: null },
    { name: 'MCF at University of Abomey-Calavi', provider: 'Mastercard Foundation', host: 'University of Abomey-Calavi (Benin)', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-06-30', url: 'https://www.uac.bj', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Intra-African', hostCountry: '["benin"]', iso2: '', quality: q(4,5,5,3), workExp: null, ageLimit: null },
    { name: 'Bourse Egalité des Chances (Montpellier Business School)', provider: 'Montpellier Business School', host: 'Montpellier Business School (France)', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2026-06-30', url: 'https://www.montpellier-bs.com', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'France and Belgium', hostCountry: '["france"]', iso2: 'FR', quality: q(3,4,5,2), workExp: null, ageLimit: null },
    { name: 'AUF Grants (Agence Universitaire de la Francophonie)', provider: 'Agence Universitaire de la Francophonie', host: 'Global (partner universities)', countries: '["Pan-African"]', degrees: '["Masters", "PhD"]', deadline: '2027-03-31', url: 'https://www.auf.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'Global', hostCountry: '["multiple"]', iso2: '', quality: q(3,5,3,2), workExp: null, ageLimit: null },
    { name: 'BGF Senegal (French Embassy)', provider: 'French Embassy', host: 'French Universities', countries: '["Senegal"]', degrees: '["Masters"]', deadline: '2027-03-31', url: 'https://www.campusfrance.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'France and Belgium', hostCountry: '["france"]', iso2: 'FR', quality: q(3,5,1,2), workExp: null, ageLimit: null },
    { name: 'BGF Cote d\'Ivoire (French Embassy)', provider: 'French Embassy', host: 'French Universities', countries: '["Cote d\'Ivoire"]', degrees: '["Masters"]', deadline: '2027-03-31', url: 'https://www.campusfrance.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'France and Belgium', hostCountry: '["france"]', iso2: 'FR', quality: q(3,5,1,2), workExp: null, ageLimit: null },
    { name: 'Brazil PEC-G (Undergraduate)', provider: 'Brazilian Government (MRE)', host: 'Brazilian Universities', countries: '["Pan-African"]', degrees: '["Undergraduate"]', deadline: '2027-03-31', url: 'https://www.gov.br/mre', funding: 'Full', amount: 'Full funding including living costs', noIelts: true, hostRegion: 'South America', hostCountry: '["brazil"]', iso2: 'BR', quality: q(4,5,5,3), workExp: null, ageLimit: null },
    { name: 'Bourse de Couverture Sociale (French Government)', provider: 'French Government', host: 'French Universities', countries: '["Pan-African"]', degrees: '["Masters"]', deadline: '2026-09-01', url: 'https://www.campusfrance.org', funding: 'Full', amount: 'Full funding including living costs', noIelts: false, hostRegion: 'France and Belgium', hostCountry: '["france"]', iso2: 'FR', quality: q(3,5,5,2), workExp: null, ageLimit: null },
  ],
};

function generateId(name) {
  return 'schol-' + crypto.createHash('md5').update(name).digest('hex').slice(0, 8);
}

const fieldsMap = {
  'Pan-African': '["All African Countries"]',
};

function normalizeDegrees(arr) {
  const map = { 'undergraduate': 'Undergraduate', 'masters': 'Masters', 'phd': 'PhD', 'postdoc': 'Postdoc', 'doctoral': 'PhD', 'professional development': 'Professional Development', 'short course': 'Short Course', 'postgraduate': 'Postgraduate' };
  return arr.map(d => {
    const key = d.toLowerCase().trim();
    return map[key] || d;
  });
}

async function main() {
  console.log('=== Zawadi Scholarship Seeder v2 ===');
  console.log(`URL: ${SUPABASE_URL}\n`);

  // Fetch existing scholarship names to avoid duplicates
  const { data: existing } = await supabase.from('scholarships').select('name');
  const existingNames = new Set((existing || []).map(s => s.name.toLowerCase().trim()));

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const [category, scholars] of Object.entries(CATEGORIES)) {
    console.log(`\n--- ${category} ---`);
    for (const s of scholars) {
      const nameLower = s.name.toLowerCase().trim();
      if (existingNames.has(nameLower)) {
        console.log(`  ⏭ SKIP (exists): ${s.name}`);
        totalSkipped++;
        continue;
      }

      const id = generateId(s.name);
      const degreeLevels = normalizeDegrees(JSON.parse(s.degrees));

      const payload = {
        id,
        name: s.name,
        provider: s.provider,
        host_institution: s.host,
        countries: JSON.parse(s.countries),
        degree_levels: degreeLevels,
        fields_of_study: ['All fields'],
        funding_type: s.funding,
        amount: s.amount,
        deadline: s.deadline,
        description: `${s.name} offered by ${s.provider} at ${s.host}. ${s.amount}.`,
        eligibility: 'Open to eligible African nations matching core conditions.',
        required_documents: ['CV / Resume', 'Academic Transcript', 'Motivation Letter', 'Reference Letter', 'Passport / ID'],
        apply_url: s.url,
        source_url: s.url,
        published: true,
        verified: false,
        verified_at: new Date().toISOString().split('T')[0],
        view_count: 0,
        no_ielts: s.noIelts,
        instruction_language: 'English',
        quality_score: s.quality.average,
        host_region: s.hostRegion,
        host_country: s.hostCountry ? JSON.parse(s.hostCountry) : undefined,
        iso2: s.iso2 || undefined,
        category: category,
        work_experience_required: s.workExp || null,
      };

      if (s.ageLimit) {
        if (typeof s.ageLimit === 'number') {
          payload.age_limit_masters = s.ageLimit;
          payload.age_limit_phd = s.ageLimit;
        } else if (typeof s.ageLimit === 'string' && s.ageLimit.includes('-')) {
          const [min, max] = s.ageLimit.split('-').map(Number);
          if (min <= 30) payload.age_limit_masters = max;
          if (min > 30) payload.age_limit_phd = max;
        }
      }

      const { error } = await supabase.from('scholarships').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.error(`  ✗ FAIL: ${s.name} — ${error.message}`);
      } else {
        console.log(`  ✓ INSERT: ${s.name} (${id})`);
        totalInserted++;
        existingNames.add(nameLower);
      }
    }
  }

  console.log(`\n=== Done! Inserted: ${totalInserted}, Skipped (duplicates): ${totalSkipped} ===`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
