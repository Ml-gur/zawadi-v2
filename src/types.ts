export interface MatchScore {
  score: number;
  reasons: string[];
  disqualifying_reasons: string[];
  is_eligible: boolean;
  no_ielts_benefit?: boolean;
  needs_profile?: boolean;
  breakdown: {
    country: number;
    degree: number;
    field: number;
    gpa: number;
    languages: number;
    experience: number;
    destination: number;
    documents: number;
    no_ielts?: number;
  };
}

export interface Scholarship {
  id: string;
  name: string;
  provider: string;
  host: string;
  host_institution?: string;
  country: string[];
  countries?: string[];
  degree_levels: string[];
  fields: string[];
  fields_of_study?: string[];
  funding_type: string; // 'Full' | 'Partial'
  amount: string;
  deadline: string;
  description: string;
  eligibility: string;
  required_documents: string[];
  apply_url: string;
  source_url?: string;
  published: boolean;
  verified_at?: string;
  verified_by?: string;
  view_count?: number;
  match?: MatchScore;
  no_ielts?: boolean;
  work_experience_required?: number;
  age_limit_masters?: number;
  age_limit_phd?: number;
  host_region?: string;
  host_country?: string[];
  iso2?: string | string[];
  urgency?: string;
  sponsor_type?: string;
  pipeline_source?: string;
  quality_score?: number;
  scam_flags?: string[];
  archived?: boolean;
}

export interface UserProfile {
  email: string;
  name: string;
  country: string;
  confirmed_fields?: string[];
  degree_level?: string;
  field_of_study?: string;
  destination_openness?: 'anywhere' | 'specific' | 'intra_african';
  destination_regions?: string[];
  include_fully_funded_anywhere?: boolean;
  plan: 'explorer' | 'plus' | 'pro' | 'mentor' | 'institutional';
  joined_at: string;
  role: 'user' | 'support_agent' | 'content_manager' | 'super_admin';
  status: 'active' | 'suspended';
  
  // Expanded matching variables
  gpa?: number;
  gpa_scale?: string;
  institution?: string;
  degree_class?: string;
  native_language?: string;
  additional_languages?: string[];
  work_experience_years?: number;
  has_research?: boolean;
  publications?: number;
  has_leadership?: boolean;
  verified_via_doc?: boolean;
}

export interface ApplicationTracker {
  id: string;
  user_email: string;
  scholarship_id: string;
  status: string; // 'Not Started' | 'Saved' | 'Drafting' | 'Ready' | 'Applied' | 'Interview' | 'Awarded' | 'Rejected' | 'Archived'
  priority: 'High' | 'Normal' | 'Low';
  notes: string;
  applied: boolean;
  updated_at: string;
}

export interface DocumentVaultItem {
  id: string;
  user_email: string;
  name: string;
  type: string;
  size: string;
  file_path?: string;
  mime_type?: string;
  uploaded_at: string;
  ai_extraction_result?: string | null;
  analysis_status?: string | null;
  last_analyzed_at?: string | null;
  analysis_error?: string | null;
  extraction_method?: string | null;
  user_confirmed?: boolean | null;
}

export interface ExtractionConfirmationData {
  institution_name: string | null;
  degree_level: string | null;
  field_of_study: string | null;
  gpa: number | null;
  gpa_scale: string | null;
  gpa_system: string | null;
  graduation_year: number | null;
  work_experience_years: number | null;
  skills: string[];
}

export interface EssayStudioGeneration {
  id: string;
  user_email: string;
  scholarship_name: string;
  essay_type: string;
  prompt: string;
  stage: 'draft' | 'critique' | 'polish';
  draft: string;
  critique: string;
  final: string;
  created_at: string;
}

export interface BotQueueIngestion {
  id: string;
  scholarship_name: string;
  provider: string;
  host: string;
  source_url: string;
  apply_url: string;
  status: 'pending' | 'approved' | 'rejected' | 'duplicate';
  confidence: string;
  created_at: string;
  reviewed_at?: string;
  admin_notes?: string;
}

export interface PaymentHistoryItem {
  id: string;
  user_email: string;
  paystack_reference: string;
  paystack_subscription_code: string;
  amount: number;
  currency: string;
  plan: string;
  billing_period?: string;
  status: string;
  webhook_event_id: string;
  authorization_url?: string;
  paid_at?: string;
  updated_at?: string;
  failure_reason?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}
