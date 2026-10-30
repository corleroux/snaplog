-- Add lifecycle fields to vendor_images table for presentation and extraction support
-- These fields support the canonical Vendor app layer while preserving
-- the existing Supabase backbone structure.

-- Add presentation and extraction fields
ALTER TABLE public.vendor_images
ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS caption text,
ADD COLUMN IF NOT EXISTS was_source_info_image boolean NOT NULL DEFAULT false;

-- Add index for display ordering
CREATE INDEX IF NOT EXISTS idx_vendor_images_vendor_id_display_order
  ON public.vendor_images(vendor_id, display_order);

-- Add comment for documentation
COMMENT ON COLUMN public.vendor_images.display_order IS 'Order for displaying images in the UI';
COMMENT ON COLUMN public.vendor_images.caption IS 'User-provided caption for the image';
COMMENT ON COLUMN public.vendor_images.was_source_info_image IS 'True if this image was the Info image used for extraction';
