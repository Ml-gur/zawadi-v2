-- ============================================================
-- ZAWADI — Migration 019: daily scholarship crawler schedule
-- pg_cron + pg_net POST to run-pipeline?action=trigger daily 02:00 UTC.
-- The cron secret lives in Supabase Vault (name: cron_secret) — never
-- committed here. One-time setup already applied via management API:
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   CREATE EXTENSION IF NOT EXISTS pg_net;
--   SELECT vault.create_secret('<secret>', 'cron_secret', 'Techsari crawler cron secret');
--   SELECT cron.schedule('scholarship-crawl-daily', '0 2 * * *', $cmd$
--     SELECT net.http_post(
--       url := 'https://raomkgvnkgvbbezffpyb.supabase.co/functions/v1/run-pipeline?action=trigger',
--       headers := jsonb_build_object(
--         'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret'),
--         'Content-Type', 'application/json'),
--       body := '{}'::jsonb) $cmd$);
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
