-- Add soft-delete column to vendor_images for safe image replacement
ALTER TABLE public.vendor_images
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Index for filtering active images efficiently
CREATE INDEX IF NOT EXISTS idx_vendor_images_vendor_id_deleted_at
  ON public.vendor_images(vendor_id, deleted_at);
