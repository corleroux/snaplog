-- Add deleted_at timestamp to vendors, fabric_styles, fabric_variants
-- This supports soft-delete tracking separate from status changes

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE fabric_styles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE fabric_variants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create indexes for common queries filtering out deleted records
CREATE INDEX IF NOT EXISTS idx_vendors_not_deleted ON vendors (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fabric_styles_not_deleted ON fabric_styles (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fabric_variants_not_deleted ON fabric_variants (id) WHERE deleted_at IS NULL;
