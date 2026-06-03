import { supabase } from './supabase';

// ─── Scholarships ───
export async function getPublishedScholarships(filters?: {
  country?: string;
  degree?: string;
  no_ielts?: boolean;
}) {
  let query = supabase.from('scholarships').select('*').eq('published', true);
  if (filters?.country) query = query.contains('countries', [filters.country]);
  if (filters?.degree) query = query.contains('degree_levels', [filters.degree]);
  if (filters?.no_ielts) query = query.eq('no_ielts', true);
  return query.order('created_at', { ascending: false });
}

export async function getAllScholarships() {
  return supabase.from('scholarships').select('*').order('view_count', { ascending: false });
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
  return supabase.from('applications').upsert(application).select().single();
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
