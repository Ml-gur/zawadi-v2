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

// ─── Plan / Mentor review entitlements ────────────────────────────
interface MentorEntitlement {
  reviews_per_month: number | null
  response_days_guarantee: number
  feedback_type: 'basic' | 'structured' | 'full' | 'full_plus'
  includes_revised_sections: boolean
  includes_strategy_session: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

const MENTOR_REVIEW_LIMITS: Record<string, MentorEntitlement> = {
  explorer: {
    reviews_per_month: 1, response_days_guarantee: 7,
    feedback_type: 'basic', includes_revised_sections: false,
    includes_strategy_session: false, priority: 'low',
  },
  plus: {
    reviews_per_month: 2, response_days_guarantee: 5,
    feedback_type: 'structured', includes_revised_sections: false,
    includes_strategy_session: false, priority: 'medium',
  },
  pro: {
    reviews_per_month: 4, response_days_guarantee: 2,
    feedback_type: 'full', includes_revised_sections: true,
    includes_strategy_session: false, priority: 'high',
  },
  institutional: {
    reviews_per_month: null, response_days_guarantee: 1,
    feedback_type: 'full_plus', includes_revised_sections: true,
    includes_strategy_session: true, priority: 'urgent',
  },
}

const PLAN_LABELS: Record<string, string> = {
  explorer: 'Explorer', plus: 'Scholar Plus',
  pro: 'Application Pro', institutional: 'Zawadi Institutional',
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

    // Auth required for all endpoints
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return corsResponse({ error: 'Authentication required' }, 401)

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return corsResponse({ error: 'Invalid or expired token' }, 401)

    const userEmail = user.email!
    const body = req.method !== 'GET' ? await req.json().catch(() => ({})) : {}
    const url = new URL(req.url)
    const action = body.action || url.searchParams.get('action')

    // Get user profile for role checks
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single()

    const isAdmin = profile?.role === 'super_admin' || profile?.role === 'content_manager'

    // ── Route ──
    if (action === 'request-review') return handleRequestReview(supabase, userEmail, profile!, body)
    if (action === 'review-status') return handleReviewStatus(supabase, userEmail, body)
    if (action === 'mentor-queue' && isAdmin) return handleAdminMentorQueue(supabase, req)
    if (action === 'assign' && isAdmin) return handleAssign(supabase, body)
    if (action === 'approve-review' && isAdmin) return handleApproveReview(supabase, body)
    if (action === 'reject-review' && isAdmin) return handleRejectReview(supabase, body)
    if (action === 'my-queue') return handleMentorQueue(supabase, userEmail)
    if (action === 'start-review') return handleStartReview(supabase, userEmail, body)
    if (action === 'submit-review') return handleSubmitReview(supabase, userEmail, body)
    if (action === 'feedback-rating') return handleFeedbackRating(supabase, userEmail, body)
    if (action === 'mentor-profiles' && isAdmin) return handleMentorProfiles(supabase, req, body)

    return corsResponse({ error: `Unknown action: ${action}` }, 400)
  } catch (err: any) {
    console.error('[mentor-review] Error:', err.message)
    return corsResponse({ error: 'Internal server error: ' + err.message }, 500)
  }
})

// ─── Student requests mentor review ───────────────────────────────
async function handleRequestReview(
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  user: any,
  body: any
) {
  const plan = user.plan || 'explorer'
  const entitlement = MENTOR_REVIEW_LIMITS[plan] || MENTOR_REVIEW_LIMITS.explorer

  // Check monthly review count
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { count: monthlyCount } = await supabase
    .from('mentor_review_requests')
    .select('*', { count: 'exact', head: true })
    .eq('user_email', userEmail)
    .gte('requested_at', monthStart.toISOString())

  const usedCount = monthlyCount || 0
  if (entitlement.reviews_per_month !== null && usedCount >= entitlement.reviews_per_month) {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(1)
    return corsResponse({
      error: `You have used all ${entitlement.reviews_per_month} mentor reviews for this month. Next slot opens on ${nextMonth.toISOString().split('T')[0]}.`,
    }, 403)
  }

  const {
    essay_id, essay_content, scholarship_name, scholarship_provider,
    scholarship_deadline, scholarship_host_region, student_notes,
  } = body

  if (!essay_id || !essay_content || !scholarship_name) {
    return corsResponse({ error: 'essay_id, essay_content, and scholarship_name are required' }, 400)
  }

  const responseDeadline = new Date(
    Date.now() + entitlement.response_days_guarantee * 24 * 60 * 60 * 1000
  )

  const payload = {
    request_reference: 'MRR-' + Date.now(),
    user_email: userEmail,
    user_first_name: (user.name || 'Student').split(' ')[0],
    user_country: user.country || 'Not specified',
    user_plan: plan,
    essay_id,
    essay_version: 1,
    essay_content,
    scholarship_name,
    scholarship_provider: scholarship_provider || null,
    scholarship_deadline: scholarship_deadline || null,
    scholarship_host_region: scholarship_host_region || null,
    student_notes: student_notes || null,
    status: 'pending',
    priority: entitlement.priority,
    response_deadline: responseDeadline,
    feedback_type: entitlement.feedback_type,
    includes_revised_sections: entitlement.includes_revised_sections,
    includes_strategy_session: entitlement.includes_strategy_session,
    requested_at: new Date().toISOString(),
  }

  const { data: saved, error: insertErr } = await supabase
    .from('mentor_review_requests')
    .insert(payload)
    .select()
    .single()

  if (insertErr) return corsResponse({ error: 'Failed to create request: ' + insertErr.message }, 500)

  // Notify admin
  const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@zawadi.app'
  await supabase.from('notifications').insert({
    user_email: adminEmail,
    message: `New mentor review request ${payload.request_reference} for ${scholarship_name}`,
    type: 'mentor_request',
    related_id: saved.id,
    created_at: new Date().toISOString(),
  }).select().maybeSingle()

  return corsResponse({
    success: true,
    request: saved,
    remaining_this_month: entitlement.reviews_per_month !== null
      ? entitlement.reviews_per_month - usedCount - 1
      : null,
    plan: PLAN_LABELS[plan] || plan,
    response_deadline: responseDeadline,
    feedback_type: entitlement.feedback_type,
  })
}

// ─── Student checks review status ─────────────────────────────────
async function handleReviewStatus(
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  const { essay_id } = body
  if (!essay_id) return corsResponse({ error: 'essay_id required' }, 400)

  const { data: requests } = await supabase
    .from('mentor_review_requests')
    .select('*')
    .eq('user_email', userEmail)
    .eq('essay_id', essay_id)
    .order('requested_at', { ascending: false })

  const sanitized = (requests || []).map((r: any) => ({
    id: r.id,
    request_reference: r.request_reference,
    status: r.status,
    priority: r.priority,
    response_deadline: r.response_deadline,
    assigned_mentor_name: r.status !== 'pending' ? r.assigned_mentor_name : null,
    feedback_type: r.feedback_type,
    feedback_overall_assessment: r.status === 'delivered_to_student' ? r.feedback_overall_assessment : null,
    feedback_opening: r.status === 'delivered_to_student' ? r.feedback_opening : null,
    feedback_narrative: r.status === 'delivered_to_student' ? r.feedback_narrative : null,
    feedback_evidence: r.status === 'delivered_to_student' ? r.feedback_evidence : null,
    feedback_cultural_authenticity: r.status === 'delivered_to_student' ? r.feedback_cultural_authenticity : null,
    feedback_closing: r.status === 'delivered_to_student' ? r.feedback_closing : null,
    feedback_general_advice: r.status === 'delivered_to_student' ? r.feedback_general_advice : null,
    revised_sections: r.status === 'delivered_to_student' ? r.revised_sections : null,
    mentor_confidence_score: r.status === 'delivered_to_student' ? r.mentor_confidence_score : null,
    estimated_success_probability: r.status === 'delivered_to_student' ? r.estimated_success_probability : null,
    student_notes: r.student_notes,
    requested_at: r.requested_at,
    delivered_at: r.delivered_at,
  }))

  return corsResponse(sanitized)
}

// ─── Admin: Get mentor queue ──────────────────────────────────────
async function handleAdminMentorQueue(
  supabase: ReturnType<typeof createClient>,
  req: Request
) {
  const url = new URL(req.url)
  let query = supabase.from('mentor_review_requests').select('*')

  const status = url.searchParams.get('status')
  const priority = url.searchParams.get('priority')
  const mentorEmail = url.searchParams.get('assigned_mentor_email')

  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (mentorEmail) query = query.eq('assigned_mentor_email', mentorEmail)

  query = query.order('response_deadline', { ascending: true })

  const { data, error } = await query
  if (error) return corsResponse({ error: error.message }, 500)

  return corsResponse(data || [])
}

// ─── Admin: Assign mentor to review ───────────────────────────────
async function handleAssign(
  supabase: ReturnType<typeof createClient>,
  body: any
) {
  const { request_id, mentor_email } = body
  if (!request_id || !mentor_email) {
    return corsResponse({ error: 'request_id and mentor_email are required' }, 400)
  }

  // Verify mentor profile
  const { data: mentorProfile } = await supabase
    .from('mentor_profiles')
    .select('*')
    .eq('mentor_email', mentor_email)
    .single()

  if (!mentorProfile || !mentorProfile.is_active) {
    return corsResponse({ error: 'Mentor not found or inactive' }, 400)
  }

  // Check concurrent review limits
  const { count: activeCount } = await supabase
    .from('mentor_review_requests')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_mentor_email', mentor_email)
    .in('status', ['assigned', 'under_review'])

  if ((activeCount || 0) >= (mentorProfile.max_concurrent_reviews || 3)) {
    return corsResponse({
      error: `Mentor has reached their maximum of ${mentorProfile.max_concurrent_reviews} concurrent reviews`,
    }, 400)
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from('mentor_review_requests')
    .update({
      status: 'assigned',
      assigned_mentor_email: mentor_email,
      assigned_mentor_name: mentorProfile.display_name,
      assigned_at: now,
    })
    .eq('id', request_id)
    .select()
    .single()

  if (error) return corsResponse({ error: error.message }, 500)

  // Notify mentor
  await supabase.from('notifications').insert({
    user_email: mentor_email,
    message: `You have been assigned a new mentor review: ${updated.request_reference} for ${updated.scholarship_name}`,
    type: 'new_assignment',
    related_id: updated.id,
    created_at: now,
  }).select().maybeSingle()

  return corsResponse(updated)
}

// ─── Admin: Approve mentor review ─────────────────────────────────
async function handleApproveReview(
  supabase: ReturnType<typeof createClient>,
  body: any
) {
  const { request_id, admin_notes } = body
  if (!request_id) return corsResponse({ error: 'request_id required' }, 400)

  const { data: request } = await supabase
    .from('mentor_review_requests')
    .select('*')
    .eq('id', request_id)
    .single()

  if (!request) return corsResponse({ error: 'Request not found' }, 404)
  if (request.status !== 'submitted_by_mentor') {
    return corsResponse({ error: `Cannot approve request in ${request.status} status` }, 400)
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from('mentor_review_requests')
    .update({
      status: 'delivered_to_student',
      admin_approved_at: now,
      admin_notes: admin_notes || null,
      delivered_at: now,
    })
    .eq('id', request_id)
    .select()
    .single()

  if (error) return corsResponse({ error: error.message }, 500)

  // Notify student
  await supabase.from('notifications').insert({
    user_email: request.user_email,
    message: `Your mentor review for ${request.scholarship_name} has been completed! Check your feedback.`,
    type: 'review_delivered',
    related_id: request_id,
    created_at: now,
  }).select().maybeSingle()

  return corsResponse(updated)
}

// ─── Admin: Reject mentor review ──────────────────────────────────
async function handleRejectReview(
  supabase: ReturnType<typeof createClient>,
  body: any
) {
  const { request_id, rejection_reason } = body
  if (!request_id) return corsResponse({ error: 'request_id required' }, 400)

  const { data: request } = await supabase
    .from('mentor_review_requests')
    .select('*')
    .eq('id', request_id)
    .single()

  if (!request) return corsResponse({ error: 'Request not found' }, 404)

  const now = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from('mentor_review_requests')
    .update({
      status: 'rejected_by_admin',
      admin_rejection_reason: rejection_reason || null,
      admin_rejected_at: now,
    })
    .eq('id', request_id)
    .select()
    .single()

  if (error) return corsResponse({ error: error.message }, 500)

  return corsResponse(updated)
}

// ─── Mentor: Get my queue ─────────────────────────────────────────
async function handleMentorQueue(
  supabase: ReturnType<typeof createClient>,
  userEmail: string
) {
  const { data: requests } = await supabase
    .from('mentor_review_requests')
    .select('*')
    .eq('assigned_mentor_email', userEmail)
    .in('status', ['assigned', 'under_review'])
    .order('response_deadline', { ascending: true })

  const sanitized = (requests || []).map((r: any) => ({
    id: r.id,
    request_reference: r.request_reference,
    user_first_name: r.user_first_name,
    user_country: r.user_country,
    user_plan: r.user_plan,
    essay_content: r.essay_content,
    scholarship_name: r.scholarship_name,
    scholarship_provider: r.scholarship_provider,
    scholarship_deadline: r.scholarship_deadline,
    scholarship_host_region: r.scholarship_host_region,
    student_notes: r.student_notes,
    feedback_type: r.feedback_type,
    includes_revised_sections: r.includes_revised_sections,
    response_deadline: r.response_deadline,
    assigned_at: r.assigned_at,
    status: r.status,
    admin_rejection_reason: r.admin_rejection_reason,
  }))

  return corsResponse(sanitized)
}

// ─── Mentor: Start review ─────────────────────────────────────────
async function handleStartReview(
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  const { request_id } = body
  if (!request_id) return corsResponse({ error: 'request_id required' }, 400)

  const { data: request } = await supabase
    .from('mentor_review_requests')
    .select('*')
    .eq('id', request_id)
    .single()

  if (!request) return corsResponse({ error: 'Request not found' }, 404)
  if (request.assigned_mentor_email !== userEmail) {
    return corsResponse({ error: 'Not assigned to you' }, 403)
  }
  if (request.status !== 'assigned') {
    return corsResponse({ error: `Cannot start request in ${request.status} status` }, 400)
  }

  const { data: updated, error } = await supabase
    .from('mentor_review_requests')
    .update({
      status: 'under_review',
      mentor_started_review_at: new Date().toISOString(),
    })
    .eq('id', request_id)
    .select()
    .single()

  if (error) return corsResponse({ error: error.message }, 500)
  return corsResponse(updated)
}

// ─── Mentor: Submit review ────────────────────────────────────────
async function handleSubmitReview(
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  const { request_id, feedback_overall_assessment, feedback_opening, feedback_narrative,
    feedback_evidence, feedback_cultural_authenticity, feedback_closing,
    feedback_general_advice, revised_sections, mentor_confidence_score,
    estimated_success_probability, mentor_private_notes } = body

  if (!request_id) return corsResponse({ error: 'request_id required' }, 400)

  const { data: request } = await supabase
    .from('mentor_review_requests')
    .select('*')
    .eq('id', request_id)
    .single()

  if (!request) return corsResponse({ error: 'Request not found' }, 404)
  if (request.assigned_mentor_email !== userEmail) {
    return corsResponse({ error: 'Not assigned to you' }, 403)
  }
  if (request.status !== 'under_review') {
    return corsResponse({ error: `Cannot submit request in ${request.status} status` }, 400)
  }

  // Validate required fields based on feedback type
  const feedbackType = request.feedback_type || 'basic'
  const missing: string[] = []
  if (!feedback_overall_assessment) missing.push('feedback_overall_assessment')
  if (!feedback_general_advice || feedback_general_advice.trim().length < 100) missing.push('feedback_general_advice (min 100 characters)')
  if (feedbackType !== 'basic') {
    if (!feedback_opening || feedback_opening.trim().length < 30) missing.push('feedback_opening (min 30 characters)')
    if (!feedback_narrative || feedback_narrative.trim().length < 30) missing.push('feedback_narrative (min 30 characters)')
    if (!feedback_evidence || feedback_evidence.trim().length < 30) missing.push('feedback_evidence (min 30 characters)')
    if (!feedback_cultural_authenticity || feedback_cultural_authenticity.trim().length < 30) missing.push('feedback_cultural_authenticity (min 30 characters)')
    if (!feedback_closing || feedback_closing.trim().length < 30) missing.push('feedback_closing (min 30 characters)')
  }
  if (feedbackType === 'full' || feedbackType === 'full_plus') {
    if (!mentor_confidence_score) missing.push('mentor_confidence_score')
  }
  if (feedbackType === 'full_plus') {
    if (!estimated_success_probability) missing.push('estimated_success_probability')
  }
  if (missing.length > 0) {
    return corsResponse({ error: `Missing required fields: ${missing.join(', ')}` }, 400)
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await supabase
    .from('mentor_review_requests')
    .update({
      status: 'submitted_by_mentor',
      mentor_submitted_at: now,
      feedback_overall_assessment,
      feedback_opening: feedback_opening || null,
      feedback_narrative: feedback_narrative || null,
      feedback_evidence: feedback_evidence || null,
      feedback_cultural_authenticity: feedback_cultural_authenticity || null,
      feedback_closing: feedback_closing || null,
      feedback_general_advice: feedback_general_advice || null,
      revised_sections: revised_sections || null,
      mentor_confidence_score: mentor_confidence_score || null,
      estimated_success_probability: estimated_success_probability || null,
      mentor_private_notes: mentor_private_notes || null,
    })
    .eq('id', request_id)
    .select()
    .single()

  if (error) return corsResponse({ error: error.message }, 500)

  // Notify admin
  const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@zawadi.app'
  await supabase.from('notifications').insert({
    user_email: adminEmail,
    message: `Mentor ${userEmail} submitted review for ${request.request_reference}`,
    type: 'review_submitted',
    related_id: request_id,
    created_at: now,
  }).select().maybeSingle()

  return corsResponse(updated)
}

// ─── Student rates mentor feedback ────────────────────────────────
async function handleFeedbackRating(
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  body: any
) {
  const { request_id, rating, comment } = body
  if (!request_id) return corsResponse({ error: 'request_id required' }, 400)

  // Verify the request belongs to this student
  const { data: request } = await supabase
    .from('mentor_review_requests')
    .select('*')
    .eq('id', request_id)
    .eq('user_email', userEmail)
    .single()

  if (!request) return corsResponse({ error: 'Request not found or not yours' }, 404)
  if (request.status !== 'delivered_to_student') {
    return corsResponse({ error: 'Can only rate delivered reviews' }, 400)
  }

  const ratingVal = Math.min(5, Math.max(1, parseInt(rating) || 5))

  const { data: saved, error } = await supabase
    .from('mentor_feedback_ratings')
    .insert({
      request_id,
      mentor_email: request.assigned_mentor_email,
      student_email: userEmail,
      rating: ratingVal,
      comment: comment || null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return corsResponse({ error: error.message }, 500)
  return corsResponse({ success: true, rating: saved })
}

// ─── Admin: Manage mentor profiles ────────────────────────────────
async function handleMentorProfiles(
  supabase: ReturnType<typeof createClient>,
  req: Request,
  body: any
) {
  if (req.method === 'POST' || body.mentor_email) {
    // Create / update
    const { mentor_email, display_name, specialization, is_active, max_concurrent_reviews } = body
    if (!mentor_email) return corsResponse({ error: 'mentor_email required' }, 400)

    const { data, error } = await supabase
      .from('mentor_profiles')
      .upsert({
        mentor_email,
        display_name: display_name || mentor_email.split('@')[0],
        specialization: specialization || [],
        is_active: is_active !== undefined ? is_active : true,
        max_concurrent_reviews: max_concurrent_reviews || 3,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return corsResponse({ error: error.message }, 500)
    return corsResponse(data)
  }

  // GET: list all
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return corsResponse({ error: error.message }, 500)
  return corsResponse(data || [])
}
