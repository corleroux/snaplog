-- Saved Reports Migration
-- Allows users to save, load, and schedule custom analytics reports

CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,

  -- Report configuration
  config JSONB NOT NULL DEFAULT '{}',

  -- Report type: 'vendor', 'style', 'custom'
  report_type TEXT NOT NULL DEFAULT 'custom',

  -- Scheduling (optional)
  schedule_interval TEXT, -- 'daily', 'weekly', 'monthly'
  schedule_recipient TEXT, -- email address for scheduled reports
  last_scheduled_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_saved_reports_user_id ON saved_reports(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_saved_reports_event_id ON saved_reports(event_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_saved_reports_user_event ON saved_reports(user_id, event_id) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own saved reports"
  ON saved_reports
  FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Users can create their own reports
CREATE POLICY "Users can create saved reports"
  ON saved_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Users can update own saved reports"
  ON saved_reports
  FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Users can delete their own reports
CREATE POLICY "Users can delete own saved reports"
  ON saved_reports
  FOR DELETE
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Admins can do everything
CREATE POLICY "Admins can manage all saved reports"
  ON saved_reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );
