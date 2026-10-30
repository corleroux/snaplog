-- 031: Data integrity constraints
--
-- Phase 2 (DATA-02 through DATA-05):
-- - Unique booth_number per event (partial, non-null only)
-- - Check constraints for positive numeric values
-- - Unique primary images per entity (partial indexes)
-- - Unique variant colors per style (partial, non-null only)

-- ============================================================================
-- DATA-02: Unique booth_number per event
-- ============================================================================
-- Only one vendor per event can have a given booth_number.
-- Partial index excludes NULL booth_numbers (vendors without booths).

CREATE UNIQUE INDEX IF NOT EXISTS vendors_booth_number_event_id_partial
  ON public.vendors (event_id, booth_number)
  WHERE booth_number IS NOT NULL;

-- ============================================================================
-- DATA-03: Check constraints for positive numeric values
-- ============================================================================
-- Using DO blocks to make ADD CONSTRAINT idempotent (constraints may already
-- exist if applied via dashboard before local migration tracking was set up).

DO $$
BEGIN
  -- fabric_styles: width and weight must be positive when present
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fabric_styles_width_cm_positive') THEN
    ALTER TABLE public.fabric_styles ADD CONSTRAINT fabric_styles_width_cm_positive CHECK (width_cm IS NULL OR width_cm > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fabric_styles_width_in_positive') THEN
    ALTER TABLE public.fabric_styles ADD CONSTRAINT fabric_styles_width_in_positive CHECK (width_in IS NULL OR width_in > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fabric_styles_weight_gsm_positive') THEN
    ALTER TABLE public.fabric_styles ADD CONSTRAINT fabric_styles_weight_gsm_positive CHECK (weight_gsm IS NULL OR weight_gsm > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fabric_styles_weight_ozsy_positive') THEN
    ALTER TABLE public.fabric_styles ADD CONSTRAINT fabric_styles_weight_ozsy_positive CHECK (weight_ozsy IS NULL OR weight_ozsy > 0);
  END IF;

  -- price_history: price must be positive, MOQ must be positive when present
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'price_history_price_positive') THEN
    ALTER TABLE public.price_history ADD CONSTRAINT price_history_price_positive CHECK (price > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'price_history_moq_positive') THEN
    ALTER TABLE public.price_history ADD CONSTRAINT price_history_moq_positive CHECK (minimum_order_quantity IS NULL OR minimum_order_quantity > 0);
  END IF;

  -- inventory_records: quantity must be non-negative
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_records_quantity_non_negative') THEN
    ALTER TABLE public.inventory_records ADD CONSTRAINT inventory_records_quantity_non_negative CHECK (quantity >= 0);
  END IF;
END
$$;

-- ============================================================================
-- DATA-04: Unique primary images per entity
-- ============================================================================
-- Only one image per vendor/style can be marked as primary.

CREATE UNIQUE INDEX IF NOT EXISTS vendor_images_one_primary
  ON public.vendor_images (vendor_id)
  WHERE is_primary = true;

CREATE UNIQUE INDEX IF NOT EXISTS fabric_images_one_primary
  ON public.fabric_images (style_id)
  WHERE is_primary = true;

-- ============================================================================
-- DATA-05: Unique variant colors per style
-- ============================================================================
-- Only one variant per style can have a given color_name.
-- Partial index excludes NULL color_names.

CREATE UNIQUE INDEX IF NOT EXISTS fabric_variants_style_color_unique
  ON public.fabric_variants (style_id, color_name)
  WHERE color_name IS NOT NULL;
