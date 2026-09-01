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
  if (raw !== null && isNaN(raw)) return null;
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
    return 0.65;
  }

  const allUserFields = [userField, ...userTargetFields].filter(Boolean);

  // Exact match
  const exactMatch = allUserFields.some(uf =>
    scholFields.some(sf => sf.toLowerCase() === uf.toLowerCase())
  );
  if (exactMatch) return 1.00;

  // Substring match — e.g. user "Computer Science" matches scholarship "Computer Science and Engineering"
  const substringMatch = allUserFields.some(uf =>
    scholFields.some(sf => {
      const ufl = uf.toLowerCase();
      const sfl = sf.toLowerCase();
      return ufl.includes(sfl) || sfl.includes(ufl);
    })
  );
  if (substringMatch) return 0.92;

  // Group match — same field group
  const userGroups = new Set(allUserFields.map(f => FIELD_TO_GROUP[f]).filter(Boolean));
  const scholGroups = new Set(scholFields.map(f => FIELD_TO_GROUP[f]).filter(Boolean));
  const groupOverlap = [...userGroups].some(g => scholGroups.has(g));
  if (groupOverlap) return 0.80;

  // Adjacent group match — nearby groups in the same broad category
  const ADJACENT_GROUPS: Record<string, string[]> = {
    'Computer Science & Technology': ['Engineering', 'Mathematics & Statistics'],
    'Engineering': ['Computer Science & Technology', 'Mathematics & Statistics', 'Architecture & Built Environment'],
    'Mathematics & Statistics': ['Computer Science & Technology', 'Engineering', 'Physics'],
    'Medicine & Health': ['Nursing & Midwifery', 'Pharmacy', 'Public Health'],
    'Public Health': ['Medicine & Health', 'Development Studies', 'Environmental Science'],
    'Development Studies': ['Social Sciences', 'Economics', 'Public Health'],
    'Social Sciences': ['Development Studies', 'Law', 'Economics'],
    'Law': ['Social Sciences', 'Development Studies', 'Peace & Conflict'],
    'Economics': ['Social Sciences', 'Development Studies', 'Mathematics & Statistics'],
    'Agriculture & Food Systems': ['Environment & Climate', 'Biology'],
    'Environment & Climate': ['Agriculture & Food Systems', 'Geography'],
  }
  const hasAdjacent = [...userGroups].some(ug => {
    const adjacent = ADJACENT_GROUPS[ug] || [];
    return [...scholGroups].some(sg => adjacent.includes(sg));
  });
  if (hasAdjacent) return 0.68;

  // Focus flag matches (broad scholarship focus areas)
  const userIsStem = [...userGroups].some(g =>
    ['Computer Science & Technology','Engineering','Medicine & Health',
     'Agriculture & Food Systems','Environment & Climate','Mathematics & Statistics'].includes(g)
  );
  const userIsDev = [...userGroups].some(g =>
    ['Development Studies','Social Sciences','Law','Peace & Conflict','Economics'].includes(g)
  );
  const userIsHum = [...userGroups].some(g =>
    ['Arts & Humanities','Islamic & Religious Studies',
     'Indigenous Knowledge & Heritage'].includes(g)
  );

  if (userIsStem && schol.stem_focus) return 0.55;
  if (userIsDev && (schol.development_focus || schol.social_sciences_focus)) return 0.55;
  if (userIsHum && schol.humanities_focus) return 0.55;
  if (userIsDev && schol.peace_conflict_focus) return 0.62;

  return 0.20;
}

export function scoreAcademicAchievement(user: any, schol: any): number {
  const userGpaRaw = user.gpa != null ? parseFloat(user.gpa) : null;
  const normBase = normaliseGrade(
    userGpaRaw !== null && !isNaN(userGpaRaw) ? userGpaRaw : null,
    user.gpa_system || 'us4',
    user.degree_class || null
  );

  const userConfirmed = user.doc_gpa_user_confirmed;
  const userNorm = userConfirmed !== undefined && userConfirmed !== null
    ? userConfirmed
    : normBase;
  const minNorm  = schol.min_gpa_normalised !== undefined ? schol.min_gpa_normalised : null;

  if (userNorm === null && minNorm === null) return 0.65;

  if (minNorm === null) {
    if (userNorm === null) return 0.65;
    if (userNorm >= 0.90) return 0.92;
    if (userNorm >= 0.75) return 0.78;
    if (userNorm >= 0.60) return 0.65;
    return 0.55;
  }

  // User hasn't provided GPA — can't verify eligibility, moderate penalty
  if (userNorm === null) return 0.42;

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

  // Degree mismatch is a significant penalty — user can't apply to this scholarship
  return 0.30;
}export function scoreLanguageStrength(user: any, schol: any): number {
  const instrLang = schol.instruction_language ?? 'English';

  // --- French instruction ---
  if (instrLang === 'French') {
    const isFrNative = user.french_test_type === 'Native' ||
                       (user.country && FRANCOPHONE_NAMES.has(user.country.toLowerCase().trim()));
    if (isFrNative) return 1.00;
    const userFr = normaliseFrenchLevel(user.french_level || null);
    const minFr  = normaliseFrenchLevel(schol.min_french_level || 'B2');
    if (userFr === 0) return 0.30; // No French declared — significant penalty
    const surplus = userFr - minFr;
    if (surplus >= 0) return Math.min(1.00, 0.78 + surplus * 0.9);
    // Below minimum — penalise proportionally
    return Math.max(0.15, 0.55 + surplus * 0.8);
  }

  // --- Arabic instruction ---
  if (instrLang === 'Arabic') {
    const isArNative = user.arabic_test_type === 'Native' ||
                       (user.country && ARABOPHONE_NAMES.has(user.country.toLowerCase().trim()));
    if (isArNative) return 1.00;
    const userAr = normaliseArabicLevel(user.arabic_level || null);
    const minAr  = normaliseArabicLevel(schol.min_arabic_level || 'B2');
    if (userAr === 0) return 0.30;
    const surplus = userAr - minAr;
    if (surplus >= 0) return Math.min(1.00, 0.78 + surplus * 0.9);
    return Math.max(0.15, 0.55 + surplus * 0.8);
  }

  // --- Portuguese instruction ---
  if (instrLang === 'Portuguese') {
    const isPtNative = user.portuguese_test_type === 'Native' ||
                         (user.country && LUSOPHONE_NAMES.has(user.country.toLowerCase().trim()));
    if (isPtNative) return 1.00;
    const userPt = normalisePortugueseLevel(user.portuguese_level || null);
    const minPt  = normalisePortugueseLevel(schol.min_portuguese_level || 'B2');
    if (userPt === 0) return 0.30;
    const surplus = userPt - minPt;
    if (surplus >= 0) return Math.min(1.00, 0.78 + surplus * 0.9);
    return Math.max(0.15, 0.55 + surplus * 0.8);
  }

  // --- Bilingual instruction (English OR French) ---
  if (instrLang === 'Bilingual') {
    const frScore = normaliseFrenchLevel(user.french_level || null);
    const enScore = user.english_score
      ? normaliseEnglishScore(user.english_test_type ?? 'IELTS', parseFloat(user.english_score) || 0)
      : (user.english_test_type === 'Native' ? 1.0 : 0);
    const best = Math.max(frScore, enScore);
    // Bonus if both languages are strong (B2+ in both)
    if (frScore >= 0.70 && enScore >= 0.70) return Math.min(1.00, best + 0.10);
    return best;
  }

  // --- English instruction (default) ---

  // No IELTS required — scholarship accepts MOI certificate or Duolingo
  if (schol.no_ielts) {
    // If user already has an English test, give them full credit
    if (user.english_test_type === 'Native' || (user.country && ANGLOPHONE_NAMES.has(user.country.toLowerCase().trim()))) {
      return 1.00;
    }
    if (user.english_score) {
      const userEn = normaliseEnglishScore(user.english_test_type ?? 'IELTS', parseFloat(user.english_score) || 0);
      return Math.min(1.00, 0.85 + userEn * 0.15);
    }
    // No test needed AND no test taken — this is a genuine benefit
    return 0.88;
  }

  // Native English speaker
  if (user.english_test_type === 'Native' || (user.country && ANGLOPHONE_NAMES.has(user.country.toLowerCase().trim()))) {
    return 1.00;
  }

  // Scholarship requires English test but user has none — significant penalty
  if (!user.english_score) return 0.20;

  const userEn = normaliseEnglishScore(user.english_test_type ?? 'IELTS', parseFloat(user.english_score) || 0);
  const minEn  = schol.min_english_score
    ? normaliseEnglishScore(schol.min_english_test_type ?? 'IELTS', parseFloat(schol.min_english_score))
    : 0.65;

  const surplus = userEn - minEn;
  if (surplus >= 0) return Math.min(1.00, 0.78 + surplus * 1.0);
  // Below minimum — penalise proportionally
  return Math.max(0.15, 0.55 + surplus * 0.8);
}

export function scoreResearchExperienceBackground(
  user: any,
  schol: any
): number {
  let score = 0.50;

  // Research experience
  const hasResearch = !!user.has_research;
  if (schol.requires_research) {
    score = hasResearch ? 0.88 : 0.18;
  } else if (hasResearch) {
    score += 0.14;
  }

  // Publications
  const pubCount = parseInt(user.publications) || 0;
  if (schol.requires_publications) {
    if (pubCount >= (schol.min_publication_count || 1)) score = Math.min(1.0, score + 0.10);
    else score = Math.max(0.10, score - 0.20);
  } else if (pubCount > 0) {
    score = Math.min(1.0, score + 0.06 * Math.min(pubCount, 3));
  }

  // Work experience
  const workYrs = parseFloat(user.work_experience_years) || 0;
  if (schol.min_work_years > 0) {
    if (workYrs >= schol.min_work_years) score = Math.min(1.0, score + 0.10);
    else score = Math.max(0.10, score - 0.14);
  }
  if (schol.max_work_years && workYrs > schol.max_work_years) {
    score = Math.max(0.20, score - 0.18);
  }

  // Leadership & community
  const hasLeadership = !!user.has_leadership;
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

  // "anywhere" — open to all destinations
  if (openness === 'anywhere') {
    // Slight boost for fully funded: user has no restrictions so funding matters more
    return schol.funding_type === 'Full' ? 0.95 : 0.85;
  }

  // "intra_african" — wants to study within Africa
  if (openness === 'intra_african') {
    if (isIntraAfrican(schol)) return 1.0;
    // Fully funded elsewhere is still attractive but less preferred
    if (schol.funding_type === 'Full') return 0.45;
    return 0.15;
  }

  // "specific" — user picked preferred countries/regions
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

    // Exact country match — best possible
    if (scholCountryNames.length > 0) {
      for (const name of scholCountryNames) {
        if (studentCountries.has(name)) return 1.0;
      }
      // No country match — check if scholarship is in a preferred region
      const scholHostRegion = schol.host_region || '';
      if (selectedRegions.includes(scholHostRegion)) return 0.85;
      // Not in preferred region, but fully funded — still worth considering
      const includeAnywhere = user.include_fully_funded_anywhere !== false;
      if (includeAnywhere && schol.funding_type === 'Full') return 0.60;
      return 0.25;
    }

    // Scholarship has no specific country — check region
    const scholRegion = schol.host_region || '';
    if (selectedRegions.includes(scholRegion)) return 0.90;

    // No region match — fully funded fallback
    const includeAnywhere = user.include_fully_funded_anywhere !== false;
    if (includeAnywhere && schol.funding_type === 'Full') return 0.55;
    return 0.20;
  }

  return 0.60;
}

export function scoreDocumentCompleteness(
  userDocTypes: string[],
  scholRequiredDocs: string[]
): number {
  const required = scholRequiredDocs ?? [];
  if (required.length === 0) return 0.70;

  // Normalize document type aliases for fuzzy matching
  const DOC_ALIASES: Record<string, string> = {
    'transcript': 'academic transcript',
    'academic transcript': 'academic transcript',
    'academic record': 'academic transcript',
    'result': 'academic transcript',
    'results': 'academic transcript',
    'cv': 'cv / resume',
    'resume': 'cv / resume',
    'curriculum vitae': 'cv / resume',
    'motivation letter': 'motivation letter',
    'motivational letter': 'motivation letter',
    'cover letter': 'motivation letter',
    'statement of purpose': 'statement of purpose',
    'sop': 'statement of purpose',
    'personal statement': 'statement of purpose',
    'reference letter': 'reference letter',
    'recommendation letter': 'reference letter',
    'recommendation': 'reference letter',
    'passport': 'passport / id',
    'passport / id': 'passport / id',
    'national id': 'passport / id',
    'id card': 'passport / id',
    'financial evidence': 'financial evidence',
    'bank statement': 'financial evidence',
    'financial statement': 'financial evidence',
    'proof of funds': 'financial evidence',
    'admission letter': 'admission letter',
    'admission offer': 'admission letter',
    'offer letter': 'admission letter',
    'english test': 'english test',
    'ielts': 'english test',
    'toefl': 'english test',
    'english proficiency': 'english test',
  }

  const normalizeDocType = (d: string): string => {
    const lower = d.toLowerCase().trim()
    return DOC_ALIASES[lower] || lower
  }

  const userSet = new Set(userDocTypes.map(normalizeDocType))
  let covered = 0

  required.forEach(r => {
    const normalizedR = normalizeDocType(r)
    if (userSet.has(normalizedR)) {
      covered++
    } else {
      // Fuzzy contains match
      const found = [...userSet].some(u => u.includes(normalizedR) || normalizedR.includes(u))
      if (found) covered++
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

  // Guard: without the profile fields the engine scores against, a percentage
  // would be fiction. Return an explicit needs-profile marker instead.
  if (!user || !user.country || !user.degree_level || !user.field_of_study) {
    return {
      score: null,
      needs_profile: true,
      reasons: [],
      disqualifying_reasons: [],
      is_eligible: null,
      breakdown: { country: 0, degree: 0, field: 0, gpa: 0, languages: 0, experience: 0, destination: 0, documents: 0 }
    };
  }

  const userCountry = user.country || '';
  const scholRequiredDocs = schol.required_documents || [];
  // Country list semantics: [] means "not yet specified" (e.g. freshly
  // crawled listings) — treat as review-pass, never as hard disqualification.
  const specifiedCountries = (Array.isArray(schol.countries) && schol.countries.length > 0)
    ? schol.countries
    : (Array.isArray(schol.country) && schol.country.length > 0)
      ? schol.country
      : null;
  const eligibleCountries = specifiedCountries ?? ['ALL'];
  const eligibleDegreeLevels = schol.degree_levels || [];
  const eligibleFields = schol.fields_of_study || schol.fields || [];

  // Profile Completeness Gate — all wizard-critical fields must be present
  // before any percentage is shown. Partial profiles produce misleading scores.
  const hasBasicProfile = !!(user.country && user.degree_level && user.field_of_study);
  if (!hasBasicProfile) {
    return {
      score: null,
      needs_profile: true,
      reasons: [],
      disqualifying_reasons: [],
      is_eligible: null,
      breakdown: { country: 0, degree: 0, field: 0, gpa: 0, languages: 0, experience: 0, destination: 0, documents: 0 }
    };
  }

  // Resolve user age: explicit age field first, derive from DOB for legacy rows
  let userAge: number | null = null;
  if (typeof user.age === 'number' && user.age > 0) {
    userAge = user.age;
  } else if (user.date_of_birth) {
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
  if (!g1.pass && specifiedCountries) {
    disqualifyingReasons.push(g1.note);
    return {
      score: 0,
      reasons: [],
      disqualifying_reasons: disqualifyingReasons,
      is_eligible: false,
      breakdown: { country: 0, degree: 0, field: 0, gpa: 0, languages: 0, experience: 0, destination: 0, documents: 0 }
    };
  }

  // 2. GATE G2: Minimum Work Experience — not hard-disqualifying
  if (!specifiedCountries) {
    matchReasons.push('Country eligibility is not yet specified for this listing — verify on the official page before applying');
  }

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
        breakdown: { country: 100, degree: 0, field: 0, gpa: 0, languages: 0, experience: 0, destination: 0, documents: 0 }
      };
    }
  } else if (schol.age_limit_masters || schol.age_limit_phd) {
    matchReasons.push(`Set your age in your profile to verify age requirements for this scholarship`);
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

  const userHasEnglishTest = !!(user.english_test_type && user.english_score);

  // AHP-inspired weightings — no single criterion exceeds 25%
  // Hard gates (country, degree) get higher weight; soft factors (GPA, docs) get less.
  // d1=country 0.25, d2=field 0.18, d3=gpa 0.08, d4=degree 0.15,
  // d5=language 0.12, d6=experience 0.05, d7=destination 0.15, d8=docs 0.02
  const rawScore = d1*0.25 + d2*0.18 + d3*0.08 + d4*0.15 + d5*0.12 + d6*0.05 + d7*0.15 + d8*0.02;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawScore * 100)));

  // Generate Match Reasons
  if (d1 >= 0.88) matchReasons.push(`Specifically open to students from ${user.country}`);
  else if (d1 >= 0.65) matchReasons.push(`Open to African students`);

  if (d2 >= 0.90) matchReasons.push(`Exact study field match — ${user.field_of_study}`);
  else if (d2 >= 0.78) matchReasons.push(`Strong academic field alignment — same discipline group`);
  else if (d2 >= 0.65) matchReasons.push(`Related academic field — adjacent discipline`);
  else if (d2 >= 0.50) matchReasons.push(`Partial field overlap — may still be eligible`);

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
      documents: Math.round(d8 * 100)
    }
  };
}
