import OpenAI from 'openai';

export interface ExtractedScholarship {
  name: string;
  provider: string;
  host_institution: string | null;
  description: string | null;
  eligibility: string | null;
  amount: string | null;
  deadline: string | null;
  apply_url: string | null;
  source_url: string;
  degree_levels: string[];
  fields_of_study: string[];
  countries: string[];
  funding_type: 'Full' | 'Partial' | 'Tuition Only' | null;
  no_ielts: boolean | null;
  work_experience_required: number | null;
  age_limit_masters: number | null;
  age_limit_phd: number | null;
  host_region: string | null;
  iso2: string | string[] | null;
  confidence_score: number;
  scam_flags: string[];
}

export interface PipelineRun {
  timestamp: string;
  sources_searched: number;
  pages_crawled: number;
  scholarships_found: number;
  duplicates_skipped: number;
  scam_flagged: number;
}

export interface PipelineOutput {
  pipeline_run: PipelineRun;
  scholarships: ExtractedScholarship[];
}

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const key = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
    _client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: key,
    });
  }
  return _client;
}

export async function extractScholarshipsFromText(
  sourceUrl: string,
  pageText: string,
): Promise<ExtractedScholarship[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
  if (!apiKey || apiKey === 'your_deepseek_api_key_from_platform_deepseek_com') {
    console.warn('[DeepSeek] No API key configured — skipping AI extraction. Pipeline will run without AI enhancement.');
    return [];
  }

  try {
    let truncatedText = pageText;
    if (pageText.length > 8000) {
      const midpoint = Math.floor(pageText.length / 2);
      const halfChunk = 4000;
      const start = Math.max(0, midpoint - halfChunk);
      truncatedText = pageText.slice(start, start + 8000);
    }

    const systemPrompt = `You are a structured scholarship data extraction specialist. Your only job is to extract scholarship data from web page content and return it as valid JSON. You never invent data. You never guess deadlines. You return null for any field not clearly stated in the source text. You are part of a pipeline discovering scholarships for African students. Flag suspicious content honestly using the scam_flags array.`;

    const userPrompt = `Extract all distinct scholarship opportunities from this web page. Return a JSON object with a single key scholarships containing an array. Each scholarship object must have these exact fields with these exact types. name string required. provider string required. host_institution string or null. description string maximum 300 words plain English no marketing language. eligibility string precise structured description. amount string with currency breakdown or null. deadline string in YYYY-MM-DD format or the string rolling or the string TBA or null never guess. apply_url absolute https URL or null never fabricate. source_url set to exactly ${sourceUrl}. degree_levels array of Secondary Undergraduate Masters PhD Postdoctoral Professional Short Course. fields_of_study string array. countries array of full African country names or the single string All African Countries. funding_type exactly Full or Partial or Tuition Only or null. no_ielts boolean true if MOI certificate or Duolingo accepted instead of IELTS false if IELTS required null if not stated. work_experience_required integer or null. age_limit_masters integer or null. age_limit_phd integer or null. host_region exactly one of West Africa hubs East Africa hubs Southern Africa hubs North Africa hubs Central Africa hubs United Kingdom and Ireland United States and Canada Australia and New Zealand Commonwealth Africa Commonwealth Global France and Belgium Francophone destinations Lusophone destinations Germany Austria Switzerland Nordic countries Netherlands and Belgium Rest of Europe China and East Asia Japan and South Korea Southeast Asia Middle East and Gulf states Intra-African or null. iso2 ISO 3166-1 alpha-2 code or array of codes or null. confidence_score decimal 0 to 1 where 0.9 plus means all critical fields clearly stated 0.7 to 0.89 means most fields clear 0.5 to 0.69 means critical fields missing or ambiguous below 0.5 means significant gaps. scam_flags array containing any of application_fee_required non_institutional_contact unverifiable_institution suspicious_amount broken_url or empty array. Web page content: ${truncatedText}`;

    const response = await getClient().chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      max_tokens: 4000,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[DeepSeek] Empty response from API');
      return [];
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr: any) {
      console.error('[DeepSeek] JSON parse error:', parseErr.message);
      console.error('[DeepSeek] Raw response (first 500 chars):', content.slice(0, 500));
      return [];
    }

    const scholarships = parsed?.scholarships;
    if (!Array.isArray(scholarships)) {
      console.error('[DeepSeek] Response missing scholarships array');
      return [];
    }

    for (const schol of scholarships) {
      if (!schol.source_url) {
        schol.source_url = sourceUrl;
      }
    }

    return scholarships as ExtractedScholarship[];
  } catch (err: any) {
    console.error('[DeepSeek] Extraction error:', err.message);
    return [];
  }
}

export function validateExtractedOutput(parsed: any): { valid: ExtractedScholarship[]; invalidCount: number } {
  const valid: ExtractedScholarship[] = [];
  let invalidCount = 0;

  if (!parsed || !Array.isArray(parsed.scholarships)) {
    return { valid: [], invalidCount: 1 };
  }

  for (const item of parsed.scholarships) {
    if (item && typeof item.name === 'string' && item.name.trim().length > 0 &&
        typeof item.provider === 'string' && item.provider.trim().length > 0) {
      valid.push(item as ExtractedScholarship);
    } else {
      invalidCount++;
    }
  }

  return { valid, invalidCount };
}
