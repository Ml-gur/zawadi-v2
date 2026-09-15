import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Environment ──────────────────────────────────────────────────
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'development'
const PRODUCTION = ENVIRONMENT === 'production'

// ─── CORS ─────────────────────────────────────────────────────────
// CORS is defence-in-depth here, NOT authorisation: every non-webhook
// action is gated on a verified user JWT (auth.getUser below) and the
// webhook is gated on a valid Paystack HMAC signature. What matters is
// that we ECHO the caller's own origin back for every allowed host. A
// mismatched Access-Control-Allow-Origin makes the browser drop the
// response, and supabase-js then reports the useless
// "Failed to send a request to the Edge Function" (see commit 69e5869).
const CANONICAL_ORIGIN = 'https://www.techsari.online'

const DEFAULT_ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/(www\.)?techsari\.online$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/(localhost|127\.0\.0\.1):\d+$/,
]

// Additional exact origins, comma separated, e.g.
// supabase secrets set ALLOWED_ORIGINS="https://staging.techsari.online"
const EXTRA_ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean)

function resolveCorsOrigin(req: Request): string {
  const origin = (req.headers.get('origin') || '').replace(/\/$/, '')
  if (!origin) return CANONICAL_ORIGIN
  if (EXTRA_ALLOWED_ORIGINS.includes(origin)) return origin
  return DEFAULT_ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))
    ? origin
    : CANONICAL_ORIGIN
}

function corsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveCorsOrigin(req),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-paystack-signature',
    // Responses vary by Origin — without this a proxy or browser cache can
    // replay the wrong allow-origin header to a different host.
    'Vary': 'Origin',
  }
}

// Single response helper: every response (success AND error) must carry the
// caller's origin, otherwise the browser hides the body and the client only
// ever sees a generic fetch failure.
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

// ─── Plan catalog ─────────────────────────────────────────────────
const PLAN_CATALOG: Record<string, {
  name: string
  monthly: { amount: number; planCode: string }
  annual: { amount: number; planCode: string }
}> = {
  plus: {
    name: 'Scholar Plus',
    monthly: { amount: 650, planCode: 'PLN_unw5dchqqxx8h81' },
    annual: { amount: 6500, planCode: 'PLN_7lbcd0qe0atza2a' },
  },
  pro: {
    name: 'Application Pro',
    monthly: { amount: 1560, planCode: 'PLN_02f9ve9p86cpx44' },
    annual: { amount: 15600, planCode: 'PLN_r7qx092mwmn5bfz' },
  },
}

const PLAN_HIERARCHY: Record<string, number> = {
  explorer: 0, plus: 1, pro: 2, institutional: 3,
}

// ─── Helpers ──────────────────────────────────────────────────────
function resolvePaymentIntent(planName: string, billingPeriodInput: string) {
  const normalizedPlan = String(planName || '').toLowerCase()
  const billingPeriod = billingPeriodInput === 'annual' ? 'annual' : 'monthly'
  const catalogPlan = PLAN_CATALOG[normalizedPlan]
  if (!catalogPlan) return { error: 'Invalid paid plan selected.' }
  const trusted = catalogPlan[billingPeriod]
  return {
    planName: normalizedPlan,
    planLabel: catalogPlan.name,
    billingPeriod,
    planCode: trusted.planCode,
    amount: trusted.amount,
    currency: 'KES',
  }
}

function resolvePlanFromCode(planCode: string) {
  for (const [planName, plan] of Object.entries(PLAN_CATALOG)) {
    for (const period of ['monthly', 'annual'] as const) {
      if (plan[period].planCode === planCode) {
        return { planName, billingPeriod: period, amount: plan[period].amount, planCode }
      }
    }
  }
  return null
}

function normalizePaystackMetadata(metadata: any): Record<string, any> {
  if (!metadata) return {}
  if (typeof metadata === 'string') {
    try { return JSON.parse(metadata) } catch { return {} }
  }
  return metadata
}

// ─── Main handler ─────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders(req) })
  }

  // Read the body exactly once. The webhook needs the raw text for HMAC
  // verification, and `request.clone()` throws once the body has been
  // consumed — so parse from the raw string instead of re-reading `req`.
  const rawBody = req.method === 'GET' ? '' : await req.text()
  let body: any = {}
  if (rawBody) {
    try { body = JSON.parse(rawBody) } catch { body = {} }
  }

  let action = 'unknown'

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const url = new URL(req.url)
    const isWebhook = url.pathname.endsWith('/webhook') || body.action === 'webhook'
    action = isWebhook ? 'webhook' : (body.action || url.searchParams.get('action') || 'unknown')

    // ── Webhook: no auth required (Paystack HMAC is the auth) ──
    if (isWebhook) {
      return await handleWebhook(req, rawBody, supabase, body)
    }

    // ── Auth for all other actions ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json(req, { error: 'Authentication required' }, 401)

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return json(req, { error: 'Invalid or expired token' }, 401)

    // `await` every handler: returning a rejected promise from inside a
    // try block does NOT reach the catch, it just becomes an opaque 500.
    if (action === 'initialize') return await handleInitialize(req, supabase, user.email!, body)
    if (action === 'verify') return await handleVerify(req, supabase, user.email!, body)
    if (action === 'abandon') return await handleAbandon(req, supabase, user.email!, body)
    if (action === 'checkout') return await handleCheckout(req, supabase, user.email!, body)

    return json(req, { error: `Unknown action: ${action}` }, 400)
  } catch (err: any) {
    // Actionable log: the action, the message and the stack. Without this a
    // 500 is indistinguishable from a platform/gateway failure.
    console.error('[process-payment] Unhandled error', {
      action,
      message: err?.message ?? String(err),
      stack: err?.stack,
    })
    return json(req, { error: 'Internal server error', action }, 500)
  }
})

// ─── Initialize Payment ───────────────────────────────────────────
async function handleInitialize(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  const intent = resolvePaymentIntent(body.plan_name, body.billing_period)
  if ((intent as any).error) return json(req, { error: (intent as any).error }, 400)

  const paymentMethod = body.payment_method === 'mobile_money' ? 'mobile_money' : 'card'
  const phoneNumber = typeof body.phone_number === 'string'
    ? body.phone_number.replace(/[^\d+]/g, '').slice(0, 20)
    : ''

  // Check plan upgrade validity
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('email', userEmail)
    .single()

  const currentPlan = profile?.plan || 'explorer'
  const targetRank = PLAN_HIERARCHY[intent.planName] ?? -1
  const currentRank = PLAN_HIERARCHY[currentPlan] ?? 0

  if (targetRank < currentRank) {
    return json(req, { error: 'Plan downgrades are not permitted via this endpoint.' }, 403)
  }
  if (targetRank === currentRank) {
    return json(req, { error: `You are already subscribed to the ${PLAN_CATALOG[intent.planName].name} tier.` }, 403)
  }

  const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY')

  if (paystackKey) {
    try {
      const paystackPayload: any = {
        email: userEmail,
        amount: Math.round(intent.amount * 100),
        currency: intent.currency,
        plan: intent.planCode,
        callback_url: Deno.env.get('PAYSTACK_CALLBACK_URL') || undefined,
        metadata: {
          user_email: userEmail,
          plan_name: intent.planName,
          billing_period: intent.billingPeriod,
          payment_method: paymentMethod,
          phone_number: paymentMethod === 'mobile_money' ? phoneNumber : undefined,
          trusted_amount: intent.amount,
          currency: intent.currency,
        },
      }

      if (paymentMethod === 'mobile_money' && phoneNumber) {
        // Don't restrict channels — let Paystack show all available options (mobile_money, card, etc.)
        // The mobile_money field hints Paystack to prefer M-Pesa for this number
        paystackPayload.mobile_money = { phone: phoneNumber, provider: 'mpesa' }
      }

      const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paystackPayload),
      })
      const initData = await initRes.json()

      if (!initData.status) {
        return json(req, { error: `Paystack init failed: ${initData.message}` }, 502)
      }

      // Persist payment record
      await supabase.from('payments').upsert({
        user_email: userEmail,
        paystack_reference: initData.data.reference,
        paystack_subscription_code: intent.planCode,
        amount: intent.amount,
        currency: intent.currency,
        plan: intent.planName,
        billing_period: intent.billingPeriod,
        status: 'pending',
        authorization_url: initData.data.authorization_url || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'paystack_reference' })

      return json(req, {
        access_code: initData.data.access_code,
        reference: initData.data.reference,
        authorization_url: initData.data.authorization_url,
        amount: intent.amount,
        currency: intent.currency,
        plan_name: intent.planName,
        billing_period: intent.billingPeriod,
      })
    } catch (e: any) {
      console.error('[Payment] Paystack init error:', e)
      return json(req, { error: 'Failed to initialize payment with Paystack.' }, 502)
    }
  }

  // Production: fail if Paystack key is missing
  if (PRODUCTION) {
    return json(req, { error: 'Payment gateway not configured. Please contact support.' }, 500)
  }

  // Sandbox fallback (development only)
  const sandboxRef = `sandbox_${Date.now()}`
  await supabase.from('payments').upsert({
    user_email: userEmail,
    paystack_reference: sandboxRef,
    paystack_subscription_code: intent.planCode,
    amount: intent.amount,
    currency: intent.currency,
    plan: intent.planName,
    billing_period: intent.billingPeriod,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'paystack_reference' })

  return json(req, {
    access_code: sandboxRef,
    reference: sandboxRef,
    authorization_url: null,
    amount: intent.amount,
    currency: intent.currency,
    plan_name: intent.planName,
    billing_period: intent.billingPeriod,
  })
}

// ─── Verify Payment ───────────────────────────────────────────────
async function handleVerify(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  const { reference } = body
  if (!reference) return json(req, { error: 'Payment reference is required.' }, 400)

  // Get stored payment
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('paystack_reference', reference)
    .single()

  if (payment?.user_email?.toLowerCase() !== userEmail.toLowerCase()) {
    return json(req, { error: 'This payment reference belongs to another account.' }, 403)
  }

  if (payment?.status === 'success') {
    const { data: user } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single()
    return json(req, { success: true, user: user ? { ...user, password_hash: undefined } : null, idempotent: true })
  }

  const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY')

  if (paystackKey) {
    try {
      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { 'Authorization': `Bearer ${paystackKey}` } }
      )
      const verifyData = await verifyRes.json()
      const paystackData = verifyData.data

      if (!verifyData.status || !paystackData) {
        await supabase.from('payments')
          .update({ status: 'failed', failure_reason: verifyData.message || 'Verification failed' })
          .eq('paystack_reference', reference)
        return json(req, { error: 'Payment could not be verified with Paystack.' }, 402)
      }

      if (paystackData.status !== 'success') {
        const terminalStatus = paystackData.status === 'abandoned' ? 'abandoned' : 'failed'
        await supabase.from('payments')
          .update({ status: terminalStatus, failure_reason: `Paystack status: ${paystackData.status}` })
          .eq('paystack_reference', reference)
        return json(req, { error: `Payment is not successful. Status: ${paystackData.status}.` }, 402)
      }

      const metadata = normalizePaystackMetadata(paystackData.metadata)
      const planName = payment.plan || metadata.plan_name
      const billingPeriod = payment.billing_period || metadata.billing_period || 'monthly'
      const intent = resolvePaymentIntent(planName, billingPeriod)

      const paidAmount = Math.round((paystackData.amount || 0) / 100)
      const paidCurrency = paystackData.currency || 'KES'
      const customerEmail = paystackData.customer?.email || metadata.user_email || userEmail

      if (customerEmail.toLowerCase() !== userEmail.toLowerCase()) {
        await supabase.from('payments')
          .update({ status: 'failed', failure_reason: 'Customer email mismatch' })
          .eq('paystack_reference', reference)
        return json(req, { error: 'Verified payment belongs to another Paystack customer.' }, 403)
      }

      if ((intent as any).error || paidAmount !== intent.amount || paidCurrency !== intent.currency) {
        await supabase.from('payments')
          .update({ status: 'failed', failure_reason: `Amount/currency mismatch` })
          .eq('paystack_reference', reference)
        return json(req, { error: 'Verified payment amount does not match the selected plan.' }, 402)
      }

      // Complete the payment — upgrade user plan
      await supabase.from('payments')
        .update({
          status: 'success',
          paid_at: paystackData.paid_at || new Date().toISOString(),
          webhook_event_id: String(paystackData.id || ''),
          updated_at: new Date().toISOString(),
        })
        .eq('paystack_reference', reference)

      await supabase.from('profiles')
        .update({ plan: intent.planName })
        .eq('email', userEmail)

      // Audit log
      await supabase.from('audit_logs').insert({
        user_email: userEmail,
        action: 'plan_upgrade',
        target_type: 'user',
        target_id: userEmail,
        details: `Upgraded to ${intent.planName} plan via payment ${reference}`,
        created_at: new Date().toISOString(),
      })

      const { data: updatedUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .single()

      return json(req, { success: true, user: updatedUser ? { ...updatedUser, password_hash: undefined } : null })
    } catch (e: any) {
      console.error('[Payment] Verify error:', e)
      return json(req, { error: 'Could not reach Paystack verification service.' }, 502)
    }
  }

  // Production: fail if verify-without-paystack
  if (PRODUCTION) {
    return json(req, { error: 'Payment verification service unavailable.' }, 502)
  }

  // Sandbox verification (development only)
  if (!String(reference).startsWith('sandbox_')) {
    await supabase.from('payments')
      .update({ status: 'failed', failure_reason: 'Sandbox requires sandbox_ prefix' })
      .eq('paystack_reference', reference)
    return json(req, { error: "Payment could not be verified. For testing, reference must start with 'sandbox_'." }, 402)
  }

  // Sandbox success
  await supabase.from('payments')
    .update({ status: 'success', paid_at: new Date().toISOString() })
    .eq('paystack_reference', reference)

  await supabase.from('profiles')
    .update({ plan: payment.plan })
    .eq('email', userEmail)

  const { data: sandboxUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', userEmail)
    .single()

  return json(req, { success: true, user: sandboxUser ? { ...sandboxUser, password_hash: undefined } : null })
}

// ─── Abandon Payment ──────────────────────────────────────────────
async function handleAbandon(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  const { reference } = body
  if (!reference) return json(req, { error: 'Payment reference is required.' }, 400)

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('paystack_reference', reference)
    .single()

  if (!payment) return json(req, { error: 'Payment reference not found.' }, 404)
  if (payment.user_email?.toLowerCase() !== userEmail.toLowerCase()) {
    return json(req, { error: 'This payment reference belongs to another account.' }, 403)
  }
  if (payment.status === 'success') return json(req, { success: true, status: 'success' })

  await supabase.from('payments')
    .update({
      status: 'abandoned',
      failure_reason: 'Checkout was closed before payment authorization.',
      updated_at: new Date().toISOString(),
    })
    .eq('paystack_reference', reference)

  return json(req, { success: true, status: 'abandoned' })
}

// ─── Checkout ─────────────────────────────────────────────────────
async function handleCheckout(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  return await handleInitialize(req, supabase, userEmail, body)
}

// ─── Webhook ──────────────────────────────────────────────────────
// NOTE: the signature is over the *raw* request body, so we take the text
// already read by the caller. Calling `req.clone()` after the body has been
// parsed throws ("body already used") and made every webhook 500.
async function handleWebhook(
  req: Request,
  rawBody: string,
  supabase: ReturnType<typeof createClient>,
  body: any
) {
  // Verify Paystack signature
  const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY')
  const signature = req.headers.get('x-paystack-signature')

  if (!paystackKey) {
    console.error('[process-payment] Missing PAYSTACK_SECRET_KEY — webhook cannot verify')
    return new Response(null, { status: 500 })
  }
  if (!signature || !/^[0-9a-f]+$/i.test(signature) || signature.length % 2 !== 0) {
    console.error('[process-payment] Missing or malformed x-paystack-signature header')
    return new Response(null, { status: 401 })
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(paystackKey),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['verify']
  )
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    hexToBytes(signature),
    encoder.encode(rawBody)
  )
  if (!valid) {
    console.error('[process-payment] Webhook signature verification failed')
    return new Response(null, { status: 401 })
  }

  const event = body.event
  const data = body.data
  if (!event || !data) return json(req, { error: 'Invalid webhook payload' }, 400)

  const metadata = normalizePaystackMetadata(data.metadata)
  const reference = data.reference || metadata.reference || ''
  const eventId = String(data.id || data.event_id || `${event}:${reference}`)

  if (event === 'charge.success' && data.status === 'success') {
    const planFromCode = resolvePlanFromCode(data.plan?.plan_code || '')
    const planName = (metadata.plan_name || planFromCode?.planName || '').toLowerCase()
    const email = (metadata.user_email || data.customer?.email || '').toLowerCase()

    if (email && planName && PLAN_CATALOG[planName]) {
      // Update payment
      await supabase.from('payments')
        .upsert({
          paystack_reference: reference,
          user_email: email,
          amount: Math.round((data.amount || 0) / 100),
          currency: data.currency || 'KES',
          plan: planName,
          status: 'success',
          paid_at: data.paid_at || new Date().toISOString(),
          webhook_event_id: eventId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'paystack_reference' })

      // Upgrade user plan
      await supabase.from('profiles')
        .update({ plan: planName })
        .eq('email', email)

      // Audit log
      await supabase.from('audit_logs').insert({
        user_email: email,
        action: 'webhook_plan_upgrade',
        target_type: 'payment',
        target_id: reference,
        details: `Webhook: upgraded to ${planName} plan via payment ${reference}`,
        created_at: new Date().toISOString(),
      })

      console.log('[process-payment] Webhook upgraded plan', { email, planName, reference })
    } else {
      console.warn('[process-payment] Webhook ignored — unidentifiable plan/user', {
        reference, planName, hasEmail: Boolean(email),
      })
    }
  }

  return json(req, { received: true })
}

// ─── Hex to bytes helper ──────────────────────────────────────────
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}
