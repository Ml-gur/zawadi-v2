import { generateContent, getProviderConfig, hasAnyKey } from './ai-provider';

const TRANSCRIPT_PROMPT = `You are a document analysis specialist. Extract structured academic data from this transcript text. Return ONLY valid JSON with these fields: institution_name as string or null, degree_level as "Undergraduate" or "Masters" or "PhD" or null, field_of_study as string or null, gpa as number or null, gpa_scale as 4.0 or 5.0 or 100 or null, graduation_year as integer or null, honors as string or null. Never guess. Return null for any field not clearly visible. No markdown, no code fences, just JSON.`;

const CV_PROMPT = `Extract structured professional data from this CV text. Return ONLY valid JSON with: work_experience_years as integer or null, primary_field as string or null, skills as string array, leadership_roles as string array, publications_count as integer or null, languages as string array. No markdown, no code fences, just JSON.`;

const ESSAY_PROMPT = `Analyze this personal statement or essay as a writing sample. Return ONLY valid JSON with: approximate_word_count as integer, tone as "formal" or "conversational" or "mixed", sentence_complexity as "simple" or "moderate" or "complex", key_themes as string array of up to 5 themes, vocabulary_level as "basic" or "intermediate" or "advanced", writing_sample_excerpt as the most distinctive 100 word excerpt. No markdown, no code fences, just JSON.`;

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

export type ExtractionResult = TranscriptData | CVData | EssaySampleData;

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
  fileBuffer: Buffer,
  docType: string,
  _userEmail: string,
  userPlan: string = 'explorer'
): Promise<{ result: ExtractionResult | null; analyzed: boolean }> {
  const isBasic = userPlan === 'explorer';
  const normalizedType = docType.toLowerCase();

  const textContent = fileBuffer.toString('utf8');

  if (normalizedType.includes('transcript')) {
    const result = await extractWithAI(TRANSCRIPT_PROMPT, textContent);
    return { result: result as TranscriptData | null, analyzed: !!result };
  }

  if (normalizedType.includes('personal statement') || normalizedType.includes('motivation') || normalizedType.includes('statement of purpose') || normalizedType.includes('essay')) {
    const result = await extractWithAI(ESSAY_PROMPT, textContent);
    return { result: result as EssaySampleData | null, analyzed: !!result };
  }

  if (!isBasic && (normalizedType.includes('cv') || normalizedType.includes('resume'))) {
    const result = await extractWithAI(CV_PROMPT, textContent);
    return { result: result as CVData | null, analyzed: !!result };
  }

  return { result: null, analyzed: false };
}
