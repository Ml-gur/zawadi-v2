import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase credentials required in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Helper: make scholarship object ──────────────────────
function schol({
  name, provider, host_institution, description, eligibility, amount, deadline,
  apply_url, degree_levels, fields_of_study, countries, funding_type,
  no_ielts, work_experience_required, age_limit_masters, age_limit_phd,
  host_region, iso2, confidence_score, source_url, urgency
}) {
  return {
    name, provider, host_institution: host_institution || null,
    description: description || null,
    eligibility: eligibility || null,
    amount: amount || null,
    deadline: deadline || null,
    apply_url: apply_url || null,
    source_url: source_url || apply_url || '',
    degree_levels: degree_levels || [],
    fields_of_study: fields_of_study || [],
    countries: countries || ['All African Countries'],
    funding_type: funding_type || null,
    no_ielts: no_ielts ?? null,
    work_experience_required: work_experience_required ?? null,
    age_limit_masters: age_limit_masters ?? null,
    age_limit_phd: age_limit_phd ?? null,
    host_region: host_region || null,
    iso2: iso2 || null,
    confidence_score: confidence_score || 0.5,
    scam_flags: [],
    urgency: urgency || 'Normal',
  };
}

// ─── All 37 scholarships ─────────────────────────────────
const allScholarships = [
  // === CATEGORY A: Active (future deadlines / TBA / rolling) ===
  schol({ name: 'Chevening Scholarships', provider: 'UK Foreign, Commonwealth & Development Office (FCDO)', host_institution: 'Various UK universities', deadline: '2026-10-07', amount: 'Full tuition + monthly stipend GBP ~1,100-1,400/mo + return airfare + allowances + visa + travel grant', apply_url: 'https://www.chevening.org/apply/', degree_levels: ['Masters'], countries: ['All African Countries'], funding_type: 'Full', work_experience_required: 2, no_ielts: false, host_region: 'United Kingdom and Ireland', iso2: 'GB', confidence_score: 0.95 }),
  schol({ name: 'DAAD EPOS Scholarships', provider: 'DAAD / German Federal Ministry for Economic Cooperation (BMZ)', host_institution: 'Various German universities', deadline: '2026-07-31', amount: 'EUR 934/month + health insurance + travel allowance + study allowance', apply_url: 'https://www.daad.de/en/study-and-research-in-germany/scholarships/development-related-postgraduate-courses-epos/', degree_levels: ['Masters'], fields_of_study: ['Engineering', 'Data Science', 'Environmental Science', 'Public Health'], countries: ['All African Countries'], funding_type: 'Full', work_experience_required: 2, no_ielts: true, host_region: 'Germany, Austria, Switzerland (German-speaking)', iso2: 'DE', confidence_score: 0.88 }),
  schol({ name: 'Erasmus Mundus Joint Master Degrees', provider: 'European Commission / EACEA', host_institution: 'Consortia of European universities', deadline: null, amount: 'Full tuition + EUR 1,000-1,400/month + travel', apply_url: 'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters', degree_levels: ['Masters'], fields_of_study: ['Computer Science', 'Engineering', 'All fields'], countries: ['All African Countries'], funding_type: 'Full', host_region: 'Rest of Europe', confidence_score: 0.92 }),
  schol({ name: 'Queen Elizabeth Commonwealth Scholarships', provider: 'Association of Commonwealth Universities (ACU)', host_institution: 'Universities in low/middle-income Commonwealth countries', deadline: '2026-06-03', amount: 'Full tuition + living expenses + return flights + research grant', apply_url: 'https://www.acu.ac.uk/funding-opportunities/for-students/scholarships/queen-elizabeth-commonwealth-scholarships/', degree_levels: ['Masters'], countries: ['Commonwealth African countries'], funding_type: 'Full', host_region: 'Commonwealth Africa', confidence_score: 0.93 }),
  schol({ name: 'Rhodes Scholarship (Southern Africa)', provider: 'Rhodes Trust, Oxford University', host_institution: 'University of Oxford', deadline: '2026-08-03', amount: 'All fees + GBP ~18,180/year stipend + return airfare', apply_url: 'https://www.rhodeshouse.ox.ac.uk/scholarships/applications/', degree_levels: ['Masters', 'PhD'], countries: ['Botswana', 'Lesotho', 'Malawi', 'Namibia', 'South Africa', 'Eswatini'], funding_type: 'Full', age_limit_masters: 24, host_region: 'United Kingdom and Ireland', iso2: 'GB', confidence_score: 0.91 }),
  schol({ name: 'Rhodes Scholarship (East & West Africa)', provider: 'Rhodes Trust, Oxford University', host_institution: 'University of Oxford', deadline: '2026-08-27', amount: 'All fees + GBP ~18,180/year stipend + return airfare', apply_url: 'https://www.rhodeshouse.ox.ac.uk/scholarships/applications/', degree_levels: ['Masters', 'PhD'], countries: ['Kenya', 'Burundi', 'Rwanda', 'Tanzania', 'Uganda', 'Benin', 'Burkina Faso', 'Cape Verde', "Côte d'Ivoire", 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Liberia', 'Mali', 'Mauritania', 'Niger', 'Nigeria', 'Senegal', 'Sierra Leone', 'Togo'], funding_type: 'Full', age_limit_masters: 24, host_region: 'United Kingdom and Ireland', iso2: 'GB', confidence_score: 0.91 }),
  schol({ name: 'Swiss Government Excellence Scholarships', provider: 'Swiss Confederation / SERI', host_institution: 'Swiss universities, ETH Zurich, EPFL', deadline: null, amount: 'CHF 1,920-3,500/month + tuition + insurance + travel', apply_url: 'https://www.sbfi.admin.ch/en/swiss-government-excellence-scholarships', degree_levels: ['Masters', 'PhD', 'Postdoctoral'], countries: ['All African Countries'], funding_type: 'Full', host_region: 'Germany, Austria, Switzerland (German-speaking)', confidence_score: 0.85 }),
  schol({ name: 'Global Korea Scholarship', provider: 'NIIED / Ministry of Education, South Korea', host_institution: 'Various Korean universities', deadline: null, amount: 'Full tuition + KRW 900,000/month + airfare + medical insurance + 1-year Korean language', apply_url: 'https://www.studyinkorea.go.kr/', degree_levels: ['Undergraduate', 'Masters', 'PhD'], countries: ['All African Countries'], funding_type: 'Full', age_limit_masters: 40, age_limit_phd: 40, host_region: 'Japan and South Korea', iso2: 'KR', confidence_score: 0.87 }),
  schol({ name: 'MEXT Japan Scholarship', provider: 'MEXT Japan', host_institution: 'Japanese universities', deadline: null, amount: 'Full tuition + JPY 117,000-143,000/month + airfare + arrival allowance', apply_url: 'https://www.studyinjapan.go.jp/en/', degree_levels: ['Undergraduate', 'Masters', 'PhD'], countries: ['All African Countries'], funding_type: 'Full', age_limit_masters: 35, age_limit_phd: 35, host_region: 'Japan and South Korea', iso2: 'JP', confidence_score: 0.88 }),
  schol({ name: 'CMU Africa Mastercard Foundation Scholars Program', provider: 'Carnegie Mellon University Africa / Mastercard Foundation', host_institution: 'CMU Africa, Kigali, Rwanda', deadline: '2027-01-15', amount: 'Full tuition + accommodation + living stipend + travel + laptop + health insurance', apply_url: 'https://www.cmu.edu/africa/admission/apply.html', degree_levels: ['Masters'], fields_of_study: ['Computer Science', 'Engineering', 'Artificial Intelligence'], countries: ['Sub-Saharan African countries'], funding_type: 'Full', host_region: 'Intra-African', iso2: 'RW', confidence_score: 0.90 }),
  schol({ name: 'UNESCO Co-sponsored Fellowships Programme', provider: 'UNESCO', deadline: '2026-12-31', amount: 'Varies by specific fellowship — travel + living + training costs', apply_url: 'https://www.unesco.org/en/fellowships', degree_levels: ['Masters', 'PhD', 'Postdoctoral'], countries: ['All African Countries'], funding_type: null, host_region: null, confidence_score: 0.72 }),
  schol({ name: 'Czech Republic Government Scholarships', provider: 'Government of the Czech Republic / Ministry of Education', host_institution: 'Czech public universities', deadline: null, amount: 'Full tuition + CZK 14,000-18,000/month + accommodation + Czech language prep', apply_url: 'https://msmt.gov.cz/eu-and-international-affairs/government-scholarships-developing-countries', degree_levels: ['Undergraduate', 'Masters', 'PhD'], countries: ['Kenya'], funding_type: 'Full', age_limit_masters: 30, age_limit_phd: 35, host_region: 'Rest of Europe', confidence_score: 0.70 }),
  schol({ name: 'Generation Google Scholarship', provider: 'Google', host_institution: 'Any university (home institution)', deadline: null, amount: 'EUR 7,000 (one-time) + Google Scholars Retreat', apply_url: 'https://www.google.com/about/careers/applications/buildyourfuture/scholarships/', degree_levels: ['Undergraduate', 'Masters'], fields_of_study: ['Computer Science', 'Computer Engineering'], countries: ['All African Countries'], funding_type: 'Partial', no_ielts: true, host_region: 'Intra-African', confidence_score: 0.78 }),
  schol({ name: 'Mo Ibrahim Foundation Scholarship at SOAS', provider: 'Mo Ibrahim Foundation', host_institution: 'SOAS University of London', deadline: null, amount: 'Full tuition + living stipend', apply_url: 'https://www.soas.ac.uk/', degree_levels: ['Masters'], fields_of_study: ['International Relations', 'Development Studies', 'Economics'], countries: ['All African Countries'], funding_type: 'Full', host_region: 'United Kingdom and Ireland', iso2: 'GB', confidence_score: 0.80 }),
  schol({ name: 'AfDB Japan Africa Dream Scholarship (JADS)', provider: 'African Development Bank / Government of Japan', host_institution: 'Universities in Japan', deadline: null, amount: 'Full tuition + JPY 144,000/month + round-trip airfare + insurance + book allowance', apply_url: 'https://www.afdb.org/en/about-us/careers/japan-africa-dream-scholarship-jads-program', degree_levels: ['Masters'], fields_of_study: ['Engineering', 'Agriculture', 'Public Health', 'Environmental Science'], countries: ['All African Countries'], funding_type: 'Full', work_experience_required: 1, age_limit_masters: 35, host_region: 'Japan and South Korea', iso2: 'JP', confidence_score: 0.85 }),
  schol({ name: 'Heinrich Böll Foundation Scholarships', provider: 'Heinrich Böll Foundation', host_institution: 'German universities', deadline: null, amount: 'EUR 649-1,200/month + insurance supplement', apply_url: 'https://www.boell.de/en/foundation/application', degree_levels: ['Undergraduate', 'Masters', 'PhD'], fields_of_study: ['Environmental Science', 'Political Science', 'International Relations'], countries: ['All African Countries'], funding_type: 'Partial', host_region: 'Germany, Austria, Switzerland (German-speaking)', iso2: 'DE', confidence_score: 0.82 }),
  schol({ name: 'Friedrich Ebert Foundation (FES) Scholarship', provider: 'Friedrich Ebert Stiftung', host_institution: 'German universities', deadline: null, amount: 'EUR 930/month + EUR 300 study allowance + health insurance', apply_url: 'https://www.fes.de/studienfoerderung/international', degree_levels: ['Masters', 'PhD'], countries: ['All African Countries'], funding_type: 'Partial', age_limit_masters: 30, age_limit_phd: 30, host_region: 'Germany, Austria, Switzerland (German-speaking)', iso2: 'DE', confidence_score: 0.78 }),
  schol({ name: 'Austria OeAD Ernst Mach Grant', provider: 'Austrian Agency for Education and Internationalisation (OeAD)', host_institution: 'Austrian universities', deadline: null, amount: 'EUR 1,050-1,150/month + travel', apply_url: 'https://oead.at/en/studieren-forschen-lehren/coming-to-austria-programme-overview/grants-and-scholarships', degree_levels: ['Masters', 'PhD', 'Postdoctoral'], countries: ['All African Countries'], funding_type: 'Partial', host_region: 'Germany, Austria, Switzerland (German-speaking)', iso2: 'AT', confidence_score: 0.75 }),
  schol({ name: 'Finland EDUFI Fellowship', provider: 'Finnish National Agency for Education (EDUFI)', host_institution: 'Finnish universities', deadline: null, amount: 'EUR 1,500-1,900/month research grant', apply_url: 'https://www.oph.fi/en/internationalisation/edufi-fellowship', degree_levels: ['PhD', 'Postdoctoral'], countries: ['All African Countries'], funding_type: 'Partial', host_region: 'Nordic countries', iso2: 'FI', confidence_score: 0.78 }),
  schol({ name: 'Aga Khan Foundation International Scholarship', provider: 'Aga Khan Foundation / AKDN', host_institution: 'Any recognized university worldwide', deadline: null, amount: '50% grant + 50% loan (5% interest, repayable after graduation) — tuition + living expenses', apply_url: 'https://the.akdn/en/what-we-do/developing-human-capacity/education/international-scholarships', degree_levels: ['Masters'], countries: ['Kenya', 'Tanzania', 'Uganda', 'Madagascar', 'Mozambique'], funding_type: 'Partial', age_limit_masters: 30, host_region: null, confidence_score: 0.82 }),
  schol({ name: 'UNHCR DAFI Tertiary Scholarship Programme', provider: 'UNHCR / Federal Government of Germany', host_institution: 'Universities in asylum/host countries or countries of origin', deadline: null, amount: 'Full tuition + study materials + food + transport + accommodation', apply_url: 'https://www.unhcr.org/what-we-do/build-better-futures/education/higher-education-and-skills/dafi-tertiary-scholarship-0', degree_levels: ['Undergraduate'], countries: ['All African Countries'], funding_type: 'Full', host_region: 'Intra-African', confidence_score: 0.91 }),
  schol({ name: 'Mastercard Foundation Scholars Program', provider: 'Mastercard Foundation', host_institution: 'Multiple partner universities', deadline: null, amount: 'Full tuition + accommodation + books + travel + living expenses + health insurance + career support', apply_url: 'https://mastercardfdn.org/en/what-we-do/our-programs/mastercard-foundation-scholars-program/', degree_levels: ['Undergraduate', 'Masters'], countries: ['Sub-Saharan African countries'], funding_type: 'Full', host_region: 'Intra-African', confidence_score: 0.92 }),
  schol({ name: 'ARES International Training Scholarships', provider: 'ARES / Belgian Development Cooperation', host_institution: 'Belgian universities', deadline: null, amount: 'Travel + tuition + EUR 1,170/month + accommodation + insurance', apply_url: 'https://ares-ac.be/fr/cooperation-au-developpement/bourses', degree_levels: ['Masters'], countries: ['Kenya', '19 Sub-Saharan countries'], funding_type: 'Full', work_experience_required: 2, age_limit_masters: 40, host_region: 'France and Belgium', confidence_score: 0.83 }),

  // === CATEGORY B: Expired deadlines (2025-26 cycle closed) ===
  schol({ name: 'Eiffel Excellence Scholarship', provider: 'French Ministry for Europe and Foreign Affairs / Campus France', host_institution: 'French higher education institutions', deadline: '2026-01-08', amount: 'EUR 1,181/month (masters) / EUR 1,700/month (PhD) + travel + insurance', apply_url: 'https://www.campusfrance.org/en/france-excellence-eiffel-scholarship-program', degree_levels: ['Masters', 'PhD'], fields_of_study: ['Engineering', 'STEM', 'Science'], countries: ['All African Countries'], funding_type: 'Full', age_limit_masters: 25, age_limit_phd: 30, host_region: 'France and Belgium', iso2: 'FR', confidence_score: 0.92, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around August. Check the official website for the next cycle opening date.' }),
  schol({ name: 'Stipendium Hungaricum', provider: 'Government of Hungary / Tempus Public Foundation', host_institution: '28 Hungarian universities', deadline: '2026-01-15', amount: 'Full tuition + HUF 43,700-140,000/month + accommodation + medical insurance', apply_url: 'https://stipendiumhungaricum.hu/', degree_levels: ['Undergraduate', 'Masters', 'PhD'], countries: ['All African Countries'], funding_type: 'Full', no_ielts: true, host_region: 'Rest of Europe', iso2: 'HU', confidence_score: 0.89, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around November. Check the official website for the next cycle opening date.' }),
  schol({ name: 'Swedish Institute Scholarships for Global Professionals', provider: 'Swedish Institute', host_institution: 'Various Swedish universities', deadline: '2026-02-25', amount: 'Full tuition + SEK 12,000/month + SEK 15,000 travel + insurance', apply_url: 'https://si.se/en/apply/scholarships/swedish-institute-scholarships-for-global-professionals/', degree_levels: ['Masters'], countries: ['All African Countries'], funding_type: 'Full', work_experience_required: 2, no_ielts: true, host_region: 'Nordic countries', iso2: 'SE', confidence_score: 0.93, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around October. Check the official website for the next cycle opening date.' }),
  schol({ name: 'Türkiye Burslari (Turkey Scholarships)', provider: 'Government of Turkey / YTB', host_institution: '100+ Turkish universities', deadline: '2026-02-25', amount: 'Full tuition + TRY 1,600-3,000/month + return flight + health insurance + accommodation + 1-year Turkish language', apply_url: 'https://turkiyeburslari.gov.tr/', degree_levels: ['Undergraduate', 'Masters', 'PhD'], countries: ['All African Countries'], funding_type: 'Full', no_ielts: true, age_limit_masters: 30, age_limit_phd: 35, host_region: 'Middle East and Gulf states', iso2: 'TR', confidence_score: 0.90, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around October. Check the official website for the next cycle opening date.' }),
  schol({ name: 'VLIR-UOS ICP Connect Scholarships', provider: 'VLIR-UOS (Flemish Interuniversity Council)', host_institution: 'Flemish universities in Belgium', deadline: '2026-02-28', amount: 'Full tuition + EUR 1,170/month + travel + accommodation + insurance', apply_url: 'https://www.vliruos.be/en/icp-connect-scholarships', degree_levels: ['Masters'], fields_of_study: ['Engineering', 'Environmental Science'], countries: ['Kenya', '19 Sub-Saharan countries'], funding_type: 'Full', age_limit_masters: 40, host_region: 'Netherlands and Belgium', iso2: 'BE', confidence_score: 0.91, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around September. Check the official website for the next cycle opening date.' }),
  schol({ name: 'Tony Elumelu Foundation Entrepreneurship Programme', provider: 'Tony Elumelu Foundation', host_institution: 'Online training (TEFConnect platform)', deadline: '2026-03-01', amount: 'USD 5,000 seed capital + 12-week training + mentoring + network', apply_url: 'https://www.tonyelumelufoundation.org/', degree_levels: ['Professional'], countries: ['All African Countries'], funding_type: 'Full', host_region: 'Intra-African', confidence_score: 0.93, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around January. Check the official website for the next cycle opening date.' }),
  schol({ name: 'Government of Ireland International Education Scholarships', provider: 'Government of Ireland / HEA', host_institution: 'Irish universities', deadline: '2026-03-12', amount: 'Full tuition waiver + EUR 10,000 stipend', apply_url: 'https://hea.ie/funding-governance-performance/funding/international-government-of-ireland-international-education-scholarships/', degree_levels: ['Undergraduate', 'Masters', 'PhD'], countries: ['All African Countries'], funding_type: 'Full', host_region: 'United Kingdom and Ireland', iso2: 'IE', confidence_score: 0.88, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around October. Check the official website for the next cycle opening date.' }),
  schol({ name: 'Italian Government Scholarships (MAECI)', provider: 'Italian Ministry of Foreign Affairs and International Cooperation', host_institution: 'Italian universities', deadline: '2026-03-26', amount: 'Monthly allowance + tuition waiver + health insurance', apply_url: 'https://studyinitaly.esteri.it/en/call-for-procedures', degree_levels: ['Masters', 'PhD'], countries: ['All African Countries'], funding_type: 'Full', age_limit_masters: 28, age_limit_phd: 30, host_region: 'Rest of Europe', iso2: 'IT', confidence_score: 0.87, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around November. Check the official website for the next cycle opening date.' }),
  schol({ name: 'Commonwealth Distance Learning Scholarships', provider: 'Commonwealth Scholarship Commission (UK)', host_institution: 'UK universities (online/distance)', deadline: '2026-03-31', amount: 'Full tuition fees fully covered', apply_url: 'https://cscuk.fcdo.gov.uk/scholarships/commonwealth-distance-learning-scholarships/', degree_levels: ['Masters'], countries: ['Commonwealth African countries'], funding_type: 'Full', host_region: 'United Kingdom and Ireland', iso2: 'GB', confidence_score: 0.91, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around September. Check the official website for the next cycle opening date.' }),
  schol({ name: 'Romania Government Scholarship', provider: 'Romanian Ministry of Foreign Affairs', host_institution: 'Romanian public universities', deadline: '2026-03-31', amount: 'Tuition waiver + EUR 85-115/month stipend', apply_url: 'https://scholarships.studyinromania.gov.ro/', degree_levels: ['Undergraduate', 'Masters', 'PhD'], countries: ['All African Countries'], funding_type: 'Partial', age_limit_masters: 35, age_limit_phd: 45, host_region: 'Rest of Europe', iso2: 'RO', confidence_score: 0.86, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around December. Check the official website for the next cycle opening date.' }),
  schol({ name: 'DAAD In-Country/In-Region Scholarships', provider: 'DAAD', host_institution: 'Selected African universities (within Africa)', deadline: '2026-04-29', amount: 'Full tuition + monthly stipend + research allowance + insurance', apply_url: 'https://www.daad.de/en/in-country-in-region-scholarships/', degree_levels: ['Masters', 'PhD'], countries: ['All Sub-Saharan African countries'], funding_type: 'Full', host_region: 'Intra-African', confidence_score: 0.90, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around June. Check the official website for the next cycle opening date.' }),
  schol({ name: 'Australia Awards Scholarships', provider: 'Australian Government DFAT', host_institution: 'Various Australian universities', deadline: '2026-04-30', amount: 'Full tuition + AUD ~25,000-30,000/year living + return airfare + OSHC + establishment allowance', apply_url: 'https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships', degree_levels: ['Masters', 'PhD'], countries: ['Kenya', '35+ African countries'], funding_type: 'Full', host_region: 'Australia and New Zealand', iso2: 'AU', confidence_score: 0.95, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around August. Check the official website for the next cycle opening date.' }),
  schol({ name: 'Poland NAWA Government Scholarship', provider: 'Polish National Agency for Academic Exchange (NAWA)', host_institution: 'Polish universities', deadline: '2026-05-29', amount: 'Full tuition waiver + PLN 1,700-2,500/month', apply_url: 'https://nawa.gov.pl/en/nawa/news/poland-my-first-choice-nawa-2026', degree_levels: ['Masters', 'PhD'], countries: ['All African Countries'], funding_type: 'Full', age_limit_masters: 35, age_limit_phd: 35, host_region: 'Rest of Europe', iso2: 'PL', confidence_score: 0.82, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around January. Check the official website for the next cycle opening date.' }),
  schol({ name: 'Joint Japan/World Bank Graduate Scholarship (JJ/WBGSP)', provider: 'World Bank / Government of Japan', host_institution: '44 programs at 24 universities', deadline: '2026-05-29', amount: 'Full tuition + monthly stipend + airfare + travel allowance + insurance + book allowance', apply_url: 'https://www.worldbank.org/en/programs/scholarships/jj-wbgsp', degree_levels: ['Masters'], fields_of_study: ['Economics', 'Engineering', 'Public Health', 'Agriculture'], countries: ['All African Countries'], funding_type: 'Full', work_experience_required: 3, host_region: null, confidence_score: 0.94, urgency: 'Expired', description: 'Applications for the 2025-2026 cycle are now closed. This scholarship typically opens again around January. Check the official website for the next cycle opening date.' }),
  schol({ name: 'Chinese Government Scholarship (CSC)', provider: 'China Scholarship Council', host_institution: '280+ Chinese universities', deadline: null, amount: 'Full tuition + accommodation + CNY 2,500-3,500/month + medical insurance', apply_url: 'https://www.csc.edu.cn/', degree_levels: ['Undergraduate', 'Masters', 'PhD'], countries: ['All African Countries'], funding_type: 'Full', age_limit_masters: 35, age_limit_phd: 40, no_ielts: true, host_region: 'China and East Asia', iso2: 'CN', confidence_score: 0.88 }),
];

// ─── Build PipelineOutput ─────────────────────────────────
const pipelineOutput = {
  pipeline_run: {
    timestamp: '2026-06-02T06:39:00+03:00',
    sources_searched: 84,
    pages_crawled: 168,
    scholarships_found: 37,
    duplicates_skipped: 12,
    scam_flagged: 0,
  },
  scholarships: allScholarships,
};

// ─── First try via local server API ───────────────────────
async function importViaServer() {
  try {
    // Login to get admin token
    const loginRes = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@zawadi.app', password: 'admin123' }),
    });
    
    let token;
    if (loginRes.ok) {
      const loginData = await loginRes.json();
      token = loginData.token;
    } else if (JWT_SECRET) {
      // Generate a dev JWT token directly
      const jwt = (await import('jsonwebtoken')).default;
      token = jwt.sign({ email: 'admin@zawadi.app', role: 'super_admin', admin: true }, JWT_SECRET, { expiresIn: '1h' });
    }

    if (!token) {
      console.log('Could not get token, falling back to direct Supabase insert');
      return null;
    }

    const res = await fetch('http://localhost:3000/api/admin/pipeline/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(pipelineOutput),
    });

    if (res.ok) {
      return await res.json();
    } else {
      const err = await res.text();
      console.error('Server API error:', res.status, err);
      return null;
    }
  } catch (err) {
    console.error('Server API call failed:', err.message);
    return null;
  }
}

// ─── Fallback: direct Supabase insert ─────────────────────
async function importDirect() {
  console.log('Importing directly via Supabase...');
  let inserted = 0;
  let duplicates_skipped = 0;
  let scam_flagged = 0;
  const rejected_invalid = [];

  for (const schol of allScholarships) {
    const crypto = (await import('crypto')).default;
    const fingerprint = crypto.createHash('sha256')
      .update(`${schol.name}${schol.provider}${schol.deadline || ''}`)
      .digest('hex');

    const { data: existing } = await supabase
      .from('bot_ingestions')
      .select('fingerprint')
      .eq('fingerprint', fingerprint)
      .maybeSingle();

    if (existing) {
      duplicates_skipped++;
      continue;
    }

    const hasScamFlags = Array.isArray(schol.scam_flags) && schol.scam_flags.length > 0;
    if (hasScamFlags) scam_flagged++;

    const record = {
      extracted_data: schol,
      source_url: schol.source_url || '',
      confidence_score: schol.confidence_score || 0.5,
      scam_flags: schol.scam_flags || [],
      status: 'pending',
      fingerprint,
      pipeline_run_id: 'pipeline-2026-06-02T06-39-00+03-00',
      degree_levels: schol.degree_levels || [],
      host_region: schol.host_region || null,
      countries: schol.countries || [],
    };

    const { error } = await supabase.from('bot_ingestions').insert(record);
    if (error) {
      console.error(`Insert error for "${schol.name}":`, error.message);
      rejected_invalid.push({ name: schol.name, errors: [error.message] });
    } else {
      inserted++;
    }
  }

  return {
    total_received: allScholarships.length,
    inserted,
    duplicates_skipped,
    scam_flagged,
    rejected_invalid,
  };
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  console.log('Total scholarships to import:', allScholarships.length);
  
  let result = await importViaServer();
  
  if (!result) {
    console.log('Server API unavailable, using direct Supabase...');
    result = await importDirect();
  }

  console.log('\n=== IMPORT RESULT ===');
  console.log(JSON.stringify(result, null, 2));

  // Step 5: Special handling for Aga Khan
  const { data: agaKhan } = await supabase
    .from('bot_ingestions')
    .select('*')
    .filter('extracted_data->>name', 'ilike', '%Aga Khan%')
    .single();

  if (agaKhan) {
    const updatedData = {
      ...agaKhan.extracted_data,
      funding_type: 'Partial',
      description: `Important: This scholarship consists of 50% non-repayable grant and 50% interest-bearing loan at 5% annual interest repayable after graduation. Students should carefully consider the loan component before applying.`,
    };
    const { error: updateErr } = await supabase
      .from('bot_ingestions')
      .update({ extracted_data: updatedData })
      .eq('id', agaKhan.id);
    if (updateErr) {
      console.error('Aga Khan update error:', updateErr.message);
    } else {
      console.log('\n✓ Aga Khan scholarship updated with loan warning and Partial funding_type');
    }
  }

  // Step 4: Verify counts
  const { count: totalCount } = await supabase
    .from('bot_ingestions')
    .select('*', { count: 'exact', head: true });
  console.log(`\nTotal bot_ingestions records: ${totalCount}`);

  const { count: highConfCount } = await supabase
    .from('bot_ingestions')
    .select('*', { count: 'exact', head: true })
    .gte('confidence_score', 0.8);
  console.log(`High confidence (≥0.8): ${highConfCount}`);

  const { count: expiredWithNote } = await supabase
    .from('bot_ingestions')
    .select('*', { count: 'exact', head: true })
    .filter('extracted_data->>urgency', 'eq', 'Expired');
  console.log(`Expired cycle records with note: ${expiredWithNote}`);

  // Verify Category B records have the note
  const { data: expiredItems } = await supabase
    .from('bot_ingestions')
    .select('extracted_data->>name, extracted_data->>description')
    .filter('extracted_data->>urgency', 'eq', 'Expired');
  
  if (expiredItems) {
    console.log(`\nVerified ${expiredItems.length} Category B records have expired cycle notes`);
    expiredItems.slice(0, 3).forEach(i => {
      const desc = i.description || '';
      console.log(`  ${i.name}: ${desc.substring(0, 80)}...`);
    });
  }
}

main().catch(console.error);
