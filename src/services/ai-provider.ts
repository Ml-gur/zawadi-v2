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
  timeout?: number;
  deepseekModel?: 'deepseek-v4-flash' | 'deepseek-v4-pro';
  thinking?: boolean;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

export interface AiProviderResult {
  text: string;
  provider: AiProvider;
  thinking?: string;
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

const AI_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[AI] ${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function retryWithBackoff<T>(fn: () => Promise<T>, label: string, maxRetries = MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit = err?.status === 429 || (err?.message || '').includes('rate limit');
      const isServerError = err?.status && err.status >= 500 && err.status < 600;
      if ((isRateLimit || isServerError) && attempt < maxRetries) {
        const delay = isRateLimit ? 2000 * Math.pow(2, attempt) : 1000 * Math.pow(2, attempt);
        console.warn(`[AI] ${label} attempt ${attempt + 1} failed (${err.status || err.message}), retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }
      // Re-throw non-retryable or final attempt
      throw err;
    }
  }
  // Should never reach here
  throw new Error(`[AI] ${label} exhausted retries`);
}

export async function generateContent(params: GenerateContentParams): Promise<AiProviderResult | null> {
  const config = getProviderConfig();

  if (!hasAnyKey(config)) {
    console.warn('[AI] No API keys configured — falling back to template generation');
    return null;
  }

  const provider = config.provider;
  const timeout = params.timeout ?? AI_TIMEOUT_MS;

  switch (provider) {
    case 'openai': {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: config.openaiKey });
      const messages: any[] = [];
      if (params.systemInstruction) {
        messages.push({ role: 'system', content: params.systemInstruction });
      }
      messages.push({ role: 'user', content: params.prompt });
      const response = await withTimeout(
        retryWithBackoff(() =>
          client.chat.completions.create({
            model: 'gpt-4o',
            messages,
            temperature: params.temperature ?? 0.8,
            max_tokens: params.maxOutputTokens ?? 1500,
          }),
          'openai'
        ),
        timeout,
        'openai'
      );
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

      const model = params.deepseekModel || 'deepseek-v4-flash';
      const body: any = {
        model,
        messages,
        temperature: params.temperature ?? 0.8,
        max_tokens: params.maxOutputTokens ?? 1500,
      };

      // Thinking mode only on deepseek-v4-pro
      if (params.thinking && model === 'deepseek-v4-pro') {
        body.thinking = { type: 'enabled' };
        if (params.reasoningEffort) {
          body.reasoning_effort = params.reasoningEffort;
        }
      }

      const response = await withTimeout(
        retryWithBackoff(() => client.chat.completions.create(body), 'deepseek'),
        timeout,
        'deepseek'
      );
      const text = response.choices?.[0]?.message?.content || '';
      // If thinking mode was used, include thinking content if available
      const thinkingContent = response.choices?.[0]?.message as any;
      return {
        text,
        provider: 'deepseek',
        thinking: thinkingContent?.thinking || undefined,
      };
    }

    case 'gemini': {
      const { GoogleGenAI } = await import('@google/genai');
      const client = new GoogleGenAI({ apiKey: config.geminiKey });
      const contents = params.systemInstruction
        ? `System: ${params.systemInstruction}\n\n${params.prompt}`
        : params.prompt;
      const response = await withTimeout(
        retryWithBackoff(() =>
          client.models.generateContent({
            model: 'gemini-2.0-flash',
            contents,
            config: {
              temperature: params.temperature ?? 0.8,
              maxOutputTokens: params.maxOutputTokens ?? 1500,
            },
          }),
          'gemini'
        ),
        timeout,
        'gemini'
      );
      return { text: response.text || '', provider: 'gemini' };
    }

    default:
      console.warn(`[AI] Unknown provider: ${provider}`);
      return null;
  }
}
