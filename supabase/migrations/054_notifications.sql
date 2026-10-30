-- Migration: Notifications Table
-- Purpose: Store in-app notifications for users
-- Related: Notification center UI, notification triggers

-- ============================================================================
-- TABLE: notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata for filtering and grouping
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Foreign key to related entity (e.g., shared_link_id, vendor_id)
  entity_id UUID,
  entity_type TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup of unread notifications per user
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, read_at)
  WHERE read_at IS NULL;

-- Fast lookup of all notifications per user (ordered by created_at)
CREATE INDEX idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- Index for filtering by type
CREATE INDEX idx_notifications_user_type
  ON notifications(user_id, type, created_at DESC);

-- Index for entity-based lookups
CREATE INDEX idx_notifications_entity
  ON notifications(entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own notifications (for client-side testing)
CREATE POLICY "Users can insert own notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can manage all notifications
CREATE POLICY "Service role can manage all notifications"
  ON notifications
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE notifications IS 'In-app notifications for users';

COMMENT ON COLUMN notifications.type IS 'Notification type: share_link_created, vendor_added, style_added, etc.';

COMMENT ON COLUMN notifications.action_url IS 'Deep link to relevant screen when notification is clicked';

COMMENT ON COLUMN notifications.metadata IS 'Additional data for notification rendering and filtering';

COMMENT ON COLUMN notifications.entity_id IS 'Optional foreign key to related entity';

COMMENT ON COLUMN notifications.entity_type IS 'Type of related entity (e.g., shared_link, vendor, fabric_style)';
