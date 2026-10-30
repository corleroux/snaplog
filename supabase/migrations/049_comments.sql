-- Comments System Migration
-- Supports comments on vendors, styles, and other entities with threading

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('vendor', 'style', 'variant', 'event')),
  entity_id UUID NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_users UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create index for looking up comments by entity
CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.comments(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view comments on entities they have access to (via event membership)
CREATE POLICY "Users can view comments on accessible entities"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      -- User is a member of the event that owns the entity
      EXISTS (
        SELECT 1 FROM public.event_members
        WHERE event_members.user_id = auth.uid()
        AND (
          -- Direct event comment
          (comments.entity_type = 'event' AND comments.entity_id = event_members.event_id)
          -- Vendor belongs to event
          OR (comments.entity_type = 'vendor' AND EXISTS (
            SELECT 1 FROM public.vendors
            WHERE vendors.id = comments.entity_id
            AND vendors.event_id = event_members.event_id
          ))
          -- Style belongs to vendor which belongs to event
          OR (comments.entity_type = 'style' AND EXISTS (
            SELECT 1 FROM public.fabric_styles
            INNER JOIN public.vendors ON vendors.id = fabric_styles.vendor_id
            WHERE fabric_styles.id = comments.entity_id
            AND vendors.event_id = event_members.event_id
          ))
          -- Variant belongs to style which belongs to vendor which belongs to event
          OR (comments.entity_type = 'variant' AND EXISTS (
            SELECT 1 FROM public.fabric_variants
            INNER JOIN public.fabric_styles ON fabric_styles.id = fabric_variants.style_id
            INNER JOIN public.vendors ON vendors.id = fabric_styles.vendor_id
            WHERE fabric_variants.id = comments.entity_id
            AND vendors.event_id = event_members.event_id
          ))
        )
      )
      -- User authored the comment
      OR comments.user_id = auth.uid()
    )
  );

-- Users can create comments on entities they have access to
CREATE POLICY "Users can create comments on accessible entities"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_members.user_id = auth.uid()
      AND (
        -- Direct event comment
        (entity_type = 'event' AND entity_id = event_members.event_id)
        -- Vendor belongs to event
        OR (entity_type = 'vendor' AND EXISTS (
          SELECT 1 FROM public.vendors
          WHERE vendors.id = entity_id
          AND vendors.event_id = event_members.event_id
        ))
        -- Style belongs to vendor which belongs to event
        OR (entity_type = 'style' AND EXISTS (
          SELECT 1 FROM public.fabric_styles
          INNER JOIN public.vendors ON vendors.id = fabric_styles.vendor_id
          WHERE fabric_styles.id = entity_id
          AND vendors.event_id = event_members.event_id
        ))
        -- Variant belongs to style which belongs to vendor which belongs to event
        OR (entity_type = 'variant' AND EXISTS (
          SELECT 1 FROM public.fabric_variants
          INNER JOIN public.fabric_styles ON fabric_styles.id = fabric_variants.style_id
          INNER JOIN public.vendors ON vendors.id = fabric_styles.vendor_id
          WHERE fabric_variants.id = entity_id
          AND vendors.event_id = event_members.event_id
        ))
      )
    )
    AND user_id = auth.uid()
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- Users can soft delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid() AND deleted_at = NOW());

-- Function to get comments for an entity
CREATE OR REPLACE FUNCTION public.get_entity_comments(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_include_deleted BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_id UUID,
  parent_id UUID,
  content TEXT,
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  mentioned_users UUID[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  reply_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.entity_type,
    c.entity_id,
    c.parent_id,
    c.content,
    c.user_id,
    u.email,
    u.raw_user_meta_data->>'full_name' AS user_full_name,
    c.mentioned_users,
    c.created_at,
    c.updated_at,
    c.deleted_at,
    (SELECT COUNT(*) FROM public.comments c2 WHERE c2.parent_id = c.id AND (p_include_deleted OR c2.deleted_at IS NULL)) AS reply_count
  FROM public.comments c
  INNER JOIN auth.users u ON u.id = c.user_id
  WHERE c.entity_type = p_entity_type
    AND c.entity_id = p_entity_id
    AND (p_include_deleted OR c.deleted_at IS NULL)
    AND c.parent_id IS NULL
  ORDER BY c.created_at DESC;
END;
$$;

-- Function to get replies for a comment
CREATE OR REPLACE FUNCTION public.get_comment_replies(
  p_comment_id UUID,
  p_include_deleted BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_id UUID,
  parent_id UUID,
  content TEXT,
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  mentioned_users UUID[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.entity_type,
    c.entity_id,
    c.parent_id,
    c.content,
    c.user_id,
    u.email,
    u.raw_user_meta_data->>'full_name' AS user_full_name,
    c.mentioned_users,
    c.created_at,
    c.updated_at,
    c.deleted_at
  FROM public.comments c
  INNER JOIN auth.users u ON u.id = c.user_id
  WHERE c.parent_id = p_comment_id
    AND (p_include_deleted OR c.deleted_at IS NULL)
  ORDER BY c.created_at ASC;
END;
$$;

-- Function to update comment timestamp
CREATE OR REPLACE FUNCTION public.update_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_timestamp();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_entity_comments TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_comment_replies TO authenticated;
