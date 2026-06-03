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

    // Auth: admin-only operations
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return corsResponse({ error: 'Authentication required' }, 401)

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return corsResponse({ error: 'Invalid or expired token' }, 401)

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', user.email)
      .single()

    const isAdmin = profile?.role === 'super_admin' || profile?.role === 'content_manager'
    if (!isAdmin) return corsResponse({ error: 'Admin access required' }, 403)

    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {}
    const url = new URL(req.url)
    const action = body.action || url.searchParams.get('action')

    if (action === 'ingest') return handleIngest(supabase, user.email!, body)
    if (action === 'review') return handleReview(supabase, user.email!, body)
    if (action === 'run') return handleRun(supabase, body)
    if (action === 'stats') return handleStats(supabase)
    if (action === 'status') return handleStatus(supabase)
    if (action === 'bot-queue') return handleBotQueue(supabase, req)
    if (action === 'publish') return handlePublish(supabase, user.email!, body)

    return corsResponse({ error: `Unknown action: ${action}` }, 400)
  } catch (err: any) {
    console.error('[run-pipeline] Error:', err.message)
    return corsResponse({ error: 'Internal server error: ' + err.message }, 500)
  }
})

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
    const fingerprint = await sha256(`${schol.name}${schol.provider}${schol.deadline}`)

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
  const { ingestion_id, action: reviewAction, review_notes, edited_scholarship } = body
  if (!ingestion_id) return corsResponse({ error: 'ingestion_id required' }, 400)
  if (!reviewAction || !['approved', 'rejected'].includes(reviewAction)) {
    return corsResponse({ error: 'action must be "approved" or "rejected"' }, 400)
  }

  // Fetch ingestion
  const { data: ingestion, error: fetchError } = await supabase
    .from('bot_ingestions')
    .select('*')
    .eq('id', ingestion_id)
    .single()

  if (fetchError || !ingestion) return corsResponse({ error: 'Ingestion not found' }, 404)

  if (reviewAction === 'rejected') {
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
