-- ARCH-11: Add missing database indexes
--
-- Indexes on FK columns and RLS-critical columns that are missing.
-- These improve RLS policy evaluation and common query performance.

-- RLS-critical: policy performance (is_event_member checks event_id)
CREATE INDEX IF NOT EXISTS idx_vendor_images_event_id ON public.vendor_images(event_id);
CREATE INDEX IF NOT EXISTS idx_price_history_event_id ON public.price_history(event_id);
CREATE INDEX IF NOT EXISTS idx_fabric_images_event_id ON public.fabric_images(event_id);
CREATE INDEX IF NOT EXISTS idx_drafts_event_id ON public.drafts(event_id);
CREATE INDEX IF NOT EXISTS idx_drafts_owner_id ON public.drafts(owner_id);

-- Query performance: common FK joins
CREATE INDEX IF NOT EXISTS idx_price_history_vendor_id ON public.price_history(vendor_id);
CREATE INDEX IF NOT EXISTS idx_fabric_images_vendor_id ON public.fabric_images(vendor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_records_vendor_id ON public.inventory_records(vendor_id);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_created_by ON public.scan_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_vendors_created_by ON public.vendors(created_by);

-- Composite: common query patterns
CREATE INDEX IF NOT EXISTS idx_scan_sessions_event_extraction ON public.scan_sessions(event_id, extraction_status);
