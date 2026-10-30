-- Migration: Notification Preferences
-- Purpose: Store user notification preferences
-- Related: Notification center UI (1.11), Notification triggers (1.13)

-- ============================================================================
-- TABLE: notification_preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one preference row per user per notification type
  UNIQUE(user_id, notification_type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup of user preferences
CREATE INDEX idx_notification_preferences_user
  ON notification_preferences(user_id);

-- Index for filtering by enabled status
CREATE INDEX idx_notification_preferences_enabled
  ON notification_preferences(user_id)
  WHERE enabled = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can read own preferences"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can manage all preferences
CREATE POLICY "Service role can manage all preferences"
  ON notification_preferences
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- DEFAULT PREFERENCES
-- ============================================================================

-- Function to set default preferences for a new user
CREATE OR REPLACE FUNCTION set_default_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default notification preferences
  INSERT INTO notification_preferences (user_id, notification_type, enabled)
  SELECT
    NEW.id,
    unnest(ARRAY['share_link_created', 'vendor_added', 'style_added', 'weekly_summary']::TEXT[]),
    true;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (note: this may need to be called manually)
-- DROP TRIGGER IF EXISTS set_default_notification_preferences on auth.users;

-- ============================================================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE notification_preferences IS 'User preferences for notification types';

COMMENT ON COLUMN notification_preferences.notification_type IS 'Type of notification: share_link_created, vendor_added, style_added, weekly_summary, etc.';

COMMENT ON COLUMN notification_preferences.enabled IS 'Whether this notification type is enabled for the user';

COMMENT ON FUNCTION set_default_notification_preferences IS 'Sets default notification preferences for new users';
