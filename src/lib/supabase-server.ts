import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    }
    _supabase = createClient(supabaseUrl, serviceRoleKey);
  }
  return _supabase;
}

// --------------- Auth ---------------

export async function createAuthUser(email: string, password: string) {
  const { data, error } = await getSupabase().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

export async function signInWithPassword(email: string, password: string) {
  // Use the anon key client for sign-in since it needs the public endpoint
  const anonClient = createClient(process.env.SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function getUserFromToken(token: string) {
  const { data, error } = await getSupabase().auth.getUser(token);
  if (error) throw error;
  return data.user;
}

// --------------- Profiles ---------------

export async function getProfile(email: string) {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function upsertProfile(profile: any) {
  const { data, error } = await getSupabase()
    .from('profiles')
    .upsert({ ...profile, updated_at: new Date().toISOString() }, { onConflict: 'email' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllProfiles() {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .order('joined_at', { ascending: false });
  if (error) throw error;
  return data;
}

// --------------- Scholarships ---------------

export async function getAllScholarships() {
  const { data, error } = await getSupabase()
    .from('scholarships')
    .select('*')
    .order('view_count', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPublishedScholarships() {
  const { data, error } = await getSupabase()
    .from('scholarships')
    .select('*')
    .eq('published', true)
    .order('view_count', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getScholarshipById(id: string) {
  const { data, error } = await getSupabase()
    .from('scholarships')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function upsertScholarship(s: any) {
  const { data, error } = await getSupabase()
    .from('scholarships')
    .upsert(s, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function incrementScholarshipView(id: string) {
  const { error } = await getSupabase().rpc('increment_view_count', { schol_id: id });
  if (error) {
    // Fallback: direct update
    const { data } = await getSupabase()
      .from('scholarships')
      .select('view_count')
      .eq('id', id)
      .single();
    if (data) {
      await getSupabase()
        .from('scholarships')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', id);
    }
  }
}

// --------------- Applications ---------------

export async function getApplications(email: string) {
  const { data, error } = await getSupabase()
    .from('applications')
    .select('*')
    .eq('user_email', email)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertApplication(app: any) {
  const { data, error } = await getSupabase()
    .from('applications')
    .upsert({ ...app, updated_at: new Date().toISOString().split('T')[0] }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteApplication(id: string) {
  const { error } = await getSupabase()
    .from('applications')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

// --------------- Documents ---------------

export async function getDocuments(email: string) {
  const { data, error } = await getSupabase()
    .from('documents')
    .select('*')
    .eq('user_email', email)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function insertDocument(doc: any) {
  const { data, error } = await getSupabase()
    .from('documents')
    .insert(doc)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDocument(id: string) {
  const { error } = await getSupabase()
    .from('documents')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

export async function getDocumentById(id: string) {
  const { data, error } = await getSupabase()
    .from('documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateDocumentAiResult(id: string, aiResult: string) {
  const { error } = await getSupabase()
    .from('documents')
    .update({ ai_extraction_result: aiResult })
    .eq('id', id);
  if (error) throw error;
}

// --------------- Essay Soul Profiles ---------------

export async function getEssaySoulProfile(email: string) {
  const { data, error } = await getSupabase()
    .from('essay_soul_profiles')
    .select('*')
    .eq('user_email', email)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function upsertEssaySoulProfile(profile: any) {
  const { data, error } = await getSupabase()
    .from('essay_soul_profiles')
    .upsert(profile, { onConflict: 'user_email' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --------------- Mentor Review Requests (v2) ---------------

export async function insertMentorRequest(req: any) {
  const { data, error } = await getSupabase()
    .from('mentor_review_requests')
    .insert(req)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMentorRequests(status?: string, assignedMentorEmail?: string) {
  let q = getSupabase().from('mentor_review_requests').select('*');
  if (status) q = q.eq('status', status);
  if (assignedMentorEmail) q = q.eq('assigned_mentor_email', assignedMentorEmail);
  const { data, error } = await q.order('response_deadline', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getMentorRequestById(id: string) {
  const { data, error } = await getSupabase()
    .from('mentor_review_requests')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateMentorRequest(id: string, updates: any) {
  const { data, error } = await getSupabase()
    .from('mentor_review_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMentorRequestsForUser(email: string) {
  const { data, error } = await getSupabase()
    .from('mentor_review_requests')
    .select('*')
    .eq('user_email', email)
    .order('requested_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMonthlyMentorRequestCount(email: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count, error } = await getSupabase()
    .from('mentor_review_requests')
    .select('*', { count: 'exact', head: true })
    .eq('user_email', email)
    .gte('requested_at', startOfMonth.toISOString())
    .not('status', 'eq', 'cancelled');
  if (error) throw error;
  return count || 0;
}

// --------------- Mentor Profiles ---------------

export async function getMentorProfiles() {
  const { data, error } = await getSupabase()
    .from('mentor_profiles')
    .select('*')
    .order('is_active', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMentorProfile(email: string) {
  const { data, error } = await getSupabase()
    .from('mentor_profiles')
    .select('*')
    .eq('mentor_email', email)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function upsertMentorProfile(profile: any) {
  const { data, error } = await getSupabase()
    .from('mentor_profiles')
    .upsert(profile, { onConflict: 'mentor_email' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --------------- Mentor Feedback Ratings ---------------

export async function insertMentorRating(rating: any) {
  const { data, error } = await getSupabase()
    .from('mentor_feedback_ratings')
    .insert(rating)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMentorRatingByRequest(requestId: string) {
  const { data, error } = await getSupabase()
    .from('mentor_feedback_ratings')
    .select('*')
    .eq('request_id', requestId)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// --------------- Notifications ---------------

export async function insertNotification(notif: any) {
  const { error } = await getSupabase()
    .from('notifications')
    .insert(notif);
  if (error) throw error;
}

export async function getNotifications(email: string, unreadOnly = false) {
  let q = getSupabase()
    .from('notifications')
    .select('*')
    .eq('user_email', email)
    .order('created_at', { ascending: false });
  if (unreadOnly) q = q.eq('is_read', false);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function markNotificationRead(id: string) {
  const { error } = await getSupabase()
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

// --------------- Essays ---------------

export async function getEssays(email: string) {
  const { data, error } = await getSupabase()
    .from('essays')
    .select('*')
    .eq('user_email', email)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function insertEssay(essay: any) {
  const { data, error } = await getSupabase()
    .from('essays')
    .insert(essay)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEssay(id: string, updates: any) {
  const { data, error } = await getSupabase()
    .from('essays')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEssay(id: string) {
  const { error } = await getSupabase()
    .from('essays')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

// --------------- Bot Ingestions ---------------

export async function getPendingIngestions() {
  const { data, error } = await getSupabase()
    .from('bot_ingestions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateIngestion(id: string, updates: any) {
  const { data, error } = await getSupabase()
    .from('bot_ingestions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --------------- Payments ---------------

export async function insertPayment(p: any) {
  const { data, error } = await getSupabase()
    .from('payments')
    .insert(p)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPaymentByReference(reference: string) {
  const { data, error } = await getSupabase()
    .from('payments')
    .select('*')
    .eq('paystack_reference', reference)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertPayment(p: any) {
  const { data, error } = await getSupabase()
    .from('payments')
    .upsert(p, { onConflict: 'paystack_reference' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePaymentByReference(reference: string, updates: any) {
  const { data, error } = await getSupabase()
    .from('payments')
    .update(updates)
    .eq('paystack_reference', reference)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// --------------- Audit Logs ---------------

export async function insertAuditLog(log: any) {
  const { error } = await getSupabase()
    .from('audit_logs')
    .insert(log);
  if (error) throw error;
}
