import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
}

function corsResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ─── Crypto helper ────────────────────────────────────────────────
function sha256hex(input: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hash = crypto.subtle
    ? '' // Will be computed async below
    : ''
  return '' // Placeholder — actual hashing done inline
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Scholarship validation (simplified server-side validation) ───
function validateScholarship(schol: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!schol.name || String(schol.name).trim().length < 3) errors.push('Name is required (min 3 chars)')
  if (!schol.provider || String(schol.provider).trim().length < 2) errors.push('Provider is required')
  if (!schol.apply_url && !schol.source_url) errors.push('At least one URL (apply or source) is required')
  return { isValid: errors.length === 0, errors }
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

    // Auth: admin-only operations (the scheduled crawler authenticates via x-cron-secret instead)
    const authHeader = req.headers.get('Authorization')

    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {}
    const url = new URL(req.url)
    const action = body.action || url.searchParams.get('action')

    // Scheduled crawler: authenticated by shared secret instead of a user JWT
    const cronSecret = req.headers.get('x-cron-secret')
    const isCron = action === 'trigger' && cronSecret && cronSecret === Deno.env.get('CRON_SECRET')

    let userEmail = ''
    if (!isCron) {
      if (!authHeader) return corsResponse({ error: 'Authentication required' }, 401)
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      if (authError || !user) return corsResponse({ error: 'Invalid or expired token' }, 401)
      userEmail = user.email!

      // Check admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', user.email)
        .single()

      const isAdmin = profile?.role === 'super_admin' || profile?.role === 'content_manager'
      if (!isAdmin) return corsResponse({ error: 'Admin access required' }, 403)
    }

    if (action === 'ingest') return handleIngest(supabase, userEmail, body)
    if (action === 'trigger') return await handleTrigger(supabase)
    if (action === 'review') return handleReview(supabase, userEmail, body)
    if (action === 'run') return handleRun(supabase, body)
    if (action === 'stats') return handleStats(supabase)
    if (action === 'status') return handleStatus(supabase)
    if (action === 'bot-queue') return handleBotQueue(supabase, req)
    if (action === 'publish') return handlePublish(supabase, userEmail, body)

    return corsResponse({ error: `Unknown action: ${action}` }, 400)
  } catch (err: any) {
    console.error('[run-pipeline] Error:', err.message)
    return corsResponse({ error: 'Internal server error: ' + err.message }, 500)
  }
})

// ─── Scheduled crawler: discover + deep-extract scholarship info ──
const FEED_SOURCES = [
  'https://opportunitydesk.org/feed/',
  'https://www.scholarshippositions.com/feed/',
  'https://www.afterschoolafrica.com/feed/',
]

const AFRICAN_COUNTRY_NAMES = [
  'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cameroon','Cabo Verde','Central African Republic',
  'Chad','Comoros','Congo','DR Congo','Democratic Republic of the Congo','Cote d Ivoire',"Côte d'Ivoire",'Ivory Coast',
  'Djibouti','Egypt','Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau',
  'Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi','Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia',
  'Niger','Nigeria','Rwanda','Sao Tome and Principe','Senegal','Seychelles','Sierra Leone','Somalia','South Africa',
  'South Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe',
]

const MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december'

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractDeadline(text: string): string | null {
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december']
  const combined = new RegExp(
    `deadline\\s*:?\\s*[^.:]{0,60}?(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS})\\s+(\\d{4})|(${MONTHS})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})|(\\d{4}-\\d{2}-\\d{2}))`,
    'gi'
  )
  for (const m of text.matchAll(combined)) {
    if (m[7]) return m[7]
    const monthToken = (m[2] || m[4] || '').toLowerCase()
    const mi = months.findIndex(mo => monthToken.startsWith(mo.slice(0, 3)))
    const day = parseInt(m[1] || m[5], 10)
    const year = parseInt(m[3] || m[6], 10)
    if (mi < 0 || isNaN(day) || isNaN(year)) continue
    if (year < 2024 || year > 2035 || day < 1 || day > 31) continue
    return `${year}-${String(mi + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  return null
}

function extractDegreeLevels(text: string): string[] {
  // Scan only the headline + summary — full article bodies mention every
  // level in "also see" blocks, which over-matches badly.
  const scope = text.substring(0, 900)
  const levels: string[] = []
  if (/undergraduate|bachelors?\b|b\.sc\b/i.test(scope)) levels.push('Bachelors')
  if (/masters?\b|m\.sc\b|msc\b|mba\b|postgraduate/i.test(scope)) levels.push('Masters')
  if (/ph\.?d\b|doctoral|doctorate|dissertation|thesis/i.test(scope)) levels.push('PhD')
  if (/post-?doc(toral)?\b/i.test(scope)) levels.push('Postdoctoral')
  return levels
}

function extractFields(text: string): string[] {
  const map: [RegExp, string][] = [
    [/engineering/i, 'Engineering'], [/public health|epidemiolog/i, 'Public Health'],
    [/medicine|medical/i, 'Medicine'], [/agricultur/i, 'Agriculture'],
    [/computer science|computing|informatics|data science/i, 'Computer Science'],
    [/law|legal studies/i, 'Law'], [/econom/i, 'Economics'],
    [/business|management|mba/i, 'Business'], [/education|pedagog/i, 'Education'],
    [/environment|climate|sustainab/i, 'Environmental Science'],
    [/water|hydro/i, 'Water Resources'], [/energy/i, 'Energy Studies'],
  ]
  return map.filter(([re]) => re.test(text)).map(([, label]) => label).slice(0, 3)
}

function extractProvider(title: string, siteName: string, body: string): string {
  const uni = title.match(/(University of [A-Z][\w'-]+(?: [A-Z][\w'-]+){0,3})/)?.[1]
  const org = title.match(/([A-Z][\w'-]+(?: [A-Z][\w'-]+){0,2}\s+(?:Foundation|Trust|Institute|Academy|Commission|Programme|Program))/)?.[1]
  if (uni) return uni
  if (org) return org
  if (siteName && !/wordpress|opportunitydesk|scholarshippositions|afterschoolafrica/i.test(siteName)) return siteName
  const bodyUni = body.match(/(University of [A-Z][\w'-]+(?: [A-Z][\w'-]+){0,2})/)?.[1]
  return bodyUni || ''
}

async function handleTrigger(supabase: ReturnType<typeof createClient>) {
  const pipelineRunId = new Date().toISOString()
  const seen = new Set<string>()
  const candidates: { title: string; link: string; snippet: string }[] = []

  const feedResults = await Promise.allSettled(
    FEED_SOURCES.map(async (feed) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 12_000)
      try {
        const res = await fetch(feed, { signal: controller.signal, headers: { 'User-Agent': 'TechsariBot/1.0' } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.text()
      } finally {
        clearTimeout(timer)
      }
    })
  )

  for (const result of feedResults) {
    if (result.status !== 'fulfilled') continue
    const items = result.value.match(/<item>[\s\S]*?<\/item>/g) ?? []
    for (const item of items.slice(0, 25)) {
      const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) ?? [])[1]?.trim().replace(/\s+/g, ' ')
      const link = (item.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/) ?? [])[1]?.trim()
      if (!title || !link || !/scholarship|fellowship|financial aid|study grant/i.test(title)) continue
      const key = link.replace(/[?#].*$/, '')
      if (seen.has(key)) continue
      seen.add(key)
      const snippet = stripHtml((item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/) ?? [])[1] || '').substring(0, 400)
      candidates.push({ title, link, snippet })
    }
  }

  // Deep-fetch the newest 12 articles for real structured data
  const toFetch = candidates.slice(0, 12)
  const pages = await Promise.allSettled(
    toFetch.map(async (c) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8_000)
      try {
        const res = await fetch(c.link, { signal: controller.signal, headers: { 'User-Agent': 'TechsariBot/1.0' } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return { c, html: await res.text() }
      } finally {
        clearTimeout(timer)
      }
    })
  )

  // Cross-dedupe against listings already on the platform
  const { data: existingNames } = await supabase
    .from('scholarships').select('name').limit(2000)
  const existingSet = new Set((existingNames ?? []).map((r: any) => (r.name || '').toLowerCase().replace(/\s+/g, ' ').trim()))

  const discovered: Record<string, unknown>[] = []
  for (const result of pages) {
    const base = result.status === 'fulfilled' ? result.value.c : null
    if (!base) continue
    const html = result.status === 'fulfilled' ? result.value.html : ''
    const siteName = (html.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/i) ?? [])[1] || ''
    const ogDesc = (html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ?? [])[1] || ''
    const metaDesc = (html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ?? [])[1] || ''
    const bodyText = stripHtml(html)
    const haystack = `${base.title} ${ogDesc || metaDesc || base.snippet} ${bodyText.substring(0, 6000)}`

    const description = stripHtml(ogDesc || metaDesc || base.snippet)
    const summaryText = `${base.title} ${description}`
    const deadline = extractDeadline(summaryText) ?? extractDeadline(bodyText.substring(0, 6000))
    const funding = /fully[- ]funded/i.test(haystack) ? 'Full' : (/partial|tuition (?:waiver|only)|50% (?:tuition|discount)/i.test(haystack) ? 'Partial' : null)
    const degreeLevels = extractDegreeLevels(summaryText)
    const fields = extractFields(haystack)
    const provider = extractProvider(base.title, siteName, bodyText.substring(0, 3000))
    const eligMatch = haystack.match(/(?:open to|eligible (?:to|for)|applicants must (?:be|have))[^.!?]{10,240}/i)
    const countries = AFRICAN_COUNTRY_NAMES.filter(c => new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(haystack.substring(0, 8000))).slice(0, 8)

    const normalizedName = base.title.toLowerCase().replace(/\s+/g, ' ').trim()
    if (existingSet.has(normalizedName)) continue

    let confidence = 0.5
    if (deadline) confidence += 0.15
    if (funding) confidence += 0.1
    if (degreeLevels.length) confidence += 0.1
    if (description.length >= 80) confidence += 0.05
    if (provider) confidence += 0.05

    discovered.push({
      name: base.title.substring(0, 180),
      provider: provider || new URL(base.link).hostname.replace('www.', ''),
      host_institution: /university|institute|college/i.test(provider) ? provider : null,
      source_url: base.link,
      apply_url: base.link,
      deadline,
      funding_type: funding,
      degree_levels: degreeLevels,
      fields_of_study: fields,
      countries,
      description: description.length > 60 ? description.substring(0, 600) : null,
      eligibility: eligMatch ? eligMatch[0].substring(0, 300) : null,
      confidence_score: Math.min(0.95, Math.round(confidence * 100) / 100),
      scam_flags: [],
    })
  }

  if (discovered.length === 0) {
    return corsResponse({ success: true, inserted: 0, message: 'No new scholarship items found', sources_ok: feedResults.filter(r => r.status === 'fulfilled').length, candidates_seen: candidates.length })
  }

  const summary = await handleIngest(supabase, 'cron@techsari.online', {
    pipeline_run: { timestamp: pipelineRunId },
    scholarships: discovered,
  })
  const payload = await summary.json()
  return corsResponse({ success: true, sources_ok: feedResults.filter(r => r.status === 'fulfilled').length, candidates_seen: candidates.length, deep_fetched: pages.length, ...payload })
}

// ─── Ingest Scholarships ──────────────────────────────────────────
async function handleIngest(
  supabase: ReturnType<typeof createClient>,
  adminEmail: string,
  body: any
) {
  const { pipeline_run, scholarships } = body
  if (!scholarships || !Array.isArray(scholarships)) {
    return corsResponse({ error: 'Missing scholarships array' }, 400)
  }

  const pipelineRunId = pipeline_run?.timestamp || new Date().toISOString()
  let inserted = 0
  let duplicates_skipped = 0
  let scam_flagged = 0
  const rejected_invalid: { name: string; errors: string[] }[] = []
  const total_received = scholarships.length

  for (const schol of scholarships) {
    // Identity = source URL: stable across extraction improvements. Name- and
    // deadline-based fingerprints churned whenever extraction got better.
    const fingerprint = await sha256(schol.source_url || `${schol.name}${schol.provider}${schol.deadline}`)

    // Duplicate check
    const { data: existing } = await supabase
      .from('bot_ingestions')
      .select('fingerprint')
      .eq('fingerprint', fingerprint)
      .maybeSingle()

    if (existing) {
      duplicates_skipped++
      continue
    }

    // Validate
    const validation = validateScholarship(schol)
    if (!validation.isValid) {
      rejected_invalid.push({ name: schol.name || 'Unknown', errors: validation.errors })
      continue
    }

    // Scam flags
    const hasScamFlags = Array.isArray(schol.scam_flags) && schol.scam_flags.length > 0
    if (hasScamFlags) scam_flagged++

    const ingestionRecord = {
      extracted_data: schol,
      source_url: schol.source_url || '',
      confidence_score: parseFloat(schol.confidence_score) || 0.5,
      scam_flags: schol.scam_flags || [],
      status: 'pending',
      fingerprint,
      pipeline_run_id: pipelineRunId,
      degree_levels: schol.degree_levels || [],
      host_region: schol.host_region || null,
      countries: schol.countries || [],
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('bot_ingestions').insert(ingestionRecord)
    if (!error) inserted++
  }

  return corsResponse({
    total_received,
    inserted,
    duplicates_skipped,
    scam_flagged,
    rejected_invalid,
  })
}

// ─── Review / Approve / Reject Bot Queue Item ─────────────────────
async function handleReview(
  supabase: ReturnType<typeof createClient>,
  adminEmail: string,
  body: any
) {
  const { ingestion_id, review_action, review_notes, edited_scholarship } = body
  if (!ingestion_id) return corsResponse({ error: 'ingestion_id required' }, 400)
  if (!review_action || !['approved', 'rejected'].includes(review_action)) {
    return corsResponse({ error: 'review_action must be "approved" or "rejected"' }, 400)
  }

  // Fetch ingestion
  const { data: ingestion, error: fetchError } = await supabase
    .from('bot_ingestions')
    .select('*')
    .eq('id', ingestion_id)
    .single()

  if (fetchError || !ingestion) return corsResponse({ error: 'Ingestion not found' }, 404)

  if (review_action === 'rejected') {
    await supabase.from('bot_ingestions')
      .update({
        status: 'rejected',
        reviewed_by: adminEmail,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes || null,
      })
      .eq('id', ingestion_id)

    await supabase.from('audit_logs').insert({
      user_email: adminEmail,
      action: 'ingestion_rejected',
      target_type: 'bot_ingestion',
      target_id: ingestion_id,
      details: `Rejected ingestion for "${ingestion.extracted_data?.name || 'Unknown'}"`,
      created_at: new Date().toISOString(),
    })

    return corsResponse({ success: true, action: 'rejected' })
  }

  // Approved — create scholarship
  const extracted = ingestion.extracted_data || {}
  const edits = edited_scholarship || {}
  const scholId = 'schol-' + Date.now()

  const mapped = {
    id: scholId,
    name: edits.name || extracted.name || '',
    provider: edits.provider || extracted.provider || '',
    host_institution: edits.host_institution || extracted.host_institution || extracted.host || '',
    countries: edits.countries || extracted.countries || [],
    degree_levels: edits.degree_levels || extracted.degree_levels || [],
    fields_of_study: edits.fields_of_study || extracted.fields_of_study || extracted.fields || [],
    funding_type: edits.funding_type || extracted.funding_type || null,
    amount: edits.amount || extracted.amount || null,
    deadline: edits.deadline || extracted.deadline || null,
    description: edits.description || extracted.description || null,
    eligibility: edits.eligibility || extracted.eligibility || null,
    required_documents: edits.required_documents || extracted.required_documents || null,
    apply_url: edits.apply_url || extracted.apply_url || '',
    source_url: edits.source_url || extracted.source_url || ingestion.source_url || '',
    published: false,
    verified: true,
    verified_by: adminEmail,
    verified_at: new Date().toISOString(),
    view_count: 0,
    pipeline_source: 'pipeline',
    host_region: edits.host_region || extracted.host_region || null,
    urgency: edits.urgency || extracted.urgency || 'Normal',
    sponsor_type: edits.sponsor_type || extracted.sponsor_type || null,
    quality_score: edits.quality_score ?? parseFloat(ingestion.confidence_score) ?? null,
  }

  const { error: insertError } = await supabase.from('scholarships').insert(mapped)
  if (insertError) return corsResponse({ error: 'Failed to insert scholarship: ' + insertError.message }, 500)

  // Update ingestion status
  await supabase.from('bot_ingestions')
    .update({
      status: 'approved',
      reviewed_by: adminEmail,
      reviewed_at: new Date().toISOString(),
      review_notes: review_notes || null,
    })
    .eq('id', ingestion_id)

  // Audit log
  await supabase.from('audit_logs').insert({
    user_email: adminEmail,
    action: 'ingestion_approved',
    target_type: 'scholarship',
    target_id: scholId,
    details: `Approved "${mapped.name}" from Bot Queue via pipeline review`,
    created_at: new Date().toISOString(),
  })

  return corsResponse({ success: true, action: 'approved', scholarship_id: scholId })
}

// ─── Trigger Pipeline Run ─────────────────────────────────────────
async function handleRun(
  supabase: ReturnType<typeof createClient>,
  body: any
) {
  // The actual crawling is done by external services (Python bot, server-side cron).
  // This endpoint simply acknowledges and provides current queue status.
  const { data: pending, count } = await supabase
    .from('bot_ingestions')
    .select('*', { count: 'exact' })
    .eq('status', 'pending')

  return corsResponse({
    success: true,
    message: 'Pipeline run acknowledged. Use the bot runner for actual crawling.',
    pending_count: count || 0,
    tip: 'Deploy the Python bot or use the server-side scraper to fill bot_ingestions.',
  })
}

// ─── Pipeline Stats ───────────────────────────────────────────────
async function handleStats(supabase: ReturnType<typeof createClient>) {
  const { count: totalScholarships } = await supabase
    .from('scholarships')
    .select('*', { count: 'exact', head: true })

  const { count: publishedCount } = await supabase
    .from('scholarships')
    .select('*', { count: 'exact', head: true })
    .eq('published', true)

  const { count: pendingIngestions } = await supabase
    .from('bot_ingestions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: approvedIngestions } = await supabase
    .from('bot_ingestions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')

  const { data: recentIngestions } = await supabase
    .from('bot_ingestions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  return corsResponse({
    total_scholarships: totalScholarships || 0,
    published_scholarships: publishedCount || 0,
    pending_ingestions: pendingIngestions || 0,
    approved_ingestions: approvedIngestions || 0,
    recent_ingestions: recentIngestions || [],
  })
}

// ─── Pipeline Status ──────────────────────────────────────────────
async function handleStatus(supabase: ReturnType<typeof createClient>) {
  const { data: statuses, error } = await supabase
    .from('bot_ingestions')
    .select('status')
    .order('created_at', { ascending: false })
    .limit(1)

  const lastRun = statuses?.[0]?.created_at || null

  const { count: pending } = await supabase
    .from('bot_ingestions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return corsResponse({
    last_run: lastRun,
    pending_count: pending || 0,
    status: (pending && pending > 0) ? 'items_pending' : 'idle',
  })
}

// ─── Bot Queue ────────────────────────────────────────────────────
async function handleBotQueue(supabase: ReturnType<typeof createClient>, req: Request) {
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const page = parseInt(url.searchParams.get('page') || '1')
  const pageSize = parseInt(url.searchParams.get('page_size') || '50')
  const offset = (page - 1) * pageSize

  let query = supabase.from('bot_ingestions').select('*', { count: 'exact' })
  if (status) query = query.eq('status', status)
  query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1)

  const { data, count, error } = await query
  if (error) return corsResponse({ error: error.message }, 500)

  return corsResponse({
    items: data || [],
    total: count || 0,
    page,
    page_size: pageSize,
  })
}

// ─── Publish Scholarship ──────────────────────────────────────────
async function handlePublish(
  supabase: ReturnType<typeof createClient>,
  adminEmail: string,
  body: any
) {
  const { scholarship_id } = body
  if (!scholarship_id) return corsResponse({ error: 'scholarship_id required' }, 400)

  const { error } = await supabase
    .from('scholarships')
    .update({
      published: true,
      published_at: new Date().toISOString(),
    })
    .eq('id', scholarship_id)

  if (error) return corsResponse({ error: error.message }, 500)

  await supabase.from('audit_logs').insert({
    user_email: adminEmail,
    action: 'scholarship_published',
    target_type: 'scholarship',
    target_id: scholarship_id,
    details: `Published scholarship ${scholarship_id}`,
    created_at: new Date().toISOString(),
  })

  return corsResponse({ success: true, scholarship_id })
}
