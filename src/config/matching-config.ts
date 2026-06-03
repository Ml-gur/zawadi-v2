// src/config/matching-config.ts

export interface AfricanCountry {
  code: string;
  name: string;
  region: string;
  lang: 'english' | 'french' | 'arabic' | 'portuguese' | 'spanish' | 'bilingual';
  gpa_system: string;
}

export const AFRICAN_COUNTRIES: AfricanCountry[] = [
  // ── ANGLOPHONE (English primary) ─────────────────────────────
  { code: 'NG', name: 'Nigeria',           region: 'West Africa',    lang: 'english', gpa_system: 'ngcgpa'  },
  { code: 'GH', name: 'Ghana',             region: 'West Africa',    lang: 'english', gpa_system: 'british' },
  { code: 'SL', name: 'Sierra Leone',      region: 'West Africa',    lang: 'english', gpa_system: 'british' },
  { code: 'LR', name: 'Liberia',           region: 'West Africa',    lang: 'english', gpa_system: 'us4'     },
  { code: 'GM', name: 'Gambia',            region: 'West Africa',    lang: 'english', gpa_system: 'british' },
  { code: 'KE', name: 'Kenya',             region: 'East Africa',    lang: 'english', gpa_system: 'british' },
  { code: 'TZ', name: 'Tanzania',          region: 'East Africa',    lang: 'english', gpa_system: 'british' },
  { code: 'UG', name: 'Uganda',            region: 'East Africa',    lang: 'english', gpa_system: 'british' },
  { code: 'RW', name: 'Rwanda',            region: 'East Africa',    lang: 'english', gpa_system: 'british' },
  { code: 'ZM', name: 'Zambia',            region: 'Southern Africa',lang: 'english', gpa_system: 'british' },
  { code: 'MW', name: 'Malawi',            region: 'Southern Africa',lang: 'english', gpa_system: 'british' },
  { code: 'ZW', name: 'Zimbabwe',          region: 'Southern Africa',lang: 'english', gpa_system: 'british' },
  { code: 'BW', name: 'Botswana',          region: 'Southern Africa',lang: 'english', gpa_system: 'british' },
  { code: 'NA', name: 'Namibia',           region: 'Southern Africa',lang: 'english', gpa_system: 'british' },
  { code: 'SZ', name: 'Eswatini',          region: 'Southern Africa',lang: 'english', gpa_system: 'british' },
  { code: 'LS', name: 'Lesotho',           region: 'Southern Africa',lang: 'english', gpa_system: 'british' },
  { code: 'ZA', name: 'South Africa',      region: 'Southern Africa',lang: 'english', gpa_system: 'za_pct' },
  { code: 'SS', name: 'South Sudan',       region: 'East Africa',    lang: 'english', gpa_system: 'us4'     },
  { code: 'SD', name: 'Sudan',             region: 'North Africa',   lang: 'arabic',  gpa_system: 'arabic'  },
  { code: 'ET', name: 'Ethiopia',          region: 'East Africa',    lang: 'english', gpa_system: 'us4'     },
  { code: 'ER', name: 'Eritrea',           region: 'East Africa',    lang: 'english', gpa_system: 'british' },

  // ── FRANCOPHONE (French primary) ─────────────────────────────
  { code: 'SN', name: 'Senegal',           region: 'West Africa',    lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'CI', name: "Côte d'Ivoire",    region: 'West Africa',    lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'ML', name: 'Mali',              region: 'West Africa',    lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'BF', name: 'Burkina Faso',      region: 'West Africa',    lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'GN', name: 'Guinea',            region: 'West Africa',    lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'NE', name: 'Niger',             region: 'West Africa',    lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'TG', name: 'Togo',              region: 'West Africa',    lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'BJ', name: 'Benin',             region: 'West Africa',    lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'CM', name: 'Cameroon',          region: 'Central Africa', lang: 'bilingual',gpa_system: 'mention_fr'},
  { code: 'CG', name: 'Republic of Congo', region: 'Central Africa', lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'CD', name: 'DR Congo',          region: 'Central Africa', lang: 'french',  gpa_system: 'belgian_20'},
  { code: 'CF', name: 'Central African Republic', region: 'Central Africa', lang: 'french', gpa_system: 'mention_fr' },
  { code: 'TD', name: 'Chad',              region: 'Central Africa', lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'GA', name: 'Gabon',             region: 'Central Africa', lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'GQ', name: 'Equatorial Guinea', region: 'Central Africa', lang: 'spanish', gpa_system: 'spanish_10'},
  { code: 'MG', name: 'Madagascar',        region: 'East Africa',    lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'KM', name: 'Comoros',           region: 'East Africa',    lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'DJ', name: 'Djibouti',          region: 'East Africa',    lang: 'french',  gpa_system: 'mention_fr' },
  { code: 'MR', name: 'Mauritania',        region: 'North Africa',   lang: 'arabic',  gpa_system: 'arabic'  },
  { code: 'SC', name: 'Seychelles',        region: 'East Africa',    lang: 'french',  gpa_system: 'british' },
  { code: 'MU', name: 'Mauritius',         region: 'East Africa',    lang: 'french',  gpa_system: 'british' },

  // ── ARABOPHONE (Arabic primary) ───────────────────────────────
  { code: 'EG', name: 'Egypt',             region: 'North Africa',   lang: 'arabic',  gpa_system: 'arabic'  },
  { code: 'MA', name: 'Morocco',           region: 'North Africa',   lang: 'arabic',  gpa_system: 'arabic'  },
  { code: 'DZ', name: 'Algeria',           region: 'North Africa',   lang: 'arabic',  gpa_system: 'arabic'  },
  { code: 'TN', name: 'Tunisia',           region: 'North Africa',   lang: 'arabic',  gpa_system: 'arabic'  },
  { code: 'LY', name: 'Libya',             region: 'North Africa',   lang: 'arabic',  gpa_system: 'arabic'  },
  { code: 'SO', name: 'Somalia',           region: 'East Africa',    lang: 'arabic',  gpa_system: 'arabic'  },

  // ── LUSOPHONE (Portuguese primary) ───────────────────────────
  { code: 'AO', name: 'Angola',            region: 'Southern Africa',lang: 'portuguese', gpa_system: 'luso_20' },
  { code: 'MZ', name: 'Mozambique',        region: 'Southern Africa',lang: 'portuguese', gpa_system: 'luso_20' },
  { code: 'CV', name: 'Cape Verde',        region: 'West Africa',    lang: 'portuguese', gpa_system: 'luso_20' },
  { code: 'GW', name: 'Guinea-Bissau',     region: 'West Africa',    lang: 'portuguese', gpa_system: 'luso_20' },
  { code: 'ST', name: 'São Tomé & Príncipe', region: 'Central Africa', lang: 'portuguese', gpa_system: 'luso_20' },

  // ── BILINGUAL / MULTILINGUAL ──────────────────────────────────
  { code: 'BI', name: 'Burundi',           region: 'East Africa',    lang: 'french',  gpa_system: 'mention_fr' },
];

export const ALL_AFRICAN_NAMES = new Set(AFRICAN_COUNTRIES.map(c => c.name.toLowerCase()));

export const ANGLOPHONE_NAMES = new Set(
  AFRICAN_COUNTRIES.filter(c => c.lang === 'english').map(c => c.name.toLowerCase())
);
export const FRANCOPHONE_NAMES = new Set(
  AFRICAN_COUNTRIES.filter(c => c.lang === 'french' || c.lang === 'bilingual').map(c => c.name.toLowerCase())
);
export const ARABOPHONE_NAMES = new Set(
  AFRICAN_COUNTRIES.filter(c => c.lang === 'arabic').map(c => c.name.toLowerCase())
);
export const LUSOPHONE_NAMES = new Set(
  AFRICAN_COUNTRIES.filter(c => c.lang === 'portuguese').map(c => c.name.toLowerCase())
);

export const REGION_NAMES: Record<string, Set<string>> = {};
for (const c of AFRICAN_COUNTRIES) {
  if (!REGION_NAMES[c.region]) REGION_NAMES[c.region] = new Set();
  REGION_NAMES[c.region].add(c.name.toLowerCase());
}

REGION_NAMES['Sub-Saharan Africa'] = new Set(
  AFRICAN_COUNTRIES.filter(c => c.region !== 'North Africa').map(c => c.name.toLowerCase())
);

const OIC_MEMBER_NAMES_LIST = [
  'Senegal','Mali','Burkina Faso','Guinea','Niger','Chad','Cameroon',
  'Gabon','Gambia','Guinea-Bissau',"Côte d'Ivoire",'Nigeria',
  'Egypt','Morocco','Algeria','Tunisia','Libya','Sudan','Somalia',
  'Mauritania','Djibouti','Comoros',
  'Mozambique','Uganda','Tanzania','Burundi',
];

export const OIC_MEMBER_NAMES = new Set(OIC_MEMBER_NAMES_LIST.map(n => n.toLowerCase()));

const COMMONWEALTH_NAMES_LIST = [
  'Nigeria','Ghana','Sierra Leone','Gambia','Kenya','Tanzania','Uganda',
  'Rwanda','Zambia','Malawi','Zimbabwe','Botswana','Namibia','Eswatini',
  'Lesotho','South Africa','Mauritius','Seychelles','Cameroon',
];

export const COMMONWEALTH_NAMES = new Set(COMMONWEALTH_NAMES_LIST.map(n => n.toLowerCase()));

export type GpaSystem =
  | 'us4'        // 0.0–4.0
  | 'ngcgpa'     // 0.0–5.0 Nigeria
  | 'british'    // First/2:1/2:2/Third
  | 'za_pct'     // 0-100% South Africa
  | 'mention_fr' // French Mention
  | 'belgian_20' // Congolese 0-20
  | 'luso_20'    // Portuguese 0-20
  | 'arabic'     // Arabic honors
  | 'spanish_10' // Spanish 0-10
  | 'pct_100';   // Generic %

export interface GpaSystemConfig {
  label: string;
  inputType: 'numeric' | 'classification' | 'mention' | 'arabic_grade';
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: { label: string; value: string; normalised: number }[];
  classBands?: { label: string; min: number; max: number; normalised: number }[];
  also_accepts_numeric?: boolean;
  numeric_max?: number;
}

export const GPA_SYSTEM_CONFIGS: Record<string, GpaSystemConfig> = {
  us4: {
    label: 'GPA (0.0 – 4.0)',
    inputType: 'numeric',
    min: 0, max: 4.0, step: 0.01,
    placeholder: 'e.g. 3.75',
  },
  ngcgpa: {
    label: 'CGPA (0.0 – 5.0)',
    inputType: 'numeric',
    min: 0, max: 5.0, step: 0.01,
    placeholder: 'e.g. 4.20',
    classBands: [
      { label: 'First Class',   min: 4.50, max: 5.00, normalised: 0.93 },
      { label: 'Second Upper',  min: 3.50, max: 4.49, normalised: 0.77 },
      { label: 'Second Lower',  min: 2.40, max: 3.49, normalised: 0.59 },
      { label: 'Third Class',   min: 1.50, max: 2.39, normalised: 0.38 },
      { label: 'Pass',          min: 1.00, max: 1.49, normalised: 0.25 },
    ],
  },
  british: {
    label: 'Degree classification',
    inputType: 'classification',
    options: [
      { label: 'First Class Honours (1st)',   value: 'first',        normalised: 0.95 },
      { label: 'Second Upper (2:1)',           value: 'upper_second', normalised: 0.75 },
      { label: 'Second Lower (2:2)',           value: 'lower_second', normalised: 0.58 },
      { label: 'Third Class',                  value: 'third',        normalised: 0.40 },
      { label: 'Pass / Ordinary',              value: 'pass',         normalised: 0.25 },
      { label: 'Distinction',                  value: 'distinction',  normalised: 0.95 },
      { label: 'Merit',                        value: 'merit',        normalised: 0.75 },
    ]
  },
  za_pct: {
    label: 'Percentage (%)',
    inputType: 'numeric',
    min: 0, max: 100, step: 1,
    placeholder: 'e.g. 72',
    classBands: [
      { label: 'Distinction',  min: 75, max: 100, normalised: 0.87 },
      { label: 'Merit',        min: 65, max: 74,  normalised: 0.70 },
      { label: 'Pass',         min: 50, max: 64,  normalised: 0.57 },
    ],
  },
  mention_fr: {
    label: 'Mention',
    inputType: 'mention',
    options: [
      { label: 'Très Bien (TB)',    value: 'tres_bien',   normalised: 0.92 },
      { label: 'Bien (B)',          value: 'bien',         normalised: 0.76 },
      { label: 'Assez Bien (AB)',   value: 'assez_bien',  normalised: 0.62 },
      { label: 'Passable (P)',      value: 'passable',    normalised: 0.50 },
    ],
    also_accepts_numeric: true,
    numeric_max: 20,
  },
  belgian_20: {
    label: 'Note (0–20)',
    inputType: 'numeric',
    min: 0, max: 20, step: 0.1,
    placeholder: 'e.g. 15',
    classBands: [
      { label: 'Grande Distinction', min: 16, max: 20, normalised: 0.90 },
      { label: 'Distinction',         min: 14, max: 15.9, normalised: 0.74 },
      { label: 'Satisfaction',        min: 12, max: 13.9, normalised: 0.62 },
      { label: 'Réussite',            min: 10, max: 11.9, normalised: 0.52 },
    ],
  },
  luso_20: {
    label: 'Nota (0–20)',
    inputType: 'numeric',
    min: 0, max: 20, step: 0.1,
    placeholder: 'e.g. 16',
    classBands: [
      { label: 'Muito Bom',    min: 17, max: 20,  normalised: 0.92 },
      { label: 'Bom',          min: 14, max: 16.9, normalised: 0.76 },
      { label: 'Suficiente',   min: 10, max: 13.9, normalised: 0.57 },
      { label: 'Reprovado',    min: 0,  max: 9.9,  normalised: 0.25 },
    ],
  },
  arabic: {
    label: 'التقدير (Grade)',
    inputType: 'arabic_grade',
    options: [
      { label: 'امتياز — Imtiyaz (Excellent)',          value: 'imtiyaz',      normalised: 0.92 },
      { label: 'جيد جداً — Jayyid Jiddan (Very Good)',  value: 'jayyid_jiddan',normalised: 0.76 },
      { label: 'جيد — Jayyid (Good)',                   value: 'jayyid',       normalised: 0.62 },
      { label: 'مقبول — Maqbul (Pass)',                 value: 'maqbul',       normalised: 0.50 },
      { label: 'راسب — Rasib (Fail)',                   value: 'rasib',        normalised: 0.10 },
    ],
    also_accepts_numeric: true,
    numeric_max: 100,
  },
  spanish_10: {
    label: 'Nota (0–10)',
    inputType: 'numeric',
    min: 0, max: 10, step: 0.1,
    placeholder: 'e.g. 7.5',
    classBands: [
      { label: 'Sobresaliente', min: 9,  max: 10, normalised: 0.95 },
      { label: 'Notable',       min: 7,  max: 8.9, normalised: 0.79 },
      { label: 'Bien',          min: 6,  max: 6.9, normalised: 0.65 },
      { label: 'Aprobado',      min: 5,  max: 5.9, normalised: 0.54 },
    ],
  },
  pct_100: {
    label: 'Percentage (%)',
    inputType: 'numeric',
    min: 0, max: 100, step: 1,
    placeholder: 'e.g. 75',
  },
};

export interface FieldGroup {
  group: string;
  fields: string[];
}

export const FIELD_GROUPS: FieldGroup[] = [
  {
    group: 'Computer Science & Technology',
    fields: ['Computer Science','Software Engineering','AI / Machine Learning',
             'Data Science','Cybersecurity','Information Technology','Telecommunications'],
  },
  {
    group: 'Engineering',
    fields: ['Mechanical Engineering','Civil Engineering','Electrical Engineering',
             'Chemical Engineering','Biomedical Engineering','Agricultural Engineering',
             'Environmental Engineering','Mining Engineering','Petroleum Engineering'],
  },
  {
    group: 'Medicine & Health',
    fields: ['Medicine','Public Health','Global Health','Nursing','Pharmacy',
             'Epidemiology','Nutrition','Community Health','One Health'],
  },
  {
    group: 'Agriculture & Food Systems',
    fields: ['Agriculture','Agronomy','Food Science & Technology','Animal Science',
             'Fisheries & Aquaculture','Forestry','Soil Science',
             'Dryland & Arid Agriculture','Pastoralism & Rangeland Management'],
  },
  {
    group: 'Environment & Climate',
    fields: ['Environmental Science','Climate Change & Policy','Conservation',
             'Natural Resource Management','Water & Sanitation','Renewable Energy'],
  },
  {
    group: 'Business & Economics',
    fields: ['Business Administration','Economics','Finance','Accounting',
             'Management','Entrepreneurship','Trade & Commerce','Microfinance'],
  },
  {
    group: 'Law',
    fields: ['Law','International Law','Human Rights Law','Constitutional Law',
             'Commercial Law','Islamic Law / Sharia'],
  },
  {
    group: 'Social Sciences',
    fields: ['Sociology','Political Science','International Relations',
             'Psychology','Anthropology','Gender Studies','Migration Studies',
             'Conflict & Security Studies'],
  },
  {
    group: 'Development Studies',
    fields: ['Development Studies','International Development',
             'Public Policy & Administration','Governance','Public Administration',
             'Humanitarian Affairs','Urban & Regional Planning','Rural Development',
             'Economic Development'],
  },
  {
    group: 'Education',
    fields: ['Education','Educational Leadership','Curriculum Development',
             'STEM Education','Early Childhood Education','Inclusive Education'],
  },
  {
    group: 'Arts & Humanities',
    fields: ['History','Literature','Philosophy','Languages & Linguistics',
             'African Studies','Cultural Studies','Media & Communications',
             'Journalism','Fine Arts','Music'],
  },
  {
    group: 'Islamic & Religious Studies',
    fields: ['Islamic Studies','Arabic Language & Literature',
             'Quranic Studies','Religious Studies'],
  },
  {
    group: 'Peace & Conflict',
    fields: ['Peace Studies','Conflict Resolution','Security Studies',
             'Post-Conflict Reconstruction','Disarmament'],
  },
  {
    group: 'Indigenous Knowledge & Heritage',
    fields: ['Indigenous Knowledge Systems','Cultural Heritage',
             'African Philosophy','Traditional Medicine'],
  },
];

export const FIELD_TO_GROUP: Record<string, string> = {};
for (const { group, fields } of FIELD_GROUPS) {
  for (const f of fields) {
    FIELD_TO_GROUP[f] = group;
  }
}

export const DESTINATION_REGIONS: Record<string, string[]> = {
  'Anglophone destinations': [
    'United Kingdom and Ireland',
    'United States and Canada',
    'Australia and New Zealand',
    'Commonwealth Africa',
    'Commonwealth Global',
  ],
  'Francophone destinations': [
    'France and Belgium',
    'Francophone destinations',
  ],
  'Lusophone destinations': [
    'Portugal and Brazil',
    'Lusophone destinations',
  ],
  'European destinations': [
    'Germany, Austria, Switzerland (German-speaking)',
    'Nordic countries: Sweden, Norway, Denmark, Finland',
    'Netherlands and Belgium',
    'Rest of Europe',
  ],
  'Asian destinations': [
    'China and East Asia',
    'Japan and South Korea',
    'Southeast Asia',
    'Middle East and Gulf states',
  ],
  'Intra-African': [
    'West Africa hubs',
    'East Africa hubs',
    'Southern Africa hubs',
    'North Africa hubs',
    'Central Africa hubs',
  ],
};

export const ALL_DESTINATION_REGIONS = Object.values(DESTINATION_REGIONS).flat();

export const DOCUMENT_TYPES = [
  { value: 'CV',              label: 'CV / Resume',              required_by: 'most scholarships' },
  { value: 'Transcript',      label: 'Academic Transcript',      required_by: 'most scholarships' },
  { value: 'Certificate',     label: 'Degree Certificate',       required_by: 'many scholarships' },
  { value: 'SOP',             label: 'Statement of Purpose',     required_by: 'research scholarships' },
  { value: 'Motivation Letter',label: 'Motivation Letter',       required_by: 'most scholarships' },
  { value: 'References',      label: 'Reference Letters',        required_by: 'most scholarships' },
  { value: 'Research Proposal',label: 'Research Proposal',       required_by: 'PhD scholarships' },
  { value: 'Passport',        label: 'Passport (bio page)',      required_by: 'all scholarships' },
  { value: 'National ID',     label: 'National ID Card',         required_by: 'many African scholarships' },
  { value: 'Birth Certificate',label: 'Birth Certificate',       required_by: 'some scholarships' },
  { value: 'Financial Evidence',label: 'Financial Evidence',     required_by: 'need-based scholarships' },
  { value: 'Community Letter',      label: 'Community / Chief Letter',        required_by: 'community-based scholarships' },
  { value: 'Proof of Origin',       label: 'Proof of Rural / Regional Origin',required_by: 'targeted scholarships' },
  { value: 'Institutional Endorsement', label: 'Institutional Endorsement Letter', required_by: 'AU and ECOWAS scholarships' },
  { value: 'Work Experience Letter',label: 'Work Experience Letter',          required_by: 'professional scholarships' },
  { value: 'Admission Letter',      label: 'Admission Letter',                required_by: 'some awards' },
  { value: 'Essay',                 label: 'Essay / Written Sample',          required_by: 'humanities scholarships' },
  { value: 'Other',                 label: 'Other Document',                  required_by: '' },
];
