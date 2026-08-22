const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callProvider(provider, params) {
  const systemInstruction = params.systemInstruction;
  const prompt = params.prompt;
  const temperature = typeof params.temperature === 'number' ? params.temperature : 0.8;
  const maxTokens = params.maxOutputTokens || 1500;

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const { provider: requestedProvider, systemInstruction, prompt, temperature, maxOutputTokens, deepseekModel, reasoningEffort } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length > 32_000) {
    return res.status(400).json({ error: 'Invalid or missing prompt' });
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
