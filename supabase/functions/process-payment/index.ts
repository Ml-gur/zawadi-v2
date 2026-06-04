import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Environment ──────────────────────────────────────────────────
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'development'
const PRODUCTION = ENVIRONMENT === 'production'

// ─── CORS ─────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = PRODUCTION
  ? ['https://www.techsari.online']
  : ['http://localhost:5173', 'http://127.0.0.1:5173']

function getCorsOrigin(req: Request): string {
  const origin = req.headers.get('origin') || ''
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  return ALLOWED_ORIGINS[0]
}

function corsResponse(body: unknown, status = 200, req?: Request) {
  const origin = req ? getCorsOrigin(req) : ALLOWED_ORIGINS[0]
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-paystack-signature',
      'Content-Type': 'application/json',
    },
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
    const origin = getCorsOrigin(req)
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-paystack-signature',
      },
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const url = new URL(req.url)
    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {}

    // ── Webhook: no auth required ──
    if (url.pathname.endsWith('/webhook') || body.action === 'webhook') {
      return handleWebhook(req, supabase, body)
    }

    // ── Auth for all other actions ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return corsResponse({ error: 'Authentication required' }, 401)

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return corsResponse({ error: 'Invalid or expired token' }, 401)

    const action = body.action || url.searchParams.get('action')

    if (action === 'initialize') return handleInitialize(supabase, user.email!, body)
    if (action === 'verify') return handleVerify(supabase, user.email!, body)
    if (action === 'abandon') return handleAbandon(supabase, user.email!, body)
    if (action === 'checkout') return handleCheckout(supabase, user.email!, body)

    return corsResponse({ error: `Unknown action: ${action}` }, 400)
  } catch (err: any) {
    console.error('[process-payment] Error:', err.message)
    return corsResponse({ error: 'Internal server error: ' + err.message }, 500)
  }
})

// ─── Initialize Payment ───────────────────────────────────────────
async function handleInitialize(
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  const intent = resolvePaymentIntent(body.plan_name, body.billing_period)
  if ((intent as any).error) return corsResponse({ error: (intent as any).error }, 400)

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
    return corsResponse({ error: 'Plan downgrades are not permitted via this endpoint.' }, 403)
  }
  if (targetRank === currentRank) {
    return corsResponse({ error: `You are already subscribed to the ${PLAN_CATALOG[intent.planName].name} tier.` }, 403)
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
        return corsResponse({ error: `Paystack init failed: ${initData.message}` }, 502)
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

      return corsResponse({
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
      return corsResponse({ error: 'Failed to initialize payment with Paystack.' }, 502)
    }
  }

  // Production: fail if Paystack key is missing
  if (PRODUCTION) {
    return corsResponse({ error: 'Payment gateway not configured. Please contact support.' }, 500)
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

  return corsResponse({
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
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  const { reference } = body
  if (!reference) return corsResponse({ error: 'Payment reference is required.' }, 400)

  // Get stored payment
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('paystack_reference', reference)
    .single()

  if (payment?.user_email?.toLowerCase() !== userEmail.toLowerCase()) {
    return corsResponse({ error: 'This payment reference belongs to another account.' }, 403)
  }

  if (payment?.status === 'success') {
    const { data: user } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single()
    return corsResponse({ success: true, user: user ? { ...user, password_hash: undefined } : null, idempotent: true })
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
        return corsResponse({ error: 'Payment could not be verified with Paystack.' }, 402)
      }

      if (paystackData.status !== 'success') {
        const terminalStatus = paystackData.status === 'abandoned' ? 'abandoned' : 'failed'
        await supabase.from('payments')
          .update({ status: terminalStatus, failure_reason: `Paystack status: ${paystackData.status}` })
          .eq('paystack_reference', reference)
        return corsResponse({ error: `Payment is not successful. Status: ${paystackData.status}.` }, 402)
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
        return corsResponse({ error: 'Verified payment belongs to another Paystack customer.' }, 403)
      }

      if ((intent as any).error || paidAmount !== intent.amount || paidCurrency !== intent.currency) {
        await supabase.from('payments')
          .update({ status: 'failed', failure_reason: `Amount/currency mismatch` })
          .eq('paystack_reference', reference)
        return corsResponse({ error: 'Verified payment amount does not match the selected plan.' }, 402)
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

      return corsResponse({ success: true, user: updatedUser ? { ...updatedUser, password_hash: undefined } : null })
    } catch (e: any) {
      console.error('[Payment] Verify error:', e)
      return corsResponse({ error: 'Could not reach Paystack verification service.' }, 502)
    }
  }

  // Production: fail if verify-without-paystack
  if (PRODUCTION) {
    return corsResponse({ error: 'Payment verification service unavailable.' }, 502)
  }

  // Sandbox verification (development only)
  if (!String(reference).startsWith('sandbox_')) {
    await supabase.from('payments')
      .update({ status: 'failed', failure_reason: 'Sandbox requires sandbox_ prefix' })
      .eq('paystack_reference', reference)
    return corsResponse({ error: "Payment could not be verified. For testing, reference must start with 'sandbox_'." }, 402)
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

  return corsResponse({ success: true, user: sandboxUser ? { ...sandboxUser, password_hash: undefined } : null })
}

// ─── Abandon Payment ──────────────────────────────────────────────
async function handleAbandon(
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  const { reference } = body
  if (!reference) return corsResponse({ error: 'Payment reference is required.' }, 400)

  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('paystack_reference', reference)
    .single()

  if (!payment) return corsResponse({ error: 'Payment reference not found.' }, 404)
  if (payment.user_email?.toLowerCase() !== userEmail.toLowerCase()) {
    return corsResponse({ error: 'This payment reference belongs to another account.' }, 403)
  }
  if (payment.status === 'success') return corsResponse({ success: true, status: 'success' })

  await supabase.from('payments')
    .update({
      status: 'abandoned',
      failure_reason: 'Checkout was closed before payment authorization.',
      updated_at: new Date().toISOString(),
    })
    .eq('paystack_reference', reference)

  return corsResponse({ success: true, status: 'abandoned' })
}

// ─── Checkout ─────────────────────────────────────────────────────
async function handleCheckout(
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  return handleInitialize(supabase, userEmail, body)
}

// ─── Webhook ─────────────────────────────────────────────────────
async function handleWebhook(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  body: any
) {
  // Verify Paystack signature
  const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY')!
  const signature = req.headers.get('x-paystack-signature')

  if (!paystackKey) {
    console.error('[process-payment] Missing PAYSTACK_SECRET_KEY — webhook cannot verify')
    return new Response(null, { status: 500 })
  }
  if (!signature) {
    console.error('[process-payment] Missing x-paystack-signature header')
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
  const rawBody = await req.clone().text()
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    hexToBytes(signature),
    encoder.encode(rawBody)
  )
  if (!valid) return new Response(null, { status: 401 })

  const event = body.event
  const data = body.data
  if (!event || !data) return corsResponse({ error: 'Invalid webhook payload' }, 400)

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
    }
  }

  return corsResponse({ received: true })
}

// ─── Hex to bytes helper ──────────────────────────────────────────
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}
