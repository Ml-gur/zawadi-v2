// ═══════════════════════════════════════════════════════════════════════════
// send-notifications: Queue worker that picks up pending notifications
// and sends them via Resend. Runs every 5 minutes via pg_cron.
//
// Auth: x-cron-secret header or admin JWT
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

let currentOrigin = 'https://www.techsari.online'

const corsHeaders = {
  'Access-Control-Allow-Origin': currentOrigin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

function allowedOrigin(req: Request): string {
  const o = req.headers.get('Origin') || ''
  if (/^https:\/\/(www\.)?techsari\.online$/.test(o)) return o
  return 'https://www.techsari.online'
}

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function fail(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function safeJsonParse(val: any, fallback: any = []) {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'object') return val // already parsed by Supabase JS client
  try { return JSON.parse(val) } catch { return fallback }
}

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_EMAIL = 'Techsari <notifications@techsari.online>'
const SITE_URL = 'https://www.techsari.online'
const BATCH_SIZE = 10 // Send up to 10 emails per invocation

// ─── Reusable email shell (Techsari premium style) ─────────────────────
function emailShell(headerTitle: string, headerSubtitle: string, bodyContent: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f4f4ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#14140f;-webkit-font-smoothing:antialiased;">
    <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f4f4ec;padding:40px 12px;">
      <tr><td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#ffffff;border-radius:20px;border:1px solid #dcdcd0;overflow:hidden;box-shadow:0 10px 30px rgba(20,20,15,0.04);">
          <!-- Header -->
          <tr><td style="padding:24px 36px;background-color:#14140f;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0"><tr>
              <td><table border="0" cellspacing="0" cellpadding="0"><tr>
                <td style="padding-right:12px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;background-color:#beff50;color:#14140f;border-radius:50%;font-weight:700;font-size:17px;line-height:1;">T</span></td>
                <td>
                  <span style="color:#ffffff;font-weight:600;font-size:18px;letter-spacing:-0.02em;display:block;line-height:1.1;">Techsari</span>
                  <span style="color:#919183;font-size:9px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;display:block;margin-top:3px;">${headerSubtitle}</span>
                </td>
              </tr></table></td>
              <td align="right"><span style="background-color:rgba(190,255,80,0.15);color:#beff50;border:1px solid rgba(190,255,80,0.3);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;padding:5px 12px;border-radius:9999px;display:inline-block;">Verified Match</span></td>
            </tr></table>
          </td></tr>
          <!-- Body -->
          <tr><td style="padding:36px 36px 32px 36px;font-size:15px;line-height:1.6;color:#14140f;">
            ${bodyContent}
          </td></tr>
          <!-- Footer -->
          <tr><td style="padding:24px 36px;background-color:#14140f;text-align:center;font-size:11px;color:#919183;border-top:1px solid #282820;">
            <div style="margin-bottom:12px;color:#ffffff;font-weight:500;font-size:12px;">Techsari — Scholarships matched to you. Applications supported by AI and mentors.</div>
            <div style="margin-bottom:14px;line-height:1.6;">You received this email because scholarship notifications are enabled for your profile.<br>
              <a href="${SITE_URL}/dashboard" style="color:#beff50;text-decoration:none;">Manage preferences</a> &nbsp;&bull;&nbsp;
              <a href="${SITE_URL}/unsubscribe" style="color:#919183;text-decoration:underline;">Unsubscribe</a>
            </div>
            <div style="font-size:10px;color:#6e6e64;letter-spacing:0.05em;">&copy; 2026 TECHSARI. ALL RIGHTS RESERVED.</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
    </body></html>
  `
}

// ─── Email template: New scholarship match ──────────────────────────────
function buildNewListingEmail(
  userName: string,
  matches: { scholarship_name: string; match_score: number; reasons: string[]; scholarship_id: string }[]
): { subject: string; html: string } {
  const count = matches.length
  const plural = count === 1 ? '' : 's'

  const scholarshipCards = matches.map(m => {
    const matchLabel = m.match_score >= 80 ? 'Strong match' : m.match_score >= 60 ? 'Good match' : 'Possible match'
    const matchBg = m.match_score >= 80 ? '#e8f5e9' : m.match_score >= 60 ? '#fff8e1' : '#f5f5f5'
    const matchColor = m.match_score >= 80 ? '#2e7d32' : m.match_score >= 60 ? '#f57f17' : '#616161'
    const reasonsList = m.reasons.map(r => `<div style="font-size:12px;color:#40403a;line-height:1.6;">✓ ${r}</div>`).join('')

    return `
      <div style="background-color:#fafaf6;border:1px solid #e0e0d6;border-radius:14px;padding:20px;margin-bottom:14px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0"><tr>
          <td>
            <div style="margin-bottom:8px;">
              <span style="display:inline-block;background-color:#14140f;color:#ffffff;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;padding:4px 10px;border-radius:9999px;">${m.scholarship_name}</span>
              <span style="display:inline-block;margin-left:6px;font-size:11px;font-weight:600;color:${matchColor};background-color:${matchBg};padding:3px 8px;border-radius:9999px;">● ${matchLabel}</span>
            </div>
            <div style="font-size:12px;font-weight:600;color:#14140f;margin:10px 0 6px 0;letter-spacing:0.03em;">Why you're seeing this</div>
            <div style="padding:0 0 0 2px;">${reasonsList}</div>
          </td>
          <td align="right" valign="top" style="white-space:nowrap;padding-left:12px;">
            <a href="${SITE_URL}/scholarships/browse/${m.scholarship_id}" style="display:inline-block;padding:8px 16px;background-color:#14140f;color:#ffffff;text-decoration:none;border-radius:9999px;font-size:12px;font-weight:600;border:1px solid #14140f;">View →</a>
          </td>
        </tr></table>
      </div>
    `
  }).join('')

  const greeting = userName ? `Hi <strong>${userName}</strong>,` : 'Hi there,'

  const body = `
    <p style="margin:0 0 16px 0;font-size:17px;color:#14140f;font-weight:500;">${greeting}</p>
    <p style="margin:0 0 24px 0;color:#40403a;font-size:15px;line-height:1.65;">
      Based on your profile, we found ${count === 1 ? 'an opportunity' : `${count} opportunities`} you may be eligible for. These scholarships appear to match several of your key requirements — but please review the full eligibility criteria on each scholarship's page before applying.
    </p>
    <div style="margin:0 0 12px 0;font-size:11px;font-weight:600;letter-spacing:0.1em;color:#6e6e64;text-transform:uppercase;">Scholarships that may match your profile</div>
    ${scholarshipCards}

    <!-- CTA -->
    <div style="text-align:center;margin:32px 0 28px 0;">
      <a href="${SITE_URL}/scholarships/browse" style="background-color:#beff50;color:#14140f !important;text-decoration:none;padding:16px 36px;border-radius:9999px;font-weight:600;font-size:14px;display:inline-block;border:1px solid #14140f;letter-spacing:-0.01em;box-shadow:0 2px 0 #14140f;">View my matches &rarr;</a>
      <div style="font-size:11px;color:#6e6e64;margin-top:10px;">Review full eligibility requirements, deadlines, and application details before applying.</div>
    </div>

    <!-- Disclaimer -->
    <div style="background-color:#fafaf6;border:1px solid #e0e0d6;border-left:4px solid #beff50;padding:18px 20px;border-radius:12px;font-size:13px;color:#30302a;margin-top:28px;">
      <div style="font-weight:600;font-size:14px;color:#14140f;margin-bottom:4px;">📋 Before you apply</div>
      <div style="line-height:1.55;color:#40403a;">
        Scholarship requirements can be detailed and may change. We match based on the information you provided and the eligibility data we have — but we recommend checking the official scholarship page for the most up-to-date requirements. Techsari helps you prepare your application with <strong>AI-assisted writing tools</strong> and gives you access to <strong>mentors</strong> who can strengthen your materials.
      </div>
      <div style="margin-top:12px;">
        <a href="${SITE_URL}/essays" style="display:inline-block;padding:8px 20px;background-color:#14140f;color:#ffffff;text-decoration:none;border-radius:9999px;font-size:12px;font-weight:600;">Prepare my application &rarr;</a>
      </div>
    </div>

    <!-- Signature -->
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #f0f0e6;">
      <p style="margin:0;font-size:14px;color:#6e6e64;line-height:1.5;">
        Warm regards,<br>
        <strong style="color:#14140f;font-size:15px;">The Techsari Team</strong>
      </p>
    </div>
  `

  return {
    subject: count === 1
      ? `You may be eligible for: ${matches[0].scholarship_name}`
      : `${count} scholarship${plural} that may match your profile`,
    html: emailShell('Scholarship Platform for African Students', '', body),
  }
}

// ─── Email template: Daily digest ───────────────────────────────────────
function buildDigestEmail(
  userName: string,
  matches: { scholarship_name: string; match_score: number; reasons: string[]; scholarship_id: string }[],
  digestType: 'daily' | 'weekly'
): { subject: string; html: string } {
  const count = matches.length
  const period = digestType === 'daily' ? 'today' : 'this week'

  const scholarshipCards = matches.map(m => {
    const matchLabel = m.match_score >= 80 ? 'Strong match' : m.match_score >= 60 ? 'Good match' : 'Possible match'
    const matchBg = m.match_score >= 80 ? '#e8f5e9' : m.match_score >= 60 ? '#fff8e1' : '#f5f5f5'
    const matchColor = m.match_score >= 80 ? '#2e7d32' : m.match_score >= 60 ? '#f57f17' : '#616161'
    const reasonsList = m.reasons.map(r => `<div style="font-size:12px;color:#40403a;line-height:1.6;">✓ ${r}</div>`).join('')

    return `
      <div style="background-color:#fafaf6;border:1px solid #e0e0d6;border-radius:14px;padding:20px;margin-bottom:14px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0"><tr>
          <td>
            <div style="margin-bottom:8px;">
              <span style="display:inline-block;background-color:#14140f;color:#ffffff;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;padding:4px 10px;border-radius:9999px;">${m.scholarship_name}</span>
              <span style="display:inline-block;margin-left:6px;font-size:11px;font-weight:600;color:${matchColor};background-color:${matchBg};padding:3px 8px;border-radius:9999px;">● ${matchLabel}</span>
            </div>
            <div style="font-size:12px;font-weight:600;color:#14140f;margin:10px 0 6px 0;letter-spacing:0.03em;">Why you're seeing this</div>
            <div style="padding:0 0 0 2px;">${reasonsList}</div>
          </td>
          <td align="right" valign="top" style="white-space:nowrap;padding-left:12px;">
            <a href="${SITE_URL}/scholarships/browse/${m.scholarship_id}" style="display:inline-block;padding:8px 16px;background-color:#14140f;color:#ffffff;text-decoration:none;border-radius:9999px;font-size:12px;font-weight:600;border:1px solid #14140f;">View →</a>
          </td>
        </tr></table>
      </div>
    `
  }).join('')

  const greeting = userName ? `Hi <strong>${userName}</strong>,` : 'Hi there,'
  const digestLabel = digestType === 'weekly' ? 'Weekly' : 'Daily'

  const body = `
    <p style="margin:0 0 16px 0;font-size:17px;color:#14140f;font-weight:500;">${greeting}</p>
    <p style="margin:0 0 24px 0;color:#40403a;font-size:15px;line-height:1.65;">
      Based on your profile, we found ${count === 1 ? 'an opportunity' : `${count} opportunities`} you may be eligible for ${period}. These scholarships appear to match several of your key requirements — but please review the full eligibility criteria on each scholarship's page before applying.
    </p>
    <div style="margin:0 0 12px 0;font-size:11px;font-weight:600;letter-spacing:0.1em;color:#6e6e64;text-transform:uppercase;">Scholarships that may match your profile</div>
    ${scholarshipCards}

    <!-- CTA -->
    <div style="text-align:center;margin:32px 0 28px 0;">
      <a href="${SITE_URL}/scholarships/browse" style="background-color:#beff50;color:#14140f !important;text-decoration:none;padding:16px 36px;border-radius:9999px;font-weight:600;font-size:14px;display:inline-block;border:1px solid #14140f;letter-spacing:-0.01em;box-shadow:0 2px 0 #14140f;">View my matches &rarr;</a>
      <div style="font-size:11px;color:#6e6e64;margin-top:10px;">Review full eligibility requirements, deadlines, and application details before applying.</div>
    </div>

    <!-- Disclaimer -->
    <div style="background-color:#fafaf6;border:1px solid #e0e0d6;border-left:4px solid #beff50;padding:18px 20px;border-radius:12px;font-size:13px;color:#30302a;margin-top:28px;">
      <div style="font-weight:600;font-size:14px;color:#14140f;margin-bottom:4px;">📋 Before you apply</div>
      <div style="line-height:1.55;color:#40403a;">
        Scholarship requirements can be detailed and may change. We match based on the information you provided and the eligibility data we have — but we recommend checking the official scholarship page for the most up-to-date requirements. Techsari helps you prepare your application with <strong>AI-assisted writing tools</strong> and gives you access to <strong>mentors</strong> who can strengthen your materials.
      </div>
      <div style="margin-top:12px;">
        <a href="${SITE_URL}/essays" style="display:inline-block;padding:8px 20px;background-color:#14140f;color:#ffffff;text-decoration:none;border-radius:9999px;font-size:12px;font-weight:600;">Prepare my application &rarr;</a>
      </div>
    </div>

    <!-- Signature -->
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #f0f0e6;">
      <p style="margin:0;font-size:14px;color:#6e6e64;line-height:1.5;">
        Warm regards,<br>
        <strong style="color:#14140f;font-size:15px;">The Techsari Team</strong>
      </p>
    </div>
  `

  return {
    subject: count === 1
      ? `1 scholarship that may match your profile — ${period}`
      : `${count} scholarships that may match your profile — ${period}`,
    html: emailShell(`${digestLabel} Digest`, 'Scholarship Platform for African Students', body),
  }
}

// ─── Send email via Resend ──────────────────────────────────────────────
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ id: string | null; error: string | null }> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return { id: null, error: 'RESEND_API_KEY not configured' }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      return { id: null, error: `Resend ${res.status}: ${errBody.substring(0, 200)}` }
    }

    const data = await res.json()
    return { id: data.id, error: null }
  } catch (err: any) {
    return { id: null, error: err.message }
  }
}

serve(async (req: Request) => {
  currentOrigin = allowedOrigin(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': allowedOrigin(req) } })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Auth: cron secret or admin JWT
    const cronSecret = req.headers.get('x-cron-secret')
    const isCron = cronSecret && cronSecret === Deno.env.get('CRON_SECRET')

    if (!isCron) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) return fail('Authentication required', 401)
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      if (authError || !user) return fail('Invalid token', 401)
    }

    // Pick up pending notifications that are due
    const { data: pending, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', 3)
      .order('scheduled_for', { ascending: true })
      .limit(BATCH_SIZE)

    if (fetchError) return fail('Queue fetch error: ' + fetchError.message)
    if (!pending?.length) return ok({ sent: 0, message: 'No pending notifications' })

    let sent = 0
    let failed = 0

    for (const notification of pending) {
      // Mark as processing
      await supabase.from('notification_queue')
        .update({ status: 'processing', last_attempt_at: new Date().toISOString() })
        .eq('id', notification.id)

      const matchData = safeJsonParse(notification.match_data)
      const isDigest = notification.notification_type === 'daily_digest' || notification.notification_type === 'weekly_digest'

      // Fetch user name
      const { data: userProfile } = await supabase
        .from('profiles').select('name').eq('id', notification.user_id).maybeSingle()
      const userName = userProfile?.name || ''

      let emailResult: { id: string | null; error: string | null }

      if (isDigest) {
        // Sort by match_score descending
        matchData.sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0))
        // Take top 10 for digest
        const topMatches = matchData.slice(0, 10)
        const digestType = notification.notification_type === 'weekly_digest' ? 'weekly' : 'daily'
        const { subject, html } = buildDigestEmail(userName, topMatches, digestType)
        emailResult = await sendEmail(notification.email, subject, html)
      } else {
        // Instant notification — show up to 3 scholarships
        const topMatches = matchData.slice(0, 3)
        const { subject, html } = buildNewListingEmail(userName, topMatches)
        emailResult = await sendEmail(notification.email, subject, html)
      }

      if (emailResult.error) {
        await supabase.from('notification_queue').update({
          status: 'failed',
          attempts: notification.attempts + 1,
          error_message: emailResult.error,
        }).eq('id', notification.id)
        failed++
      } else {
        await supabase.from('notification_queue').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          resend_message_id: emailResult.id,
          attempts: notification.attempts + 1,
        }).eq('id', notification.id)

        // Log email event
        await supabase.from('email_events').insert({
          user_id: notification.user_id,
          notification_id: notification.id,
          resend_message_id: emailResult.id,
          event_type: 'sent',
        })
        sent++
      }
    }

    return ok({ sent, failed, total_processed: sent + failed })
  } catch (err: any) {
    console.error('[send-notifications] Error:', err.message)
    return fail('Internal server error: ' + err.message, 500)
  }
})
