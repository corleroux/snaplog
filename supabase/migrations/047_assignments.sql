-- Assignment System Migration
-- Allows assigning vendors, styles, and other entities to users
--
-- Features:
-- - Assign any entity type to a user
-- - Track who assigned and when
-- - Prevent duplicate assignments
-- - Filter by assignee in list views

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendor', 'style', 'variant')),
  entity_id UUID NOT NULL,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_assignments_entity_type_id ON assignments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_to ON assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_by ON assignments(assigned_by);

-- Prevent duplicate assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_unique
  ON assignments(entity_type, entity_id, assigned_to)
  WHERE assigned_at IS NOT NULL;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignments_updated_at();

-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view assignments for entities in their events
CREATE POLICY "Users can view assignments in their events"
  ON assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      JOIN event_members ON events.id = event_members.event_id
      WHERE event_members.user_id = auth.uid()
        AND (
          -- Vendor assignments
          (assignments.entity_type = 'vendor' AND assignments.entity_id IN (
            SELECT id FROM vendors WHERE event_id = events.id
          ))
          OR
          -- Style assignments (through vendor)
          (assignments.entity_type = 'style' AND assignments.entity_id IN (
            SELECT fabric_styles.id FROM fabric_styles
            JOIN vendors ON fabric_styles.vendor_id = vendors.id
            WHERE vendors.event_id = events.id
          ))
          OR
          -- Variant assignments (through style and vendor)
          (assignments.entity_type = 'variant' AND assignments.entity_id IN (
            SELECT fabric_variants.id FROM fabric_variants
            JOIN fabric_styles ON fabric_variants.style_id = fabric_styles.id
            JOIN vendors ON fabric_styles.vendor_id = vendors.id
            WHERE vendors.event_id = events.id
          ))
        )
    )
  );

-- Users can create assignments for entities in their events
CREATE POLICY "Users can create assignments in their events"
  ON assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      JOIN event_members ON events.id = event_members.event_id
      WHERE event_members.user_id = auth.uid()
        AND event_members.role IN ('owner', 'admin', 'editor')
        AND (
          -- Vendor assignments
          (assignments.entity_type = 'vendor' AND assignments.entity_id IN (
            SELECT id FROM vendors WHERE event_id = events.id
          ))
          OR
          -- Style assignments
          (assignments.entity_type = 'style' AND assignments.entity_id IN (
            SELECT fabric_styles.id FROM fabric_styles
            JOIN vendors ON fabric_styles.vendor_id = vendors.id
            WHERE vendors.event_id = events.id
          ))
          OR
          -- Variant assignments
          (assignments.entity_type = 'variant' AND assignments.entity_id IN (
            SELECT fabric_variants.id FROM fabric_variants
            JOIN fabric_styles ON fabric_variants.style_id = fabric_styles.id
            JOIN vendors ON fabric_styles.vendor_id = vendors.id
            WHERE vendors.event_id = events.id
          ))
        )
    )
    AND assigned_by = auth.uid()
  );

-- Users can update assignments they created
CREATE POLICY "Users can update their assignments"
  ON assignments
  FOR UPDATE
  USING (assigned_by = auth.uid())
  WITH CHECK (assigned_by = auth.uid());

-- Users can delete assignments they created (or admins)
CREATE POLICY "Users can delete their assignments"
  ON assignments
  FOR DELETE
  USING (
    assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM event_members
      JOIN events ON event_members.event_id = events.id
      JOIN vendors ON vendors.event_id = events.id
      WHERE event_members.user_id = auth.uid()
        AND event_members.role IN ('owner', 'admin')
        AND (
          (assignments.entity_type = 'vendor' AND assignments.entity_id = vendors.id)
          OR (assignments.entity_type = 'style' AND assignments.entity_id IN (
            SELECT id FROM fabric_styles WHERE vendor_id = vendors.id
          ))
        )
    )
  );

-- Helper function to get assignees for an entity
CREATE OR REPLACE FUNCTION get_entity_assignees(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  assigned_at TIMESTAMPTZ,
  assigned_by_email TEXT,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    assignee.id AS user_id,
    assignee.email,
    COALESCE(assignee.raw_user_meta_data->>'full_name', assignee.email) AS full_name,
    assignee.raw_user_meta_data->>'avatar_url' AS avatar_url,
    a.assigned_at,
    assigner.email AS assigned_by_email,
    a.notes
  FROM assignments a
  JOIN auth.users assignee ON a.assigned_to = assignee.id
  JOIN auth.users assigner ON a.assigned_by = assigner.id
  WHERE a.entity_type = p_entity_type
    AND a.entity_id = p_entity_id
  ORDER BY a.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get entities assigned to a user
CREATE OR REPLACE FUNCTION get_user_assignments(
  p_user_id UUID,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  event_id UUID,
  event_name TEXT,
  assigned_at TIMESTAMPTZ,
  assigned_by_email TEXT,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.entity_type,
    a.entity_id,
    CASE
      WHEN a.entity_type = 'vendor' THEN v.company_name
      WHEN a.entity_type = 'style' THEN s.name
      WHEN a.entity_type = 'variant' THEN fv.variant_name
    END AS entity_name,
    COALESCE(v.event_id, ev.event_id) AS event_id,
    COALESCE(e.name, ev.name) AS event_name,
    a.assigned_at,
    assigner.email AS assigned_by_email,
    a.notes
  FROM assignments a
  JOIN auth.users assigner ON a.assigned_by = assigner.id
  LEFT JOIN vendors v ON a.entity_type = 'vendor' AND a.entity_id = v.id
  LEFT JOIN events e ON v.event_id = e.id
  LEFT JOIN fabric_styles s ON a.entity_type = 'style' AND a.entity_id = s.id
  LEFT JOIN vendors v2 ON s.vendor_id = v2.id
  LEFT JOIN events ev ON v2.event_id = ev.id
  LEFT JOIN fabric_variants fv ON a.entity_type = 'variant' AND a.entity_id = fv.id
  LEFT JOIN fabric_styles s2 ON fv.style_id = s2.id
  LEFT JOIN vendors v3 ON s2.vendor_id = v3.id
  WHERE a.assigned_to = p_user_id
    AND (p_entity_type IS NULL OR a.entity_type = p_entity_type)
  ORDER BY a.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
