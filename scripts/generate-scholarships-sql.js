const sql = [];

function sq(v) { return v === null || v === undefined ? 'NULL' : "'" + v.replace(/'/g, "''") + "'"; }

function arr(a) { return a && a.length ? 'ARRAY[' + a.map(x => sq(x)).join(',') + ']' : 'NULL'; }

function b(v) { return v ? 'true' : 'false'; }

const now = '2026-06-04T12:52:00+00:00';

const scholarships = [
  // === LIVE SCHOLARSHIPS ===
  {
    id: 'schol-8', name: 'Makerere University Mastercard Foundation Scholars Program 2026/27',
    provider: 'Mastercard Foundation / Makerere University', host: 'Makerere University, Kampala, Uganda',
    countries: ['Kenya','Nigeria','Ghana','South Africa','Rwanda','Uganda','Ethiopia','Tanzania'],
    degrees: ['Undergraduate','Masters'], fields: ['All fields'],
    funding: 'Full', amount: 'Full -- tuition + accommodation + living stipend + books + mentoring',
    deadline: '2026-06-05', published: false,
    desc: 'The Mastercard Foundation Scholars Program at Makerere University supports academically talented, economically disadvantaged students from Sub-Saharan Africa. Provides full tuition, accommodation, living stipend, books, and mentoring for 245 undergraduate and 13 Masters scholarships.',
    eligibility: 'Academically talented, economically disadvantaged students from Sub-Saharan African countries. Must meet Makerere University admission requirements.',
    docs: ['Academic Transcript','Motivation Letter','Passport / ID','Reference Letter','Proof of Financial Need'],
    apply: 'https://www.mak.ac.ug', source: 'https://www.mak.ac.ug',
    ielts: true, no_ielts: true, financial: true, first_gen: true, rural: true, ldc: true,
    leadership: true, community: true, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Urgent', region: 'East Africa', hcountry: ['uganda'], iso2: 'UG'
  },
  {
    id: 'schol-9', name: 'ICMM Young Leaders Scholarship (One Young World Summit 2026)',
    provider: 'International Council on Mining and Metals (ICMM) / One Young World',
    host: 'One Young World Summit 2026, Cape Town, South Africa',
    countries: ['Pan-African'], degrees: ['Fellowship'],
    fields: ['Sustainability','Biodiversity','Decarbonisation','Responsible Resource Production','Social Performance'],
    funding: 'Full', amount: 'Full -- summit access + travel + accommodation + meals + leadership training',
    deadline: '2026-06-07', published: false,
    desc: 'The ICMM Young Leaders Scholarship enables young leaders aged 18-35 with proven impact in sustainability-related fields to attend the One Young World Summit 2026 in Cape Town, South Africa (Nov 3-6, 2026).',
    eligibility: 'Young leaders aged 18-35 with proven impact in sustainability-related fields. Open to all African countries.',
    docs: ['Application Form','Motivation Letter','CV / Resume'],
    apply: 'https://www.oneyoungworld.com/scholarship/icmm-young-leaders-scholarship-2026',
    source: 'https://www.oneyoungworld.com/scholarship/icmm-young-leaders-scholarship-2026',
    ielts: true, no_ielts: true, age_masters: 35, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Urgent', region: 'Southern Africa', hcountry: ['south africa'], iso2: 'ZA'
  },
  {
    id: 'schol-10', name: 'MASS African Design Centre (ADC) Fellowship 2026',
    provider: 'MASS Design Group', host: 'African Design Centre, Kigali, Rwanda',
    countries: ['Pan-African'], degrees: ['Fellowship'],
    fields: ['Architecture','Design','Urban Planning','Vernacular Architecture','Community-Centered Design'],
    funding: 'Full', amount: 'Full -- paid residency + research support + mentorship + housing support',
    deadline: '2026-06-14', published: false,
    desc: 'The MASS African Design Centre Fellowship is a 12-month professional fellowship (Oct 2026 - Sep 2027) based in Kigali, Rwanda for African nationals under 35 with a background in architecture or design.',
    eligibility: 'Nationals of an African country with background in architecture/design. Must relocate to Kigali. Age under 35.',
    docs: ['Portfolio','Motivation Letter','CV / Resume','Reference Letter'],
    apply: 'https://massdesigngroup.org/MASS-relaunches-ADC', source: 'https://massdesigngroup.org/MASS-relaunches-ADC',
    ielts: true, no_ielts: true, age_masters: 35, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'East Africa', hcountry: ['rwanda'], iso2: 'RW'
  },
  {
    id: 'schol-11', name: 'Spaces of Culture 2026 -- Call for Proposals',
    provider: 'Goethe-Institut / EU / EUNIC', host: 'Projects across Sub-Saharan Africa',
    countries: ['Pan-African'], degrees: ['Grant'],
    fields: ['Cultural Relations','Arts','Creative Industries','Cultural Cooperation'],
    funding: 'Partial', amount: 'Up to EUR 50,000 per project',
    deadline: '2026-06-21', published: false,
    desc: 'Spaces of Culture is a project grant (not a traditional scholarship) supporting cultural and civil society organisations in Sub-Saharan Africa for projects fostering cultural cooperation between Africa and Europe.',
    eligibility: 'Cultural and civil society organisations in Sub-Saharan Africa.',
    docs: ['Project Proposal','Organisation Profile','Budget Plan'],
    apply: 'https://menterprise.africa/opportunities/spaces-of-culture-2026-call-for-proposals-sub-saharan-africa/',
    source: 'https://menterprise.africa/opportunities/spaces-of-culture-2026-call-for-proposals-sub-saharan-africa/',
    ielts: true, no_ielts: true, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Sub-Saharan Africa', hcountry: ['various'], iso2: 'ZZ'
  },
  {
    id: 'schol-12', name: 'WISE Prize for Education 2026-2027',
    provider: 'Qatar Foundation / World Innovation Summit for Education (WISE)',
    host: 'Global (culminating at WISE 13, Doha, Qatar, late 2027)',
    countries: ['Global'], degrees: ['Prize'],
    fields: ['Education Innovation','EdTech','Learning Solutions'],
    funding: 'Full', amount: '$1 million total prize pool + mentorship + technical support',
    deadline: '2026-06-27', published: false,
    desc: 'The WISE Prize for Education is an innovation prize/funding program recognizing organizations and individuals with innovative education solutions addressing global education challenges. Open to African applicants.',
    eligibility: 'Organizations and individuals with innovative education solutions addressing global education challenges.',
    docs: ['Application Form','Innovation Proposal'],
    apply: 'https://www.wise-qatar.org/innovation/wise-prize-for-education',
    source: 'https://www.wise-qatar.org/innovation/wise-prize-for-education',
    ielts: true, no_ielts: true, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Global', hcountry: ['qatar'], iso2: 'QA'
  },
  {
    id: 'schol-13', name: 'University of Pretoria Mastercard Foundation Scholars Program 2026/27',
    provider: 'Mastercard Foundation / University of Pretoria',
    host: 'University of Pretoria, South Africa',
    countries: ['Pan-African'], degrees: ['Undergraduate','Honours','Masters'],
    fields: ['All fields'], funding: 'Full',
    amount: 'Full -- tuition + accommodation + living stipend + books + mentoring + leadership development',
    deadline: '2026-09-30', published: false,
    desc: 'The University of Pretoria Mastercard Foundation Scholars Program provides full scholarships to academically talented, economically disadvantaged African students. Students must first apply for admission to UP before applying for the scholarship.',
    eligibility: 'Academically talented, economically disadvantaged students from African countries. Must first apply and be accepted to University of Pretoria, THEN apply for scholarship. IELTS required for non-English background applicants.',
    docs: ['University Acceptance Letter','Academic Transcript','Motivation Letter','Reference Letter','Proof of Financial Need'],
    apply: 'https://www.up.ac.za/mastercard-foundation-scholars-program/how-apply',
    source: 'https://www.up.ac.za/mastercard-foundation-scholars-program/how-apply',
    ielts: true, no_ielts: false, financial: true, first_gen: true, rural: true, ldc: true,
    leadership: true, community: true, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Southern Africa', hcountry: ['south africa'], iso2: 'ZA'
  },
  {
    id: 'schol-14', name: 'Konrad-Adenauer-Stiftung (KAS) International Scholarship 2026',
    provider: 'Konrad-Adenauer-Stiftung (KAS) -- German CDU Party-Affiliated Foundation',
    host: 'German universities', countries: ['Global'], degrees: ['Masters','PhD'],
    fields: ['All fields'], funding: 'Full',
    amount: 'EUR 934/month (Masters) or EUR 1,400/month (PhD) + health insurance + family allowance + travel + research support',
    deadline: '2026-07-15', published: false,
    desc: 'KAS offers full scholarships for international students including all African countries to pursue Masters or PhD programs at German universities. Strong academic record and social/political engagement aligned with Christian-democratic values required.',
    eligibility: 'International students from all African countries. Masters: under 30; PhD: under 35. Strong academic record and social/political engagement. German language B2 level recommended. Medicine, Veterinary Medicine, Dentistry, Law, Arts, Architecture excluded.',
    docs: ['Academic Transcript','Motivation Letter','Reference Letter','Language Certificate','Proof of Political/Social Engagement'],
    apply: 'https://www.kas.de/en/web/begabtenfoerderung/internationales',
    source: 'https://www.kas.de/en/web/begabtenfoerderung/internationales',
    ielts: true, no_ielts: false, age_masters: 30, age_phd: 35,
    leadership: true, community: true, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Europe', hcountry: ['germany'], iso2: 'DE'
  },
  {
    id: 'schol-15', name: 'HPI Research School Fellowships at UCT 2026',
    provider: 'Hasso Plattner Institute (HPI) / University of Cape Town',
    host: 'University of Cape Town, South Africa', countries: ['Pan-African'],
    degrees: ['PhD','Postdoctoral'],
    fields: ['Digital Health','Computer Science','Information Systems','Public Health'],
    funding: 'Full',
    amount: 'Full -- tuition + bursary + equipment + conference travel + research support',
    deadline: '2026-08-15', published: false,
    desc: 'The HPI Research School at UCT offers fully-funded PhD and Postdoctoral fellowships for outstanding African researchers passionate about technology and information systems. For February 2027 admission.',
    eligibility: 'Outstanding African researchers passionate about technology and information systems. IELTS required per UCT standards.',
    docs: ['Research Proposal','Academic Transcript','CV / Resume','Reference Letter','IELTS Score'],
    apply: 'https://limesurvey.uct.ac.za/index.php/258499',
    source: 'https://limesurvey.uct.ac.za/index.php/258499',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Southern Africa', hcountry: ['south africa'], iso2: 'ZA'
  },
  {
    id: 'schol-16', name: 'Hokkaido University MEXT Scholarship (University Recommendation) Oct 2027',
    provider: 'MEXT Japan / Hokkaido University', host: 'Hokkaido University, Sapporo, Japan',
    countries: ['Global'], degrees: ['Masters','PhD'],
    fields: ['Science','Engineering','Agriculture','Environmental Science'],
    funding: 'Full',
    amount: 'JPY 145,000-147,000/month + tuition waiver + airfare + arrival allowance',
    deadline: '2027-03-31', published: false,
    desc: 'MEXT Scholarship at Hokkaido University for October 2027 admission. Contact laboratories directly for supervision before applying. Language requirements set by university, not MEXT.',
    eligibility: 'Outstanding academic record in relevant fields. Masters: under 35; PhD: under 40. Contact laboratories directly for supervision before applying.',
    docs: ['Research Proposal','Academic Transcript','CV / Resume','Reference Letter','Contact with Supervisor'],
    apply: 'https://www.studyinjapan.go.jp/en/',
    source: 'https://www.studyinjapan.go.jp/en/',
    ielts: true, no_ielts: true, age_masters: 35, age_phd: 40,
    pipeline: 'discovery-scan-2026-06-04', urgency: 'Normal',
    region: 'Asia', hcountry: ['japan'], iso2: 'JP'
  },
  {
    id: 'schol-17', name: 'University of Tokyo MEXT Scholarship 2027',
    provider: 'MEXT Japan / University of Tokyo', host: 'University of Tokyo, Japan',
    countries: ['Global'], degrees: ['Masters','PhD'],
    fields: ['Science','Engineering','Technology'],
    funding: 'Full',
    amount: 'JPY 145,000/month + full tuition + round-trip airfare',
    deadline: '2026-10-31', published: false,
    desc: 'MEXT Scholarship at the University of Tokyo for October 2027 admission via University Recommendation. Language requirements set by the university.',
    eligibility: 'Outstanding academic record in relevant fields. Open to all African countries.',
    docs: ['Research Proposal','Academic Transcript','CV / Resume','Reference Letter'],
    apply: 'https://www.u-tokyo.ac.jp/en/prospective-students/mext.html',
    source: 'https://www.u-tokyo.ac.jp/en/prospective-students/mext.html',
    ielts: true, no_ielts: true, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Asia', hcountry: ['japan'], iso2: 'JP'
  },
  {
    id: 'schol-18', name: 'AYFN Autumn Japan Culture Camp 2026',
    provider: 'ASEAN Youth Friendship Network (AYFN)',
    host: 'Japan (various cities)', countries: ['Global'], degrees: ['Short Program'],
    fields: ['Cultural Exchange','Japanese Culture'], funding: 'Partial',
    amount: 'Full or Partial -- program fees + accommodation + meals + activities',
    deadline: '2026-07-15', published: false,
    desc: 'The AYFN Autumn Japan Culture Camp is a short-term cultural exchange program for youth interested in Japanese culture. Open to global participants including African countries.',
    eligibility: 'Youth interested in Japanese culture. Open to African participants.',
    docs: ['Application Form','Passport Copy','Motivation Letter'],
    apply: 'https://owafk-africa.com/ayfn-autumn-japan-culture-camp-2026',
    source: 'https://owafk-africa.com/ayfn-autumn-japan-culture-camp-2026',
    ielts: true, no_ielts: true, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Asia', hcountry: ['japan'], iso2: 'JP'
  },

  // === ARCHIVED SCHOLARSHIPS ===
  {
    id: 'schol-19', name: 'AUB Mastercard Foundation Scholars Program (On-Campus)',
    provider: 'Mastercard Foundation / American University of Beirut',
    host: 'American University of Beirut, Lebanon', countries: ['Pan-African'],
    degrees: ['Masters','PhD'], fields: ['All fields'], funding: 'Full',
    amount: 'Full -- tuition + accommodation + living stipend + travel + insurance + mentoring',
    deadline: '2026-03-12', published: false,
    desc: 'The AUB Mastercard Foundation Scholars Program provides full scholarships for African students pursuing Masters or PhD degrees on campus at the American University of Beirut. Next cycle expected ~Jan 2027.',
    eligibility: 'African citizens with academic talent and financial need.',
    docs: ['Academic Transcript','Motivation Letter','Reference Letter','Proof of Financial Need'],
    apply: 'https://www.aub.edu.lb/mcf/Pages/default.aspx',
    source: 'https://www.aub.edu.lb/mcf/Pages/default.aspx',
    ielts: true, no_ielts: false, financial: true, leadership: true, community: true,
    pipeline: 'discovery-scan-2026-06-04', urgency: 'Normal',
    region: 'Middle East', hcountry: ['lebanon'], iso2: 'LB'
  },
  {
    id: 'schol-20', name: 'AUB Mastercard Foundation Scholars Program (Online Graduate)',
    provider: 'Mastercard Foundation / American University of Beirut',
    host: 'AUB, online programs', countries: ['Pan-African'],
    degrees: ['Masters'], fields: ['Business Administration','Engineering Management','Computing in Education','Nursing Administration'],
    funding: 'Full',
    amount: 'Full -- tuition + technology support for online study',
    deadline: '2026-05-18', published: false,
    desc: 'The AUB Mastercard Foundation Online Graduate Scholarship provides full tuition and technology support for African students pursuing online Masters programs at AUB. Next cycle expected ~Apr 2027.',
    eligibility: 'African citizens with academic talent and financial need.',
    docs: ['Academic Transcript','Motivation Letter','Reference Letter','Proof of Financial Need'],
    apply: 'https://www.aub.edu.lb/mcf/Pages/default.aspx',
    source: 'https://www.aub.edu.lb/mcf/Pages/default.aspx',
    ielts: true, no_ielts: false, financial: true, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Middle East', hcountry: ['lebanon'], iso2: 'LB'
  },
  {
    id: 'schol-21', name: 'University of Glasgow African Excellence Award',
    provider: 'University of Glasgow', host: 'University of Glasgow, UK',
    countries: ['Pan-African'], degrees: ['Masters'], fields: ['All fields'],
    funding: 'Partial',
    amount: 'Full tuition fee waiver (Masters)',
    deadline: '2026-03-31', published: false,
    desc: 'The University of Glasgow African Excellence Award provides a full tuition fee waiver for Masters students from African countries. Next cycle expected ~Dec 2026.',
    eligibility: 'African countries. Must meet University of Glasgow admission requirements. IELTS required.',
    docs: ['Academic Transcript','Motivation Letter','CV / Resume','IELTS Score'],
    apply: 'https://www.gla.ac.uk/scholarships/universityofglasgowafricanexcellenceaward/',
    source: 'https://www.gla.ac.uk/scholarships/universityofglasgowafricanexcellenceaward/',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Europe', hcountry: ['united kingdom'], iso2: 'GB'
  },
  {
    id: 'schol-22', name: 'Google PhD Fellowship Program 2026',
    provider: 'Google', host: 'Any university (home institution)', countries: ['Pan-African'],
    degrees: ['PhD'], fields: ['Computer Science','Artificial Intelligence','Machine Learning','Related Fields'],
    funding: 'Full',
    amount: 'Up to USD 85,000/year + Google Research Mentor',
    deadline: '2026-04-30', published: false,
    desc: 'The Google PhD Fellowship supports outstanding PhD students in Computer Science and related fields with funding and a Google Research Mentor. Africa-specific track available. Next cycle expected ~Mar 2027.',
    eligibility: 'All African countries. Must be a current PhD student at a recognized university.',
    docs: ['Research Proposal','Academic Transcript','CV / Resume','Reference Letter','Supervisor Endorsement'],
    apply: 'https://research.google/programs-and-events/phd-fellowship/',
    source: 'https://research.google/programs-and-events/phd-fellowship/',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Global', hcountry: ['global'], iso2: 'ZZ'
  },
  {
    id: 'schol-23', name: 'Azerbaijan Government Scholarship (Heydar Aliyev Grant)',
    provider: 'Government of Azerbaijan', host: 'Azerbaijani universities',
    countries: ['Pan-African'], degrees: ['Preparatory','Bachelor','Masters','PhD','General Medicine','Medical Residency'],
    fields: ['All fields'], funding: 'Full',
    amount: 'Full -- tuition + living stipend + accommodation',
    deadline: '2026-04-15', published: false,
    desc: 'The Azerbaijan Government Scholarship provides full scholarships for international students including African countries (OIC and NAM member states) to study at Azerbaijani universities. Next cycle expected ~Feb 2027.',
    eligibility: 'All African countries included in OIC and NAM member states.',
    docs: ['Academic Transcript','Motivation Letter','Passport Copy','Medical Certificate'],
    apply: 'https://studyinazerbaijan.edu.az/financial-support',
    source: 'https://studyinazerbaijan.edu.az/financial-support',
    ielts: true, no_ielts: true, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Central Asia', hcountry: ['azerbaijan'], iso2: 'AZ'
  },
  {
    id: 'schol-24', name: 'Coimbra Group Scholarship Programme for Sub-Saharan Africa',
    provider: 'Coimbra Group Universities (Europe)',
    host: 'Coimbra Group universities across Europe', countries: ['Pan-African'],
    degrees: ['Research Visit'], fields: ['All fields'], funding: 'Full',
    amount: 'Full -- travel + living expenses during 1-3 month research visit',
    deadline: '2026-05-10', published: false,
    desc: 'The Coimbra Group Scholarship offers early-career researchers from Sub-Saharan African higher education institutions a 1-3 month research visit at a Coimbra Group university in Europe. Age limit under 45.',
    eligibility: 'Early-career researchers from Sub-Saharan African higher education institutions. Age under 45.',
    docs: ['Research Proposal','CV / Resume','Reference Letter','Letter of Invitation'],
    apply: 'https://coimbra-group.eu/activities/scholarships/',
    source: 'https://coimbra-group.eu/activities/scholarships/',
    ielts: true, no_ielts: false, age_masters: 45,
    pipeline: 'discovery-scan-2026-06-04', urgency: 'Normal',
    region: 'Europe', hcountry: ['various'], iso2: 'ZZ'
  },
  {
    id: 'schol-25', name: "L'Oreal-UNESCO For Women in Science Sub-Saharan Africa",
    provider: "Fondation L'Oreal / UNESCO",
    host: 'Research institutions in Sub-Saharan Africa', countries: ['Pan-African'],
    degrees: ['PhD','Postdoctoral'],
    fields: ['Life Sciences','Physical Sciences','Engineering','Mathematics','Computer Science'],
    funding: 'Partial',
    amount: 'EUR 10,000 (Doctoral) / EUR 15,000 (Postdoctoral) + leadership training',
    deadline: '2026-05-15', published: false,
    desc: "The L'Oreal-UNESCO For Women in Science program supports African women scientists with research grants and leadership training. Next cycle expected ~Mar 2027.",
    eligibility: 'African women scientists only. PhD or Postdoctoral in STEM fields at research institutions in Sub-Saharan Africa.',
    docs: ['Research Proposal','CV / Resume','Reference Letter','Proof of Affiliation'],
    apply: 'https://www.forwomeninscience.com/',
    source: 'https://www.forwomeninscience.com/',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Sub-Saharan Africa', hcountry: ['various'], iso2: 'ZZ'
  },
  {
    id: 'schol-26', name: 'NL Scholarship (Netherlands) 2026/27',
    provider: 'Dutch Ministry of Education, Culture and Science',
    host: 'Dutch research universities and universities of applied sciences',
    countries: ['Pan-African'], degrees: ['Bachelor','Masters'],
    fields: ['All fields'], funding: 'Partial',
    amount: 'EUR 10,000 (one-time contribution to living expenses; NOT full cost)',
    deadline: '2026-05-01', published: false,
    desc: 'The NL Scholarship is a partial scholarship for international students from non-EEA countries (all African countries eligible) to study at Dutch universities. Next cycle expected ~Nov 2026.',
    eligibility: 'Non-EEA countries (all African countries eligible). Must have been accepted to a participating Dutch university.',
    docs: ['University Acceptance Letter','Motivation Letter','Passport Copy'],
    apply: 'https://www.studyinnl.org/finances/nl-scholarship',
    source: 'https://www.studyinnl.org/finances/nl-scholarship',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Europe', hcountry: ['netherlands'], iso2: 'NL'
  },
  {
    id: 'schol-27', name: 'World Bank Group Africa Fellowship Program',
    provider: 'World Bank Group', host: 'WBG headquarters (Washington D.C.) or country offices',
    countries: ['Pan-African'], degrees: ['Fellowship'],
    fields: ['Agriculture','Energy','Economics','Development','Infrastructure','Governance'],
    funding: 'Full',
    amount: 'Full -- stipend + travel + accommodation support (6 months)',
    deadline: '2025-08-25', published: false,
    desc: 'The World Bank Group Africa Fellowship Program offers PhD students and recent graduates from Sub-Saharan Africa a 6-month fellowship (January-June) at WBG headquarters or country offices. Age limit under 32.',
    eligibility: 'PhD students or recent graduates from Sub-Saharan African countries. Age under 32.',
    docs: ['Research Proposal','CV / Resume','Reference Letter','PhD Enrollment Proof'],
    apply: 'https://www.worldbank.org/en/region/afr/brief/world-bank-group-africa-fellowship-program',
    source: 'https://www.worldbank.org/en/region/afr/brief/world-bank-group-africa-fellowship-program',
    ielts: true, no_ielts: false, age_masters: 32, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'North America', hcountry: ['united states'], iso2: 'US'
  },
  {
    id: 'schol-28', name: 'DAAD Leadership for Africa 2026/27',
    provider: 'DAAD / German Federal Foreign Office', host: 'German universities',
    countries: ['Pan-African'], degrees: ['Masters'], fields: ['All fields'],
    funding: 'Full',
    amount: 'EUR 934/month + German language course + travel + health insurance + study allowance',
    deadline: '2025-06-10', published: false,
    desc: 'DAAD Leadership for Africa offers full scholarships for Masters programs at German universities, including a preparatory German language course. Next cycle expected ~Apr 2027.',
    eligibility: 'Graduates from selected Sub-Saharan African countries (varies by year). Includes recognized refugees.',
    docs: ['Academic Transcript','Motivation Letter','Reference Letter','Proof of Leadership'],
    apply: 'https://www.daad.de/en/the-daad/intersecting-dimensions-topics/sustainable-development/funding-programmes/funding-programmes-for-students-a-z/leadership-for-africa/',
    source: 'https://www.daad.de/en/the-daad/intersecting-dimensions-topics/sustainable-development/funding-programmes/funding-programmes-for-students-a-z/leadership-for-africa/',
    ielts: true, no_ielts: false, leadership: true, community: true,
    pipeline: 'discovery-scan-2026-06-04', urgency: 'Normal',
    region: 'Europe', hcountry: ['germany'], iso2: 'DE'
  },
  {
    id: 'schol-29', name: 'Commonwealth Shared Scholarships 2026/27',
    provider: 'Commonwealth Scholarship Commission (UK)',
    host: 'Various UK universities', countries: ['Pan-African'],
    degrees: ['Masters'], fields: ['All fields'], funding: 'Full',
    amount: 'Full -- tuition + living stipend + airfare + allowances',
    deadline: '2025-12-01', published: false,
    desc: 'Commonwealth Shared Scholarships offer full funding for Masters programs at UK universities for students from Commonwealth African countries. Next cycle expected ~Nov 2026.',
    eligibility: 'Commonwealth African countries. Must have a bachelors degree and be unable to afford UK study without a scholarship.',
    docs: ['Academic Transcript','Motivation Letter','Reference Letter','Proof of Commonwealth Citizenship'],
    apply: 'https://cscuk.fcdo.gov.uk/scholarships/commonwealth-shared-scholarships/',
    source: 'https://cscuk.fcdo.gov.uk/scholarships/commonwealth-shared-scholarships/',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Europe', hcountry: ['united kingdom'], iso2: 'GB'
  },
  {
    id: 'schol-30', name: 'TESIECS Intra-Africa Academic Mobility Scholarship',
    provider: 'EU / Intra-Africa Academic Mobility Scheme / TESIECS Consortium',
    host: 'University of Johannesburg, UWC, University of Zimbabwe, University of Botswana, NUST (Namibia)',
    countries: ['Pan-African'], degrees: ['Masters','PhD'],
    fields: ['Environmental Change Solutions','Sustainability'], funding: 'Full',
    amount: 'Full -- tuition + travel + living allowance + insurance',
    deadline: '2026-06-01', published: false,
    desc: 'The TESIECS Intra-Africa Academic Mobility Scholarship provides full funding for Masters and PhD students in Environmental Change Solutions and Sustainability, with mobility across partner universities in Southern Africa.',
    eligibility: 'African students residing on the continent.',
    docs: ['Academic Transcript','Motivation Letter','Reference Letter','Research Proposal'],
    apply: 'https://tesiecs.uj.ac.za/', source: 'https://tesiecs.uj.ac.za/',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Southern Africa', hcountry: ['south africa','zimbabwe','botswana','namibia'], iso2: 'ZA'
  },
  {
    id: 'schol-31', name: 'Canon Collins Trust Postgraduate Scholarships 2026',
    provider: 'Canon Collins Trust', host: 'South African universities',
    countries: ['Pan-African'], degrees: ['Masters','PhD'],
    fields: ['Justice','Education Policy','Humanities','Climate Justice'], funding: 'Partial',
    amount: 'ZAR 20,000 - ZAR 100,000 per year (partial to substantial)',
    deadline: '2025-09-02', published: false,
    desc: 'Canon Collins Trust offers partial to substantial postgraduate scholarships for Southern African students at South African universities in justice, education policy, humanities, and climate justice fields.',
    eligibility: 'Southern African countries.',
    docs: ['Academic Transcript','Motivation Letter','Reference Letter','Research Proposal'],
    apply: 'https://canoncollins.org/scholarships/', source: 'https://canoncollins.org/scholarships/',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Southern Africa', hcountry: ['south africa'], iso2: 'ZA'
  },
  {
    id: 'schol-32', name: 'University of Sheffield Undergraduate Merit Scholarship',
    provider: 'University of Sheffield', host: 'University of Sheffield, UK',
    countries: ['Pan-African'], degrees: ['Undergraduate'], fields: ['All fields'],
    funding: 'Partial',
    amount: 'GBP 10,000 towards tuition fees (partial)',
    deadline: '2026-06-03', published: false,
    desc: 'The University of Sheffield International Undergraduate Merit Scholarship offers a GBP 10,000 tuition fee reduction for international students from all African countries. Next cycle expected ~Oct 2026.',
    eligibility: 'All African countries (international students). Must have an offer for an undergraduate program at Sheffield.',
    docs: ['University Acceptance Letter','Academic Transcript','Motivation Letter','IELTS Score'],
    apply: 'https://www.sheffield.ac.uk/international/fees-and-funding/scholarships/undergraduate/international-undergraduate-merit-scholarship',
    source: 'https://www.sheffield.ac.uk/international/fees-and-funding/scholarships/undergraduate/international-undergraduate-merit-scholarship',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Europe', hcountry: ['united kingdom'], iso2: 'GB'
  },
  {
    id: 'schol-33', name: 'Kader Asmal Fellowship Programme 2026/27',
    provider: 'Irish Aid / Embassy of Ireland in South Africa / Canon Collins Trust',
    host: 'Irish higher education institutions', countries: ['Pan-African'],
    degrees: ['Masters'], fields: ['All fields'], funding: 'Full',
    amount: 'Full -- tuition + living stipend + airfare + insurance',
    deadline: '2025-07-31', published: false,
    desc: 'The Kader Asmal Fellowship Programme provides full scholarships for South African citizens to pursue Masters programs at Irish higher education institutions. 2+ years relevant work experience required.',
    eligibility: 'South African citizens only. 2+ years relevant work experience required.',
    docs: ['Academic Transcript','Motivation Letter','Reference Letter','Proof of Work Experience'],
    apply: 'https://irishaidfellowships.ie/strands/kader-asmal-fellowship.html',
    source: 'https://irishaidfellowships.ie/strands/kader-asmal-fellowship.html',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Europe', hcountry: ['ireland'], iso2: 'IE'
  },
  {
    id: 'schol-34', name: 'INSEAD Greendale Foundation MBA Scholarship',
    provider: 'Greendale Foundation / INSEAD', host: 'INSEAD, France / Singapore',
    countries: ['Pan-African'], degrees: ['MBA'], fields: ['Business','Management'],
    funding: 'Partial',
    amount: 'EUR 35,000 towards MBA tuition (partial)',
    deadline: '2026-04-30', published: false,
    desc: 'The INSEAD Greendale Foundation MBA Scholarship provides a EUR 35,000 contribution towards MBA tuition for nationals of Kenya, Malawi, Mozambique, South Africa, Zambia, and Zimbabwe.',
    eligibility: 'Nationals of Kenya, Malawi, Mozambique, South Africa, Zambia, Zimbabwe only.',
    docs: ['MBA Application','Motivation Letter','CV / Resume','Reference Letter'],
    apply: 'https://www.insead.edu/master-programmes/mba/insead-scholarships/insead-greendale-foundation-scholarship',
    source: 'https://www.insead.edu/master-programmes/mba/insead-scholarships/insead-greendale-foundation-scholarship',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Europe', hcountry: ['france','singapore'], iso2: 'FR'
  },

  // === TBA SCHOLARSHIPS ===
  {
    id: 'schol-35', name: 'DAAD Leadership for Africa 2027/28',
    provider: 'DAAD / German Federal Foreign Office', host: 'German universities',
    countries: ['Pan-African'], degrees: ['Masters'], fields: ['All fields'],
    funding: 'Full',
    amount: 'EUR 934/month + German language course + travel + insurance',
    deadline: '2027-06-30', published: false,
    desc: 'DAAD Leadership for Africa 2027/28 cycle. Expected announcement ~Mar-Apr 2027. Full Masters scholarships at German universities with preparatory German language course.',
    eligibility: 'Selected Sub-Saharan African countries (announced each cycle).',
    docs: ['Academic Transcript','Motivation Letter','Reference Letter','Proof of Leadership'],
    apply: 'https://www.daad.de/en/the-daad/intersecting-dimensions-topics/sustainable-development/funding-programmes/funding-programmes-for-students-a-z/leadership-for-africa/',
    source: 'https://www.daad.de/en/the-daad/intersecting-dimensions-topics/sustainable-development/funding-programmes/funding-programmes-for-students-a-z/leadership-for-africa/',
    ielts: true, no_ielts: false, leadership: true, community: true,
    pipeline: 'discovery-scan-2026-06-04', urgency: 'Normal',
    region: 'Europe', hcountry: ['germany'], iso2: 'DE'
  },
  {
    id: 'schol-36', name: 'OFID / OPEC Fund Scholarship',
    provider: 'OPEC Fund for International Development (OFID)',
    host: 'Various international universities', countries: ['Pan-African'],
    degrees: ['Masters'], fields: ['Development Studies','Related Fields'],
    funding: 'Full',
    amount: 'Historically up to USD 50,000 for Masters',
    deadline: '2027-06-30', published: false,
    desc: 'The OPEC Fund Scholarship program is currently restructuring and NOT accepting applications. Historically supported Masters degrees in development-related fields.',
    eligibility: 'Developing countries including African nations.',
    docs: ['Academic Transcript','Motivation Letter','Reference Letter','University Acceptance'],
    apply: 'https://opecfund.org/what-we-offer/special-initiatives/scholarship',
    source: 'https://opecfund.org/what-we-offer/special-initiatives/scholarship',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Global', hcountry: ['various'], iso2: 'ZZ'
  },
  {
    id: 'schol-37', name: 'Canon Collins Trust 2027 Postgraduate Scholarships',
    provider: 'Canon Collins Trust', host: 'South African universities',
    countries: ['Pan-African'], degrees: ['Masters','PhD'],
    fields: ['Justice','Education Policy','Humanities','Climate Justice'], funding: 'Partial',
    amount: 'ZAR 20,000 - ZAR 100,000 per year',
    deadline: '2027-08-31', published: false,
    desc: 'Canon Collins Trust 2027 cycle postgraduate scholarships for Southern African students at South African universities.',
    eligibility: 'Southern African countries.',
    docs: ['Academic Transcript','Motivation Letter','Reference Letter','Research Proposal'],
    apply: 'https://canoncollins.org/scholarships/', source: 'https://canoncollins.org/scholarships/',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Southern Africa', hcountry: ['south africa'], iso2: 'ZA'
  },
  {
    id: 'schol-38', name: 'Africa London Nagasaki (ALN) Fund 2027',
    provider: 'ALN Fund',
    host: 'London School of Hygiene & Tropical Medicine (LSHTM), UK OR Institute of Tropical Medicine, Nagasaki, Japan',
    countries: ['Pan-African'], degrees: ['Masters'], fields: ['Infectious Disease Control','Tropical Medicine','Public Health'],
    funding: 'Full',
    amount: 'Full -- tuition + living stipend + travel',
    deadline: '2027-06-30', published: false,
    desc: 'The ALN Fund provides full MSc scholarships for African scientists to study infectious disease control and tropical medicine at LSHTM (UK) or Nagasaki University (Japan).',
    eligibility: 'African scientists.',
    docs: ['Research Proposal','Academic Transcript','Motivation Letter','Reference Letter'],
    apply: 'https://www.lshtm.ac.uk/study/fees-and-funding/funding-scholarships',
    source: 'https://www.lshtm.ac.uk/study/fees-and-funding/funding-scholarships',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Europe', hcountry: ['united kingdom','japan'], iso2: 'GB'
  },

  // === QECS - STATUS CHANGE ===
  {
    id: 'schol-39', name: 'Queen Elizabeth Commonwealth Scholarships (QECS) 2026/27',
    provider: 'Association of Commonwealth Universities (ACU)',
    host: 'Commonwealth universities', countries: ['Pan-African'],
    degrees: ['Masters'], fields: ['All fields'], funding: 'Full',
    amount: 'Full -- tuition + living stipend + airfare + allowances',
    deadline: '2026-06-03', published: false,
    desc: 'QECS offers fully-funded Masters degrees at Commonwealth universities for students from low and middle-income Commonwealth countries. Deadline passed June 3, 2026. Next cycle expected ~Apr 2027.',
    eligibility: 'Low and middle-income Commonwealth countries including many African nations.',
    docs: ['Academic Transcript','Motivation Letter','Reference Letter','University Offer'],
    apply: 'https://www.acu.ac.uk/funding-opportunities/for-students/scholarships/queen-elizabeth-commonwealth-scholarships/',
    source: 'https://www.acu.ac.uk/funding-opportunities/for-students/scholarships/queen-elizabeth-commonwealth-scholarships/',
    ielts: true, no_ielts: false, pipeline: 'discovery-scan-2026-06-04',
    urgency: 'Normal', region: 'Global', hcountry: ['various'], iso2: 'ZZ'
  }
];

function pad(v) {
  const str = String(v);
  return str.padEnd(2);
}

for (const sch of scholarships) {
  sql.push('-- ' + sch.id + ': ' + sch.name);
  sql.push('INSERT INTO public.scholarships (');
  sql.push('  id, name, provider, host_institution, countries, degree_levels, fields_of_study,');
  sql.push('  funding_type, amount, deadline, description, eligibility, required_documents,');
  sql.push('  apply_url, source_url, published, verified, view_count, instruction_language, no_ielts,');
  sql.push('  targets_financial_need, targets_first_generation, targets_rural_origin,');
  sql.push('  targets_ldc_countries, requires_leadership, requires_community, pipeline_source,');
  sql.push('  urgency, host_region, host_country, iso2, created_at, updated_at)');
  sql.push('VALUES (');
  sql.push('  ' + sq(sch.id) + ',');
  sql.push('  ' + sq(sch.name) + ',');
  sql.push('  ' + sq(sch.provider) + ',');
  sql.push('  ' + sq(sch.host) + ',');
  sql.push('  ' + arr(sch.countries) + ',');
  sql.push('  ' + arr(sch.degrees) + ',');
  sql.push('  ' + arr(sch.fields) + ',');
  sql.push('  ' + sq(sch.funding) + ',');
  sql.push('  ' + sq(sch.amount) + ',');
  sql.push('  ' + sq(sch.deadline) + ',');
  sql.push('  ' + sq(sch.desc) + ',');
  sql.push('  ' + sq(sch.eligibility) + ',');
  sql.push('  ' + arr(sch.docs) + ',');
  sql.push('  ' + sq(sch.apply) + ',');
  sql.push('  ' + sq(sch.source) + ',');
  sql.push('  ' + b(sch.published) + ',');
  sql.push('  false, -- verified');
  sql.push('  0, -- view_count');
  sql.push("  'English',");
  sql.push('  ' + b(sch.no_ielts) + ',');
  sql.push('  ' + b(sch.financial || false) + ',');
  sql.push('  ' + b(sch.first_gen || false) + ',');
  sql.push('  ' + b(sch.rural || false) + ',');
  sql.push('  ' + b(sch.ldc || false) + ',');
  sql.push('  ' + b(sch.leadership || false) + ',');
  sql.push('  ' + b(sch.community || false) + ',');
  sql.push('  ' + sq(sch.pipeline) + ',');
  sql.push('  ' + sq(sch.urgency) + ',');
  sql.push('  ' + sq(sch.region) + ',');
  sql.push('  ' + arr(sch.hcountry) + ',');
  sql.push('  ' + sq(sch.iso2) + ',');
  sql.push("  '" + now + "',");
  sql.push("  '" + now + "'");
  sql.push(');');
  sql.push('');
}

console.log(sql.join('\n'));
