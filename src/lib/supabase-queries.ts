import { supabase } from './supabase';

// ─── Scholarships ───

/**
 * Explicit column list — select('*') ships 423KB per load (dead columns +
 * long text the finder never renders); this trims ~25% and keeps every field
 * the matching engine reads. opens_at is new (migration 015) — if the column
 * is missing the query is retried without it so the finder never breaks.
 */
const SCHOLARSHIP_COLUMNS = `
  id, slug, name, provider, host_institution, countries, degree_levels,
  fields_of_study, funding_type, amount, deadline, opens_at, description,
  eligibility, required_documents, apply_url, source_url, published,
  no_ielts, work_experience_required, age_limit_masters, age_limit_phd,
  host_region, host_country, iso2, urgency, sponsor_type, category,
  updated_at, is_intra_african, min_gpa_normalised, instruction_language,
  min_english_score, min_english_test_type, requires_research,
  requires_publications, requires_leadership, requires_community,
  targets_financial_need, targets_first_generation, targets_rural_origin,
  targets_ldc_countries, stem_focus, development_focus, min_work_years,
  max_work_years, min_publication_count
`;

export async function getPublishedScholarships(filters?: {
  country?: string;
  degree?: string;
  no_ielts?: boolean;
}) {
  const today = new Date().toISOString().split('T')[0];
  const build = (columns: string) => {
    let q = supabase
      .from('scholarships')
      .select(columns)
      .eq('published', true)
      .or(`deadline.is.null,deadline.gte.${today}`);
    // postgrest-js serialises arrays as Postgres literals ({a,b}); these columns are jsonb and need JSON text
    if (filters?.country) q = q.contains('countries', JSON.stringify([filters.country]));
    if (filters?.degree) q = q.contains('degree_levels', JSON.stringify([filters.degree]));
    if (filters?.no_ielts) q = q.eq('no_ielts', true);
    return q.order('deadline', { ascending: true, nullsFirst: false });
  };

  let result = await build(SCHOLARSHIP_COLUMNS);
  if (
    result.error &&
    (result.error.code === 'PGRST204' ||
      result.error.code === '42703' ||
      /opens_at/.test(result.error.message || ''))
  ) {
    // opens_at migration not applied yet — degrade gracefully
    const withoutOpens = SCHOLARSHIP_COLUMNS.replace(', opens_at', '').replace('opens_at, ', '');
    result = await build(withoutOpens);
  }
  return result;
}

export async function getAllScholarships() {
  const result = await supabase.from('scholarships').select('*').order('view_count', { ascending: false });
  return result;
}

export async function upsertScholarship(scholarship: any) {
  return supabase.from('scholarships').upsert(scholarship).select().single();
}

export async function deleteScholarship(id: string) {
  // Soft delete: unpublish
  return supabase.from('scholarships').update({ published: false }).eq('id', id);
}

export async function bulkDeleteScholarships(ids: string[]) {
  return supabase.from('scholarships').update({ published: false }).in('id', ids);
}

export async function togglePublishScholarship(id: string, currentPublished: boolean) {
  return supabase
    .from('scholarships')
    .update({ published: !currentPublished })
    .eq('id', id)
    .select()
    .single();
}

// ─── Auto-Unpublish ───
export async function autoUnpublishExpiredScholarships() {
  try {
    const today = new Date().toISOString().split('T')[0];
    return await supabase
      .from('scholarships')
      .update({ published: false })
      .lt('deadline', today)
      .eq('published', true);
  } catch {
    return { data: null, error: null };
  }
}

export async function getAutoUnpublishedScholarships() {
  const today = new Date().toISOString().split('T')[0];
  return supabase
    .from('scholarships')
    .select('*')
    .lt('deadline', today)
    .order('updated_at', { ascending: false });
}

export async function republishScholarship(id: string) {
  return supabase
    .from('scholarships')
    .update({ published: true })
    .eq('id', id)
    .select()
    .single();
}

export async function permanentlyDeleteScholarship(id: string) {
  return supabase.from('scholarships').delete().eq('id', id);
}

// ─── Profiles ───
export async function getProfile(userId: string) {
  return supabase.from('profiles').select('*').eq('id', userId).single();
}

export async function getProfileByEmail(email: string) {
  return supabase.from('profiles').select('*').eq('email', email).single();
}

export async function upsertProfile(profile: any) {
  return supabase
    .from('profiles')
    .upsert({ ...profile, updated_at: new Date().toISOString() })
    .select()
    .single();
}

export async function getAllProfiles() {
  return supabase.from('profiles').select('*').order('joined_at', { ascending: false });
}

export async function getAllProfilesAdmin() {
  return supabase.from('profiles').select('*').order('joined_at', { ascending: false });
}

// ─── Applications ───
export async function getUserApplications(userEmail: string) {
  return supabase
    .from('applications')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false });
}

export async function upsertApplication(application: any) {
  return supabase.from('applications').upsert(application, { onConflict: 'user_email, scholarship_id' }).select().single();
}

export async function deleteApplication(id: string) {
  return supabase.from('applications').delete().eq('id', id);
}

// ─── Documents ───
export async function getUserDocuments(userEmail: string) {
  return supabase
    .from('documents')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false });
}

export async function uploadDocumentToStorage(
  userEmail: string,
  file: File,
  docType: string
): Promise<{ storagePath: string; data: any }> {
  const storagePath = `${userEmail}/${docType}/${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from('scholarship-docs')
    .upload(storagePath, file);
  if (error) throw error;
  return { storagePath, data };
}

export async function insertDocument(doc: any) {
  return supabase.from('documents').insert(doc).select().single();
}

export async function deleteDocument(id: string, storagePath?: string) {
  if (storagePath) {
    await supabase.storage.from('scholarship-docs').remove([storagePath]);
  }
  return supabase.from('documents').delete().eq('id', id);
}

export async function downloadDocument(storagePath: string) {
  return supabase.storage.from('scholarship-docs').download(storagePath);
}

export async function getDocumentDownloadUrl(storagePath: string) {
  const { data } = supabase.storage.from('scholarship-docs').getPublicUrl(storagePath);
  return data?.publicUrl || null;
}

// ─── Essays ───
export async function getUserEssays(userEmail: string) {
  return supabase
    .from('essays')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false });
}

// ─── Notifications ───
export async function getUserNotifications(userEmail: string, unreadOnly = false) {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_email', userEmail);
  if (unreadOnly) query = query.eq('is_read', false);
  return query.order('created_at', { ascending: false });
}

export async function markNotificationRead(id: string) {
  return supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

// ─── Bot Ingestions (Admin) ───
export async function getBotIngestions(status?: string, page = 1, limit = 20) {
  let query = supabase.from('bot_ingestions').select('*', { count: 'exact' });
  if (status) query = query.eq('status', status);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return query.order('confidence_score', { ascending: false }).range(from, to);
}

// ─── Match Feedback ───
export async function getMatchFeedback(userEmail: string) {
  return supabase
    .from('recommendation_feedback')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false });
}

export async function insertMatchFeedback(feedback: any) {
  return supabase.from('recommendation_feedback').insert(feedback);
}

// ─── Contact Submissions ───
export async function insertContactSubmission(submission: any) {
  return supabase.from('contact_submissions').insert(submission);
}

// ─── Audit Logs (Admin) ───
export async function getAuditLogs(limit = 200) {
  return supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
}

// ─── Analysis Logs (Admin) ───
export async function getAnalysisLogs(limit = 100) {
  return supabase
    .from('documents')
    .select('*')
    .not('analysis_status', 'is', null)
    .order('last_analyzed_at', { ascending: false })
    .limit(limit);
}
