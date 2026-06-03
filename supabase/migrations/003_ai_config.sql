-- Migration: Create ai_config table for AI provider configuration
-- Safe to run — uses IF NOT EXISTS and ON CONFLICT DO NOTHING

CREATE TABLE IF NOT EXISTS public.ai_config (
    id text PRIMARY KEY DEFAULT 'default',
    provider text DEFAULT 'deepseek',
    openai_key text,
    deepseek_key text,
    gemini_key text,
    ai_model text DEFAULT 'deepseek-v4-pro',
    ai_temperature_draft numeric DEFAULT 0.8,
    ai_temperature_critique numeric DEFAULT 0.5,
    ai_temperature_polish numeric DEFAULT 0.3,
    ai_max_tokens_essay integer DEFAULT 1500,
    ai_max_tokens_critique integer DEFAULT 1000,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Allow authenticated users to read their own config (for Edge Functions with service_role, no RLS needed since service_role bypasses RLS)
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

-- Edge Functions use service_role key — they bypass RLS. No RLS policies needed.
-- The admin-settings Edge Function handles write access control.
