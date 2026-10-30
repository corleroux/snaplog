-- Add soft-delete filter to SELECT policies for vendors, fabric_styles, fabric_variants
--
-- The deleted_at column was added in migration 041 but existing SELECT policies
-- did not filter on deleted_at IS NULL. Soft-deleted records were visible to all
-- event members. This migration corrects the SELECT policies for the three core tables.

-- Vendors
DROP POLICY IF EXISTS "members can read vendors" ON public.vendors;
CREATE POLICY "members can read vendors"
  ON public.vendors
  FOR SELECT
  USING (is_event_member(event_id) AND (deleted_at IS NULL));

-- Fabric styles
DROP POLICY IF EXISTS "members can read fabric_styles" ON public.fabric_styles;
CREATE POLICY "members can read fabric_styles"
  ON public.fabric_styles
  FOR SELECT
  USING (is_event_member(event_id) AND (deleted_at IS NULL));

-- Fabric variants
-- Variants do not have a direct event_id; gate through the parent fabric_style
DROP POLICY IF EXISTS "members can read fabric_variants" ON public.fabric_variants;
CREATE POLICY "members can read fabric_variants"
  ON public.fabric_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fabric_styles fs
      WHERE fs.id = fabric_variants.style_id
        AND is_event_member(fs.event_id)
        AND fs.deleted_at IS NULL
    )
    AND (deleted_at IS NULL)
  );
