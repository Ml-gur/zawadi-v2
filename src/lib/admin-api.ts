import { supabase } from './supabase';

export interface AdminOverview {
  users: { total: number; active: number; suspended: number; new_7d: number; prev_7d: number };
  scholarships: { total: number; published: number; expiring_7d: number };
  applications: { total: number; by_stage: Record<string, number> };
  documents: { total: number; pending: number; failed: number };
  essays: { total: number; last_7d: number };
  payments: { successful: number; mrr: number };
  bot_queue: { pending: number };
  contact: { total: number; unread: number };
  audit: { total: number };
}

export interface Timeseries {
  user_growth: { month: string; users: number }[];
  essays_daily: { date: string; count: number }[];
  applications_daily: { date: string; count: number }[];
  top_scholarships: { id: string; name: string; view_count: number }[];
  recent_signups: { name: string | null; email: string; country: string | null; plan: string; created_at: string }[];
}

export interface AdminUserProfile {
  email: string;
  name: string | null;
  country: string | null;
  plan: string;
  status: string;
  role: string;
  created_at: string;
  joined_at: string | null;
  degree_level: string | null;
  field_of_study: string | null;
  gpa: string | number | null;
  date_of_birth: string | null;
  confirmed_fields?: string[];
  [key: string]: unknown;
}

export interface UserEngagement {
  applications: number;
  documents: number;
  essays: number;
  storage: string;
}

export interface AuditEntry {
  id: string;
  admin_email: string | null;
  action: string | null;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
  created_at: string | null;
}

export interface PaymentRow {
  id: string;
  user_email: string | null;
  plan: string | null;
  amount: number | null;
  status: string | null;
  paystack_reference: string | null;
  created_at: string | null;
}

export async function callAdminApi<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, params }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `Admin request failed (HTTP ${res.status})`);
  }
  return json.data as T;
}
