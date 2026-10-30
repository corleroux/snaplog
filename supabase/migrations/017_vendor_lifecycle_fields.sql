-- Add lifecycle fields to vendors table for extraction/commit workflow support
-- These fields support the canonical Vendor app layer while preserving
-- the existing Supabase backbone structure.

-- Add source info image reference
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS source_info_image_id uuid REFERENCES public.vendor_images(id) ON DELETE SET NULL;

-- Add extraction metadata fields
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS extracted_at timestamptz,
ADD COLUMN IF NOT EXISTS extraction_status text
  CHECK (extraction_status IN ('pending', 'processing', 'complete', 'failed')),
ADD COLUMN IF NOT EXISTS extraction_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS extraction_confidence numeric;

-- Add index for source info image lookups
CREATE INDEX IF NOT EXISTS idx_vendors_source_info_image_id
  ON public.vendors(source_info_image_id) WHERE source_info_image_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.vendors.source_info_image_id IS 'Reference to the vendor_image used as the source for AI extraction';
COMMENT ON COLUMN public.vendors.extracted_at IS 'Timestamp when AI extraction was performed';
COMMENT ON COLUMN public.vendors.extraction_status IS 'Status of the extraction process (pending|processing|complete|failed)';
COMMENT ON COLUMN public.vendors.extraction_warnings IS 'Array of warnings generated during extraction';
COMMENT ON COLUMN public.vendors.extraction_confidence IS 'Confidence score from extraction (0-1)';
