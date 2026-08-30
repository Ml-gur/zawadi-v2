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

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_EMAIL = 'Zawadi <notifications@techsari.online>'
const SITE_URL = 'https://www.techsari.online'
const BATCH_SIZE = 10 // Send up to 10 emails per invocation

// ─── Email template: New scholarship match ──────────────────────────────
function buildNewListingEmail(
  userName: string,
  matches: { scholarship_name: string; match_score: number; reasons: string[]; scholarship_id: string }[]
): { subject: string; html: string } {
  const count = matches.length
  const plural = count === 1 ? '' : 's'

  const scholarshipCards = matches.map(m => {
    const scoreColor = m.match_score >= 70 ? '#16a34a' : m.match_score >= 50 ? '#ca8a04' : '#6b7280'
    const reasonsList = m.reasons.slice(0, 3).map(r => `<li style="margin:2px 0;color:#6b7280;font-size:13px;">✓ ${r}</li>`).join('')

    return `
      <tr>
        <td style="padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:12px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <h3 style="margin:0 0 4px 0;font-size:16px;color:#0f172a;font-weight:600;">${m.scholarship_name}</h3>
                <p style="margin:0 0 8px 0;font-size:13px;">
                  <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;color:white;background:${scoreColor};">${m.match_score}% match</span>
                </p>
                <ul style="margin:0;padding-left:16px;">${reasonsList}</ul>
                <a href="${SITE_URL}/scholarships/browse/${m.scholarship_id}" style="display:inline-block;margin-top:12px;padding:8px 20px;background:#0f172a;color:white;border-radius:999px;text-decoration:none;font-size:13px;font-weight:500;">View Scholarship →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
    `
  }).join('')

  return {
    subject: count === 1
      ? `New scholarship match: ${matches[0].scholarship_name}`
      : `${count} new scholarships match your profile`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding:24px 24px 16px 24px;background:#0f172a;">
                    <h1 style="margin:0;color:white;font-size:20px;font-weight:700;">🎓 Zawadi</h1>
                    <p style="margin:8px 0 0 0;color:#94a3b8;font-size:14px;">New scholarship${plural} for you</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 16px 0;color:#334155;font-size:15px;line-height:1.5;">
                      Hi ${userName || 'there'},
                    </p>
                    <p style="margin:0 0 20px 0;color:#334155;font-size:15px;line-height:1.5;">
                      Based on your profile, we found <strong>${count} scholarship${plural}</strong> you may be eligible for:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${scholarshipCards}
                    </table>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                      <a href="${SITE_URL}/dashboard" style="color:#6366f1;text-decoration:none;">Manage notification preferences</a>
                      &nbsp;·&nbsp;
                      <a href="${SITE_URL}/unsubscribe" style="color:#94a3b8;text-decoration:none;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
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

  const scholarshipRows = matches.map(m => {
    const scoreColor = m.match_score >= 70 ? '#16a34a' : m.match_score >= 50 ? '#ca8a04' : '#6b7280'
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:top;">
                <a href="${SITE_URL}/scholarships/browse/${m.scholarship_id}" style="color:#0f172a;text-decoration:none;font-weight:600;font-size:14px;">${m.scholarship_name}</a>
                <p style="margin:4px 0 0 0;color:#64748b;font-size:12px;">${m.reasons[0] || 'Matches your profile'}</p>
              </td>
              <td style="text-align:right;vertical-align:top;white-space:nowrap;">
                <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;color:white;background:${scoreColor};">${m.match_score}%</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
  }).join('')

  return {
    subject: count === 1
      ? `1 new scholarship match ${period}`
      : `${count} new scholarship matches ${period}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding:24px 24px 16px 24px;background:#0f172a;">
                    <h1 style="margin:0;color:white;font-size:20px;font-weight:700;">🎓 Zawadi ${digestType === 'weekly' ? 'Weekly' : 'Daily'} Digest</h1>
                    <p style="margin:8px 0 0 0;color:#94a3b8;font-size:14px;">${count} match${count === 1 ? '' : 'es'} ${period}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 16px 0;color:#334155;font-size:15px;line-height:1.5;">
                      Hi ${userName || 'there'},
                    </p>
                    <p style="margin:0 0 16px 0;color:#334155;font-size:15px;line-height:1.5;">
                      Here${count === 1 ? "'s" : "'re"} the scholarship${count === 1 ? '' : 's'} that matched your profile ${period}:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${scholarshipRows}
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                      <tr>
                        <td align="center">
                          <a href="${SITE_URL}/scholarships/browse" style="display:inline-block;padding:10px 24px;background:#0f172a;color:white;border-radius:999px;text-decoration:none;font-size:14px;font-weight:500;">Browse All Scholarships →</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                      <a href="${SITE_URL}/dashboard" style="color:#6366f1;text-decoration:none;">Manage notification preferences</a>
                      &nbsp;·&nbsp;
                      <a href="${SITE_URL}/unsubscribe" style="color:#94a3b8;text-decoration:none;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
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

      const matchData = JSON.parse(notification.match_data || '[]')
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
