import { generateContent, getProviderConfig, hasAnyKey } from './ai-provider';
import { extractTextFromBuffer } from './text-extractor';

const TRANSCRIPT_PROMPT = `You are a document analysis specialist. Extract structured academic data from this transcript text. Return ONLY valid JSON with these fields: institution_name as string or null, degree_level as "Undergraduate" or "Masters" or "PhD" or null, field_of_study as string or null, gpa as number or null, gpa_scale as 4.0 or 5.0 or 100 or null, graduation_year as integer or null, honors as string or null. Never guess. Return null for any field not clearly visible. No markdown, no code fences, just JSON.`;

const CV_PROMPT = `Extract structured professional data from this CV text. Return ONLY valid JSON with: work_experience_years as integer or null, primary_field as string or null, skills as string array, leadership_roles as string array, publications_count as integer or null, languages as string array. No markdown, no code fences, just JSON.`;

const ESSAY_PROMPT = `Analyze this personal statement or essay as a writing sample. Return ONLY valid JSON with: approximate_word_count as integer, tone as "formal" or "conversational" or "mixed", sentence_complexity as "simple" or "moderate" or "complex", key_themes as string array of up to 5 themes, vocabulary_level as "basic" or "intermediate" or "advanced", writing_sample_excerpt as the most distinctive 100 word excerpt. No markdown, no code fences, just JSON.`;

const REFERENCE_LETTER_PROMPT = `Analyze this reference / recommendation letter. Return ONLY valid JSON with: relationship as string (e.g. "professor", "employer", "mentor"), sentiment as "strongly_positive" or "positive" or "neutral" or "mixed", key_strengths as string array of up to 6 qualities mentioned, acquaintance_duration_years as number or null, recommender_title as string or null, contains_qualifiers as boolean (does it include any hedging or weak praise). No markdown, no code fences, just JSON.`;

const CERTIFICATE_PROMPT = `Extract structured data from this certificate or award document. Return ONLY valid JSON with: institution_name as string or null, certificate_name as string or null, issue_date as string or null, expiry_date as string or null, grade as string or null, is_academic as boolean, is_professional as boolean. No markdown, no code fences, just JSON.`;

export interface TranscriptData {
  institution_name: string | null;
  degree_level: 'Undergraduate' | 'Masters' | 'PhD' | null;
  field_of_study: string | null;
  gpa: number | null;
  gpa_scale: number | null;
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
  confidence?: number;
  warning?: string;
}

function tryParseJson(text: string): any | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }
  return null;
}

async function extractWithAI(systemPrompt: string, textContent: string): Promise<any | null> {
  if (!hasAnyKey()) return null;
  try {
    const result = await generateContent({
      systemInstruction: systemPrompt,
      prompt: `DOCUMENT TEXT:\n\n${textContent.substring(0, 15000)}\n\n---\n\nExtract the requested information as JSON from the document above.`,
      temperature: 0.1,
      maxOutputTokens: 2048,
    });
    if (result?.text) {
      return tryParseJson(result.text);
    }
    return null;
  } catch {
    return null;
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
  const isBasic = userPlan === 'explorer';
  const normalizedType = docType.toLowerCase();

  const extractionResult = await extractTextFromBuffer(fileBuffer, mimetype, filename);
  const textContent = extractionResult.text;

  const extractionMeta: ExtractionMetadata = {
    method: extractionResult.method,
    confidence: extractionResult.confidence,
    warning: extractionResult.warning,
  };

  if (normalizedType.includes('transcript')) {
    const result = await extractWithAI(TRANSCRIPT_PROMPT, textContent);
    return { result: result as TranscriptData | null, analyzed: !!result, extraction: extractionMeta };
  }

  if (normalizedType.includes('personal statement') || normalizedType.includes('motivation') || normalizedType.includes('statement of purpose') || normalizedType.includes('essay')) {
    const result = await extractWithAI(ESSAY_PROMPT, textContent);
    return { result: result as EssaySampleData | null, analyzed: !!result, extraction: extractionMeta };
  }

  if (normalizedType.includes('cv') || normalizedType.includes('resume')) {
    const result = await extractWithAI(CV_PROMPT, textContent);
    return { result: result as CVData | null, analyzed: !!result, extraction: extractionMeta };
  }

  if (normalizedType.includes('reference letter') || normalizedType.includes('recommendation')) {
    const result = await extractWithAI(REFERENCE_LETTER_PROMPT, textContent);
    return { result: result as ReferenceLetterData | null, analyzed: !!result, extraction: extractionMeta };
  }

  if (normalizedType.includes('certificate') || normalizedType.includes('award') || normalizedType.includes('diploma')) {
    const result = await extractWithAI(CERTIFICATE_PROMPT, textContent);
    return { result: result as CertificateData | null, analyzed: !!result, extraction: extractionMeta };
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
  doc_extraction_confidence?: number;
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
    enrichment.doc_extraction_confidence = extraction.confidence;
  }

  if (result && (normalizedType.includes('transcript'))) {
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
