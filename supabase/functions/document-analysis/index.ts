import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function corsResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const TRANSCRIPT_PROMPT = `You are a document analysis specialist. Extract structured academic data from this transcript text. Return ONLY valid JSON with these fields: institution_name as string or null, degree_level as "Undergraduate" or "Masters" or "PhD" or null, field_of_study as string or null, gpa as number or null, gpa_scale as 4.0 or 5.0 or 100 or null, graduation_year as integer or null, honors as string or null. Never guess. Return null for any field not clearly visible. No markdown, no code fences, just JSON.`

const CV_PROMPT = `Extract structured professional data from this CV text. Return ONLY valid JSON with: work_experience_years as integer or null, primary_field as string or null, skills as string array, leadership_roles as string array, publications_count as integer or null, languages as string array. No markdown, no code fences, just JSON.`

const ESSAY_PROMPT = `Analyze this personal statement or essay as a writing sample. Return ONLY valid JSON with: approximate_word_count as integer, tone as "formal" or "conversational" or "mixed", sentence_complexity as "simple" or "moderate" or "complex", key_themes as string array of up to 5 themes, vocabulary_level as "basic" or "intermediate" or "advanced", writing_sample_excerpt as the most distinctive 100 word excerpt. No markdown, no code fences, just JSON.`

const REFERENCE_LETTER_PROMPT = `Analyze this reference / recommendation letter. Return ONLY valid JSON with: relationship as string (e.g. "professor", "employer", "mentor"), sentiment as "strongly_positive" or "positive" or "neutral" or "mixed", key_strengths as string array of up to 6 qualities mentioned, acquaintance_duration_years as number or null, recommender_title as string or null, contains_qualifiers as boolean (does it include any hedging or weak praise). No markdown, no code fences, just JSON.`

const CERTIFICATE_PROMPT = `Extract structured data from this certificate or award document. Return ONLY valid JSON with: institution_name as string or null, certificate_name as string or null, issue_date as string or null, expiry_date as string or null, grade as string or null, is_academic as boolean, is_professional as boolean. No markdown, no code fences, just JSON.`

function getPromptForType(docType: string): string | null {
  const t = docType.toLowerCase()
  if (t.includes('transcript')) return TRANSCRIPT_PROMPT
  if (t.includes('personal statement') || t.includes('motivation') || t.includes('statement of purpose') || t.includes('essay')) return ESSAY_PROMPT
  if (t.includes('cv') || t.includes('resume')) return CV_PROMPT
  if (t.includes('reference letter') || t.includes('recommendation')) return REFERENCE_LETTER_PROMPT
  if (t.includes('certificate') || t.includes('award') || t.includes('diploma')) return CERTIFICATE_PROMPT
  return null
}

async function callDeepSeek(systemPrompt: string, textContent: string): Promise<string | null> {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
  if (!apiKey) return null
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `DOCUMENT TEXT:\n\n${textContent.substring(0, 15000)}\n\n---\n\nExtract the requested information as JSON from the document above.` },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('[document-analysis] DeepSeek API error:', res.status, errText)
      return null
    }
    const json = await res.json()
    return json?.choices?.[0]?.message?.content || null
  } catch (err) {
    console.error('[document-analysis] DeepSeek call failed:', err)
    return null
  }
}

function tryParseJson(text: string): any | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]) } catch {}
  }
  return null
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
    const { documentId, docType, textContent, action } = body

    if (action === 'analyze') {
      if (!documentId || !docType || !textContent) {
        return corsResponse({ error: 'documentId, docType, and textContent are required' }, 400)
      }

      const systemPrompt = getPromptForType(docType)
      if (!systemPrompt) {
        return corsResponse({ error: `Unsupported document type: ${docType}` }, 400)
      }

      const rawResult = await callDeepSeek(systemPrompt, textContent)
      if (!rawResult) {
        return corsResponse({ error: 'AI analysis failed — no result returned' }, 500)
      }

      const parsed = tryParseJson(rawResult)
      if (!parsed) {
        return corsResponse({ error: 'AI returned invalid JSON', raw: rawResult }, 500)
      }

      const extractionMeta = { method: 'deepseek-ai', confidence: 90 }
      const now = new Date().toISOString()

      const { error: updateErr } = await supabase
        .from('documents')
        .update({
          ai_extraction_result: { data: parsed, extraction: extractionMeta },
          analysis_status: 'completed',
          last_analyzed_at: now,
          analysis_error: null,
        })
        .eq('id', documentId)
        .eq('user_email', userEmail)

      if (updateErr) {
        console.error('[document-analysis] DB update failed:', updateErr.message)
        return corsResponse({ error: 'Failed to save analysis results' }, 500)
      }

      // Build profile enrichment
      const enrichment: Record<string, unknown> = {
        doc_extraction_method: extractionMeta.method,
        doc_extraction_confidence: extractionMeta.confidence,
      }

      if (docType.toLowerCase().includes('transcript')) {
        enrichment.doc_gpa_normalised_extracted = parsed.gpa ?? null
        enrichment.doc_institution_extracted = parsed.institution_name ?? null
        enrichment.doc_field_of_study_extracted = parsed.field_of_study ?? null
        enrichment.doc_degree_level_extracted = parsed.degree_level ?? null
        enrichment.doc_honors_extracted = parsed.honors ?? null
      }

      if (docType.toLowerCase().includes('cv') || docType.toLowerCase().includes('resume')) {
        enrichment.doc_work_years_extracted = parsed.work_experience_years ?? null
        enrichment.doc_has_research_extracted = (parsed.publications_count ?? 0) > 0
        enrichment.doc_publication_count_extracted = parsed.publications_count ?? null
        enrichment.doc_has_leadership_extracted = (parsed.leadership_roles?.length ?? 0) > 0
        enrichment.doc_skills_extracted = parsed.skills ?? []
        enrichment.doc_languages_extracted = parsed.languages ?? []
        enrichment.doc_field_of_study_extracted = parsed.primary_field ?? null
      }

      // Merge enrichment into profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .single()

      if (profile) {
        const profileUpdate: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(enrichment)) {
          if (val !== null && val !== undefined) {
            profileUpdate[key] = val
          }
        }
        if (enrichment.doc_gpa_normalised_extracted) {
          const current = profile.gpa ? parseFloat(profile.gpa) : null
          if (!current || (enrichment.doc_gpa_normalised_extracted as number) > current) {
            profileUpdate.gpa = enrichment.doc_gpa_normalised_extracted
          }
        }
        if (enrichment.doc_institution_extracted && !profile.institution) {
          profileUpdate.institution = enrichment.doc_institution_extracted
        }
        if (enrichment.doc_field_of_study_extracted && !profile.field_of_study) {
          profileUpdate.field_of_study = enrichment.doc_field_of_study_extracted
        }
        if (enrichment.doc_degree_level_extracted && !profile.degree_level) {
          profileUpdate.degree_level = enrichment.doc_degree_level_extracted
        }
        if (Object.keys(profileUpdate).length > 0) {
          await supabase.from('profiles').update(profileUpdate).eq('email', userEmail)
        }
      }

      return corsResponse({
        success: true,
        result: parsed,
        extraction: extractionMeta,
        enrichment,
      })
    }

    if (action === 'status') {
      const { data: docs, error: docsErr } = await supabase
        .from('documents')
        .select('id, name, type, analysis_status, last_analyzed_at, analysis_error')
        .eq('user_email', userEmail)

      if (docsErr) return corsResponse({ error: docsErr.message }, 500)

      return corsResponse({ documents: docs })
    }

    return corsResponse({ error: `Unknown action: ${action}` }, 400)
  } catch (err: any) {
    console.error('[document-analysis] Unhandled error:', err.message)
    return corsResponse({ error: 'Internal server error: ' + err.message }, 500)
  }
})
