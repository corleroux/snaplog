-- Query Optimization Migration
--
-- Additional indexes to optimize common query patterns identified
-- in the vendor and style repositories.
--
-- Optimizations:
-- 1. Composite indexes for (event_id, status, created_at) queries
-- 2. Partial indexes for active/deleted records
-- 3. Indexes for common filtering patterns

-- ============================================================================
-- VENDORS TABLE
-- ============================================================================

-- Composite index for the common pattern: filter by event, exclude deleted, order by created_at
CREATE INDEX IF NOT EXISTS idx_vendors_event_status_created ON vendors(event_id, status, created_at DESC);

-- Partial index for active vendors only (status != 'deleted')
CREATE INDEX IF NOT EXISTS idx_vendors_active_event_created ON vendors(event_id, created_at DESC)
WHERE status != 'deleted';

-- Partial index for deleted vendors (for admin/views that need them)
CREATE INDEX IF NOT EXISTS idx_vendors_deleted_event_created ON vendors(event_id, created_at DESC)
WHERE status = 'deleted';


-- ============================================================================
-- FABRIC STYLES TABLE
-- ============================================================================

-- Composite index for the common pattern: filter by event, exclude deleted, order by created_at
CREATE INDEX IF NOT EXISTS idx_fabric_styles_event_status_created ON fabric_styles(event_id, status, created_at DESC);

-- Partial index for active styles only
CREATE INDEX IF NOT EXISTS idx_fabric_styles_active_event_created ON fabric_styles(event_id, created_at DESC)
WHERE status != 'deleted';

-- Partial index for deleted styles
CREATE INDEX IF NOT EXISTS idx_fabric_styles_deleted_event_created ON fabric_styles(event_id, created_at DESC)
WHERE status = 'deleted';

-- Composite index for vendor + status queries
CREATE INDEX IF NOT EXISTS idx_fabric_styles_vendor_status_created ON fabric_styles(vendor_id, status, created_at DESC);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_fabric_styles_event_category_status ON fabric_styles(event_id, category, status);

-- Index for season filtering
CREATE INDEX IF NOT EXISTS idx_fabric_styles_event_season_status ON fabric_styles(event_id, season, status);

-- ============================================================================
-- DRAFTS TABLE
-- ============================================================================

-- Composite index for user's drafts by event
CREATE INDEX IF NOT EXISTS idx_drafts_owner_event_updated ON drafts(owner_id, event_id, updated_at DESC);

-- Partial index for active drafts only
CREATE INDEX IF NOT EXISTS idx_drafts_active_owner_event ON drafts(owner_id, event_id, updated_at DESC)
WHERE status != 'deleted';

-- Index for draft status filtering
CREATE INDEX IF NOT EXISTS idx_drafts_status_updated ON drafts(status, updated_at DESC);

-- ============================================================================
-- SCAN SESSIONS TABLE
-- ============================================================================

-- Composite index for event + extraction status + created
CREATE INDEX IF NOT EXISTS idx_scan_sessions_event_status_created ON scan_sessions(event_id, extraction_status, created_at DESC);

-- Index for scan type lookups
CREATE INDEX IF NOT EXISTS idx_scan_sessions_type_status_created ON scan_sessions(scan_type, extraction_status, created_at DESC);

-- ============================================================================
-- VENDOR IMAGES TABLE
-- ============================================================================

-- Partial index for primary images (common query pattern)
CREATE INDEX IF NOT EXISTS idx_vendor_images_primary_vendor ON vendor_images(vendor_id, is_primary)
WHERE is_primary = true;

-- ============================================================================
-- FABRIC IMAGES TABLE
-- ============================================================================

-- Partial index for primary images
CREATE INDEX IF NOT EXISTS idx_fabric_images_primary_vendor ON fabric_images(vendor_id, is_primary)
WHERE is_primary = true;

-- Partial index for primary style images
CREATE INDEX IF NOT EXISTS idx_fabric_images_primary_style ON fabric_images(style_id, is_primary)
WHERE is_primary = true AND variant_id IS NULL;

-- ============================================================================
-- FABRIC VARIANTS TABLE
-- ============================================================================

-- Composite index for vendor + status queries
CREATE INDEX IF NOT EXISTS idx_fabric_variants_vendor_status_created ON fabric_variants(vendor_id, status, created_at DESC);

-- Composite index for style + status queries
CREATE INDEX IF NOT EXISTS idx_fabric_variants_style_status_created ON fabric_variants(style_id, status, created_at DESC);

-- Index for color filtering
CREATE INDEX IF NOT EXISTS idx_fabric_variants_vendor_color ON fabric_variants(vendor_id, color_code);

-- ============================================================================
-- INVENTORY RECORDS TABLE
-- ============================================================================

-- Composite index for vendor + variant lookups
CREATE INDEX IF NOT EXISTS idx_inventory_records_vendor_variant ON inventory_records(vendor_id, variant_id);

-- Index for inventory availability (quantity > 0)
CREATE INDEX IF NOT EXISTS idx_inventory_records_available_quantity ON inventory_records(quantity DESC)
WHERE quantity > 0;

-- ============================================================================
-- PRICE HISTORY TABLE
-- ============================================================================

-- Composite index for vendor + variant + created (for latest price)
CREATE INDEX IF NOT EXISTS idx_price_history_vendor_variant_created ON price_history(vendor_id, variant_id, created_at DESC);

-- Index for price lookups by currency
CREATE INDEX IF NOT EXISTS idx_price_history_currency_created ON price_history(currency, created_at DESC);

-- NOTE: audit_log indexes are defined in 059_audit_log.sql where the table is created.

-- ============================================================================
-- ANALYZE
-- ============================================================================

-- Analyze tables to update statistics after adding indexes
ANALYZE vendors;
ANALYZE fabric_styles;
ANALYZE fabric_variants;
ANALYZE vendor_images;
ANALYZE fabric_images;
ANALYZE inventory_records;
ANALYZE price_history;
ANALYZE drafts;
ANALYZE scan_sessions;
