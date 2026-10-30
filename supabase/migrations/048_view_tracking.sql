-- Style Popularity Tracking Migration
-- Tracks views and exports for styles to measure popularity
--
-- Features:
-- - Track style views (when a user views a style detail)
-- - Track style exports (when a user exports a style)
-- - Aggregate popularity metrics
-- - Time-filtered popularity lists

-- Style views table
CREATE TABLE IF NOT EXISTS style_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID NOT NULL REFERENCES fabric_styles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Session information for deduplication
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Style exports table
CREATE TABLE IF NOT EXISTS style_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id UUID NOT NULL REFERENCES fabric_styles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'excel', 'image')),
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_style_views_style_id ON style_views(style_id);
CREATE INDEX IF NOT EXISTS idx_style_views_user_id ON style_views(user_id);
CREATE INDEX IF NOT EXISTS idx_style_views_event_id ON style_views(event_id);
CREATE INDEX IF NOT EXISTS idx_style_views_viewed_at ON style_views(viewed_at);

CREATE INDEX IF NOT EXISTS idx_style_exports_style_id ON style_exports(style_id);
CREATE INDEX IF NOT EXISTS idx_style_exports_user_id ON style_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_style_exports_event_id ON style_exports(event_id);
CREATE INDEX IF NOT EXISTS idx_style_exports_exported_at ON style_exports(exported_at);

-- Enable RLS
ALTER TABLE style_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for style_views
-- Users can view views in their events
CREATE POLICY "Users can view style views in their events"
  ON style_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = style_views.event_id
        AND event_members.user_id = auth.uid()
    )
  );

-- Users can insert their own views
CREATE POLICY "Users can insert their own style views"
  ON style_views
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for style_exports
-- Users can view exports in their events
CREATE POLICY "Users can view style exports in their events"
  ON style_exports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = style_exports.event_id
        AND event_members.user_id = auth.uid()
    )
  );

-- Users can insert their own exports
CREATE POLICY "Users can insert their own style exports"
  ON style_exports
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to track a style view
CREATE OR REPLACE FUNCTION track_style_view(
  p_style_id UUID,
  p_event_id UUID,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_view_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Check if user has access to this style
  IF NOT EXISTS (
    SELECT 1 FROM fabric_styles s
    JOIN vendors v ON s.vendor_id = v.id
    JOIN event_members em ON v.event_id = em.event_id
    WHERE s.id = p_style_id
      AND em.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User does not have access to this style';
  END IF;

  -- Check for recent view from same session (debounce within 5 minutes)
  IF EXISTS (
    SELECT 1 FROM style_views
    WHERE style_id = p_style_id
      AND user_id = v_user_id
      AND (p_session_id IS NULL OR session_id = p_session_id)
      AND viewed_at > NOW() - INTERVAL '5 minutes'
    ORDER BY viewed_at DESC
    LIMIT 1
  ) THEN
    -- Return existing view ID
    SELECT id INTO v_view_id FROM style_views
    WHERE style_id = p_style_id
      AND user_id = v_user_id
      AND (p_session_id IS NULL OR session_id = p_session_id)
      AND viewed_at > NOW() - INTERVAL '5 minutes'
    ORDER BY viewed_at DESC
    LIMIT 1;
  ELSE
    -- Create new view record
    INSERT INTO style_views (style_id, user_id, event_id, session_id)
    VALUES (p_style_id, v_user_id, p_event_id, p_session_id)
    RETURNING id INTO v_view_id;
  END IF;

  RETURN v_view_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track a style export
CREATE OR REPLACE FUNCTION track_style_export(
  p_style_id UUID,
  p_event_id UUID,
  p_export_type TEXT
)
RETURNS UUID AS $$
DECLARE
  v_export_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Check if user has access to this style
  IF NOT EXISTS (
    SELECT 1 FROM fabric_styles s
    JOIN vendors v ON s.vendor_id = v.id
    JOIN event_members em ON v.event_id = em.event_id
    WHERE s.id = p_style_id
      AND em.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User does not have access to this style';
  END IF;

  -- Create export record
  INSERT INTO style_exports (style_id, user_id, event_id, export_type)
  VALUES (p_style_id, v_user_id, p_event_id, p_export_type)
  RETURNING id INTO v_export_id;

  RETURN v_export_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get popular styles
CREATE OR REPLACE FUNCTION get_popular_styles(
  p_event_id UUID,
  p_time_range TEXT DEFAULT '7d', -- '1d', '7d', '30d', 'all'
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  style_id UUID,
  style_name TEXT,
  vendor_id UUID,
  vendor_name TEXT,
  view_count BIGINT,
  export_count BIGINT,
  popularity_score BIGINT
) AS $$
DECLARE
  v_time_filter TIMESTAMPTZ;
BEGIN
  -- Determine time filter
  CASE p_time_range
    WHEN '1d' THEN v_time_filter := NOW() - INTERVAL '1 day';
    WHEN '7d' THEN v_time_filter := NOW() - INTERVAL '7 days';
    WHEN '30d' THEN v_time_filter := NOW() - INTERVAL '30 days';
    WHEN 'all' THEN v_time_filter := '-infinity'::TIMESTAMPTZ;
    ELSE v_time_filter := NOW() - INTERVAL '7 days';
  END CASE;

  RETURN QUERY
  SELECT
    s.id AS style_id,
    s.name AS style_name,
    v.id AS vendor_id,
    v.company_name AS vendor_name,
    COALESCE(sv.views, 0) AS view_count,
    COALESCE(se.exports, 0) AS export_count,
    -- Popularity score: views + (exports * 5)
    COALESCE(sv.views, 0) + (COALESCE(se.exports, 0) * 5) AS popularity_score
  FROM fabric_styles s
  JOIN vendors v ON s.vendor_id = v.id
  LEFT JOIN (
    SELECT style_id, COUNT(*) AS views
    FROM style_views
    WHERE viewed_at > v_time_filter
    GROUP BY style_id
  ) sv ON s.id = sv.style_id
  LEFT JOIN (
    SELECT style_id, COUNT(*) AS exports
    FROM style_exports
    WHERE exported_at > v_time_filter
    GROUP BY style_id
  ) se ON s.id = se.style_id
  WHERE v.event_id = p_event_id
    AND (COALESCE(sv.views, 0) + COALESCE(se.exports, 0) * 5) > 0
  ORDER BY popularity_score DESC, s.name ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION track_style_view TO authenticated;
GRANT EXECUTE ON FUNCTION track_style_export TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_styles TO authenticated;
