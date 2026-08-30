// ═══════════════════════════════════════════════════════════════════════════
// process-new-listing: When a scholarship is published, find matching
// users and queue notification emails.
//
// Called by: admin publish action, bot queue approve, or cron
// Auth: service_role or admin JWT
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function safeJsonParse(val: any, fallback: any = []) {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return fallback }
}

let currentOrigin = 'https://www.techsari.online'

const corsHeaders = {
  'Access-Control-Allow-Origin': currentOrigin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// ─── Simple eligibility check (server-side, no matching engine) ─────────
function checkEligibility(scholarship: any, profile: any): {
  eligible: boolean
  score: number
  reasons: string[]
} {
  const reasons: string[] = []
  let score = 50 // baseline

  // Country match
  const scholCountries: string[] = scholarship.countries || []
  if (scholCountries.length > 0) {
    const userCountry = (profile.country || '').trim()
    if (userCountry && scholCountries.some(c => c.toLowerCase() === userCountry.toLowerCase())) {
      score += 20
      reasons.push('Country matches eligible list')
    } else if (userCountry) {
      score -= 15
      reasons.push('Country not in eligible list')
    }
  } else {
    reasons.push('Open to all countries')
    score += 10
  }

  // Degree level match
  const scholDegrees: string[] = scholarship.degree_levels || []
  const userDegree = (profile.degree_level || '').trim()
  if (userDegree && scholDegrees.length > 0) {
    const degMatch = scholDegrees.some(d => d.toLowerCase().includes(userDegree.toLowerCase()))
    if (degMatch) {
      score += 15
      reasons.push('Degree level matches')
    } else {
      score -= 10
      reasons.push('Degree level may not match')
    }
  }

  // Field of study match
  const scholFields: string[] = scholarship.fields_of_study || []
  const userField = (profile.field_of_study || '').trim()
  if (userField && scholFields.length > 0) {
    const fieldMatch = scholFields.some(f => f.toLowerCase().includes(userField.toLowerCase()))
    if (fieldMatch) {
      score += 10
      reasons.push('Field of study matches')
    }
  }

  // No IELTS benefit
  if (scholarship.no_ielts) {
    score += 5
    reasons.push('No IELTS required')
  }

  // Financial need alignment
  if (scholarship.targets_financial_need && profile.financial_need) {
    score += 5
    reasons.push('Targets financial need')
  }

  return {
    eligible: score >= 40,
    score: Math.min(100, Math.max(0, score)),
    reasons,
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

    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return fail('Authentication required', 401)

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return fail('Invalid token', 401)

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('email', user.email).single()
    if (profile?.role !== 'super_admin' && profile?.role !== 'content_manager') {
      return fail('Admin access required', 403)
    }

    const body = await req.json().catch(() => ({}))
    const { scholarship_id, scholarship_ids } = body

    // Determine which scholarships to process
    let scholarshipIds: string[] = []
    if (scholarship_id) {
      scholarshipIds = [scholarship_id]
    } else if (scholarship_ids && Array.isArray(scholarship_ids)) {
      scholarshipIds = scholarship_ids
    } else {
      return fail('Provide scholarship_id or scholarship_ids')
    }

    // Fetch scholarships
    const { data: scholarships, error: scholError } = await supabase
      .from('scholarships')
      .select('*')
      .in('id', scholarshipIds)
      .eq('published', true)

    if (scholError || !scholarships?.length) {
      return fail(`No published scholarships found: ${scholError?.message || 'none'}`)
    }

    // Fetch users with notification preferences (instant or daily)
    const { data: prefs, error: prefError } = await supabase
      .from('notification_preferences')
      .select('user_id, email, new_listing_alerts, minimum_match_score, notification_frequency')
      .eq('new_listing_alerts', true)
      .neq('notification_frequency', 'none')

    if (prefError || !prefs?.length) {
      return ok({ processed: 0, message: 'No users with notification preferences' })
    }

    // Fetch user profiles for matching
    const userIds = prefs.map(p => p.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, country, degree_level, field_of_study')
      .in('id', userIds)

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    let matchesCreated = 0
    let notificationsQueued = 0

    for (const scholarship of scholarships) {
      // Group users by notification frequency for this scholarship
      const instantUsers: { user_id: string; email: string; match_score: number; reasons: string[] }[] = []
      const dailyUsers: { user_id: string; email: string; match_score: number; reasons: string[] }[] = []
      const weeklyUsers: { user_id: string; email: string; match_score: number; reasons: string[] }[] = []

      for (const pref of prefs) {
        const userProfile = profileMap.get(pref.user_id)
        if (!userProfile) continue

        const eligibility = checkEligibility(scholarship, userProfile)
        const minScore = pref.minimum_match_score || 50

        if (eligibility.score < minScore) continue

        const matchRecord = {
          user_id: pref.user_id,
          scholarship_id: scholarship.id,
          match_score: eligibility.score,
          eligibility_status: eligibility.score >= 70 ? 'likely_eligible' : 'possibly_eligible',
          match_reasons: eligibility.reasons,
        }

        // Upsert match record
        await supabase.from('user_matches').upsert(matchRecord, {
          onConflict: 'user_id,scholarship_id',
        })
        matchesCreated++

        const entry = {
          user_id: pref.user_id,
          email: pref.email,
          match_score: eligibility.score,
          reasons: eligibility.reasons,
        }

        if (pref.notification_frequency === 'instant') {
          instantUsers.push(entry)
        } else if (pref.notification_frequency === 'daily') {
          dailyUsers.push(entry)
        } else if (pref.notification_frequency === 'weekly') {
          weeklyUsers.push(entry)
        }
      }

      // Queue instant notifications (one per user)
      for (const user of instantUsers) {
        await supabase.from('notification_queue').insert({
          user_id: user.user_id,
          email: user.email,
          notification_type: 'new_listing',
          status: 'pending',
          scholarship_ids: JSON.stringify([scholarship.id]),
          match_data: JSON.stringify([{
            scholarship_id: scholarship.id,
            scholarship_name: scholarship.name,
            match_score: user.match_score,
            reasons: user.reasons,
          }]),
          scheduled_for: new Date().toISOString(),
        })
        notificationsQueued++
      }

      // Queue daily digest entries (batched per user later by send-daily-digest)
      for (const user of dailyUsers) {
        // Check if there's already a pending daily digest for this user today
        const today = new Date().toISOString().split('T')[0]
        const { data: existing } = await supabase
          .from('notification_queue')
          .select('id, scholarship_ids, match_data')
          .eq('user_id', user.user_id)
          .eq('notification_type', 'daily_digest')
          .eq('status', 'pending')
          .gte('created_at', `${today}T00:00:00Z`)
          .maybeSingle()

        if (existing) {
          // Append to existing daily digest
          const existingIds = safeJsonParse(existing.scholarship_ids)
          const existingData = safeJsonParse(existing.match_data)
          if (!existingIds.includes(scholarship.id)) {
            existingIds.push(scholarship.id)
            existingData.push({
              scholarship_id: scholarship.id,
              scholarship_name: scholarship.name,
              match_score: user.match_score,
              reasons: user.reasons,
            })
            await supabase.from('notification_queue').update({
              scholarship_ids: JSON.stringify(existingIds),
              match_data: JSON.stringify(existingData),
            }).eq('id', existing.id)
          }
        } else {
          await supabase.from('notification_queue').insert({
            user_id: user.user_id,
            email: user.email,
            notification_type: 'daily_digest',
            status: 'pending',
            scholarship_ids: JSON.stringify([scholarship.id]),
            match_data: JSON.stringify([{
              scholarship_id: scholarship.id,
              scholarship_name: scholarship.name,
              match_score: user.match_score,
              reasons: user.reasons,
            }]),
            scheduled_for: new Date(`${today}T07:00:00Z`), // 7 AM UTC
          })
        }
        notificationsQueued++
      }

      // Queue weekly digest entries
      for (const user of weeklyUsers) {
        // Similar logic — find or create weekly digest entry
        const { data: existingWeekly } = await supabase
          .from('notification_queue')
          .select('id, scholarship_ids, match_data')
          .eq('user_id', user.user_id)
          .eq('notification_type', 'weekly_digest')
          .eq('status', 'pending')
          .gte('created_at', getWeekStart())
          .maybeSingle()

        if (existingWeekly) {
          const existingIds = safeJsonParse(existingWeekly.scholarship_ids)
          const existingData = safeJsonParse(existingWeekly.match_data)
          if (!existingIds.includes(scholarship.id)) {
            existingIds.push(scholarship.id)
            existingData.push({
              scholarship_id: scholarship.id,
              scholarship_name: scholarship.name,
              match_score: user.match_score,
              reasons: user.reasons,
            })
            await supabase.from('notification_queue').update({
              scholarship_ids: JSON.stringify(existingIds),
              match_data: JSON.stringify(existingData),
            }).eq('id', existingWeekly.id)
          }
        } else {
          await supabase.from('notification_queue').insert({
            user_id: user.user_id,
            email: user.email,
            notification_type: 'weekly_digest',
            status: 'pending',
            scholarship_ids: JSON.stringify([scholarship.id]),
            match_data: JSON.stringify([{
              scholarship_id: scholarship.id,
              scholarship_name: scholarship.name,
              match_score: user.match_score,
              reasons: user.reasons,
            }]),
            scheduled_for: getNextMonday7AM(),
          })
        }
        notificationsQueued++
      }
    }

    return ok({
      processed: scholarships.length,
      matches_created: matchesCreated,
      notifications_queued: notificationsQueued,
    })
  } catch (err: any) {
    console.error('[process-new-listing] Error:', err.message)
    return fail('Internal server error: ' + err.message, 500)
  }
})

function getWeekStart(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff))
  return monday.toISOString()
}

function getNextMonday7AM(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const daysUntilMonday = day === 0 ? 1 : (8 - day)
  const nextMonday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilMonday,
    7, 0, 0
  ))
  return nextMonday.toISOString()
}
