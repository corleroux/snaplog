-- 040: Additional CHECK constraints and unique index
--
-- DI-02: Prevent events with start date after end date
-- DI-03: Enforce extraction_confidence range 0-1
-- DI-04: Prevent multiple primary images per variant

-- ============================================================================
-- DI-02: Event date ordering
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_date_order') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_date_order
      CHECK (starts_on IS NULL OR ends_on IS NULL OR starts_on <= ends_on);
  END IF;
END
$$;

-- ============================================================================
-- DI-03: Extraction confidence range (0-1)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_confidence_range') THEN
    ALTER TABLE public.vendors ADD CONSTRAINT vendors_confidence_range
      CHECK (extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fabric_styles_confidence_range') THEN
    ALTER TABLE public.fabric_styles ADD CONSTRAINT fabric_styles_confidence_range
      CHECK (extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1));
  END IF;
END
$$;

-- ============================================================================
-- DI-04: Unique primary image per variant
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uniq_fabric_images_variant_primary
  ON public.fabric_images (variant_id)
  WHERE is_primary = true AND variant_id IS NOT NULL;
