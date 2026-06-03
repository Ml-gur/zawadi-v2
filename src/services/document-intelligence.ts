import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = () => process.env.GOOGLE_API_KEY || '';

function getClient() {
  const key = GEMINI_API_KEY();
  if (!key || key === 'your_api_key_here') return null;
  return new GoogleGenAI({ apiKey: key });
}

const TRANSCRIPT_PROMPT = `You are a document analysis specialist. Extract structured academic data from this transcript. Return JSON with these fields: institution_name as string or null, degree_level as "Undergraduate" or "Masters" or "PhD" or null, field_of_study as string or null, gpa as number or null, gpa_scale as 4.0 or 5.0 or 100 or null, graduation_year as integer or null, honors as string or null. Never guess. Return null for any field not clearly visible in the document.`;

const CV_PROMPT = `Extract structured professional data from this CV. Return JSON with: work_experience_years as integer or null, primary_field as string or null, skills as string array, leadership_roles as string array, publications_count as integer or null, languages as string array.`;

const ESSAY_PROMPT = `Analyze this personal statement or essay as a writing sample. Return JSON with: approximate_word_count as integer, tone as "formal" or "conversational" or "mixed", sentence_complexity as "simple" or "moderate" or "complex", key_themes as string array of up to 5 themes, vocabulary_level as "basic" or "intermediate" or "advanced", writing_sample_excerpt as the most distinctive 100 word excerpt that best represents the author's voice.`;

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

async function extractWithGemini(systemPrompt: string, fileBuffer: Buffer): Promise<any | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const base64 = fileBuffer.toString('base64');
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { text: systemPrompt },
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64
          }
        }
      ],
      config: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      }
    });
    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
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

  if (normalizedType.includes('transcript')) {
    const result = await extractWithGemini(TRANSCRIPT_PROMPT, fileBuffer);
    return { result: result as TranscriptData | null, analyzed: !!result };
  }

  if (normalizedType.includes('personal statement') || normalizedType.includes('motivation') || normalizedType.includes('statement of purpose') || normalizedType.includes('essay')) {
    const result = await extractWithGemini(ESSAY_PROMPT, fileBuffer);
    return { result: result as EssaySampleData | null, analyzed: !!result };
  }

  if (!isBasic && (normalizedType.includes('cv') || normalizedType.includes('resume'))) {
    const result = await extractWithGemini(CV_PROMPT, fileBuffer);
    return { result: result as CVData | null, analyzed: !!result };
  }

  return { result: null, analyzed: false };
}
