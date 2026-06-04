import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AiConfigRow {
  provider?: string
  openai_key?: string | null
  deepseek_key?: string | null
  gemini_key?: string | null
  ai_model?: string | null
  ai_temperature_draft?: number | null
  ai_temperature_critique?: number | null
  ai_temperature_polish?: number | null
  ai_max_tokens_essay?: number | null
  ai_max_tokens_critique?: number | null
}

async function fetchAiConfig(supabase: ReturnType<typeof createClient>): Promise<AiConfigRow | null> {
  try {
    const { data, error } = await supabase
      .from('ai_config')
      .select('*')
      .eq('id', 'default')
      .maybeSingle()
    if (error || !data) return null
    return data as AiConfigRow
  } catch {
    return null
  }
}

async function callDeepSeek(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  temperature: number,
  maxOutputTokens: number,
  model: string,
): Promise<string> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxOutputTokens,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`DeepSeek API error ${res.status}: ${errText}`)
  }
  const json = await res.json()
  const text = json?.choices?.[0]?.message?.content || ''
  if (text) return text
  throw new Error('DeepSeek returned empty response')
}

async function callAiProvider(
  cfg: AiConfigRow | null,
  systemInstruction: string,
  userPrompt: string,
  temperature: number,
  maxOutputTokens: number,
  modelOverride?: string,
): Promise<string> {
  const hasDeepSeek = !!(cfg?.deepseek_key || Deno.env.get('DEEPSEEK_API_KEY'))
  const hasOpenAI = !!(cfg?.openai_key || Deno.env.get('OPENAI_API_KEY'))
  const hasGemini = !!(cfg?.gemini_key || Deno.env.get('GOOGLE_API_KEY'))

  const configured = cfg?.provider
  const provider = configured && (
    (configured === 'deepseek' && hasDeepSeek) ||
    (configured === 'openai' && hasOpenAI) ||
    (configured === 'gemini' && hasGemini)
  ) ? configured : hasDeepSeek ? 'deepseek' : hasOpenAI ? 'openai' : 'gemini'

  const lastErr: string[] = []

  async function tryDeepSeek(): Promise<string | null> {
    const apiKey = cfg?.deepseek_key || Deno.env.get('DEEPSEEK_API_KEY') || ''
    if (!apiKey) return null
    try {
      const model = modelOverride || cfg?.ai_model || 'deepseek-v4-flash'
      return await callDeepSeek(apiKey, systemInstruction, userPrompt, temperature, maxOutputTokens, model)
    } catch (e: any) {
      lastErr.push(`deepseek: ${e.message}`)
      return null
    }
  }

  async function tryOpenAI(): Promise<string | null> {
    const apiKey = cfg?.openai_key || Deno.env.get('OPENAI_API_KEY') || ''
    if (!apiKey) return null
    try {
      const model = modelOverride || cfg?.ai_model || 'gpt-4o'
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxOutputTokens,
        }),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`OpenAI API error ${res.status}: ${errText}`)
      }
      const json = await res.json()
      const text = json?.choices?.[0]?.message?.content || ''
      if (text) return text
    } catch (e: any) {
      lastErr.push(`openai: ${e.message}`)
    }
    return null
  }

  async function tryGemini(): Promise<string | null> {
    const geminiKey = cfg?.gemini_key || Deno.env.get('GOOGLE_API_KEY') || ''
    if (!geminiKey) return null
    try {
      const { GoogleGenAI } = await import('https://esm.sh/@google/genai')
      const genAI = new GoogleGenAI({ apiKey: geminiKey })
      const model = modelOverride || cfg?.ai_model || 'gemini-2.5-flash'
      const result = await genAI.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: { systemInstruction, temperature, maxOutputTokens },
      })
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (text) return text
    } catch (e: any) {
      lastErr.push(`gemini: ${e.message}`)
    }
    return null
  }

  // Try providers in preference order
  const attempts: (() => Promise<string | null>)[] = []
  if (provider === 'deepseek') attempts.push(tryDeepSeek, tryOpenAI, tryGemini)
  else if (provider === 'openai') attempts.push(tryOpenAI, tryDeepSeek, tryGemini)
  else attempts.push(tryGemini, tryDeepSeek, tryOpenAI)

  for (const attempt of attempts) {
    const result = await attempt()
    if (result) return result
  }

  throw new Error(`All AI providers failed: ${lastErr.join('; ')}`)
}

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

const PLAN_LIMITS: Record<string, number> = {
  explorer: 3,
  plus: 10,
  pro: 25,
  institutional: 9999,
}

const PLAN_LABELS: Record<string, string> = {
  explorer: 'Explorer',
  plus: 'Scholar Plus',
  pro: 'Application Pro',
  institutional: 'Zawadi Institutional',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return corsResponse({ error: 'Authentication required' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return corsResponse({ error: 'Invalid or expired token' }, 401)
    const userEmail = user.email!

    const body = await req.json()
    const action = body.action || 'generate'

    if (action === 'generate') {
      return handleGenerateEssay(supabase, userEmail, body)
    }
    if (action === 'match-rationale') {
      return handleMatchRationale(supabase, userEmail, body)
    }

    return corsResponse({ error: `Unknown action: ${action}` }, 400)
  } catch (err: any) {
    console.error('[generate-essay] Unhandled error:', err.message)
    return corsResponse({ error: 'Internal server error: ' + err.message }, 500)
  }
})

async function handleGenerateEssay(
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  const {
    essay_type, scholarship_name, prompt, stage, previous_content,
    notes, word_count, document_ids, provider: reqProvider
  } = body

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', userEmail)
    .single()

  if (profileErr || !profile) return corsResponse({ error: 'User profile not found' }, 404)

  const plan = profile.plan || 'explorer'
  const limit = PLAN_LIMITS[plan] ?? 3

  const todayStart = new Date().toISOString().split('T')[0]
  const { count: genCount, error: countErr } = await supabase
    .from('essays')
    .select('*', { count: 'exact', head: true })
    .eq('user_email', userEmail)
    .gte('created_at', todayStart)

  const dailyCount = genCount ?? 0
  if (dailyCount >= limit) {
    const upgradePlan = plan === 'explorer' ? 'plus' : plan === 'plus' ? 'pro' : ''
    const nextLabel = upgradePlan ? PLAN_LABELS[upgradePlan] : ''
    const nextLimit = upgradePlan ? PLAN_LIMITS[upgradePlan] : 0
    return corsResponse({
      error: `You've used all ${limit} essay generations available today on the ${PLAN_LABELS[plan]} plan.${nextLabel ? ` Upgrade to ${nextLabel} (${nextLimit} per day) for more generations.` : ''}`,
      daily_limit: limit,
      plan,
      upgrade_to: upgradePlan || null,
    }, 430)
  }

  let documentContext = ''
  if (document_ids && Array.isArray(document_ids) && document_ids.length > 0) {
    const docContexts: string[] = []
    for (const docId of document_ids) {
      const { data: doc } = await supabase
        .from('documents')
        .select('*')
        .eq('id', docId)
        .eq('user_email', userEmail)
        .single()
      if (!doc?.ai_extraction_result) continue
      let parsed: any = null
      try {
        parsed = typeof doc.ai_extraction_result === 'string'
          ? JSON.parse(doc.ai_extraction_result)
          : doc.ai_extraction_result
      } catch { continue }
      const data = parsed?.data || parsed
      if (data && typeof data === 'object') {
        const lines: string[] = [`--- From ${doc.name || docId} (${doc.type || 'document'}) ---`]
        for (const [k, v] of Object.entries(data)) {
          if (v !== null && v !== undefined && v !== '') {
            lines.push(`  ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          }
        }
        docContexts.push(lines.join('\n'))
      }
    }
    if (docContexts.length > 0) {
      documentContext = '\nDocument-based evidence for your essay (use these facts, do not fabricate):\n' + docContexts.join('\n\n')
    }
  }

  const userCountry = profile.country || 'your country'
  const userField = profile.field_of_study || 'your field'
  const userDegree = profile.degree_level || 'graduate'
  const userNotes = prompt || notes || ''
  const userName = profile.name || 'the applicant'
  const hasResearch = profile.has_research
  const hasLeadership = profile.has_leadership
  const workYrs = profile.work_experience_years

  const aiConfig = await fetchAiConfig(supabase)
  let generatedText = ''

  let systemInstruction = ''
  let userPrompt = ''
  let temperature = 0.8
  let maxOutputTokens = 1500

  if (stage === 'draft') {
    systemInstruction = `You are Zawadi, an expert scholarship essay coach helping African students write compelling statements of purpose.
You generate high-quality, personalized scholarship essays based on the student's background and the specific scholarship.
The student is from ${userCountry}, pursuing a ${userDegree} in ${userField}.
Use their provided notes to write an authentic, persuasive essay.
Write in first person from the student's perspective. Tone: confident, humble, mission-driven.
Ground all claims in the document-based evidence provided — never fabricate GPA, institutions, degrees, or other factual details.`

    userPrompt = `Write a ${essay_type || 'Personal Statement'} essay for the "${scholarship_name}" scholarship.

Student background:
- Name: ${userName}
- Country: ${userCountry}
- Degree level: ${userDegree}
- Field of study: ${userField}
${hasResearch ? '- Has research experience' : ''}
${hasLeadership ? '- Has leadership experience' : ''}
${workYrs ? `- ${workYrs} years of work experience` : ''}
${documentContext}

Student's personal notes: ${userNotes || 'The student has strong academic credentials and a desire to return to Africa after studies.'}

Instructions: Write a complete, compelling essay of approximately ${word_count || 500} words.`
    temperature = aiConfig?.ai_temperature_draft ?? 0.8
    maxOutputTokens = aiConfig?.ai_max_tokens_essay ?? 1500
  } else if (stage === 'critique') {
    const targetText = previous_content || prompt || ''
    userPrompt = `You are an expert scholarship essay reviewer. Analyze the following draft essay for the "${scholarship_name}" scholarship.
1) Strengths (2-3 specific points)
2) Areas for improvement (2-3 specific points with suggestions)
3) One rewritten opening paragraph

The student is from ${userCountry}, studying ${userField} at the ${userDegree} level.
${documentContext ? '\nNote: The student has uploaded documents containing these verified facts — check the essay for alignment:\n' + documentContext : ''}

DRAFT ESSAY: ${targetText}`
    temperature = aiConfig?.ai_temperature_critique ?? 0.5
    maxOutputTokens = aiConfig?.ai_max_tokens_critique ?? 1000
  } else if (stage === 'polish') {
    const baseText = previous_content || prompt || ''
    userPrompt = `You are an expert academic editor. Polish the following essay for the "${scholarship_name}" scholarship.
Improve clarity, flow, grammar, and impact while preserving the student's authentic voice.
Fix grammatical errors. Strengthen weak verbs. Improve sentence variety.
Do not change the core meaning or add fictional details.

ESSAY TO POLISH: ${baseText}`
    temperature = aiConfig?.ai_temperature_polish ?? 0.3
    maxOutputTokens = aiConfig?.ai_max_tokens_essay ?? 1500
  }

  const effectiveModel = reqProvider || undefined

  try {
    generatedText = await callAiProvider(
      aiConfig,
      systemInstruction,
      userPrompt,
      temperature,
      maxOutputTokens,
      effectiveModel,
    )
  } catch (err: any) {
    console.error('AI generation failed:', err.message)
  }

  if (!generatedText) {
    const sentences = (prompt || notes || '').split(/[.!?\n]+/).filter((s: string) => s.trim().length > 10)
    const userBackground = sentences.length > 0 ? sentences.slice(0, 2).join('. ') : 'your unique background'
    const userGoals = sentences.length > 1 ? sentences[sentences.length - 1] : 'your career goals'

    if (stage === 'draft') {
      generatedText = `Statement of Purpose — ${scholarship_name}\n\nGrowing up in ${userCountry}, I have always been driven by a desire to create meaningful change within my community and beyond. My journey in ${userField} began with a curiosity that has since matured into a focused commitment to addressing real-world challenges.\n\nBackground & Motivation: ${userBackground || `My academic journey in ${userField} has equipped me with a strong foundation to tackle complex problems.`}\n\nGoals & Vision: ${userGoals || `My goal is to leverage training from this program to develop innovative solutions in ${userField} for communities across ${userCountry} and broader Africa.`}\n\nWhy This Scholarship: The ${scholarship_name} represents a unique opportunity to gain world-class training and bring that knowledge back to where it is needed most.\n\nSincerely, ${userName}`
    } else if (stage === 'critique') {
      generatedText = `### Critique Analysis for ${scholarship_name}\n\n**Strengths:** Personal narrative from ${userCountry} provides authentic perspective. Focus on ${userField} aligns well with scholarship goals.\n\n**Areas for Improvement:** Consider adding more specific examples. Strengthen the connection between past experience and future goals.\n\n**Next Steps:** Proceed to the Polish stage for final refinements.`
    } else if (stage === 'polish') {
      const baseText = previous_content || prompt || ''
      generatedText = baseText.length > 50 ? `Polished version:\n\n${baseText}` : `As a dedicated ${userDegree} candidate from ${userCountry} focused on ${userField}, my journey has been defined by a commitment to driving meaningful change.`
    }
  }

  let savedId = 'ess-' + Date.now()
  if (stage === 'draft' || stage === 'critique' || stage === 'polish') {
    const { data: existing } = await supabase
      .from('essays')
      .select('*')
      .eq('user_email', userEmail)
      .eq('scholarship_name', scholarship_name || '')
      .maybeSingle()

    const payload: Record<string, unknown> = {
      user_email: userEmail,
      scholarship_name: scholarship_name || 'General Scholarship',
      essay_type: essay_type || 'Personal Statement',
      prompt: prompt || 'Write a personal essay',
      stage,
      created_at: todayStart,
    }

    if (existing) {
      const updates: Record<string, unknown> = { stage }
      if (stage === 'draft') updates.draft = generatedText
      else if (stage === 'critique') updates.critique = generatedText
      else updates.final = generatedText
      const { error: updateErr } = await supabase.from('essays').update(updates).eq('id', existing.id)
      if (updateErr) console.error('[generate-essay] Failed to update essay:', updateErr.message)
      savedId = existing.id
    } else {
      payload.id = savedId
      if (stage === 'draft') payload.draft = generatedText
      else if (stage === 'critique') payload.critique = generatedText
      else payload.final = generatedText
      const { error: insertErr } = await supabase.from('essays').insert(payload)
      if (insertErr) console.error('[generate-essay] Failed to insert essay:', insertErr.message)
    }
  }

  return corsResponse({
    id: savedId,
    content: generatedText,
    stage,
    remaining_today: Math.max(0, limit - dailyCount - 1),
    daily_limit: limit,
    plan,
  })
}

async function handleMatchRationale(
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  const { scholarship_id } = body
  if (!scholarship_id) return corsResponse({ error: 'scholarship_id required' }, 400)

  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', userEmail)
    .single()

  if (!user) return corsResponse({ error: 'User not found' }, 404)

  const { data: schol } = await supabase
    .from('scholarships')
    .select('*')
    .eq('id', scholarship_id)
    .single()

  if (!schol) return corsResponse({ error: 'Scholarship not found' }, 404)

  const matchFields: string[] = []
  if (schol.countries && Array.isArray(schol.countries)) {
    const userCountry = user.country?.toLowerCase()
    if (schol.countries.some((c: string) =>
      c.toLowerCase() === 'global' ||
      c.toLowerCase() === 'pan-african' ||
      c.toLowerCase() === userCountry
    )) matchFields.push('country')
  }
  if (schol.degree_levels && Array.isArray(schol.degree_levels)) {
    if (schol.degree_levels.some((d: string) =>
      d.toLowerCase() === user.degree_level?.toLowerCase()
    )) matchFields.push('degree')
  }
  const matchScore = matchFields.length > 0 ? Math.min(40 + matchFields.length * 20, 90) : 20
  const isEligible = matchFields.length >= 2

  const aiConfig = await fetchAiConfig(supabase)
  let rationale: any = { summary: 'AI rationale unavailable — no AI provider configured.' }

  try {
    const systemPrompt = 'You are a scholarship matching advisor. Explain why a student matches (or does not match) a specific scholarship. Be specific, constructive, and actionable. Return ONLY valid JSON with keys: summary (2-3 sentence overall assessment), strengths (array of strings), weaknesses (array of strings or empty), suggestions (array of actionable suggestions). No markdown, no code fences.'

    const userPrompt = `Student Profile:
- Name: ${user.name || 'N/A'}
- Country: ${user.country || 'N/A'}
- Degree Level: ${user.degree_level || 'N/A'}
- Field: ${user.field_of_study || 'N/A'}
- GPA: ${user.gpa || 'N/A'}

Scholarship:
- Name: ${schol.name || 'N/A'}
- Provider: ${schol.provider || 'N/A'}
- Degree Levels: ${Array.isArray(schol.degree_levels) ? schol.degree_levels.join(', ') : schol.degree_levels || 'N/A'}
- Fields: ${Array.isArray(schol.fields_of_study || schol.fields) ? (schol.fields_of_study || schol.fields).join(', ') : 'N/A'}
- Countries: ${Array.isArray(schol.countries) ? schol.countries.join(', ') : schol.countries || 'N/A'}
- Funding: ${schol.funding_type || 'N/A'}
- Deadline: ${schol.deadline || 'N/A'}

Match Score: ${matchScore}/100
Eligible: ${isEligible ? 'Yes' : 'No'}`

    const text = await callAiProvider(
      aiConfig,
      systemPrompt,
      userPrompt,
      0.3,
      1024,
    )
    if (text) {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try { rationale = JSON.parse(jsonMatch[0]) } catch {}
      }
    }
  } catch (err: any) {
    console.error('[Match Rationale] AI error:', err.message)
  }

  return corsResponse({
    match: {
      score: matchScore,
      is_eligible: isEligible,
      reasons: matchFields.map((f: string) => `Matches on ${f}`),
      breakdown: {},
    },
    rationale,
  })
}
