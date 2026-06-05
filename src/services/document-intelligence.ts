import { generateContent, hasAnyKey } from './ai-provider';
import { extractTextFromBuffer } from './text-extractor';
import { extractFromPDFText, type PatternExtractionResult } from './pdf-pattern-extractor';

export interface TranscriptData {
  institution_name: string | null;
  degree_level: 'Undergraduate' | 'Masters' | 'PhD' | null;
  field_of_study: string | null;
  gpa: number | null;
  gpa_scale: string | null;
  gpa_system: string | null;
  graduation_year: number | null;
  honors: string | null;
}

export interface CVData {
  work_experience_years: number | null;
  primary_field: string | null;
  skills: string[];
  leadership_roles: string[];
  publications_count: number | null;
  languages: string[];
}

export interface EssaySampleData {
  approximate_word_count: number;
  tone: 'formal' | 'conversational' | 'mixed';
  sentence_complexity: 'simple' | 'moderate' | 'complex';
  key_themes: string[];
  vocabulary_level: 'basic' | 'intermediate' | 'advanced';
  writing_sample_excerpt: string;
}

export interface ReferenceLetterData {
  relationship: string | null;
  sentiment: 'strongly_positive' | 'positive' | 'neutral' | 'mixed';
  key_strengths: string[];
  acquaintance_duration_years: number | null;
  recommender_title: string | null;
  contains_qualifiers: boolean;
}

export interface CertificateData {
  institution_name: string | null;
  certificate_name: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  grade: string | null;
  is_academic: boolean;
  is_professional: boolean;
}

export type ExtractionResult = TranscriptData | CVData | EssaySampleData | ReferenceLetterData | CertificateData;

export interface ExtractionMetadata {
  method: string;
  warning?: string;
}

function tryParseJson(text: string): any | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }
  return null;
}

export async function extractRemainingFieldsWithAI(
  rawText: string,
  patternResult: PatternExtractionResult
): Promise<Partial<PatternExtractionResult>> {
  if (!hasAnyKey()) return {};

  const missingFields: string[] = [];
  if (!patternResult.institution_name || patternResult.confidence.institution_name < 0.7) {
    missingFields.push('institution_name: the full official name of the educational institution');
  }
  if (!patternResult.gpa || patternResult.confidence.gpa < 0.7) {
    missingFields.push('gpa: the overall grade point average or final grade as a number');
    missingFields.push('gpa_scale: the scale used such as 4.0 or 5.0 or 100 or First Class');
    missingFields.push('gpa_system: the grading system such as us4, ngcgpa, pct_100, british');
  }
  if (!patternResult.field_of_study || patternResult.confidence.field_of_study < 0.7) {
    missingFields.push('field_of_study: the academic programme or major subject studied');
  }
  if (!patternResult.graduation_year || patternResult.confidence.graduation_year < 0.7) {
    missingFields.push('graduation_year: the year the degree was awarded or expected');
  }
  if (!patternResult.degree_level || patternResult.confidence.degree_level < 0.7) {
    missingFields.push('degree_level: Bachelors, Masters, PhD, or Diploma');
  }

  if (missingFields.length === 0) return {};

  const keys = missingFields.map(f => f.split(':')[0]);
  const prompt = `Extract only these specific fields from the academic transcript text below.
Return a JSON object with only these keys: ${keys.join(', ')}.
Return null for any field you cannot find with certainty. Never guess.

Fields needed:
${missingFields.join('\n')}

Transcript text (first 2000 characters):
${rawText.substring(0, 2000)}

Return only valid JSON. No explanation.`;

  try {
    const response = await generateContent({
      systemInstruction: 'You are a document data extractor. Return only the requested JSON fields. Never hallucinate values.',
      prompt,
      temperature: 0.1,
      maxOutputTokens: 1024,
    });

    if (!response?.text) return {};
    const parsed = tryParseJson(response.text);
    if (!parsed) return {};

    const result: Partial<PatternExtractionResult> = {};
    for (const key of keys) {
      const typedKey = key as keyof PatternExtractionResult;
      if (parsed[key] !== undefined && parsed[key] !== null) {
        (result as any)[typedKey] = parsed[key];
      }
    }
    return result;
  } catch {
    return {};
  }
}

export async function analyzeDocument(
  fileBuffer: Buffer | Uint8Array | ArrayBuffer,
  docType: string,
  _userEmail: string,
  userPlan: string = 'explorer',
  mimetype: string = 'application/octet-stream',
  filename: string = 'document'
): Promise<{ result: TranscriptData | CVData | EssaySampleData | ReferenceLetterData | CertificateData | null; analyzed: boolean; extraction?: ExtractionMetadata }> {
  const normalizedType = docType.toLowerCase();

  const extractionResult = await extractTextFromBuffer(fileBuffer, mimetype, filename);
  const textContent = extractionResult.text;

  const extractionMeta: ExtractionMetadata = {
    method: extractionResult.method,
    warning: extractionResult.warning,
  };

  if (textContent.trim().length < 50) {
    return { result: null, analyzed: false, extraction: { ...extractionMeta, warning: extractionResult.warning || 'Insufficient text extracted' } };
  }

  if (normalizedType.includes('transcript')) {
    const patternResult = extractFromPDFText(textContent, docType);
    const merged = { ...patternResult };

    if (patternResult.extraction_method !== 'pattern') {
      const aiFields = await extractRemainingFieldsWithAI(textContent, patternResult);
      Object.assign(merged, aiFields);
      merged.extraction_method = patternResult.extraction_method === 'ai' ? 'ai' : 'hybrid';
    }

    return {
      result: {
        institution_name: merged.institution_name,
        degree_level: merged.degree_level as 'Undergraduate' | 'Masters' | 'PhD' | null,
        field_of_study: merged.field_of_study,
        gpa: merged.gpa,
        gpa_scale: merged.gpa_scale,
        gpa_system: merged.gpa_system,
        graduation_year: merged.graduation_year,
        honors: null,
      } as TranscriptData,
      analyzed: true,
      extraction: { ...extractionMeta, method: merged.extraction_method },
    };
  }

  if (normalizedType.includes('cv') || normalizedType.includes('resume')) {
    const patternResult = extractFromPDFText(textContent, docType);
    return {
      result: {
        work_experience_years: patternResult.work_experience_years,
        primary_field: null,
        skills: patternResult.skills,
        leadership_roles: [],
        publications_count: null,
        languages: [],
      } as CVData,
      analyzed: true,
      extraction: { ...extractionMeta, method: 'pattern' },
    };
  }

  return { result: null, analyzed: false, extraction: extractionMeta };
}

export interface ProfileEnrichment {
  doc_gpa_normalised_extracted?: number | null;
  doc_has_research_extracted?: boolean;
  doc_publication_count_extracted?: number | null;
  doc_work_years_extracted?: number | null;
  doc_has_leadership_extracted?: boolean;
  doc_institution_extracted?: string | null;
  doc_field_of_study_extracted?: string | null;
  doc_degree_level_extracted?: string | null;
  doc_skills_extracted?: string[];
  doc_languages_extracted?: string[];
  doc_honors_extracted?: string | null;
  doc_reference_sentiment?: string | null;
  doc_certificate_type?: string | null;
  doc_extraction_method?: string;
}

export function buildProfileEnrichment(
  result: TranscriptData | CVData | EssaySampleData | ReferenceLetterData | CertificateData | null,
  docType: string,
  extraction?: ExtractionMetadata
): ProfileEnrichment {
  const enrichment: ProfileEnrichment = {};
  const normalizedType = docType.toLowerCase();

  if (extraction) {
    enrichment.doc_extraction_method = extraction.method;
  }

  if (result && normalizedType.includes('transcript')) {
    const t = result as TranscriptData;
    enrichment.doc_gpa_normalised_extracted = t.gpa;
    enrichment.doc_institution_extracted = t.institution_name;
    enrichment.doc_field_of_study_extracted = t.field_of_study;
    enrichment.doc_degree_level_extracted = t.degree_level;
    enrichment.doc_honors_extracted = t.honors;
  }

  if (result && (normalizedType.includes('cv') || normalizedType.includes('resume'))) {
    const c = result as CVData;
    enrichment.doc_work_years_extracted = c.work_experience_years;
    enrichment.doc_has_research_extracted = (c.publications_count ?? 0) > 0;
    enrichment.doc_publication_count_extracted = c.publications_count;
    enrichment.doc_has_leadership_extracted = c.leadership_roles.length > 0;
    enrichment.doc_skills_extracted = c.skills;
    enrichment.doc_languages_extracted = c.languages;
    enrichment.doc_field_of_study_extracted = c.primary_field;
  }

  if (result && (normalizedType.includes('reference letter') || normalizedType.includes('recommendation'))) {
    const r = result as ReferenceLetterData;
    enrichment.doc_reference_sentiment = r.sentiment;
    if (r.key_strengths?.length) {
      enrichment.doc_skills_extracted = r.key_strengths;
    }
  }

  if (result && (normalizedType.includes('certificate') || normalizedType.includes('award') || normalizedType.includes('diploma'))) {
    const c = result as CertificateData;
    enrichment.doc_certificate_type = c.certificate_name;
    enrichment.doc_institution_extracted = c.institution_name;
  }

  return enrichment;
}
