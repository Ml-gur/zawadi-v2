export type AiProvider = 'openai' | 'deepseek' | 'gemini';

export interface AiProviderConfig {
  provider: AiProvider;
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

const DEFAULT_PROVIDER = (import.meta.env.VITE_AI_PROVIDER as AiProvider) || 'gemini';

/**
 * Provider selection and API keys live server-side in /api/ai-generate.
 * The client never sees or sends key material — it only names a provider.
 */
export function getDefaultConfig(): AiProviderConfig {
  return { provider: DEFAULT_PROVIDER };
}

export function hasAnyKey(_config?: AiProviderConfig): boolean {
  // Keys are held by the serverless proxy; availability is discovered per-call.
  return true;
}

export function setProviderConfig(config: Partial<AiProviderConfig>): void {}

export function getProviderConfig(): AiProviderConfig {
  return { provider: DEFAULT_PROVIDER };
}

const AI_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function postToProxy(params: GenerateContentParams, signalTimeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), signalTimeoutMs);
  try {
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/ai-generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        provider: params.deepseekModel === 'deepseek-v4-pro' ? 'deepseek' : undefined,
        systemInstruction: params.systemInstruction,
        prompt: params.prompt,
        temperature: params.temperature,
        maxOutputTokens: params.maxOutputTokens,
        deepseekModel: params.deepseekModel,
        reasoningEffort: params.reasoningEffort,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = new Error(`AI proxy error ${res.status}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return (await res.json()) as { text: string; provider: AiProvider; thinking?: string };
  } finally {
    clearTimeout(timer);
  }
}

export async function generateContent(params: GenerateContentParams): Promise<AiProviderResult | null> {
  const timeout = params.timeout ?? AI_TIMEOUT_MS;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await postToProxy(params, timeout);
    } catch (err: any) {
      const isRateLimit = err?.status === 429 || (err?.message || '').includes('rate limit');
      const isServerError = err?.status && err.status >= 500 && err.status < 600;
      if ((isRateLimit || isServerError) && attempt < MAX_RETRIES) {
        const delay = isRateLimit ? 2000 * Math.pow(2, attempt) : 1000 * Math.pow(2, attempt);
        console.warn(`[AI] attempt ${attempt + 1} failed (${err.status || err.message}), retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }
      if (err?.name === 'AbortError') throw new Error('[AI] request timed out');
      throw err;
    }
  }
  throw new Error('[AI] exhausted retries');
}
