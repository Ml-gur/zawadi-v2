-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 019: Scholarship Notification System
-- Creates tables for notification preferences, match tracking,
-- notification queue, and email event analytics.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. notification_preferences ─────────────────────────────────────────
-- Controls whether and how a user receives scholarship notifications.
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  new_listing_alerts BOOLEAN NOT NULL DEFAULT true,
  notification_frequency TEXT NOT NULL DEFAULT 'instant'
    CHECK (notification_frequency IN ('instant', 'daily', 'weekly', 'none')),
  minimum_match_score NUMERIC(5,2) DEFAULT 50.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_freq ON notification_preferences(notification_frequency)
  WHERE new_listing_alerts = true;

-- ─── 2. user_matches ─────────────────────────────────────────────────────
-- Records why a scholarship was recommended to a user.
CREATE TABLE IF NOT EXISTS user_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_id TEXT NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  match_score NUMERIC(5,2),
  eligibility_status TEXT DEFAULT 'unknown'
    CHECK (eligibility_status IN ('likely_eligible', 'possibly_eligible', 'ineligible', 'unknown')),
  match_reasons JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, scholarship_id)
);

CREATE INDEX IF NOT EXISTS idx_user_matches_user ON user_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_matches_scholarship ON user_matches(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_user_matches_score ON user_matches(match_score DESC);

-- ─── 3. notification_queue ───────────────────────────────────────────────
-- Queue of emails to send. Processed by Edge Functions.
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'new_listing'
    CHECK (notification_type IN ('new_listing', 'daily_digest', 'weekly_digest')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  scholarship_ids JSONB DEFAULT '[]'::jsonb,
  match_data JSONB DEFAULT '[]'::jsonb,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  resend_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_queue_status ON notification_queue(status)
  WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_notif_queue_scheduled ON notification_queue(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notif_queue_user ON notification_queue(user_id);

-- ─── 4. email_events ─────────────────────────────────────────────────────
-- Tracks delivery analytics from Resend webhooks.
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_id UUID REFERENCES notification_queue(id) ON DELETE SET NULL,
  resend_message_id TEXT,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_notification ON email_events(notification_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_resend ON email_events(resend_message_id);

-- ─── 5. RLS Policies ─────────────────────────────────────────────────────

-- notification_preferences: users read/write their own
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- user_matches: users read their own, service_role writes
ALTER TABLE user_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own matches"
  ON user_matches FOR SELECT
  USING (auth.uid() = user_id);

-- notification_queue: service_role only (no direct user access)
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages notification queue"
  ON notification_queue FOR ALL
  USING (auth.role() = 'service_role');

-- email_events: service_role only
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages email events"
  ON email_events FOR ALL
  USING (auth.role() = 'service_role');

-- ─── 6. Updated_at trigger ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notif_prefs_updated
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- ─── 7. Auto-create notification preferences on user signup ──────────────

CREATE OR REPLACE FUNCTION handle_new_user_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, email, new_listing_alerts, notification_frequency)
  VALUES (NEW.id, NEW.email, true, 'instant')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profiles insert (not auth.users, since we need the profile to exist)
CREATE TRIGGER trg_auto_notif_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_notification_prefs();
