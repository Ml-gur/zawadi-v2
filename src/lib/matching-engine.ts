// src/lib/matching-engine.ts

import {
  ALL_AFRICAN_NAMES,
  ANGLOPHONE_NAMES,
  FRANCOPHONE_NAMES,
  ARABOPHONE_NAMES,
  LUSOPHONE_NAMES,
  REGION_NAMES,
  OIC_MEMBER_NAMES,
  COMMONWEALTH_NAMES,
  FIELD_TO_GROUP,
  GpaSystem,
} from '../config/matching-config';
import { resolveDestinationRegion, getAfricanCountries, getCountryByISO2, getCountryByName } from './country-graph';

// ─── Classification lookup tables ─────────────────────────

const BRITISH_NORM: Record<string, number> = {
  'first':         0.95,
  'distinction':   0.95,
  'upper_second':  0.75,
  'merit':         0.75,
  'lower_second':  0.58,
  'third':         0.40,
  'pass':          0.28,
};

const MENTION_FR_NORM: Record<string, number> = {
  'tres_bien':  0.92,
  'bien':       0.76,
  'assez_bien': 0.62,
  'passable':   0.50,
};

const ARABIC_NORM: Record<string, number> = {
  'imtiyaz':       0.92,
  'jayyid_jiddan': 0.80,
  'jayyid':        0.70,
  'maqbul':        0.60,
  'rasib':         0.15,
};

// ─── Normalisation Functions ──────────────────────────────

export function normaliseGrade(
  raw: number | null,
  system: GpaSystem | string,
  classRaw: string | null = null
): number | null {
  if (system === 'british') {
    return classRaw ? BRITISH_NORM[classRaw] ?? null : null;
  }
  if (system === 'mention_fr') {
    if (raw !== null) return Math.min(1.0, raw / 20);
    return classRaw ? MENTION_FR_NORM[classRaw] ?? null : null;
  }
  if (system === 'arabic') {
    if (raw !== null && raw <= 100) return raw / 100;
    return classRaw ? ARABIC_NORM[classRaw] ?? null : null;
  }
  if (system === 'belgian_20' || system === 'luso_20') {
    if (raw === null) return null;
    return Math.min(1.0, Math.max(0, raw / 20));
  }
  if (system === 'spanish_10') {
    if (raw === null) return null;
    return Math.min(1.0, Math.max(0, raw / 10));
  }
  if (system === 'ngcgpa') {
    if (raw === null) return null;
    return Math.min(1.0, Math.max(0, raw / 5.0));
  }
  if (system === 'us4') {
    if (raw === null) return null;
    return Math.min(1.0, Math.max(0, raw / 4.0));
  }
  if (system === 'za_pct' || system === 'pct_100') {
    if (raw === null) return null;
    return Math.min(1.0, Math.max(0, raw / 100));
  }
  return null;
}

export function normaliseEnglishScore(
  testType: string,
  score: number
): number {
  switch (testType) {
    case 'IELTS':      return Math.min(1.0, score / 9.0);
    case 'TOEFL_iBT':  return Math.min(1.0, score / 120);
    case 'Cambridge':  return Math.min(1.0, score / 230);
    case 'Duolingo':   return Math.min(1.0, score / 160);
    case 'PTE':        return Math.min(1.0, score / 90);
    case 'Native':     return 1.0;
    default:           return 0.0;
  }
}

export function normaliseFrenchLevel(cefr: string | null): number {
  const LEVELS: Record<string, number> = {
    'A1': 0.15, 'A2': 0.30, 'B1': 0.50,
    'B2': 0.70, 'C1': 0.85, 'C2': 1.00,
    'Native': 1.00,
  };
  return LEVELS[cefr ?? ''] ?? 0.0;
}

export function normaliseArabicLevel(level: string | null): number {
  const LEVELS: Record<string, number> = {
    'A1': 0.15, 'A2': 0.30, 'B1': 0.50,
    'B2': 0.70, 'C1': 0.85, 'C2': 1.00,
    'Native': 1.00,
    'ILR-0': 0.05, 'ILR-1': 0.30, 'ILR-2': 0.55,
    'ILR-3': 0.75, 'ILR-4': 0.90, 'ILR-5': 1.00,
  };
  return LEVELS[level ?? ''] ?? 0.0;
}

export function normalisePortugueseLevel(level: string | null): number {
  const BANDS: Record<string, number> = {
    'Intermediário': 0.55,
    'Intermediário Superior': 0.70,
    'Avançado': 0.85,
    'Avançado Superior': 1.00,
    'Native': 1.00,
    'A1': 0.15, 'A2': 0.30, 'B1': 0.50,
    'B2': 0.70, 'C1': 0.85, 'C2': 1.00,
  };
  return BANDS[level ?? ''] ?? 0.0;
}

// ─── Phase A: Hard Eligibility Gates ─────────────────────────

interface GateResult {
  pass: boolean;
  note: string;
}

export function checkCountryEligibility(
  userCountry: string,
  eligibleCountries: string[]
): GateResult {
  const uc = userCountry.toLowerCase().trim();

  if (eligibleCountries.length === 0) {
    return { pass: true, note: 'Open to all nationalities' };
  }

  // Broad markers
  if (eligibleCountries.some(c => c.toUpperCase() === 'ALL' || c.toUpperCase() === 'GLOBAL')) {
    return { pass: true, note: 'Open to all nationalities' };
  }
  if (eligibleCountries.some(c => c.toUpperCase() === 'PAN-AFRICAN' || c.toUpperCase() === 'AFRICAN')) {
    if (ALL_AFRICAN_NAMES.has(uc)) {
      return { pass: true, note: 'Open to all African students' };
    }
  }

  // Exact case-insensitive match against scholarship's country names
  const exactMatch = eligibleCountries.some(c => c.toLowerCase().trim() === uc);
  if (exactMatch) {
    const matchedName = eligibleCountries.find(c => c.toLowerCase().trim() === uc);
    return { pass: true, note: `Open to citizens of ${matchedName || userCountry}` };
  }

  // Regional markers (scholarship countries list may contain region names)
  const REGIONAL_MARKERS: Record<string, string> = {
    'ECOWAS': 'West Africa',
    'SADC':   'Southern Africa',
    'EAC':    'East Africa',
    'IGAD':   'East Africa',
    'CENSAD': 'North Africa',
    'AMU':    'North Africa',
    'ECCAS':  'Central Africa',
    'COMESA': 'East Africa',
    'SUB-SAHARAN AFRICA': 'Sub-Saharan Africa',
    'SUB_SAHARAN': 'Sub-Saharan Africa',
  };
  for (const [marker, region] of Object.entries(REGIONAL_MARKERS)) {
    if (eligibleCountries.some(c => c.toUpperCase() === marker.toUpperCase())) {
      const regionSet = REGION_NAMES[region];
      if (regionSet && regionSet.has(uc)) {
        return { pass: true, note: `Open to ${marker} member states` };
      }
    }
  }

  // Language group markers
  if (eligibleCountries.some(c => c.toUpperCase() === 'FRANCOPHONE' || c.toUpperCase() === 'FRANCOPHONE')) {
    if (FRANCOPHONE_NAMES.has(uc)) {
      return { pass: true, note: 'Open to Francophone African countries' };
    }
  }
  if (eligibleCountries.some(c => c.toUpperCase() === 'LUSOPHONE')) {
    if (LUSOPHONE_NAMES.has(uc)) {
      return { pass: true, note: 'Open to Lusophone African countries' };
    }
  }
  if (eligibleCountries.some(c => c.toUpperCase() === 'OIC')) {
    if (OIC_MEMBER_NAMES.has(uc)) {
      return { pass: true, note: 'Open to OIC member states' };
    }
  }

  // Commonwealth membership
  if (eligibleCountries.some(c => c.toUpperCase() === 'COMMONWEALTH')) {
    if (COMMONWEALTH_NAMES.has(uc)) {
      return { pass: true, note: 'Open to Commonwealth countries' };
    }
  }

  return { pass: false, note: `Not open to students from ${userCountry}` };
}

export function checkDegreeLevel(userTargetDegree: string, eligibleLevels: string[]): GateResult {
  if (eligibleLevels.length === 0) return { pass: true, note: 'All degree levels accepted' };

  const ALIASES: Record<string, string[]> = {
    'masters': ['masters', 'master', 'msc', 'ma', 'mba', 'meng', 'mphil', 'postgrad', 'postgraduate'],
    'postgrad': ['masters', 'master', 'msc', 'ma', 'mba', 'meng', 'mphil', 'postgrad', 'postgraduate'],
    'phd':     ['phd', 'dphil', 'doctoral', 'doctorate'],
    'postdoc': ['postdoc', 'post-doctoral', 'research fellowship'],
    'bachelors': ['bachelors', 'undergraduate', 'bsc', 'ba', 'beng'],
  };

  const userKey = userTargetDegree.toLowerCase();
  const userAliases = ALIASES[userKey] ?? [userKey];
  
  const pass = eligibleLevels.some(l => {
    const lLower = l.toLowerCase();
    return userAliases.some(a => lLower.includes(a) || a.includes(lLower));
  });

  return {
    pass,
    note: pass
      ? `Awards ${userTargetDegree}`
      : `Requires ${eligibleLevels.join(' or ')} — your target is ${userTargetDegree}`,
  };
}

export function checkLanguageGate(user: any, schol: any): GateResult {
  const instrLang = schol.instruction_language || 'English';

  if (instrLang === 'French') {
    const userFrench = normaliseFrenchLevel(user.french_level || null);
    const isFrenchNative = user.french_test_type === 'Native' ||
                           (user.country && FRANCOPHONE_NAMES.has(user.country.toLowerCase().trim()));
    if (isFrenchNative) return { pass: true, note: 'Native French speaker' };
    
    const minFrench = normaliseFrenchLevel(schol.min_french_level || 'B2');
    if (userFrench >= minFrench) return { pass: true, note: `French level meets B2+ requirement` };
    return { pass: false, note: `Requires French proficiency ${schol.min_french_level || 'B2'} — your level: ${user.french_level ?? 'none'}` };
  }

  if (instrLang === 'Arabic') {
    const userArabic = normaliseArabicLevel(user.arabic_level || null);
    const isArabicNative = user.arabic_test_type === 'Native' ||
                           (user.country && ARABOPHONE_NAMES.has(user.country.toLowerCase().trim()));
    if (isArabicNative) return { pass: true, note: 'Native Arabic speaker' };
    
    const minArabic = normaliseArabicLevel(schol.min_arabic_level || 'B2');
    if (userArabic >= minArabic) return { pass: true, note: `Arabic level meets requirement` };
    return { pass: false, note: `Requires Arabic proficiency ${schol.min_arabic_level || 'B2'}` };
  }

  if (instrLang === 'Portuguese') {
    const isPortNative = user.portuguese_test_type === 'Native' ||
                         (user.country && LUSOPHONE_NAMES.has(user.country.toLowerCase().trim()));
    if (isPortNative) return { pass: true, note: 'Native Portuguese speaker' };
    
    const userPort = normalisePortugueseLevel(user.portuguese_level || null);
    const minPort = normalisePortugueseLevel(schol.min_portuguese_level || 'B2');
    if (userPort >= minPort) return { pass: true, note: `Portuguese level meets requirement` };
    return { pass: false, note: `Requires Portuguese proficiency ${schol.min_portuguese_level || 'B2'}` };
  }

  if (instrLang === 'Bilingual') {
    const engOk = checkEnglishGate(user, schol).pass;
    const frOk  = checkFrenchGate(user, schol).pass;
    if (engOk || frOk) return { pass: true, note: 'Bilingual programme — English or French sufficient' };
    return { pass: false, note: 'Bilingual programme — English or French proficiency required' };
  }

  // Default: English-instruction scholarship
  return checkEnglishGate(user, schol);
}

function checkFrenchGate(user: any, schol: any): GateResult {
  const userFrench = normaliseFrenchLevel(user.french_level || null);
  const isFrenchNative = user.french_test_type === 'Native' ||
                         (user.country && FRANCOPHONE_NAMES.has(user.country.toLowerCase().trim()));
  if (isFrenchNative) return { pass: true, note: 'Native French speaker' };
  
  const minFrench = normaliseFrenchLevel(schol.min_french_level || 'B2');
  if (userFrench >= minFrench) return { pass: true, note: `French level meets B2+ requirement` };
  return { pass: false, note: `Requires French proficiency ${schol.min_french_level || 'B2'}` };
}

function checkEnglishGate(user: any, schol: any): GateResult {
  // No-IELTS scholarship: accepts MOI, Duolingo, or doesn't require English test
  if (schol.no_ielts) {
    return { pass: true, note: 'No IELTS required — accepts MOI certificate or Duolingo test ($60)' };
  }
  if (!schol.min_english_score && !schol.min_english_test_type) {
    return { pass: true, note: 'No English test required' };
  }
  if (user.english_test_type === 'Native' || (user.country && ANGLOPHONE_NAMES.has(user.country.toLowerCase().trim()))) {
    return { pass: true, note: 'Native English speaker or Anglophone origin' };
  }
  if (!user.english_score && !user.english_test_type) {
    return { pass: false, note: 'English proficiency test required but not declared' };
  }
  const userNorm  = normaliseEnglishScore(user.english_test_type ?? 'IELTS', parseFloat(user.english_score) || 0);
  const minNorm   = normaliseEnglishScore(schol.min_english_test_type ?? 'IELTS', parseFloat(schol.min_english_score) || 6.0);
  if (userNorm >= minNorm) {
    return { pass: true, note: `English ${user.english_test_type} ${user.english_score} meets requirement` };
  }
  return { pass: false, note: `English score is below required ${schol.min_english_test_type ?? 'IELTS'} ${schol.min_english_score ?? 6.0}` };
}

// ─── Phase B: Soft Scoring Dimensions ─────────────────────────

export function scoreCountrySpecificity(userCountry: string, eligibleCountries: string[]): number {
  const uc = userCountry.toLowerCase().trim();
  if (eligibleCountries.length === 0 || eligibleCountries.some(c => c.toUpperCase() === 'ALL' || c.toUpperCase() === 'GLOBAL')) return 0.50;
  if (eligibleCountries.some(c => c.toLowerCase().trim() === uc)) return 1.00;
  if (['ECOWAS','SADC','EAC','IGAD','AMU','ECCAS'].some(m => eligibleCountries.some(c => c.toUpperCase() === m))) return 0.88;
  if (['FRANCOPHONE','LUSOPHONE','OIC','COMMONWEALTH'].some(m => eligibleCountries.some(c => c.toUpperCase() === m))) return 0.82;
  if (eligibleCountries.some(c => c.toUpperCase() === 'SUB_SAHARAN' || c.toUpperCase() === 'SUB-SAHARAN AFRICA')) return 0.75;
  if (eligibleCountries.some(c => c.toUpperCase() === 'AFRICAN' || c.toUpperCase() === 'PAN-AFRICAN')) return 0.65;
  return 0.50;
}

export function scoreAcademicField(
  userField: string,
  userTargetFields: string[],
  scholFields: string[],
  schol: any
): number {
  if (scholFields.length === 0 || scholFields.some(f => f.toLowerCase() === 'all fields' || f.toLowerCase() === 'all')) {
    return 0.60;
  }

  const allUserFields = [userField, ...userTargetFields].filter(Boolean);

  // Exact match
  const exactMatch = allUserFields.some(uf =>
    scholFields.some(sf => sf.toLowerCase() === uf.toLowerCase())
  );
  if (exactMatch) return 1.00;

  // Group match — same field group
  const userGroups = new Set(allUserFields.map(f => FIELD_TO_GROUP[f]).filter(Boolean));
  const scholGroups = new Set(scholFields.map(f => FIELD_TO_GROUP[f]).filter(Boolean));
  const groupOverlap = [...userGroups].some(g => scholGroups.has(g));
  if (groupOverlap) return 0.78;

  // Focus flag matches
  const userIsStem = [...userGroups].some(g =>
    ['Computer Science & Technology','Engineering','Medicine & Health',
     'Agriculture & Food Systems','Environment & Climate'].includes(g)
  );
  const userIsDev = [...userGroups].some(g =>
    ['Development Studies','Social Sciences','Law','Peace & Conflict'].includes(g)
  );
  const userIsHum = [...userGroups].some(g =>
    ['Arts & Humanities','Islamic & Religious Studies',
     'Indigenous Knowledge & Heritage'].includes(g)
  );

  if (userIsStem && schol.stem_focus) return 0.52;
  if (userIsDev && (schol.development_focus || schol.social_sciences_focus)) return 0.52;
  if (userIsHum && schol.humanities_focus) return 0.52;
  if (userIsDev && schol.peace_conflict_focus) return 0.60;

  return 0.10;
}

export function scoreAcademicAchievement(user: any, schol: any): number {
  const normBase = normaliseGrade(
    user.gpa !== undefined ? parseFloat(user.gpa) : null,
    user.gpa_system || 'us4',
    user.degree_class || null
  );

  const userNorm = user.doc_gpa_normalised_extracted !== undefined ? user.doc_gpa_normalised_extracted : normBase;
  const minNorm  = schol.min_gpa_normalised !== undefined ? schol.min_gpa_normalised : null;

  if (userNorm === null && minNorm === null) return 0.60;

  if (minNorm === null) {
    if (userNorm === null) return 0.60;
    if (userNorm >= 0.90) return 0.92;
    if (userNorm >= 0.75) return 0.78;
    if (userNorm >= 0.60) return 0.65;
    return 0.55;
  }

  if (userNorm === null) return 0.40;

  if (userNorm >= minNorm) {
    const surplus = userNorm - minNorm;
    return Math.min(1.00, 0.72 + surplus * 1.4);
  }

  const deficit = minNorm - userNorm;
  if (deficit <= 0.04) return 0.48;
  if (deficit <= 0.10) return 0.28;
  if (deficit <= 0.20) return 0.12;
  return 0.05;
}

export function scoreDegreeLevelFit(userTargetDegree: string, eligibleLevels: string[]): number {
  if (eligibleLevels.length === 0) return 0.65;

  const exactMatch = eligibleLevels.some(l =>
    l.toLowerCase().includes(userTargetDegree.toLowerCase()) ||
    userTargetDegree.toLowerCase().includes(l.toLowerCase())
  );
  if (exactMatch) return 1.00;

  return 0.72;
}

export function scoreLanguageStrength(user: any, schol: any): number {
  const instrLang = schol.instruction_language ?? 'English';

  if (instrLang === 'French') {
    const isFrNative = user.french_test_type === 'Native' ||
                       (user.country && FRANCOPHONE_NAMES.has(user.country.toLowerCase().trim()));
    if (isFrNative) return 1.00;
    const userFr = normaliseFrenchLevel(user.french_level || null);
    const minFr  = normaliseFrenchLevel(schol.min_french_level || 'B2');
    const surplus = userFr - minFr;
    return Math.min(1.00, 0.72 + surplus * 1.0);
  }

  if (instrLang === 'Arabic') {
    const isArNative = user.arabic_test_type === 'Native' ||
                       (user.country && ARABOPHONE_NAMES.has(user.country.toLowerCase().trim()));
    if (isArNative) return 1.00;
    const userAr = normaliseArabicLevel(user.arabic_level || null);
    const minAr  = normaliseArabicLevel(schol.min_arabic_level || 'B2');
    return Math.min(1.00, 0.72 + (userAr - minAr));
  }

  if (instrLang === 'Portuguese') {
    const isPtNative = user.portuguese_test_type === 'Native' ||
                       (user.country && LUSOPHONE_NAMES.has(user.country.toLowerCase().trim()));
    if (isPtNative) return 1.00;
    const userPt = normalisePortugueseLevel(user.portuguese_level || null);
    const minPt  = normalisePortugueseLevel(schol.min_portuguese_level || 'B2');
    return Math.min(1.00, 0.72 + (userPt - minPt));
  }

  if (instrLang === 'Bilingual') {
    const frScore = normaliseFrenchLevel(user.french_level || null);
    const enScore = user.english_score
      ? normaliseEnglishScore(user.english_test_type ?? 'IELTS', parseFloat(user.english_score) || 0)
      : 0;
    return Math.max(frScore, enScore);
  }

  // English-instruction
  if (schol.no_ielts) return 0.90;
  if (user.english_test_type === 'Native' || (user.country && ANGLOPHONE_NAMES.has(user.country.toLowerCase().trim()))) {
    return 1.00;
  }
  if (!user.english_score) return 0.60;
  const userEn = normaliseEnglishScore(user.english_test_type ?? 'IELTS', parseFloat(user.english_score) || 0);
  const minEn  = schol.min_english_score
    ? normaliseEnglishScore(schol.min_english_test_type ?? 'IELTS', parseFloat(schol.min_english_score))
    : 0.65;
  const surplus = userEn - minEn;
  return Math.min(1.00, 0.72 + surplus * 1.2);
}

export function scoreResearchExperienceBackground(
  user: any,
  schol: any
): number {
  let score = 0.50;

  // Research experience
  const hasResearch = user.doc_has_research_extracted !== undefined ? user.doc_has_research_extracted : !!user.has_research;
  if (schol.requires_research) {
    score = hasResearch ? 0.88 : 0.18;
  } else if (hasResearch) {
    score += 0.14;
  }

  // Publications
  const pubCount = user.doc_publication_count_extracted !== undefined ? user.doc_publication_count_extracted : (parseInt(user.publications) || 0);
  if (schol.requires_publications) {
    if (pubCount >= (schol.min_publication_count || 1)) score = Math.min(1.0, score + 0.10);
    else score = Math.max(0.10, score - 0.20);
  } else if (pubCount > 0) {
    score = Math.min(1.0, score + 0.06 * Math.min(pubCount, 3));
  }

  // Work experience
  const workYrs = user.doc_work_years_extracted !== undefined ? user.doc_work_years_extracted : (parseFloat(user.work_experience_years) || 0);
  if (schol.min_work_years > 0) {
    if (workYrs >= schol.min_work_years) score = Math.min(1.0, score + 0.10);
    else score = Math.max(0.10, score - 0.14);
  }
  if (schol.max_work_years && workYrs > schol.max_work_years) {
    score = Math.max(0.20, score - 0.18);
  }

  // Leadership & community
  const hasLeadership = user.doc_has_leadership_extracted !== undefined ? user.doc_has_leadership_extracted : !!user.has_leadership;
  if (schol.requires_leadership && hasLeadership) score = Math.min(1.0, score + 0.08);
  if (schol.requires_community && user.has_community_service) score = Math.min(1.0, score + 0.06);

  // Financial need & targeting
  if (schol.targets_financial_need && user.financial_need_level === 'high') {
    score = Math.min(1.0, score + 0.10);
  }
  if (schol.targets_first_generation && user.is_first_generation) {
    score = Math.min(1.0, score + 0.08);
  }
  if (schol.targets_rural_origin && user.is_rural_origin) {
    score = Math.min(1.0, score + 0.08);
  }
  if (schol.targets_ldc_countries) {
    const countryNode = getCountryByName(user.country);
    if (countryNode && countryNode.is_ldc) {
      score = Math.min(1.0, score + 0.10);
    }
  }

  return Math.min(1.0, score);
}

function resolveScholarshipISO2(schol: any): string[] {
  if (schol.iso2 && Array.isArray(schol.iso2)) {
    return schol.iso2 as string[];
  }
  if (schol.iso2 && typeof schol.iso2 === 'string') {
    return [schol.iso2];
  }
  return [];
}

function getScholarshipCountryNames(schol: any): string[] {
  const codes = resolveScholarshipISO2(schol);
  const names: string[] = [];
  for (const code of codes) {
    const node = getCountryByISO2(code);
    if (node) {
      names.push(node.name);
    }
  }
  return names;
}

function isIntraAfrican(schol: any): boolean {
  if (schol.is_intra_african) return true;
  const countryNames = getScholarshipCountryNames(schol);
  if (countryNames.length > 0) {
    const african = new Set(getAfricanCountries());
    for (const name of countryNames) {
      if (african.has(name)) return true;
    }
    return false;
  }
  if (schol.host_region) {
    const resolved = resolveDestinationRegion(schol.host_region);
    const african = new Set(getAfricanCountries());
    for (const name of resolved) {
      if (african.has(name)) return true;
    }
  }
  return false;
}

export function scoreDestinationPreference(
  user: any,
  schol: any
): number {
  const openness = user.destination_openness || 'anywhere';

  if (openness === 'anywhere') {
    return 1.0;
  }

  if (openness === 'intra_african') {
    if (isIntraAfrican(schol)) return 1.0;
    if (schol.funding_type === 'Full') return 0.5;
    return 0.2;
  }

  if (openness === 'specific') {
    const selectedRegions: string[] = user.destination_regions || [];

    const studentCountries = new Set<string>();
    for (const region of selectedRegions) {
      const resolved = resolveDestinationRegion(region);
      for (const c of resolved) {
        studentCountries.add(c);
      }
    }

    const scholCountryNames = getScholarshipCountryNames(schol);

    if (scholCountryNames.length > 0) {
      for (const name of scholCountryNames) {
        if (studentCountries.has(name)) return 1.0;
      }
      return 0.4;
    }

    const scholRegion = schol.host_region || '';
    if (selectedRegions.includes(scholRegion)) return 1.0;

    const includeAnywhere = user.include_fully_funded_anywhere !== false;
    if (includeAnywhere && schol.funding_type === 'Full') return 0.8;

    return 0.4;
  }

  return 0.6;
}

export function scoreDocumentCompleteness(
  userDocTypes: string[],
  scholRequiredDocs: string[]
): number {
  const required = scholRequiredDocs ?? [];
  if (required.length === 0) return 0.70;

  const userSet = new Set(userDocTypes.map(d => d.toLowerCase().trim()));
  let covered = 0;

  required.forEach(r => {
    const rawR = r.toLowerCase().trim();
    if (userSet.has(rawR)) {
      covered++;
    } else {
      // Fuzzy contains match
      const found = [...userSet].some(u => u.includes(rawR) || rawR.includes(u));
      if (found) covered++;
    }
  });

  const ratio = covered / required.length;

  if (ratio === 1.00) return 1.00;
  if (ratio >= 0.75) return 0.82;
  if (ratio >= 0.50) return 0.62;
  if (ratio >= 0.25) return 0.42;
  return 0.22;
}

// ─── Main Compute Match Score Wrapper ──────────────────────────────

export function computeScholarshipMatch(
  schol: any,
  user: any,
  userDocs: any[]
) {
  const matchReasons: string[] = [];
  const disqualifyingReasons: string[] = [];

  const userCountry = user.country || '';
  const scholRequiredDocs = schol.required_documents || [];
  const eligibleCountries = schol.countries || schol.country || ['ALL'];
  const eligibleDegreeLevels = schol.degree_levels || [];
  const eligibleFields = schol.fields_of_study || schol.fields || [];

  // Compute user age from date_of_birth if available
  let userAge: number | null = null;
  if (user.date_of_birth) {
    const birthDate = new Date(user.date_of_birth);
    const today = new Date();
    userAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      userAge--;
    }
  }

  // 1. GATE G1: Country Eligibility
  const g1 = checkCountryEligibility(userCountry, eligibleCountries);
  if (!g1.pass) {
    disqualifyingReasons.push(g1.note);
    return {
      score: 0,
      reasons: [],
      disqualifying_reasons: disqualifyingReasons,
      is_eligible: false,
      breakdown: { country: 0, degree: 0, field: 0, gpa: 0, languages: 0, experience: 0, destination: 0, documents: 0, no_ielts: 0 }
    };
  }

  // 2. GATE G2: Minimum Work Experience — not hard-disqualifying
  if (schol.work_experience_required) {
    const userWorkYrs = parseFloat(user.work_experience_years || '');
    if (isNaN(userWorkYrs)) {
      matchReasons.push(`Set your work experience in your profile to verify the ${schol.work_experience_required}-year minimum for this scholarship`);
    } else if (userWorkYrs < schol.work_experience_required) {
      matchReasons.push(`Requires ${schol.work_experience_required}+ years of work experience (you have ${userWorkYrs})`);
    }
  }

  // 3. Age Limit Gate
  if (userAge !== null) {
    const scholAgeLimit = user.degree_level?.toLowerCase().startsWith('phd')
      ? schol.age_limit_phd
      : schol.age_limit_masters;
    if (scholAgeLimit && userAge > scholAgeLimit) {
      disqualifyingReasons.push(`Age limit of ${scholAgeLimit} (you are ${userAge})`);
      return {
        score: 0,
        reasons: [],
        disqualifying_reasons: disqualifyingReasons,
        is_eligible: false,
        breakdown: { country: 100, degree: 0, field: 0, gpa: 0, languages: 0, experience: 0, destination: 0, documents: 0, no_ielts: 0 }
      };
    }
  } else if (schol.age_limit_masters || schol.age_limit_phd) {
    matchReasons.push(`Set your date of birth in your profile to verify age requirements for this scholarship`);
  }

  // 4. GATE G4: Degree Level — skip if user hasn't set a degree level
  const userDegreeLevel = user.degree_level || user.target_degree || '';
  if (!userDegreeLevel) {
    // Can't check degree gate; just skip it
  } else {
    const g2 = checkDegreeLevel(userDegreeLevel, eligibleDegreeLevels);
    if (!g2.pass) {
      // Don't hard-disqualify — let the scholarship show with a reduced score
      // so users can see opportunities they could grow into
      matchReasons.push(`${g2.note} — completing a ${eligibleDegreeLevels.join('/')} program unlocks more matching opportunities`);
    }
  }

  // 3. GATE G5: Language Proficiency — not hard-disqualifying
  const hasLangProfile = !!(user.english_test_type || user.english_score || user.french_level || user.arabic_level);
  if (hasLangProfile) {
    const g5 = checkLanguageGate(user, schol);
    if (!g5.pass) {
      matchReasons.push(`${g5.note} — update your language profile to improve your match score`);
    }
  }

  // Soft Scoring Dimensions
  const d1 = scoreCountrySpecificity(userCountry, eligibleCountries);
  const d2 = scoreAcademicField(user.field_of_study || '', user.target_fields || [], eligibleFields, schol);
  const d3 = scoreAcademicAchievement(user, schol);
  const d4 = scoreDegreeLevelFit(user.degree_level || user.target_degree || '', eligibleDegreeLevels);
  const d5 = scoreLanguageStrength(user, schol);
  const d6 = scoreResearchExperienceBackground(user, schol);
  const d7 = scoreDestinationPreference(user, schol);
  const d8 = scoreDocumentCompleteness(userDocs.map(d => d.type), scholRequiredDocs);

  // No-IELTS bonus dimension
  const userHasEnglishTest = !!(user.english_test_type && user.english_score);
  const noIeltsBonus = schol.no_ielts ? (userHasEnglishTest ? 0.90 : 1.00) : 0;
  const d9 = noIeltsBonus;

  // Weightings (adjusted to include no_ielts)
  const rawScore = d1*0.22 + d2*0.18 + d3*0.14 + d4*0.09 + d5*0.09 + d6*0.07 + d7*0.06 + d8*0.05 + d9*0.10;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawScore * 100)));

  // Generate Match Reasons
  if (d1 >= 0.88) matchReasons.push(`Specifically open to students from ${user.country}`);
  else if (d1 >= 0.65) matchReasons.push(`Open to African students`);

  if (d2 >= 0.90) matchReasons.push(`Exact study field match — ${user.field_of_study}`);
  else if (d2 >= 0.70) matchReasons.push(`Strong academic field alignment`);

  if (d3 >= 0.82) matchReasons.push(`GPA profile meets or exceeds academic benchmarks`);
  else if (d3 <= 0.28 && schol.min_gpa_normalised) {
    disqualifyingReasons.push(`Academic grade may be below required minimum — check eligibility rules`);
  }

  if (d4 === 1.00) matchReasons.push(`Awards matching target level: ${user.degree_level}`);

  if (d5 >= 0.95) matchReasons.push(`Strong native language competence matching instructions`);
  else if (d5 >= 0.80) matchReasons.push(`Verified language credentials align exceptionally`);

  if (d6 >= 0.80) {
    if (user.has_research) matchReasons.push(`Invaluable research experience matching this award`);
    else if (user.has_leadership) matchReasons.push(`Exceptional leadership record matches criteria`);
  }

  if (d7 === 1.00) {
    if (isIntraAfrican(schol)) matchReasons.push(`Intra-African scholarship matches your focused preference`);
    else matchReasons.push(`Destination preference aligns with this scholarship's host region`);
  } else if (d7 >= 0.75) {
    matchReasons.push(`Fully funded opportunity open to you — funding priority over destination`);
  } else if (d7 >= 0.35) {
    matchReasons.push(`Outside preferred regions but still eligible — consider broader options`);
  }

  // No-IELTS benefit reason
  if (schol.no_ielts) {
    if (!userHasEnglishTest) {
      matchReasons.push(`No IELTS required — this scholarship accepts MOI certificates or Duolingo, saving you \$300+ on English tests`);
    } else {
      matchReasons.push(`No IELTS barrier — your existing English test is more than enough`);
    }
  }

  if (d8 === 1.00) matchReasons.push(`Complete file portfolio verified in Doc Vault`);
  else if (d8 < 0.50) {
    const missing = scholRequiredDocs.filter(
      (r: string) => !userDocs.map(ud => ud.type.toLowerCase().trim()).includes(r.toLowerCase().trim())
    );
    if (missing.length > 0) {
      disqualifyingReasons.push(`Missing required documents in Vault: ${missing.slice(0, 3).join(', ')}`);
    }
  }

  return {
    score: totalScore,
    reasons: matchReasons,
    disqualifying_reasons: disqualifyingReasons,
    is_eligible: true,
    no_ielts_benefit: schol.no_ielts && !userHasEnglishTest,
    breakdown: {
      country: Math.round(d1 * 100),
      degree: Math.round(d4 * 100),
      field: Math.round(d2 * 100),
      gpa: Math.round(d3 * 100),
      languages: Math.round(d5 * 100),
      experience: Math.round(d6 * 100),
      destination: Math.round(d7 * 100),
      documents: Math.round(d8 * 100),
      no_ielts: Math.round(d9 * 100)
    }
  };
}
