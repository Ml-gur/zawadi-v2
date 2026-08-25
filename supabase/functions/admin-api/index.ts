import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

let currentOrigin = 'https://www.techsari.online'

// ─── CORS ─────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
}

// ─── CORS: strict origin allowlist ─────────────────────────────
function allowedOrigin(req: Request): string {
  const o = req.headers.get('Origin') || ''
  if (/^https:\/\/(www\.)?techsari\.online$/.test(o)) return o
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(o)) return o
  if (/^http:\/\/localhost:\d+$/.test(o)) return o
  return 'https://www.techsari.online'
}



function ok(data: unknown) {
  return new Response(JSON.stringify({ ok: true, data }), {
    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': currentOrigin, 'Content-Type': 'application/json' },
  })
}

function fail(error: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': currentOrigin, 'Content-Type': 'application/json' },
  })
}

// ─── Constants ────────────────────────────────────────────────────
const VALID_PLANS = ['explorer', 'plus', 'pro', 'institutional']
const VALID_STATUSES = ['active', 'suspended']
const READ_ONLY_ACTIONS = ['overview', 'timeseries', 'users.list', 'audit.list', 'payments.list', 'ai.test']
const DAY_MS = 86_400_000

// ─── Audit helper ─────────────────────────────────────────────────
async function writeAudit(
  supabase: ReturnType<typeof createClient>,
  actor: string,
  action: string,
  targetType: string,
  targetId: string,
  details: string,
) {
  await supabase.from('audit_logs').insert({
    id: crypto.randomUUID(),
    admin_email: actor,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
    created_at: new Date().toISOString(),
  })
}

// ─── Count helper (head: true → no rows shipped) ──────────────────
async function countOf(supabase: ReturnType<typeof createClient>, table: string, filters?: Record<string, unknown>) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true })
  for (const [col, val] of Object.entries(filters ?? {})) q = q.eq(col, val)
  const { count } = await q
  return count ?? 0
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString()
}

// ─── Overview ─────────────────────────────────────────────────────
async function actionOverview(supabase: ReturnType<typeof createClient>) {
  const [
    usersTotal, usersActive, usersSuspended,
    schTotal, schPublished,
    docsTotal, docsPending, docsFailed,
    essaysTotal,
    paySuccessCount, botPending, contactTotal, contactUnread, auditCount,
  ] = await Promise.all([
    countOf(supabase, 'profiles'),
    countOf(supabase, 'profiles', { status: 'active' }),
    countOf(supabase, 'profiles', { status: 'suspended' }),
    countOf(supabase, 'scholarships'),
    countOf(supabase, 'scholarships', { published: true }),
    countOf(supabase, 'documents'),
    countOf(supabase, 'documents', { analysis_status: 'pending' }),
    countOf(supabase, 'documents', { analysis_status: 'failed' }),
    countOf(supabase, 'essays'),
    countOf(supabase, 'payments', { status: 'success' }),
    countOf(supabase, 'bot_ingestions', { status: 'pending' }),
    countOf(supabase, 'contact_submissions'),
    countOf(supabase, 'contact_submissions', { is_read: false }),
    countOf(supabase, 'audit_logs'),
  ])

  // Date-bounded counts that the head-count helper cannot express
  const [{ count: newSignups }, { count: prevSignups }, { count: expiringSoon }, { count: essaysLast7 }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', isoDaysAgo(7)),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', isoDaysAgo(14)).lt('created_at', isoDaysAgo(7)),
    supabase.from('scholarships').select('*', { count: 'exact', head: true }).eq('published', true).lte('deadline', new Date(Date.now() + 7 * DAY_MS).toISOString().split('T')[0]),
    supabase.from('essays').select('*', { count: 'exact', head: true }).gte('created_at', isoDaysAgo(7)),
  ])

  // Applications by stage + MRR from real successful payments
  const [{ data: appStatuses }, { data: successAmounts }] = await Promise.all([
    supabase.from('applications').select('status'),
    supabase.from('payments').select('amount').eq('status', 'success'),
  ])
  const applicationsByStage: Record<string, number> = {}
  for (const row of appStatuses ?? []) {
    const stage = (row as { status?: string }).status || 'unknown'
    applicationsByStage[stage] = (applicationsByStage[stage] || 0) + 1
  }
  const mrr = (successAmounts ?? []).reduce((sum, r) => sum + (Number((r as { amount?: number }).amount) || 0), 0)

  return ok({
    users: { total: usersTotal, active: usersActive, suspended: usersSuspended, new_7d: newSignups ?? 0, prev_7d: prevSignups ?? 0 },
    scholarships: { total: schTotal, published: schPublished, expiring_7d: expiringSoon ?? 0 },
    applications: { total: appStatuses?.length ?? 0, by_stage: applicationsByStage },
    documents: { total: docsTotal, pending: docsPending, failed: docsFailed },
    essays: { total: essaysTotal, last_7d: essaysLast7 ?? 0 },
    payments: { successful: paySuccessCount, mrr: Math.round(mrr * 100) / 100 },
    bot_queue: { pending: botPending },
    contact: { total: contactTotal, unread: contactUnread },
    audit: { total: auditCount },
  })
}

// ─── Timeseries ───────────────────────────────────────────────────
function bucketDaily(rows: { created_at?: string | null }[], days: number) {
  const buckets = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(new Date(Date.now() - i * DAY_MS).toISOString().split('T')[0], 0)
  }
  for (const row of rows) {
    if (!row.created_at) continue
    const day = row.created_at.split('T')[0]
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) || 0) + 1)
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }))
}

async function actionTimeseries(supabase: ReturnType<typeof createClient>) {
  const [{ data: signups }, { data: essayRows }, { data: appRows }, { data: topScholarships }, { data: recentSignups }] =
    await Promise.all([
      supabase.from('profiles').select('created_at,joined_at').gte('created_at', isoDaysAgo(180)),
      supabase.from('essays').select('created_at').gte('created_at', isoDaysAgo(14)),
      supabase.from('applications').select('created_at').gte('created_at', isoDaysAgo(14)),
      supabase.from('scholarships').select('id,name,view_count').order('view_count', { ascending: false }).limit(10),
      supabase.from('profiles').select('name,email,country,plan,created_at').order('created_at', { ascending: false }).limit(5),
    ])

  // Monthly growth over 6 months
  const monthly = new Map<string, number>()
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthly.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0)
  }
  for (const row of signups ?? []) {
    const created = (row as { created_at?: string; joined_at?: string }).created_at
    if (!created) continue
    const key = created.split('-').slice(0, 2).join('-')
    if (monthly.has(key)) monthly.set(key, (monthly.get(key) || 0) + 1)
  }

  return ok({
    user_growth: [...monthly.entries()].map(([month, users]) => ({ month, users })),
    essays_daily: bucketDaily(essayRows ?? [], 14),
    applications_daily: bucketDaily(appRows ?? [], 14),
    top_scholarships: topScholarships ?? [],
    recent_signups: recentSignups ?? [],
  })
}

// ─── Users list ───────────────────────────────────────────────────
async function actionUsersList(supabase: ReturnType<typeof createClient>, params: Record<string, unknown>) {
  const page = Math.max(1, Number(params.page) || 1)
  const limit = Math.min(50, Math.max(5, Number(params.limit) || 25))
  const from = (page - 1) * limit

  let q = supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  if (params.search) {
    const term = String(params.search).replace(/[,()]/g, '')
    q = q.or(`email.ilike.*${term}*,name.ilike.*${term}*`)
  }
  if (params.plan && params.plan !== 'all') q = q.eq('plan', params.plan)
  if (params.status && params.status !== 'all') q = q.eq('status', params.status)

  const { data, count, error } = await q.range(from, from + limit - 1)
  if (error) return fail(error.message, 500)

  const emails = (data ?? []).map((u) => (u as { email: string }).email)
  const [appRows, docRows, essayRows] = await Promise.all([
    emails.length ? supabase.from('applications').select('user_email').in('user_email', emails) : Promise.resolve({ data: [] }),
    emails.length ? supabase.from('documents').select('user_email,size').in('user_email', emails) : Promise.resolve({ data: [] }),
    emails.length ? supabase.from('essays').select('user_email').in('user_email', emails) : Promise.resolve({ data: [] }),
  ])

  const engagement: Record<string, { applications: number; documents: number; essays: number; storage: string }> = {}
  for (const email of emails) engagement[email] = { applications: 0, documents: 0, essays: 0, storage: '0 KB' }
  for (const row of (appRows.data ?? []) as { user_email: string }[]) {
    if (engagement[row.user_email]) engagement[row.user_email].applications++
  }
  let docBytes: Record<string, number> = {}
  for (const row of (docRows.data ?? []) as { user_email: string; size?: string }[]) {
    if (!engagement[row.user_email]) continue
    engagement[row.user_email].documents++
    const kb = parseFloat(row.size || '0')
    docBytes[row.user_email] = (docBytes[row.user_email] || 0) + (isNaN(kb) ? 0 : kb)
  }
  for (const row of (essayRows.data ?? []) as { user_email: string }[]) {
    if (engagement[row.user_email]) engagement[row.user_email].essays++
  }
  for (const [email, bytesKb] of Object.entries(docBytes)) {
    engagement[email].storage = bytesKb > 1024 ? `${(bytesKb / 1024).toFixed(1)} MB` : `${Math.round(bytesKb)} KB`
  }

  return ok({ users: data ?? [], engagement, page, limit, total: count ?? 0 })
}

// ─── User mutations ───────────────────────────────────────────────
async function actionUserUpdate(supabase: ReturnType<typeof createClient>, actor: string, params: Record<string, unknown>) {
  const email = String(params.email || '')
  if (!email) return fail('email is required')

  const changes: Record<string, string> = {}
  if (params.plan !== undefined) {
    if (!VALID_PLANS.includes(String(params.plan))) return fail(`plan must be one of ${VALID_PLANS.join(', ')}`)
    changes.plan = String(params.plan)
  }
  if (params.status !== undefined) {
    if (!VALID_STATUSES.includes(String(params.status))) return fail(`status must be one of ${VALID_STATUSES.join(', ')}`)
    changes.status = String(params.status)
  }
  if (Object.keys(changes).length === 0) return fail('nothing to update: provide plan and/or status')

  const { error } = await supabase.from('profiles').update(changes).eq('email', email)
  if (error) return fail(error.message, 500)

  await writeAudit(supabase, actor, 'user.update', 'profile', email, JSON.stringify(changes))
  return ok({ email, ...changes })
}

async function actionUserDelete(supabase: ReturnType<typeof createClient>, actor: string, params: Record<string, unknown>) {
  const email = String(params.email || '')
  if (!email) return fail('email is required')
  if (email === actor) return fail('You cannot delete your own account')

  const { data: profile } = await supabase.from('profiles').select('id,auth_user_id').eq('email', email).maybeSingle()

  const { error: delError } = await supabase.from('profiles').delete().eq('email', email)
  if (delError) return fail(delError.message, 500)

  const authUserId = (profile as { auth_user_id?: string } | null)?.auth_user_id
  if (authUserId) {
    const { error: authError } = await supabase.auth.admin.deleteUser(authUserId)
    if (authError) console.error(`[admin-api] profile deleted but auth user ${authUserId} remains:`, authError.message)
  }

  await writeAudit(supabase, actor, 'user.delete', 'profile', email, authUserId ? 'profile + auth user deleted' : 'profile deleted (no auth user linked)')
  return ok({ email, deleted: true })
}

// ─── Audit + payments lists ───────────────────────────────────────
async function actionAuditList(supabase: ReturnType<typeof createClient>, params: Record<string, unknown>) {
  const page = Math.max(1, Number(params.page) || 1)
  const limit = Math.min(100, Math.max(10, Number(params.limit) || 30))
  const from = (page - 1) * limit
  const { data, count, error } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)
  if (error) return fail(error.message, 500)
  return ok({ entries: data ?? [], page, limit, total: count ?? 0 })
}

async function actionPaymentsList(supabase: ReturnType<typeof createClient>, params: Record<string, unknown>) {
  const page = Math.max(1, Number(params.page) || 1)
  const limit = Math.min(100, Math.max(10, Number(params.limit) || 30))
  const from = (page - 1) * limit
  const [{ data, count, error }, { data: successAmounts }] = await Promise.all([
    supabase
      .from('payments')
      .select('id,user_email,plan,amount,status,paystack_reference,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1),
    supabase.from('payments').select('amount').eq('status', 'success'),
  ])
  if (error) return fail(error.message, 500)
  const mrr = (successAmounts ?? []).reduce((sum, r) => sum + (Number((r as { amount?: number }).amount) || 0), 0)
  return ok({ payments: data ?? [], page, limit, total: count ?? 0, mrr: Math.round(mrr * 100) / 100 })
}

// ─── AI connection test ───────────────────────────────────────────
async function actionAiTest(supabase: ReturnType<typeof createClient>) {
  const { data: cfg } = await supabase.from('ai_config').select('*').eq('id', 'default').maybeSingle()
  if (!cfg) return fail('No AI configuration found. Save a provider key first.', 404)

  const provider = cfg.provider || 'deepseek'
  const started = Date.now()
  let endpoint = ''
  let apiKey = ''
  let body: unknown

  if (provider === 'deepseek') {
    apiKey = cfg.deepseek_key || Deno.env.get('DEEPSEEK_API_KEY') || ''
    endpoint = 'https://api.deepseek.com/v1/chat/completions'
    body = { model: cfg.ai_model || 'deepseek-v4-pro', messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 }
  } else if (provider === 'openai') {
    apiKey = cfg.openai_key || Deno.env.get('OPENAI_API_KEY') || ''
    endpoint = 'https://api.openai.com/v1/chat/completions'
    body = { model: cfg.ai_model || 'gpt-4o-mini', messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 }
  } else if (provider === 'gemini') {
    apiKey = cfg.gemini_key || Deno.env.get('GEMINI_API_KEY') || ''
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.ai_model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`
    body = { contents: [{ parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 5 } }
  } else {
    return fail(`Unknown provider: ${provider}`)
  }
  if (!apiKey) return fail(`No API key configured for provider "${provider}"`, 400)

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15_000)
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    })
    clearTimeout(timer)
    const latency = Date.now() - started
    if (!res.ok) {
      const errText = await res.text()
      return fail(`${provider} responded ${res.status}: ${errText.substring(0, 200)}`, 502)
    }
    return ok({ provider, model: cfg.ai_model, latency_ms: latency })
  } catch (err) {
    return fail(`${provider} unreachable: ${(err as Error).message}`, 502)
  }
}

// ─── Main handler ─────────────────────────────────────────────────
serve(async (req: Request) => {
  currentOrigin = allowedOrigin(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': allowedOrigin(req) } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return fail('Authentication required', 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user?.email) return fail('Invalid or expired token', 401)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', user.email)
      .maybeSingle()
    const role = profile?.role as string | undefined

    const { action, params = {} } = await req.json()
    if (!action) return fail('action is required')

    if (role === 'content_manager' && !READ_ONLY_ACTIONS.includes(action)) {
      return fail('Content managers have read-only admin access', 403)
    }
    if (role !== 'super_admin' && role !== 'content_manager') {
      return fail('Admin access required', 403)
    }

    switch (action) {
      case 'overview': return await actionOverview(supabase)
      case 'timeseries': return await actionTimeseries(supabase)
      case 'users.list': return await actionUsersList(supabase, params)
      case 'user.update': return await actionUserUpdate(supabase, user.email, params)
      case 'user.delete': return await actionUserDelete(supabase, user.email, params)
      case 'audit.list': return await actionAuditList(supabase, params)
      case 'payments.list': return await actionPaymentsList(supabase, params)
      case 'ai.test': return await actionAiTest(supabase)
      default: return fail(`Unknown action: ${action}`)
    }
  } catch (err) {
    console.error('[admin-api] Unhandled error:', (err as Error).message)
    return fail('Internal server error: ' + (err as Error).message, 500)
  }
})
