import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function corsResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ─── Valid providers ──────────────────────────────────────────────
const VALID_PROVIDERS = ['openai', 'deepseek', 'gemini']

// ─── Mask helper ──────────────────────────────────────────────────
function maskKey(key: string | null | undefined): string {
  if (!key || key.length < 12) return key || ''
  return `${key.substring(0, 8)}...${key.slice(-4)}`
}

// ─── Main handler ─────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Auth required — admin only
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return corsResponse({ error: 'Authentication required' }, 401)

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return corsResponse({ error: 'Invalid or expired token' }, 401)

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', user.email)
      .single()

    if (profile?.role !== 'super_admin' && profile?.role !== 'content_manager') {
      return corsResponse({ error: 'Admin access required' }, 403)
    }

    if (req.method === 'GET') return handleGetConfig(supabase)
    if (req.method === 'PUT') return handleUpdateConfig(supabase, await req.json())
    if (req.method === 'POST') return handleUpdateConfig(supabase, await req.json())

    return corsResponse({ error: 'Method not allowed' }, 405)
  } catch (err: any) {
    console.error('[admin-settings] Error:', err.message)
    return corsResponse({ error: 'Internal server error: ' + err.message }, 500)
  }
})

// ─── GET AI Config ────────────────────────────────────────────────
async function handleGetConfig(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from('ai_config')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()

  if (error) return corsResponse({ error: error.message }, 500)

  if (data) {
    return corsResponse({
      provider: data.provider || 'gemini',
      openai_key: maskKey(data.openai_key),
      deepseek_key: maskKey(data.deepseek_key),
      gemini_key: maskKey(data.gemini_key),
      has_openai: !!data.openai_key,
      has_deepseek: !!data.deepseek_key,
      has_gemini: !!data.gemini_key,
      // Include additional AI config fields
      ai_temperature_draft: data.ai_temperature_draft ?? 0.8,
      ai_temperature_critique: data.ai_temperature_critique ?? 0.5,
      ai_temperature_polish: data.ai_temperature_polish ?? 0.3,
      ai_max_tokens_essay: data.ai_max_tokens_essay ?? 1500,
      ai_max_tokens_critique: data.ai_max_tokens_critique ?? 1000,
      ai_model: data.ai_model || 'gemini-2.5-flash',
      updated_at: data.updated_at,
    })
  }

  // Fallback: read from environment
  const geminiKey = Deno.env.get('GOOGLE_API_KEY') || ''
  const openaiKey = Deno.env.get('OPENAI_API_KEY') || ''
  const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY') || ''

  return corsResponse({
    provider: Deno.env.get('AI_PROVIDER') || 'gemini',
    openai_key: maskKey(openaiKey),
    deepseek_key: maskKey(deepseekKey),
    gemini_key: maskKey(geminiKey),
    has_openai: !!(openaiKey && openaiKey !== 'your_api_key_here'),
    has_deepseek: !!(deepseekKey && deepseekKey !== 'your_deepseek_api_key_from_platform_deepseek_com'),
    has_gemini: !!(geminiKey && geminiKey !== 'your_api_key_here'),
    source: 'environment',
  })
}

// ─── PUT / POST Update AI Config ──────────────────────────────────
async function handleUpdateConfig(
  supabase: ReturnType<typeof createClient>,
  body: any
) {
  const { provider, openai_key, deepseek_key, gemini_key, ai_model,
    ai_temperature_draft, ai_temperature_critique, ai_temperature_polish,
    ai_max_tokens_essay, ai_max_tokens_critique } = body

  // Validate provider
  if (provider && !VALID_PROVIDERS.includes(provider)) {
    return corsResponse({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` }, 400)
  }

  // Upsert to ai_config table
  const { data: existing } = await supabase
    .from('ai_config')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (provider) updates.provider = provider
  if (openai_key) updates.openai_key = openai_key
  if (deepseek_key) updates.deepseek_key = deepseek_key
  if (gemini_key) updates.gemini_key = gemini_key
  if (ai_model) updates.ai_model = ai_model
  if (ai_temperature_draft !== undefined) updates.ai_temperature_draft = ai_temperature_draft
  if (ai_temperature_critique !== undefined) updates.ai_temperature_critique = ai_temperature_critique
  if (ai_temperature_polish !== undefined) updates.ai_temperature_polish = ai_temperature_polish
  if (ai_max_tokens_essay !== undefined) updates.ai_max_tokens_essay = ai_max_tokens_essay
  if (ai_max_tokens_critique !== undefined) updates.ai_max_tokens_critique = ai_max_tokens_critique

  if (existing) {
    const { error } = await supabase
      .from('ai_config')
      .update(updates)
      .eq('id', 'default')

    if (error) return corsResponse({ error: error.message }, 500)
  } else {
    const { error } = await supabase
      .from('ai_config')
      .insert({ id: 'default', ...updates })

    if (error) return corsResponse({ error: error.message }, 500)
  }

  // Fetch fresh config to return
  const { data: fresh } = await supabase
    .from('ai_config')
    .select('*')
    .eq('id', 'default')
    .single()

  // Audit log
  await supabase.from('audit_logs').insert({
    action: 'ai_config_updated',
    target_type: 'ai_config',
    target_id: 'default',
    details: `AI provider updated to ${provider || existing?.provider || 'gemini'}`,
    created_at: new Date().toISOString(),
  })

  return corsResponse({
    success: true,
    provider: fresh?.provider || provider || existing?.provider || 'gemini',
    has_openai: !!fresh?.openai_key,
    has_deepseek: !!fresh?.deepseek_key,
    has_gemini: !!fresh?.gemini_key,
    ai_model: fresh?.ai_model || 'gemini-2.5-flash',
  })
}
