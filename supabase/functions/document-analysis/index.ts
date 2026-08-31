import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

let currentOrigin = 'https://www.techsari.online'

const corsHeaders = {
  'Access-Control-Allow-Origin': currentOrigin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
}

// ─── CORS: strict origin allowlist ─────────────────────────────
function allowedOrigin(req: Request): string {
  const o = req.headers.get('Origin') || ''
  if (/^https:\/(www\.)?techsari\.online$/.test(o)) return o
  return 'https://www.techsari.online'
}



function corsResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ─── Types ─────────────────────────────────────────────────────

interface PatternResult {
  student_name: string | null
  date_of_birth: string | null
  institution_name: string | null
  degree_level: string | null
  field_of_study: string | null
  gpa: number | null
  gpa_scale: string | null
  gpa_system: string | null
  gpa_classification: string | null
  graduation_year: number | null
  matric_number: string | null
  work_experience_years: number | null
  current_job_title: string | null
  skills: string[]
  leadership_roles: string[]
  education_history: { institution: string; degree: string; year: number | null }[]
  email: string | null
  phone: string | null
  confidence: Record<string, number>
  extraction_method: 'pattern' | 'ai' | 'hybrid'
}

// ─── Text preprocessing ─────────────────────────────────────────

function preprocessText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s{3,}/g, ' ')
    .replace(/[–—]/g, '-')
    .normalize('NFKD')
}

// ─── GPA patterns for all African grading systems ──────────────

interface GpaMatch {
  value: number | null
  scale: string | null
  system: string | null
  classification: string | null
  confidence: number
}

const GPA_PATTERNS: { pattern: RegExp; classify: (m: RegExpMatchArray) => GpaMatch; priority?: number }[] = [
  // Explicit CGPA with denominator — highest priority (cumulative, not semester)
  {
    pattern: /(?:CGPA|C\.G\.P\.A|Cumulative\s+Grade\s+Point\s+Average)[:\s]*(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)/i,
    priority: 10,
    classify: (m) => {
      const raw = parseFloat(m[1])
      const denom = parseFloat(m[2])
      if (isNaN(raw) || isNaN(denom)) return { value: null, scale: null, system: null, classification: null, confidence: 0 }
      let system = denom === 4.0 ? 'us4' : denom === 5.0 ? 'ngcgpa' : `scale_${denom}`
      return { value: raw, scale: String(denom), system, classification: null, confidence: 0.95 }
    },
  },
  // Generic GPA with denominator: "GPA: 3.75/4.0", "GPA 4.85/5.0"
  {
    pattern: /(?:GPA|Grade\s+Point\s+Average|G\.P\.A)[:\s]*(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)/i,
    priority: 7,
    classify: (m) => {
      const raw = parseFloat(m[1])
      const denom = parseFloat(m[2])
      if (isNaN(raw) || isNaN(denom)) return { value: null, scale: null, system: null, classification: null, confidence: 0 }
      let system = denom === 4.0 ? 'us4' : denom === 5.0 ? 'ngcgpa' : `scale_${denom}`
      return { value: raw, scale: String(denom), system, classification: null, confidence: 0.93 }
    },
  },
  // "3.75/4.0" standalone
  {
    pattern: /(\d+\.\d{1,2})\s*\/\s*(4\.0|5\.0|10|20|100)\b/i,
    classify: (m) => {
      const raw = parseFloat(m[1])
      const denom = parseFloat(m[2])
      if (isNaN(raw) || isNaN(denom)) return { value: null, scale: null, system: null, classification: null, confidence: 0 }
      const systemMap: Record<string, string> = { '4': 'us4', '5': 'ngcgpa', '10': 'spanish_10', '20': 'belgian_20', '100': 'pct_100' }
      return { value: raw, scale: String(denom), system: systemMap[String(denom)] || `scale_${denom}`, classification: null, confidence: 0.90 }
    },
  },
  // Percentage: "Overall: 85%", "Aggregate: 72.5%", "Total: 68%"
  {
    pattern: /(?:overall|total|aggregate|cumulative|final|average|percentage)[:\s]*(\d{2}(?:\.\d{1,2})?)\s*%/i,
    classify: (m) => {
      const raw = parseFloat(m[1])
      if (isNaN(raw)) return { value: null, scale: null, system: null, classification: null, confidence: 0 }
      return { value: raw, scale: '100', system: 'pct_100', classification: null, confidence: 0.85 }
    },
  },
  // South African percentage: "72%", "65%" near keywords
  {
    pattern: /(?:mark|score|result|obtained)[:\s]*(\d{2}(?:\.\d)?)\s*%/i,
    classify: (m) => {
      const raw = parseFloat(m[1])
      if (isNaN(raw)) return { value: null, scale: null, system: null, classification: null, confidence: 0 }
      return { value: raw, scale: '100', system: 'za_pct', classification: null, confidence: 0.80 }
    },
  },
  // British degree classifications
  {
    pattern: /(First\s+Class|First-Class|1st\s+Class|Second\s+Class\s+Upper|Second\s+Class\s+Lower|2:1|2\.1|2:2|2\.2|Third\s+Class|Third-Class|Pass|Ordinary)/i,
    classify: (m) => {
      const cls = m[1].toLowerCase()
      if (cls.includes('first')) return { value: null, scale: 'British', system: 'british', classification: 'First Class', confidence: 0.95 }
      if (cls.includes('upper') || cls === '2:1' || cls === '2.1') return { value: null, scale: 'British', system: 'british', classification: 'Second Class Upper', confidence: 0.95 }
      if (cls.includes('lower') || cls === '2:2' || cls === '2.2') return { value: null, scale: 'British', system: 'british', classification: 'Second Class Lower', confidence: 0.95 }
      if (cls.includes('third')) return { value: null, scale: 'British', system: 'british', classification: 'Third Class', confidence: 0.95 }
      return { value: null, scale: 'British', system: 'british', classification: cls, confidence: 0.90 }
    },
  },
  // French mention system: "Mention Très Bien", "Mention Bien", "Mention Assez Bien"
  {
    pattern: /(?:mention\s+)?(Très\s+Bien|Très\s+Bien|TB|Bien|B|Assez\s+Bien|AB|Passable|P|Insuffisant)/i,
    classify: (m) => {
      const cls = m[1].toLowerCase()
      if (cls.includes('très') || cls === 'tb') return { value: null, scale: 'French', system: 'mention_fr', classification: 'Très Bien', confidence: 0.90 }
      if (cls === 'bien' || cls === 'b') return { value: null, scale: 'French', system: 'mention_fr', classification: 'Bien', confidence: 0.90 }
      if (cls.includes('assez') || cls === 'ab') return { value: null, scale: 'French', system: 'mention_fr', classification: 'Assez Bien', confidence: 0.90 }
      if (cls === 'passable' || cls === 'p') return { value: null, scale: 'French', system: 'mention_fr', classification: 'Passable', confidence: 0.90 }
      return { value: null, scale: 'French', system: 'mention_fr', classification: cls, confidence: 0.80 }
    },
  },
  // Belgian/DR Congo 20-point scale: "14/20", "12.5/20"
  {
    pattern: /(\d{1,2}(?:\.\d)?)\s*\/\s*20\b(?!\s*0)/i,
    classify: (m) => {
      const raw = parseFloat(m[1])
      if (isNaN(raw) || raw > 20) return { value: null, scale: null, system: null, classification: null, confidence: 0 }
      return { value: raw, scale: '20', system: 'belgian_20', classification: null, confidence: 0.85 }
    },
  },
  // Portuguese 20-point scale (Angola, Mozambique): "14 valores", "12/20"
  {
    pattern: /(\d{1,2}(?:\.\d)?)\s*(?:valores|values?)\b/i,
    classify: (m) => {
      const raw = parseFloat(m[1])
      if (isNaN(raw) || raw > 20) return { value: null, scale: null, system: null, classification: null, confidence: 0 }
      return { value: raw, scale: '20', system: 'luso_20', classification: null, confidence: 0.85 }
    },
  },
  // Spanish 10-point scale (Equatorial Guinea)
  {
    pattern: /(?:nota|calificación|promedio)[:\s]*(\d{1,2}(?:\.\d)?)\s*\/\s*10\b/i,
    classify: (m) => {
      const raw = parseFloat(m[1])
      if (isNaN(raw) || raw > 10) return { value: null, scale: null, system: null, classification: null, confidence: 0 }
      return { value: raw, scale: '10', system: 'spanish_10', classification: null, confidence: 0.85 }
    },
  },
  // GPA out of 4.0 without explicit CGPA label: bare "3.45/4.00" or "3.45/4"
  {
    pattern: /(\d\.\d{2})\s*\/\s*4(?:\.00?)?\b/i,
    classify: (m) => {
      const raw = parseFloat(m[1])
      if (isNaN(raw)) return { value: null, scale: null, system: null, classification: null, confidence: 0 }
      return { value: raw, scale: '4.0', system: 'us4', classification: null, confidence: 0.80 }
    },
  },
  // GPA with text: "GPA of 3.5", "final GPA 4.0"
  {
    pattern: /(?:GPA|grade point)[:\s]*of?\s*(\d\.\d{1,2})/i,
    classify: (m) => {
      const raw = parseFloat(m[1])
      if (isNaN(raw)) return { value: null, scale: null, system: null, classification: null, confidence: 0 }
      const scale = raw > 4.0 ? '5.0' : '4.0'
      const system = raw > 4.0 ? 'ngcgpa' : 'us4'
      return { value: raw, scale, system, classification: null, confidence: 0.75 }
    },
  },
  // Ethiopian / US-style GPA: "3.5" near grade-related keywords
  {
    pattern: /(?:cumulative|final|overall)\s+(?:GPA|grade|result)[:\s]*(\d\.\d{1,2})/i,
    classify: (m) => {
      const raw = parseFloat(m[1])
      if (isNaN(raw)) return { value: null, scale: null, system: null, classification: null, confidence: 0 }
      const scale = raw > 4.0 ? '5.0' : '4.0'
      const system = raw > 4.0 ? 'ngcgpa' : 'us4'
      return { value: raw, scale, system, classification: null, confidence: 0.75 }
    },
  },
]

function extractGPA(text: string): GpaMatch {
  let best: GpaMatch = { value: null, scale: null, system: null, classification: null, confidence: 0 }
  let bestScore = -1
  for (const { pattern, classify, priority } of GPA_PATTERNS) {
    const match = text.match(pattern)
    if (!match) continue
    const result = classify(match)
    // Score = confidence * 10 + priority bonus (CGPA gets priority 10, GPA gets 7)
    const score = result.confidence * 10 + (priority || 0)
    if (score > bestScore) {
      best = result
      bestScore = score
    }
  }
  return best
}

// ─── Year extraction ───────────────────────────────────────────

const YEAR_PATTERNS: { pattern: RegExp; confidence: number }[] = [
  { pattern: /(?:graduation|award|conferral|completion|programme end|date of award)[^\d]*(\d{4})/gi, confidence: 0.90 },
  { pattern: /(?:awarded|graduated|completed|finished|conferred)\s+(?:\w+\s+)?(\d{4})/gi, confidence: 0.85 },
  { pattern: /(?:expected|anticipated|projected)\s+(?:year|date|graduation)[:\s]*(\d{4})/gi, confidence: 0.80 },
  { pattern: /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi, confidence: 0.70 },
  { pattern: /\b(?:session|academic year|academic session)[:\s]*(\d{4})\s*[-–/]\s*(\d{4})\b/gi, confidence: 0.65 },
]

function extractGraduationYear(text: string): { value: number | null; confidence: number } {
  const currentYear = new Date().getFullYear()
  let bestYear: number | null = null
  let bestConfidence = 0
  for (const { pattern, confidence } of YEAR_PATTERNS) {
    const matches = [...text.matchAll(pattern)]
    for (const match of matches) {
      const year = parseInt(match[1])
      if (year >= 1990 && year <= currentYear + 5 && confidence > bestConfidence) {
        bestYear = year
        bestConfidence = confidence
      }
    }
  }
  return { value: bestYear, confidence: bestConfidence }
}

// ─── Degree level extraction ───────────────────────────────────

const DEGREE_PATTERNS: { pattern: RegExp; result: string; confidence: number }[] = [
  // Doctorate
  { pattern: /\b(PhD|Ph\.D|DPhil|D\.Phil|Doctor(?:ate)?|Doctorat|Doktor)\b/i, result: 'PhD', confidence: 0.95 },
  // Masters
  { pattern: /\b(Master(?:'s)?|MSc|M\.Sc|MA|M\.A|MEng|M\.Eng|MBA|MPhil|M\.Phil|LLM|MEd|M\.Ed|MFA|MPH|MPA|MSci|MRes|Magistère)\b/i, result: 'Masters', confidence: 0.95 },
  // Professional doctorates
  { pattern: /\b(MD|DVM|DDS|JD|PharmD|DPharm|DBA|EdD|DEd|DM)\b/i, result: 'PhD', confidence: 0.90 },
  // Bachelors
  { pattern: /\b(Bachelor(?:'s)?|BSc|B\.Sc|BA|B\.A|BEng|B\.Eng|BEd|B\.Ed|LLB|BArch|BFA|BBA|BNurs|BPharm|Undergraduate)\b/i, result: 'Bachelors', confidence: 0.95 },
  // Postgraduate diploma / certificate
  { pattern: /\b(Postgraduate|PGDip|PG\s?Dip|PGCert|PG\s?Cert|Graduate\s+(?:Diploma|Certificate))\b/i, result: 'Masters', confidence: 0.80 },
  // Diplomas
  { pattern: /\b(Higher National Diploma|HND|Diploma|Advanced Diploma|OND|Ordinary National Diploma)\b/i, result: 'Diploma', confidence: 0.90 },
  // French degrees
  { pattern: /\b(Licence|License|Licencié|Bac\+[0-9])\b/i, result: 'Bachelors', confidence: 0.85 },
  { pattern: /\b(Master\s+[12]|Master spécialisé|Mastère)\b/i, result: 'Masters', confidence: 0.85 },
  { pattern: /\b(Doctorat|Thèse|These)\b/i, result: 'PhD', confidence: 0.85 },
  // Portuguese degrees
  { pattern: /\b(Licenciatura|Bacharelato|Bacharel)\b/i, result: 'Bachelors', confidence: 0.85 },
  { pattern: /\b(Mestrado|Mestre)\b/i, result: 'Masters', confidence: 0.85 },
  { pattern: /\b(Doutoramento|Doutor)\b/i, result: 'PhD', confidence: 0.85 },
  // Arabic degrees
  { pattern: /\b(بكالوريوس|بكالوريا)\b/i, result: 'Bachelors', confidence: 0.85 },
  { pattern: /\b(ماجستير)\b/i, result: 'Masters', confidence: 0.85 },
  { pattern: /\b(دكتوراه)\b/i, result: 'PhD', confidence: 0.85 },
]

function extractDegreeLevel(text: string): { value: string | null; confidence: number } {
  for (const { pattern, result, confidence } of DEGREE_PATTERNS) {
    if (pattern.test(text)) return { value: result, confidence }
  }
  return { value: null, confidence: 0 }
}

// ─── Institution name extraction ───────────────────────────────

const INSTITUTION_PATTERNS: { pattern: RegExp; confidence: number }[] = [
  // Common African university abbreviations (match before full-name patterns)
  { pattern: /\b(KNUST|UNILAG|OAU|UI|UNN|ABU|BUK|UNIMAID|UNIJOS|UNIUYO|AAU|FUTO|LASU|OOU|MAPOLY|ILARO|ABPCO|UDUS|UNIPORT|UNICAL|FUTA|FUPRE|NSUK|BSU|KSU|CRUTECH|MOUAU|NDU|DELSU|EDSU|JOOS|PLASU|SAU|TASUED|ABUAD|CU|Babcock|Covenant|Al-Hikmah|Afe\s+Babalola)\b/i,
    confidence: 0.92 },
  // South African universities
  { pattern: /\b(UCT|Wits|Witswatersrand|Stellenbosch|UKZN|UP|UFS|Rhodes|NWU|UJ|CPUT|TUT|Durban\s+University|Cape\s+Peninsula|University\s+of\s+Johannesburg)\b/i,
    confidence: 0.92 },
  // East African universities
  { pattern: /\b(UDSM|MUHAS|ARI|SUA|ARU|CUHAS|Mzumbe|OPEN\s+University\s+of\+Tanzania|Kenyatta|Strathmore|USIU|Daystar|Kabarak|Moi|Maseno|Karatina|Dedan\s+Kimathi|Technical\s+University\s+of\+Kenya|JKUAT|Pwani\+University)\b/i,
    confidence: 0.92 },
  // West African universities
  { pattern: /\b(LEGON|UG|KNUST|Cape\s+Coast|Valley\s+View|Ashesi|GIMPA|CU|Central\s+University|Bluecrest|ACCGH|Ghana\s+Technology)\b/i,
    confidence: 0.92 },
  // "University of X" pattern — most common globally
  { pattern: /(?:University\s+of\s+[A-Z][A-Za-z\s]{2,50})(?:\n|,|\.|$)/i, confidence: 0.90 },
  // "X University" / "X College" / "X Institute" pattern
  { pattern: /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,3}\s+(?:University|College|Institute|Polytechnic|Academy|School\s+of))(?:\n|,|\.|$)/i, confidence: 0.88 },
  // "studied at X" / "from X"
  { pattern: /(?:studied?\s+(?:at|from)\s+)([A-Z][A-Za-z\s]{3,50})(?:\n|,|\.|$)/i, confidence: 0.85 },
  // French patterns
  { pattern: /(?:Université\s+(?:de\s+)?[A-ZÉÈÊËÎÏÔÛÙ][A-Za-zéèêëîïôûù\s-]{2,50})(?:\n|,|\.|$)/i, confidence: 0.90 },
  { pattern: /(?:Institut\s+(?:de\s+)?[A-ZÉÈ][A-Za-zéèêë\s-]{2,50})(?:\n|,|\.|$)/i, confidence: 0.85 },
  { pattern: /(?:Grande\s+[ÉE]cole)\s+(?:de\s+)?[A-Za-zéèêë\s-]{2,50}/i, confidence: 0.85 },
  // Portuguese patterns
  { pattern: /(?:Universidade\s+(?:de\s+)?[A-Z][A-Za-z\s]{2,50})(?:\n|,|\.|$)/i, confidence: 0.90 },
  { pattern: /(?:Instituto\s+(?:Superior\s+)?(?:de\s+)?[A-Z][A-Za-z\s]{2,50})(?:\n|,|\.|$)/i, confidence: 0.85 },
  // Arabic-script institution line (heuristic: first long line at top of transcript)
  { pattern: /^([A-Z][A-Za-z\s&]{10,80})$/m, confidence: 0.60 },
]

function extractInstitutionName(text: string): { value: string | null; confidence: number } {
  const preprocessed = preprocessText(text)
  const first2k = preprocessed.substring(0, 2000)

  // Try structured patterns first
  for (const { pattern, confidence } of INSTITUTION_PATTERNS) {
    const match = first2k.match(pattern)
    if (match) {
      const name = match[1] || match[0]
      const cleaned = name
        .replace(/official transcript|academic record|transcript of records|student (copy|version)/gi, '')
        .replace(/^\s+|\s+$/g, '')
      if (cleaned.length > 5) return { value: cleaned, confidence }
    }
  }

  // Fallback: first line containing university/college keywords
  const lines = first2k.split('\n').map(l => l.trim()).filter(l => l.length > 5)
  for (const line of lines) {
    if (/university|universit|college|institute|institut|polytechnic|academy|school of|faculdade|universidad/i.test(line)) {
      const cleaned = line.replace(/official transcript|academic record|transcript of records|student (copy|version)/gi, '').trim()
      return { value: cleaned, confidence: 0.80 }
    }
  }

  // Last resort: longest line in first section
  const longest = lines.sort((a, b) => b.length - a.length)[0]
  return { value: longest || null, confidence: 0.35 }
}

// ─── Field of study extraction ─────────────────────────────────

const FIELD_PATTERNS: { pattern: RegExp; confidence: number }[] = [
  // English — "Bachelor of Science in Computer Science"
  { pattern: /(?:bachelor\s+of\s+[A-Za-z\s]+?|master\s+of\s+[A-Za-z\s]+?|doctor\s+of\s+[A-Za-z\s]+?)\s+(?:in|of)\s+([A-Za-z\s&]{3,60}?)(?:\n|,|\.|$)/i, confidence: 0.92 },
  // English — programme/course/major
  { pattern: /(?:programme|program|course|major|degree in|faculty of|department of|school of)[:\s]+([A-Za-z\s&]{3,60}?)(?:\n|,|\.|and|$)/i, confidence: 0.90 },
  // English — "bachelor in X" / "master in X"
  { pattern: /(?:bachelor|master|doctor|phd)[^\n]{0,30}?(?:in|of)\s+([A-Za-z\s&]{3,50}?)(?:\n|,|$)/i, confidence: 0.85 },
  // English — field of study / specialization
  { pattern: /(?:field of study|discipline|area of study|specialization|major field)[:\s]*([A-Za-z\s&]{3,50}?)(?:\n|,|\.|$)/i, confidence: 0.85 },
  // English — " programme:" or " course:" on same line
  { pattern: /(?:programme|course|program)\s*:\s*([A-Za-z\s&]{3,60}?)(?:\n|,|\.|$)/i, confidence: 0.88 },
  // French
  { pattern: /(?:filière|spécialité|domaine|section|matière principale)[:\s]*([A-Za-zéèêëîïôùû\s]{3,50}?)(?:\n|,|\.|$)/i, confidence: 0.85 },
  { pattern: /(?:licence|master|doctorat)\s+(?:en\s+)?([A-Za-zéèêëîïôùû\s]{3,50}?)(?:\n|,|\.|$)/i, confidence: 0.85 },
  // Portuguese
  { pattern: /(?:curso|área|especialidade|ramo)[:\s]*([A-Za-zçãõáéíóúâêô\s]{3,50}?)(?:\n|,|\.|$)/i, confidence: 0.85 },
  { pattern: /(?:licenciatura|mestrado|doutoramento)\s+(?:em\s+)?([A-Za-zçãõáéíóúâêô\s]{3,50}?)(?:\n|,|\.|$)/i, confidence: 0.85 },
]

function extractFieldOfStudy(text: string): { value: string | null; confidence: number } {
  const preprocessed = preprocessText(text)
  for (const { pattern, confidence } of FIELD_PATTERNS) {
    const match = preprocessed.match(pattern)
    if (match && match[1].trim().length > 2) {
      return { value: match[1].trim(), confidence }
    }
  }
  return { value: null, confidence: 0 }
}

// ─── Student name extraction ───────────────────────────────────

function extractStudentName(text: string): { value: string | null; confidence: number } {
  const names = [
    ...text.matchAll(/(?:name of student|student name|student|name|candidate|full name)[:\s]*\n?([A-Z][A-Za-z\s,.'-]{3,60})/gi),
    ...text.matchAll(/^(?:Name|Name of Student|Student|Candidate)[:\s]+([A-Z][A-Za-z\s,.'-]{3,60})/mgi),
  ]
  for (const match of names) {
    const name = match[1].trim()
    if (name.length > 3 && !name.match(/^(university|college|institute|transcript)/i)) {
      return { value: name, confidence: 0.85 }
    }
  }
  return { value: null, confidence: 0 }
}

// ─── Date of birth extraction ──────────────────────────────────

function extractDateOfBirth(text: string): { value: string | null; confidence: number } {
  const dobPatterns = [
    /(?:date of birth|DOB|birth date|born|birthday)[:\s]*\n?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    /(?:date of birth|DOB|birth date|born|birthday)[:\s]*\n?(\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})/i,
  ]
  for (const pattern of dobPatterns) {
    const match = text.match(pattern)
    if (match) {
      return { value: match[1].trim(), confidence: 0.85 }
    }
  }
  return { value: null, confidence: 0 }
}

// ─── Matric / registration number ──────────────────────────────

function extractMatricNumber(text: string): { value: string | null; confidence: number } {
  const patterns = [
    /(?:matric|registration|student|admission|exam|index)\s*(?:no|number|num|#)[:\s]*\n?([A-Z0-9]{5,20})/i,
    /\b(?:REG|MAT|ADM|STU)[/-]?\d{5,10}\b/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return { value: match[1] || match[0], confidence: 0.80 }
  }
  return { value: null, confidence: 0 }
}

// ─── Email extraction ──────────────────────────────────────────

function extractEmail(text: string): { value: string | null; confidence: number } {
  const match = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)
  return { value: match ? match[0] : null, confidence: match ? 0.95 : 0 }
}

// ─── Phone extraction ──────────────────────────────────────────

function extractPhone(text: string): { value: string | null; confidence: number } {
  const patterns = [
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const num = match[0].replace(/[^\d+]/g, '')
      if (num.length >= 8 && num.length <= 15) return { value: match[0], confidence: 0.80 }
    }
  }
  return { value: null, confidence: 0 }
}

// ─── Work experience extraction (CV) ───────────────────────────

function extractWorkExperience(text: string): { years: number | null; confidence: number } {
  const yearRangePattern = /(\d{4})\s*[-–to]+\s*(\d{4}|present|current|now|date)/gi
  const matches = [...text.matchAll(yearRangePattern)]
  if (matches.length === 0) return { years: null, confidence: 0 }
  let totalYears = 0
  const currentYear = new Date().getFullYear()
  for (const match of matches) {
    const startYear = parseInt(match[1])
    const endYearStr = match[2].toLowerCase()
    const isPresent = endYearStr.includes('present') || endYearStr.includes('current') || endYearStr.includes('now') || endYearStr.includes('date')
    const endYear = isPresent ? currentYear : parseInt(match[2])
    if (startYear >= 1980 && startYear <= currentYear && !isNaN(endYear) && endYear >= startYear) {
      totalYears += endYear - startYear
    }
  }
  return {
    years: totalYears > 0 ? Math.min(totalYears, 50) : null,
    confidence: matches.length > 0 ? 0.80 : 0,
  }
}

// ─── Current job title extraction ──────────────────────────────

function extractCurrentJobTitle(text: string): string | null {
  const patterns = [
    /(?:current|present)\s+(?:role|position|title|job)[:\s]+([A-Za-z\s/]{3,60})(?:\n|,|\.|$)/i,
    /(?:job title|position|role|title)[:\s]+([A-Za-z\s/]{3,60})(?:\n|,|\.|$)/i,
    /^([A-Z][A-Za-z\s]{3,50})\s+(?:at|@|–|-)\s+[A-Z]/m,
  ]
  for (const pattern of patterns) {
    const match = text.substring(0, 1500).match(pattern)
    if (match) return match[1].trim()
  }
  return null
}

// ─── Skills extraction ─────────────────────────────────────────

function extractSkills(text: string): string[] {
  const skillSection = text.match(
    /(?:skills|technical skills|competencies|core competencies|expertise|technologies|proficiencies)[:\s]*\n([\s\S]{0,1500}?)(?:\n\n|\n[A-Z]|\n\d)/i
  )
  if (!skillSection) return []

  const raw = skillSection[1]
  const items = raw
    .split(/[,\n•·\-–—|\/\\;]/)
    .map(s => s.trim())
    .filter(s => s.length > 1 && s.length < 50 && /[A-Za-z]/.test(s))
    .slice(0, 30)

  return [...new Set(items.map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()))]
}

// ─── Leadership roles extraction ───────────────────────────────

function extractLeadershipRoles(text: string): string[] {
  const leadershipKeywords = /(?:lead|president|vice president|director|manager|head|coordinator|chair|founder|co-founder|captain|officer|representative|supervisor|leadership)/i
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5 && l.length < 200)

  const roles: string[] = []
  for (const line of lines) {
    if (leadershipKeywords.test(line) && !/skill|competenc|technolog|proficien/i.test(line)) {
      const clean = line.replace(/^[•·\-–—|\d.\s]+/, '').trim()
      if (clean.length > 5 && !roles.includes(clean)) {
        roles.push(clean)
      }
    }
  }
  return roles.slice(0, 10)
}

// ─── Education history from CV ─────────────────────────────────

function extractEducationHistory(text: string): { institution: string; degree: string; year: number | null }[] {
  const eduSection = text.match(
    /(?:education|academic background|academic qualifications|qualifications|education and training)[:\s]*\n([\s\S]{0,2000}?)(?:\n\n|\n[A-Z](?!.*(?:university|college|institute|phd|master|bachelor|diploma)))/i
  )
  if (!eduSection) return []

  const entries: { institution: string; degree: string; year: number | null }[] = []
  const lines = eduSection[1].split('\n').filter(l => l.trim().length > 3)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const instMatch = line.match(/([A-Z][A-Za-z\s]{5,60}(?:University|College|Institute|Polytechnic|Academy|School))/)
    const yearMatch = line.match(/(\d{4})\s*[-–]\s*(\d{4}|present)/)
    const degreeMatch = line.match(/\b(PhD|Ph\.D|Master|MSc|M\.Sc|MBA|Bachelor|BSc|B\.Sc|BA|HND|Diploma|Doctorat|Licence|Mestrado|Licenciatura)\b/i)

    if (instMatch) {
      const year = yearMatch ? parseInt(yearMatch[1]) : null
      const degree = degreeMatch ? degreeMatch[1] : 'Degree'
      entries.push({ institution: instMatch[1].trim(), degree, year })
    }
  }

  return entries.slice(0, 5)
}

// ─── Main pattern extraction orchestrator ─────────────────────

function extractFromPDFText(rawText: string, docType: string): PatternResult {
  const t = docType.toLowerCase()
  const isTranscript = t.includes('transcript')
  const isCV = t.includes('cv') || t.includes('resume')

  const preprocessed = preprocessText(rawText)

  const gpaR = isTranscript ? extractGPA(preprocessed) : { value: null, scale: null, system: null, classification: null, confidence: 0 }
  const yrR = isTranscript ? extractGraduationYear(preprocessed) : { value: null, confidence: 0 }
  const degR = isTranscript ? extractDegreeLevel(preprocessed) : { value: null, confidence: 0 }
  const instR = isTranscript ? extractInstitutionName(preprocessed) : { value: null, confidence: 0 }
  const fieldR = isTranscript ? extractFieldOfStudy(preprocessed) : { value: null, confidence: 0 }
  const nameR = isTranscript ? extractStudentName(preprocessed) : { value: null, confidence: 0 }
  const dobR = isTranscript ? extractDateOfBirth(preprocessed) : { value: null, confidence: 0 }
  const matricR = isTranscript ? extractMatricNumber(preprocessed) : { value: null, confidence: 0 }
  const workR = isCV ? extractWorkExperience(preprocessed) : { years: null, confidence: 0 }
  const jobR = isCV ? extractCurrentJobTitle(preprocessed) : null
  const skillsR = isCV ? extractSkills(preprocessed) : []
  const leadershipR = isCV ? extractLeadershipRoles(preprocessed) : []
  const eduHistoryR = isCV ? extractEducationHistory(preprocessed) : []
  const emailR = extractEmail(preprocessed)
  const phoneR = extractPhone(preprocessed)

  const confScores = [instR.confidence, degR.confidence, fieldR.confidence, gpaR.confidence, yrR.confidence]
  const high = confScores.filter(c => c >= 0.7).length
  const method: 'pattern' | 'ai' | 'hybrid' = high >= 4 ? 'pattern' : high >= 2 ? 'hybrid' : 'ai'

  return {
    student_name: nameR.value,
    date_of_birth: dobR.value,
    institution_name: instR.value,
    degree_level: degR.value,
    field_of_study: fieldR.value,
    gpa: gpaR.value,
    gpa_scale: gpaR.scale,
    gpa_system: gpaR.system,
    gpa_classification: gpaR.classification,
    graduation_year: yrR.value,
    matric_number: matricR.value,
    work_experience_years: workR.years,
    current_job_title: jobR,
    skills: skillsR,
    leadership_roles: leadershipR,
    education_history: eduHistoryR,
    email: emailR.value,
    phone: phoneR.value,
    confidence: {
      student_name: nameR.confidence,
      date_of_birth: dobR.confidence,
      institution_name: instR.confidence,
      degree_level: degR.confidence,
      field_of_study: fieldR.confidence,
      gpa: gpaR.confidence,
      graduation_year: yrR.confidence,
      work_experience_years: workR.confidence,
    },
    extraction_method: method,
  }
}

// ─── AI fallback (DeepSeek) ────────────────────────────────────

const AI_FETCH_TIMEOUT_MS = 15_000

async function callDeepSeek(systemPrompt: string, textContent: string, aiCfg: Record<string, unknown> | null): Promise<string | null> {
  const apiKey = (aiCfg?.deepseek_key as string) || Deno.env.get('DEEPSEEK_API_KEY')
  if (!apiKey) return null
  // Only DeepSeek models can be called with the DeepSeek key — if the admin
  // configured a different provider without a DeepSeek key, skip AI fallback
  // (pattern-only extraction) instead of failing the whole analysis.
  if (aiCfg?.provider && aiCfg.provider !== 'deepseek' && !aiCfg.deepseek_key) return null
  const model = (aiCfg?.provider === 'deepseek' && aiCfg.ai_model as string) || 'deepseek-v4-pro'
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS)
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: textContent.substring(0, 15000) },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    })
    clearTimeout(timer)
    if (!res.ok) {
      const errText = await res.text()
      console.error('[document-analysis] DeepSeek API error:', res.status, errText)
      return null
    }
    const json = await res.json()
    return json?.choices?.[0]?.message?.content || null
  } catch (err) {
    console.error('[document-analysis] DeepSeek call failed:', err)
    return null
  }
}

function tryParseJson(text: string): any | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]) } catch {}
  }
  return null
}

// ─── Vision OCR via DeepSeek (scanned/image docs) ──────────────

const VISION_TIMEOUT_MS = 30_000

async function ocrWithDeepSeekVision(
  images: string[],
  docType: string,
  aiCfg: Record<string, unknown> | null,
): Promise<string | null> {
  const apiKey = (aiCfg?.deepseek_key as string) || Deno.env.get('DEEPSEEK_API_KEY')
  if (!apiKey) return null

  const model = 'deepseek-v4-flash-vision-exp'

  // Build multimodal content: system prompt + all page images
  const docHint = docType.toLowerCase().includes('transcript')
    ? 'academic transcript or academic record'
    : docType.toLowerCase().includes('cv') || docType.toLowerCase().includes('resume')
    ? 'CV or resume'
    : 'student document'

  const contentParts: any[] = [
    {
      type: 'text',
      text: `You are an OCR engine. Extract ALL visible text from this ${docHint}.\n` +
        'Preserve the original structure: tables, columns, headers, and line breaks.\n' +
        'For transcripts, keep course names, grades, credits, and GPA summary rows intact.\n' +
        'Pay special attention to:\n' +
        '- GPA/CGPA values (look for summary rows at bottom of tables)\n' +
        '- Institution name (usually at the top)\n' +
        '- Student name and registration number\n' +
        '- Course codes, titles, credit units, and letter/grade points\n' +
        '- For CVs: work dates, job titles, company names, skills sections\n' +
        'Return ONLY the extracted text — no commentary, no markdown formatting, no interpretations.',
    },
  ]

  // Add up to 5 page images (limit to prevent token overflow)
  for (const img of images.slice(0, 5)) {
    contentParts.push({
      type: 'image_url',
      image_url: { url: img },
    })
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS)
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: contentParts }],
        temperature: 0.05,
        max_tokens: 4096,
      }),
    })
    clearTimeout(timer)
    if (!res.ok) {
      const errText = await res.text()
      console.error('[document-analysis] DeepSeek Vision API error:', res.status, errText)
      return null
    }
    const json = await res.json()
    return json?.choices?.[0]?.message?.content || null
  } catch (err) {
    console.error('[document-analysis] DeepSeek Vision call failed:', err)
    return null
  }
}

async function extractRemainingFieldsWithAI(rawText: string, patternResult: PatternResult, aiCfg: Record<string, unknown> | null): Promise<Record<string, unknown>> {
  const missingFields: string[] = []
  if (!patternResult.institution_name || patternResult.confidence.institution_name < 0.7) {
    missingFields.push('institution_name: the full official name of the educational institution')
  }
  if (!patternResult.gpa || patternResult.confidence.gpa < 0.7) {
    missingFields.push('gpa: the overall grade point average or final grade as a number')
    missingFields.push('gpa_scale: the scale used such as 4.0 or 5.0 or 10 or 20 or 100')
    missingFields.push('gpa_system: the grading system such as us4, ngcgpa, pct_100, british, mention_fr, belgian_20, luso_20, spanish_10')
  }
  if (!patternResult.field_of_study || patternResult.confidence.field_of_study < 0.7) {
    missingFields.push('field_of_study: the academic programme or major subject studied')
  }
  if (!patternResult.graduation_year || patternResult.confidence.graduation_year < 0.7) {
    missingFields.push('graduation_year: the year the degree was awarded or expected')
  }
  if (!patternResult.degree_level || patternResult.confidence.degree_level < 0.7) {
    missingFields.push('degree_level: Bachelors, Masters, PhD, or Diploma')
  }

  if (missingFields.length === 0) return {}

  const keys = missingFields.map(f => f.split(':')[0])
  const prompt = `Extract only these specific fields from the student document below.
Return JSON with only these keys: ${keys.join(', ')}.
Return null for any field you cannot find. Never guess.
The document may be a transcript with course tables — the GPA/CGPA often appears
in a summary row (e.g. "CGPA: 3.45/5.00") or near the words "cumulative", "overall",
or "grade point average". Read carefully across table rows.

${missingFields.join('\n')}

Text:
${rawText.substring(0, 12000)}`

  const systemPrompt = 'You are a document data extractor. Return only the requested JSON fields. Never hallucinate values.'
  const raw = await callDeepSeek(systemPrompt, prompt, aiCfg)
  if (!raw) return {}

  const parsed = tryParseJson(raw)
  if (!parsed) return {}

  const result: Record<string, unknown> = {}
  for (const key of keys) {
    if (parsed[key] !== undefined && parsed[key] !== null) {
      result[key] = parsed[key]
    }
  }
  return result
}

// ─── Main handler ───────────────────────────────────────────────

serve(async (req: Request) => {
  currentOrigin = allowedOrigin(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': allowedOrigin(req) } })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return corsResponse({ error: 'Authentication required' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return corsResponse({ error: 'Invalid or expired token' }, 401)
    const userEmail = user.email!

    const body = await req.json()
    const { documentId, docType, textContent, action, images } = body

    // AI provider settings are admin-managed via the AI Config panel
    // (ai_config table) — same source generate-essay reads.
    const { data: aiCfg } = await supabase
      .from('ai_config')
      .select('provider, deepseek_key, openai_key, gemini_key, ai_model')
      .eq('id', 'default')
      .maybeSingle()

    if (action === 'analyze') {
      if (!documentId || !docType) {
        return corsResponse({ error: 'documentId and docType are required' }, 400)
      }

      const t = docType.toLowerCase()
      const isTranscript = t.includes('transcript')
      const isCV = t.includes('cv') || t.includes('resume')

      // Determine text source: either from client extraction or OCR
      let workingText = textContent || ''
      let extractionMethod: 'pattern' | 'ai' | 'hybrid' = 'pattern'

      // If text is too short but we have images, OCR via DeepSeek Vision
      if ((!workingText || workingText.trim().length < 50) && images && images.length > 0) {
        console.log(`[document-analysis] Text too short (${workingText.length} chars), running OCR on ${images.length} page image(s)...`)
        const ocrText = await ocrWithDeepSeekVision(images, docType, aiCfg ?? null)
        if (ocrText && ocrText.trim().length > 20) {
          workingText = ocrText
          extractionMethod = 'ai'
          console.log(`[document-analysis] OCR produced ${ocrText.length} chars of text`)
        } else {
          console.log('[document-analysis] OCR returned no usable text')
          extractionMethod = 'ai'
        }
      }

      if (!workingText || workingText.trim().length < 20) {
        return corsResponse({ error: 'Could not extract sufficient text from the document. The file may be password-protected or contain only images.' }, 400)
      }

      // Step 1: Pattern matching
      const patternResult = extractFromPDFText(workingText, docType)
      let merged: Record<string, unknown> = { ...patternResult } as unknown as Record<string, unknown>

      // If OCR was used, upgrade extraction method
      if (extractionMethod === 'ai' && patternResult.extraction_method === 'ai') {
        extractionMethod = 'ai'
      } else if (extractionMethod === 'ai' && patternResult.extraction_method !== 'pattern') {
        extractionMethod = 'hybrid'
      } else {
        extractionMethod = patternResult.extraction_method
      }

      // Step 2: AI fallback for low-confidence fields
      if (isTranscript && extractionMethod !== 'pattern') {
        const aiFields = await extractRemainingFieldsWithAI(workingText, patternResult, aiCfg ?? null)
        Object.assign(merged, aiFields)
        if (Object.keys(aiFields).length > 0) {
          extractionMethod = extractionMethod === 'ai' ? 'ai' : 'hybrid'
        }
      }

      const now = new Date().toISOString()

      // Prepare the extraction result for storage
      const extractionPayload = {
        student_name: merged.student_name ?? null,
        date_of_birth: merged.date_of_birth ?? null,
        institution_name: merged.institution_name ?? null,
        degree_level: merged.degree_level ?? null,
        field_of_study: merged.field_of_study ?? null,
        gpa: merged.gpa ?? null,
        gpa_scale: merged.gpa_scale ?? null,
        gpa_system: merged.gpa_system ?? null,
        gpa_classification: merged.gpa_classification ?? null,
        graduation_year: merged.graduation_year ?? null,
        matric_number: merged.matric_number ?? null,
        work_experience_years: merged.work_experience_years ?? null,
        current_job_title: merged.current_job_title ?? null,
        skills: merged.skills ?? [],
        leadership_roles: merged.leadership_roles ?? [],
        education_history: merged.education_history ?? [],
        email: merged.email ?? null,
        phone: merged.phone ?? null,
      }

      const { error: updateErr } = await supabase
        .from('documents')
        .update({
          ai_extraction_result: extractionPayload,
          analysis_status: 'completed',
          last_analyzed_at: now,
          analysis_error: null,
          extraction_method: extractionMethod,
        })
        .eq('id', documentId)
        .eq('user_email', userEmail)

      if (updateErr) {
        console.error('[document-analysis] DB update failed:', updateErr.message)
        return corsResponse({ error: 'Failed to save analysis results' }, 500)
      }

      // Build profile enrichment
      const enrichment: Record<string, unknown> = {
        doc_extraction_method: extractionMethod,
      }

      if (isTranscript) {
        enrichment.doc_gpa_normalised_extracted = extractionPayload.gpa
        enrichment.doc_institution_extracted = extractionPayload.institution_name
        enrichment.doc_field_of_study_extracted = extractionPayload.field_of_study
        enrichment.doc_degree_level_extracted = extractionPayload.degree_level
      }

      if (isCV) {
        enrichment.doc_work_years_extracted = extractionPayload.work_experience_years
        enrichment.doc_skills_extracted = extractionPayload.skills
        enrichment.doc_leadership_roles_extracted = extractionPayload.leadership_roles
      }

      // Merge enrichment into profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .single()

      if (profile) {
        const profileUpdate: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(enrichment)) {
          if (val !== null && val !== undefined) {
            profileUpdate[key] = val
          }
        }
        if (enrichment.doc_gpa_normalised_extracted && !profile.doc_gpa_user_confirmed) {
          const current = profile.gpa ? parseFloat(profile.gpa) : null
          if (!current || (enrichment.doc_gpa_normalised_extracted as number) > current) {
            profileUpdate.gpa = enrichment.doc_gpa_normalised_extracted
          }
        }
        if (enrichment.doc_institution_extracted && !profile.institution) {
          profileUpdate.institution = enrichment.doc_institution_extracted
        }
        if (enrichment.doc_field_of_study_extracted && !profile.field_of_study) {
          profileUpdate.field_of_study = enrichment.doc_field_of_study_extracted
        }
        if (enrichment.doc_degree_level_extracted && !profile.degree_level) {
          profileUpdate.degree_level = enrichment.doc_degree_level_extracted
        }
        if (Object.keys(profileUpdate).length > 0) {
          await supabase.from('profiles').update(profileUpdate).eq('email', userEmail)
        }
      }

      return corsResponse({
        success: true,
        result: extractionPayload,
        extraction: { method: extractionMethod },
        enrichment,
      })
    }

    return corsResponse({ error: `Unknown action: ${action}` }, 400)
  } catch (err: any) {
    console.error('[document-analysis] Unhandled error:', err.message)
    return corsResponse({ error: 'Internal server error: ' + err.message }, 500)
  }
})
