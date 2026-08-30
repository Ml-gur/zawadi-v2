// ═══════════════════════════════════════════════════════════════════════════
// send-daily-digest: Groups pending daily_digest notifications by user
// and sends one consolidated email per user via Resend.
// Runs daily at 07:00 UTC via pg_cron.
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

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return { id: null, error: 'RESEND_API_KEY not configured' }
  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { id: null, error: `Resend ${res.status}: ${err.substring(0, 200)}` }
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

    // Auth
    const cronSecret = req.headers.get('x-cron-secret')
    const isCron = cronSecret && cronSecret === Deno.env.get('CRON_SECRET')
    if (!isCron) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) return fail('Authentication required', 401)
      const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      if (error || !user) return fail('Invalid token', 401)
    }

    // Get all pending daily_digest notifications
    const { data: pending, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .eq('notification_type', 'daily_digest')
      .lte('scheduled_for', new Date().toISOString())

    if (fetchError) return fail('Fetch error: ' + fetchError.message)
    if (!pending?.length) return ok({ sent: 0, message: 'No pending daily digests' })

    // Group by user_id
    const byUser = new Map<string, any[]>()
    for (const n of pending) {
      const existing = byUser.get(n.user_id) || []
      existing.push(n)
      byUser.set(n.user_id, existing)
    }

    let sent = 0
    let failed = 0

    for (const [userId, notifications] of byUser) {
      // Merge all match_data from this user's pending digests
      const allMatches: any[] = []
      const allIds: string[] = []
      for (const n of notifications) {
        const matches = JSON.parse(n.match_data || '[]')
        const ids = JSON.parse(n.scholarship_ids || '[]')
        for (const m of matches) {
          if (!allMatches.some(am => am.scholarship_id === m.scholarship_id)) {
            allMatches.push(m)
          }
        }
        for (const id of ids) {
          if (!allIds.includes(id)) allIds.push(id)
        }
      }

      // Deduplicate and sort by score
      allMatches.sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0))
      const topMatches = allMatches.slice(0, 10)

      if (topMatches.length === 0) {
        // Cancel all notifications for this user (no real matches)
        for (const n of notifications) {
          await supabase.from('notification_queue').update({ status: 'cancelled' }).eq('id', n.id)
        }
        continue
      }

      // Fetch user info
      const email = notifications[0].email
      const { data: userProfile } = await supabase
        .from('profiles').select('name').eq('id', userId).maybeSingle()
      const userName = userProfile?.name || ''

      // Build digest email
      const count = topMatches.length
      const scholarshipRows = topMatches.map((m: any) => {
        const scoreColor = m.match_score >= 70 ? '#16a34a' : m.match_score >= 50 ? '#ca8a04' : '#6b7280'
        return `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;">
                    <a href="${SITE_URL}/scholarships/browse/${m.scholarship_id}" style="color:#0f172a;text-decoration:none;font-weight:600;font-size:14px;">${m.scholarship_name}</a>
                    <p style="margin:4px 0 0 0;color:#64748b;font-size:12px;">${(m.reasons || [])[0] || 'Matches your profile'}</p>
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

      const html = `
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
                      <h1 style="margin:0;color:white;font-size:20px;font-weight:700;">🎓 Zawadi Daily Digest</h1>
                      <p style="margin:8px 0 0 0;color:#94a3b8;font-size:14px;">${count} match${count === 1 ? '' : 'es'} today</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px;">
                      <p style="margin:0 0 16px 0;color:#334155;font-size:15px;line-height:1.5;">
                        Hi ${userName || 'there'},
                      </p>
                      <p style="margin:0 0 16px 0;color:#334155;font-size:15px;line-height:1.5;">
                        Here${count === 1 ? "'s" : "'re"} the scholarship${count === 1 ? '' : 's'} that matched your profile today:
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
      `

      const result = await sendEmail(email, `${count} new scholarship match${count === 1 ? '' : 'es'} today`, html)

      if (result.error) {
        // Mark all as failed
        for (const n of notifications) {
          await supabase.from('notification_queue').update({
            status: 'failed',
            error_message: result.error,
            attempts: (n.attempts || 0) + 1,
            last_attempt_at: new Date().toISOString(),
          }).eq('id', n.id)
        }
        failed++
      } else {
        // Mark all as sent, keep first as primary
        for (let i = 0; i < notifications.length; i++) {
          const n = notifications[i]
          await supabase.from('notification_queue').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            resend_message_id: i === 0 ? result.id : null,
            attempts: (n.attempts || 0) + 1,
          }).eq('id', n.id)
        }

        // Log event
        await supabase.from('email_events').insert({
          user_id: userId,
          notification_id: notifications[0].id,
          resend_message_id: result.id,
          event_type: 'sent',
        })
        sent++
      }
    }

    return ok({ sent, failed, total_users: byUser.size })
  } catch (err: any) {
    console.error('[send-daily-digest] Error:', err.message)
    return fail('Internal server error: ' + err.message, 500)
  }
})
