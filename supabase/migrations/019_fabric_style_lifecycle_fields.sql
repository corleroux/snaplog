-- Add lifecycle fields to fabric_styles table for extraction/commit workflow support
-- These fields support the canonical Style app layer while preserving
-- the existing fabric_* Supabase backbone structure.

-- Add supplier reference field
ALTER TABLE public.fabric_styles
ADD COLUMN IF NOT EXISTS supplier_ref text;

-- Add source info image reference
ALTER TABLE public.fabric_styles
ADD COLUMN IF NOT EXISTS source_info_image_id uuid REFERENCES public.fabric_images(id) ON DELETE SET NULL;

-- Add extraction metadata fields
ALTER TABLE public.fabric_styles
ADD COLUMN IF NOT EXISTS extracted_at timestamptz,
ADD COLUMN IF NOT EXISTS extraction_status text
  CHECK (extraction_status IN ('pending', 'processing', 'complete', 'failed')),
ADD COLUMN IF NOT EXISTS extraction_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS extraction_confidence numeric;

-- Add index for source info image lookups
CREATE INDEX IF NOT EXISTS idx_fabric_styles_source_info_image_id
  ON public.fabric_styles(source_info_image_id) WHERE source_info_image_id IS NOT NULL;

-- Add index for supplier reference lookups
CREATE INDEX IF NOT EXISTS idx_fabric_styles_supplier_ref
  ON public.fabric_styles(supplier_ref) WHERE supplier_ref IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.fabric_styles.supplier_ref IS 'Supplier''s reference code for this style';
COMMENT ON COLUMN public.fabric_styles.source_info_image_id IS 'Reference to the fabric_image used as the source for AI extraction';
COMMENT ON COLUMN public.fabric_styles.extracted_at IS 'Timestamp when AI extraction was performed';
COMMENT ON COLUMN public.fabric_styles.extraction_status IS 'Status of the extraction process (pending|processing|complete|failed)';
COMMENT ON COLUMN public.fabric_styles.extraction_warnings IS 'Array of warnings generated during extraction';
COMMENT ON COLUMN public.fabric_styles.extraction_confidence IS 'Confidence score from extraction (0-1)';
