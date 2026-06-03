/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  email: string;
  name?: string;
  country?: string;
  degree_level?: string;
  field_of_study?: string;
  date_of_birth?: string;
  gpa?: number;
  gpa_system?: string;
  gpa_scale?: string;
  native_language?: string;
  additional_languages?: string[];
  destination_openness?: 'anywhere' | 'specific' | 'intra_african';
  destination_regions?: string[];
  include_fully_funded_anywhere?: boolean;
  work_experience_years?: number;
  has_research?: boolean;
  publications?: number;
  has_leadership?: boolean;
  verified_via_doc?: boolean;
  institution?: string;
  plan?: string;
  role?: string;
  status?: string;
  confirmed_fields?: string[];
  joined_at?: string;
  updated_at?: string;
};

export type Scholarship = {
  id: string;
  name: string;
  provider?: string;
  host?: string;
  country?: string[];
  eligible_country_codes?: string[];
  degree_levels?: string[];
  fields?: string[];
  funding_type?: string;
  amount?: string;
  deadline?: string;
  description?: string;
  eligibility?: string;
  required_documents?: string[];
  apply_url?: string;
  source_url?: string;
  published?: boolean;
  no_ielts?: boolean;
  work_experience_required?: number;
  age_limit_masters?: number;
  age_limit_phd?: number;
  verified_at?: string;
  view_count?: number;
  host_region?: string;
};

export type Application = {
  id: string;
  user_email: string;
  scholarship_id: string;
  status?: string;
  priority?: string;
  notes?: string;
  updated_at?: string;
};

export type Document = {
  id: string;
  user_email: string;
  name?: string;
  type?: string;
  size?: string;
  file_path?: string;
  mime_type?: string;
  uploaded_at?: string;
  ai_extraction_result?: string | null;
};

export type Essay = {
  id: string;
  user_email: string;
  scholarship_name?: string;
  essay_type?: string;
  prompt?: string;
  stage?: string;
  draft?: string;
  critique?: string;
  final?: string;
  created_at?: string;
};
