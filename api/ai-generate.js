import { createClient } from '@supabase/supabase-js';

const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 15;

// In-memory rate limiting map
const ipRequestCounts = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = ipRequestCounts.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
    ipRequestCounts.set(ip, entry);
    return false;
  }

  entry.count += 1;
  ipRequestCounts.set(ip, entry);
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

/** Verify the caller's Supabase session server-side; returns user email or null. */
async function authenticate(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token || token.length > 4096) return null;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;
  try {
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRequestCounts.entries()) {
    if (now > entry.resetAt) ipRequestCounts.delete(ip);
  }
}, 300_000);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callProvider(provider, params) {
  const systemInstruction = params.systemInstruction;
  const prompt = params.prompt;
  const temperature = typeof params.temperature === 'number' ? params.temperature : 0.8;
  const maxTokens = Math.min(params.maxOutputTokens || 1500, 4000);

  if (provider === 'openai') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw Object.assign(new Error('OPENAI_API_KEY not configured'), { status: 500 });
    const messages = [];
    if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
    messages.push({ role: 'user', content: prompt });
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-4o', messages, temperature, max_tokens: maxTokens }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw Object.assign(new Error(`OpenAI error ${res.status}`), { status: res.status });
    const data = await res.json();
    return { text: data.choices?.[0]?.message?.content || '', thinking: undefined };
  }

  if (provider === 'deepseek') {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw Object.assign(new Error('DEEPSEEK_API_KEY not configured'), { status: 500 });
    const messages = [];
    if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
    messages.push({ role: 'user', content: prompt });
    const model = params.deepseekModel === 'deepseek-v4-pro' ? 'deepseek-reasoner' : 'deepseek-chat';
    const body = { model, messages, temperature, max_tokens: maxTokens };
    if (params.thinking && model === 'deepseek-reasoner' && params.reasoningEffort) {
      body.reasoning_effort = params.reasoningEffort;
    }
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw Object.assign(new Error(`DeepSeek error ${res.status}`), { status: res.status });
    const data = await res.json();
    const message = data.choices?.[0]?.message || {};
    return { text: message.content || '', thinking: message.reasoning_content || undefined };
  }

  if (provider === 'gemini') {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw Object.assign(new Error('GOOGLE_API_KEY not configured'), { status: 500 });
    const contents = systemInstruction
      ? `System: ${systemInstruction}\n\n${prompt}`
      : prompt;
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contents }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );
    if (!res.ok) throw Object.assign(new Error(`Gemini error ${res.status}`), { status: res.status });
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || '';
    return { text, thinking: undefined };
  }

  throw Object.assign(new Error(`Unknown provider: ${provider}`), { status: 400 });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Bill-abuse guard: only signed-in scholars may spend AI credits.
  const user = await authenticate(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Sign in to use the AI studio.' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(`${user.id}:${clientIp}`)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute before requesting AI generations.' });
  }

  const { provider: requestedProvider, systemInstruction, prompt, temperature, maxOutputTokens, deepseekModel, reasoningEffort } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length > 20_000) {
    return res.status(400).json({ error: 'Invalid or missing prompt (max 20,000 chars)' });
  }

  let provider = requestedProvider;
  if (!provider || provider === 'default') {
    provider = process.env.AI_PROVIDER || 'gemini';
  }
  if (!['openai', 'deepseek', 'gemini'].includes(provider)) {
    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await callProvider(provider, { systemInstruction, prompt, temperature, maxOutputTokens, deepseekModel, reasoningEffort });
      return res.status(200).json({ ...result, provider });
    } catch (err) {
      const status = err?.status || 500;
      const retryable = status === 429 || (status >= 500 && status < 600);
      if (retryable && attempt < MAX_RETRIES) {
        const delay = status === 429 ? 2000 * Math.pow(2, attempt) : 1000 * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
      console.error(`[ai-generate] ${provider} failed:`, err?.message);
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: 'AI generation failed. Please try again shortly.',
      });
    }
  }
}

