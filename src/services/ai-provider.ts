export type AiProvider = 'openai' | 'deepseek' | 'gemini';

export interface AiProviderConfig {
  provider: AiProvider;
  openaiKey: string;
  deepseekKey: string;
  geminiKey: string;
}

export interface GenerateContentParams {
  systemInstruction?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AiProviderResult {
  text: string;
  provider: AiProvider;
}

let cachedConfig: AiProviderConfig | null = null;

export function getDefaultConfig(): AiProviderConfig {
  return {
    provider: (process.env.AI_PROVIDER as AiProvider) || 'gemini',
    openaiKey: process.env.OPENAI_API_KEY || '',
    deepseekKey: process.env.DEEPSEEK_API_KEY || '',
    geminiKey: process.env.GOOGLE_API_KEY || '',
  };
}

export function hasAnyKey(config?: AiProviderConfig): boolean {
  const c = config || getDefaultConfig();
  return !!(c.openaiKey && c.openaiKey !== 'your_api_key_here')
    || !!(c.deepseekKey && c.deepseekKey !== 'your_deepseek_api_key_from_platform_deepseek_com')
    || !!(c.geminiKey && c.geminiKey !== 'your_api_key_here');
}

export function setProviderConfig(config: AiProviderConfig): void {
  cachedConfig = config;
}

export function getProviderConfig(): AiProviderConfig {
  return cachedConfig || getDefaultConfig();
}

export async function generateContent(params: GenerateContentParams): Promise<AiProviderResult | null> {
  const config = getProviderConfig();

  if (!hasAnyKey(config)) {
    console.warn('[AI] No API keys configured — falling back to template generation');
    return null;
  }

  const provider = config.provider;

  switch (provider) {
    case 'openai': {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: config.openaiKey });
      const messages: any[] = [];
      if (params.systemInstruction) {
        messages.push({ role: 'system', content: params.systemInstruction });
      }
      messages.push({ role: 'user', content: params.prompt });
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: params.temperature ?? 0.8,
        max_tokens: params.maxOutputTokens ?? 1500,
      });
      return { text: response.choices?.[0]?.message?.content || '', provider: 'openai' };
    }

    case 'deepseek': {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: config.deepseekKey,
      });
      const messages: any[] = [];
      if (params.systemInstruction) {
        messages.push({ role: 'system', content: params.systemInstruction });
      }
      messages.push({ role: 'user', content: params.prompt });
      const response = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages,
        temperature: params.temperature ?? 0.8,
        max_tokens: params.maxOutputTokens ?? 1500,
      });
      return { text: response.choices?.[0]?.message?.content || '', provider: 'deepseek' };
    }

    case 'gemini': {
      const { GoogleGenAI } = await import('@google/genai');
      const client = new GoogleGenAI({ apiKey: config.geminiKey });
      const contents = params.systemInstruction
        ? `System: ${params.systemInstruction}\n\n${params.prompt}`
        : params.prompt;
      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        config: {
          temperature: params.temperature ?? 0.8,
          maxOutputTokens: params.maxOutputTokens ?? 1500,
        },
      });
      return { text: response.text || '', provider: 'gemini' };
    }

    default:
      console.warn(`[AI] Unknown provider: ${provider}`);
      return null;
  }
}
