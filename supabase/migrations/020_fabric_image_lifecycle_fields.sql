-- Add lifecycle fields to fabric_images table for presentation and extraction support
-- These fields support the canonical Style app layer while preserving
-- the existing fabric_* Supabase backbone structure.

-- Add presentation and extraction fields
ALTER TABLE public.fabric_images
ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS caption text,
ADD COLUMN IF NOT EXISTS was_source_info_image boolean NOT NULL DEFAULT false;

-- Add index for display ordering
CREATE INDEX IF NOT EXISTS idx_fabric_images_style_id_display_order
  ON public.fabric_images(style_id, display_order) WHERE style_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fabric_images_variant_id_display_order
  ON public.fabric_images(variant_id, display_order) WHERE variant_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.fabric_images.display_order IS 'Order for displaying images in the UI';
COMMENT ON COLUMN public.fabric_images.caption IS 'User-provided caption for the image';
COMMENT ON COLUMN public.fabric_images.was_source_info_image IS 'True if this image was the Info image used for extraction';
