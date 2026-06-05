export interface PatternExtractionResult {
  institution_name: string | null;
  degree_level: string | null;
  field_of_study: string | null;
  gpa: number | null;
  gpa_scale: string | null;
  gpa_system: string | null;
  graduation_year: number | null;
  student_name: string | null;
  work_experience_years: number | null;
  skills: string[];
  current_job_title: string | null;
  confidence: {
    institution_name: number;
    degree_level: number;
    field_of_study: number;
    gpa: number;
    graduation_year: number;
    work_experience_years: number;
  };
  extraction_method: 'pattern' | 'ai' | 'hybrid';
  raw_text_length: number;
}

const GPA_PATTERNS = [
  { pattern: /(?:CGPA|GPA|Grade Point Average)[:\s]+(\d\.\d{1,2})(?:\s*\/\s*(\d\.\d{1,2}))?/i, confidence: 0.95 },
  { pattern: /(\d\.\d{1,2})\s*\/\s*5\.0/i, confidence: 0.90 },
  { pattern: /(?:overall|total|aggregate|cumulative)[:\s]+(\d{2,3}(?:\.\d{1,2})?)\s*%/i, confidence: 0.85 },
  { pattern: /(?:First Class|First-Class|1st Class|Second Class Upper|2:1|2\.1|Second Class Lower|2:2|2\.2|Third Class)/i, confidence: 0.90 },
];

const YEAR_PATTERNS = [
  { pattern: /(?:graduation|award|conferral|completion|programme end)[^\d]*(\d{4})/i, confidence: 0.90 },
  { pattern: /(?:awarded|graduated|completed|finished)\s+(?:in\s+)?(?:\w+\s+)?(\d{4})/i, confidence: 0.85 },
  { pattern: /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i, confidence: 0.70 },
];

const DEGREE_PATTERNS = [
  { pattern: /\b(Bachelor(?:'s)?|BSc|BA|BEng|B\.Sc|B\.A|B\.Eng|Undergraduate)\b/i, result: 'Bachelors', confidence: 0.95 },
  { pattern: /\b(Master(?:'s)?|MSc|MA|MEng|MBA|MPhil|M\.Sc|M\.A|Postgraduate)\b/i, result: 'Masters', confidence: 0.95 },
  { pattern: /\b(Doctor(?:ate)?|PhD|Ph\.D|DPhil|D\.Phil)\b/i, result: 'PhD', confidence: 0.95 },
  { pattern: /\b(Higher National Diploma|HND)\b/i, result: 'Diploma', confidence: 0.90 },
];

const FIELD_PATTERNS = [
  { pattern: /(?:programme|program|course|major|degree in|faculty of)[:\s]+([A-Za-z\s&]{3,60}?)(?:\n|,|\.|and|$)/i, confidence: 0.90 },
  { pattern: /(?:bachelor|master|doctor)[^\n]*(?:in|of)\s+([A-Za-z\s&]{3,40}?)(?:\n|,|$)/i, confidence: 0.85 },
];

function extractGPA(text: string): { value: number | null; scale: string | null; system: string | null; confidence: number } {
  for (const { pattern, confidence } of GPA_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    if (pattern.source.includes('First Class') || pattern.source.includes('Second Class')) {
      const cls = match[0].toLowerCase();
      if (cls.includes('first')) return { value: null, scale: 'British', system: 'british', confidence: 0.90 };
      if (cls.includes('second class upper') || cls.includes('2:1') || cls.includes('2.1')) return { value: null, scale: 'British', system: 'british', confidence: 0.90 };
      if (cls.includes('second class lower') || cls.includes('2:2') || cls.includes('2.2')) return { value: null, scale: 'British', system: 'british', confidence: 0.90 };
      if (cls.includes('third')) return { value: null, scale: 'British', system: 'british', confidence: 0.90 };
    }

    const raw = parseFloat(match[1]);
    if (isNaN(raw)) continue;

    let scale: string | null = null;
    let system: string | null = null;

    if (match[2]) {
      const denom = parseFloat(match[2]);
      scale = match[2];
      system = denom === 4.0 ? 'us4' : denom === 5.0 ? 'ngcgpa' : `scale_${denom}`;
    } else if (pattern.source.includes('%')) {
      scale = '100';
      system = 'pct_100';
    } else if (pattern.source.includes('5\\.0')) {
      scale = '5.0';
      system = 'ngcgpa';
    } else {
      scale = raw > 4.0 ? '5.0' : '4.0';
      system = raw > 4.0 ? 'ngcgpa' : 'us4';
    }

    return { value: raw, scale, system, confidence };
  }
  return { value: null, scale: null, system: null, confidence: 0 };
}

function extractGraduationYear(text: string): { value: number | null; confidence: number } {
  const currentYear = new Date().getFullYear();
  let bestYear: number | null = null;
  let bestConfidence = 0;

  for (const { pattern, confidence } of YEAR_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const year = parseInt(match[1]);
      if (year >= 2000 && year <= currentYear + 2) {
        if (confidence > bestConfidence) {
          bestYear = year;
          bestConfidence = confidence;
        }
      }
    }
  }

  return { value: bestYear, confidence: bestConfidence };
}

function extractDegreeLevel(text: string): { value: string | null; confidence: number } {
  for (const { pattern, result, confidence } of DEGREE_PATTERNS) {
    if (pattern.test(text)) {
      return { value: result, confidence };
    }
  }
  return { value: null, confidence: 0 };
}

function extractInstitutionName(text: string): { value: string | null; confidence: number } {
  const firstSection = text.substring(0, 500);
  const lines = firstSection.split('\n').map(l => l.trim()).filter(l => l.length > 3);

  for (const line of lines) {
    if (/university|college|institute|polytechnic|academy|school of/i.test(line)) {
      const cleaned = line.replace(/official transcript|academic record|transcript of records|student (copy|version)/gi, '').trim();
      return { value: cleaned, confidence: 0.85 };
    }
  }

  const longest = lines.sort((a, b) => b.length - a.length)[0];
  return { value: longest || null, confidence: 0.4 };
}

function extractFieldOfStudy(text: string): { value: string | null; confidence: number } {
  for (const { pattern, confidence } of FIELD_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1].trim().length > 2) {
      return { value: match[1].trim(), confidence };
    }
  }
  return { value: null, confidence: 0 };
}

function extractWorkExperience(text: string): { years: number | null; confidence: number } {
  const yearRangePattern = /(\d{4})\s*[-–to]+\s*(\d{4}|present|current|now)/gi;
  const matches = [...text.matchAll(yearRangePattern)];

  if (matches.length === 0) return { years: null, confidence: 0 };

  let totalYears = 0;
  const currentYear = new Date().getFullYear();

  for (const match of matches) {
    const startYear = parseInt(match[1]);
    const endYearStr = match[2].toLowerCase();
    const isPresent = endYearStr.includes('present') || endYearStr.includes('current') || endYearStr.includes('now');
    const endYear = isPresent ? currentYear : parseInt(match[2]);

    if (startYear >= 1990 && startYear <= currentYear && !isNaN(endYear) && endYear >= startYear) {
      totalYears += endYear - startYear;
    }
  }

  return {
    years: totalYears > 0 ? Math.min(totalYears, 40) : null,
    confidence: matches.length > 0 ? 0.80 : 0,
  };
}

function extractSkills(text: string): string[] {
  const skillsSectionMatch = text.match(/(?:skills|technical skills|competencies|core competencies)[:\s]*\n([\s\S]{0,500}?)(?:\n\n|\n[A-Z])/i);
  if (!skillsSectionMatch) return [];

  const skillsText = skillsSectionMatch[1];
  return skillsText
    .split(/[,\n•·\-|\/]/)
    .map(s => s.trim())
    .filter(s => s.length > 2 && s.length < 40)
    .slice(0, 20);
}

function extractCurrentJobTitle(text: string): string | null {
  const titleMatch = text.substring(0, 800).match(
    /(?:current role|position|title|job title)[:\s]+([A-Za-z\s]{3,50})/i
  );
  return titleMatch ? titleMatch[1].trim() : null;
}

export function extractFromPDFText(
  rawText: string,
  docType: string
): PatternExtractionResult {
  const normalizedType = docType.toLowerCase();
  const isTranscript = normalizedType.includes('transcript');
  const isCV = normalizedType.includes('cv') || normalizedType.includes('resume');

  const gpaResult = isTranscript ? extractGPA(rawText) : { value: null, scale: null, system: null, confidence: 0 };
  const yearResult = isTranscript ? extractGraduationYear(rawText) : { value: null, confidence: 0 };
  const degreeResult = isTranscript ? extractDegreeLevel(rawText) : { value: null, confidence: 0 };
  const institutionResult = isTranscript ? extractInstitutionName(rawText) : { value: null, confidence: 0 };
  const fieldResult = isTranscript ? extractFieldOfStudy(rawText) : { value: null, confidence: 0 };
  const workResult = isCV ? extractWorkExperience(rawText) : { years: null, confidence: 0 };
  const skillsResult = isCV ? extractSkills(rawText) : [];
  const jobTitleResult = isCV ? extractCurrentJobTitle(rawText) : null;

  const fields = [institutionResult.confidence, degreeResult.confidence, fieldResult.confidence, gpaResult.confidence, yearResult.confidence];
  const highConfCount = fields.filter(c => c >= 0.7).length;

  const extractionMethod = highConfCount >= 4 ? 'pattern' : highConfCount >= 2 ? 'hybrid' : 'ai';

  return {
    institution_name: institutionResult.value,
    degree_level: degreeResult.value,
    field_of_study: fieldResult.value,
    gpa: gpaResult.value,
    gpa_scale: gpaResult.scale,
    gpa_system: gpaResult.system,
    graduation_year: yearResult.value,
    student_name: null,
    work_experience_years: workResult.years,
    skills: skillsResult,
    current_job_title: jobTitleResult,
    confidence: {
      institution_name: institutionResult.confidence,
      degree_level: degreeResult.confidence,
      field_of_study: fieldResult.confidence,
      gpa: gpaResult.confidence,
      graduation_year: yearResult.confidence,
      work_experience_years: workResult.confidence,
    },
    extraction_method: extractionMethod as 'pattern' | 'ai' | 'hybrid',
    raw_text_length: rawText.length,
  };
}
