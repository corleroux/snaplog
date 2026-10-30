-- Saved Filters Migration
-- Allows users to save, organize, and share filter configurations

CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendors', 'styles', 'events')),
  filter_config JSONB NOT NULL DEFAULT '{}',
  is_shared BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS saved_filters_user_id_idx ON saved_filters(user_id);
CREATE INDEX IF NOT EXISTS saved_filters_entity_type_idx ON saved_filters(entity_type);
CREATE INDEX IF NOT EXISTS saved_filters_is_shared_idx ON saved_filters(is_shared);

-- Enable RLS
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own filters"
  ON saved_filters FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can view shared filters"
  ON saved_filters FOR SELECT
  USING (is_shared = true AND deleted_at IS NULL);

CREATE POLICY "Users can insert own filters"
  ON saved_filters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own filters"
  ON saved_filters FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own filters"
  ON saved_filters FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for saved_filters
CREATE TRIGGER update_saved_filters_updated_at
  BEFORE UPDATE ON saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
