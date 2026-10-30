-- Migration 085: Garment schema + generalised catalogue item storage
-- Proves FR-SCH-03: a new category is added purely by inserting a schema row.
-- Fabric tables are left untouched; new additive tables store non-fabric items.
-- STAGING ONLY: deploy with supabase db push --project-ref <project-ref>

-- ============================================================
-- SEED: garment v1
-- Mirror PRD §1.2 garment fields, with translation/null extraction hints.
-- ============================================================
INSERT INTO public.catalogue_types (slug, kind, display_name, version, schema)
VALUES (
    'garment',
    'catalogue_type',
    'Garment',
    1,
    jsonb_build_object(
        'translate_to_english', true,
        'rules', jsonb_build_array(
            'All numeric fields should be numbers, not strings.',
            'If information is not visible, use null.',
            'Extract silhouette, garment type, construction, fabric/composition, closure, neckline, sleeve, fit and sizing.',
            'For colourways, extract all visible colour variants.',
            'Return ONLY valid JSON, no markdown formatting.',
            'TRANSLATE ALL CHINESE TEXT TO ENGLISH before including in the JSON response.'
        ),
        'scan_types', jsonb_build_object(
            'garment_flat', 'This is a flat-lay garment photo. Extract silhouette, construction, fabric, closure, neckline, sleeve, fit and sizing.',
            'garment_hanging', 'This is a garment on a hanger. Focus on overall silhouette, garment type, neckline, sleeve and visible details.',
            'garment_worn', 'This is a garment being worn. Extract fit, silhouette, length and styling cues.',
            'garment_label', 'This is a garment label or tag. Extract composition, care instructions, size and country of origin.'
        ),
        'output_root', 'item',
        'fields', jsonb_build_array(
            jsonb_build_object('path', 'item.item_code', 'type', 'string', 'label', 'Item code', 'hint', 'style/product code', 'required', false),
            jsonb_build_object('path', 'item.name', 'type', 'string', 'label', 'Name', 'hint', 'style or product name', 'required', false),
            jsonb_build_object('path', 'item.garment_type', 'type', 'string', 'label', 'Garment type', 'hint', 'e.g., Dress, Shirt, Jacket, Trousers, Skirt', 'required', false),
            jsonb_build_object('path', 'item.silhouette', 'type', 'string', 'label', 'Silhouette', 'hint', 'e.g., A-line, Slim, Boxy, Oversized', 'required', false),
            jsonb_build_object('path', 'item.construction', 'type', 'string', 'label', 'Construction', 'hint', 'e.g., Tailored, Draped, Knitted, Woven', 'required', false),
            jsonb_build_object('path', 'item.fabric_composition', 'type', 'string', 'label', 'Fabric / Composition', 'hint', 'fiber content, e.g., "100% Cotton", "80% Cotton 20% Polyester"', 'required', false),
            jsonb_build_object('path', 'item.closure', 'type', 'string', 'label', 'Closure', 'hint', 'e.g., Button, Zip, Hook-and-eye, Tie', 'required', false),
            jsonb_build_object('path', 'item.neckline', 'type', 'string', 'label', 'Neckline', 'hint', 'e.g., V-neck, Crew neck, Collar, Halter', 'required', false),
            jsonb_build_object('path', 'item.sleeve', 'type', 'string', 'label', 'Sleeve', 'hint', 'e.g., Long sleeve, Short sleeve, Sleeveless, Cap sleeve', 'required', false),
            jsonb_build_object('path', 'item.fit', 'type', 'string', 'label', 'Fit', 'hint', 'e.g., Slim, Regular, Relaxed, Loose', 'required', false),
            jsonb_build_object('path', 'item.sizing', 'type', 'string', 'label', 'Sizing', 'hint', 'e.g., S/M/L, numeric sizes, or size range shown', 'required', false),
            jsonb_build_object('path', 'item.season', 'type', 'string', 'label', 'Season', 'hint', 'season code like SS25, FW25', 'required', false),
            jsonb_build_object('path', 'item.metadata', 'type', 'object', 'label', 'Metadata', 'hint', 'any additional info as object', 'required', false),
            jsonb_build_object(
                'path', 'item.colourways',
                'type', 'array',
                'label', 'Colourways',
                'hint', 'visible colour variants',
                'required', false,
                'items', jsonb_build_object(
                    'type', 'group',
                    'fields', jsonb_build_array(
                        jsonb_build_object('path', 'colour_code', 'type', 'string', 'label', 'Colour code', 'hint', 'colour code', 'required', false),
                        jsonb_build_object('path', 'colour_name', 'type', 'string', 'label', 'Colour name', 'hint', 'colour name', 'required', false),
                        jsonb_build_object('path', 'variant_name', 'type', 'string', 'label', 'Variant name', 'hint', 'custom variant description', 'required', false),
                        jsonb_build_object('path', 'sizing', 'type', 'string', 'label', 'Sizing', 'hint', 'size-specific availability', 'required', false),
                        jsonb_build_object('path', 'metadata', 'type', 'object', 'label', 'Metadata', 'hint', 'any additional info as object', 'required', false)
                    )
                )
            )
        )
    )
)
ON CONFLICT (slug, version) DO UPDATE
SET schema = EXCLUDED.schema,
    display_name = EXCLUDED.display_name,
    kind = EXCLUDED.kind,
    is_active = true;

-- ============================================================
-- TABLE: catalogue_items
-- Generalised storage for any non-fabric catalogue type.
-- Mirrors fabric_styles structure but stores extracted fields as JSONB.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.catalogue_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    vendor_id       UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,

    schema_type     TEXT NOT NULL,
    schema_version  INTEGER NOT NULL DEFAULT 1,

    item_code       TEXT NOT NULL,
    name            TEXT,
    extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,

    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'hidden', 'archived')),

    created_by      UUID NOT NULL REFERENCES public.profiles(id),
    updated_by      UUID REFERENCES public.profiles(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (vendor_id, item_code),
    FOREIGN KEY (schema_type, schema_version) REFERENCES public.catalogue_types(slug, version)
);

CREATE INDEX IF NOT EXISTS idx_catalogue_items_event_id ON public.catalogue_items(event_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_items_vendor_id ON public.catalogue_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_items_item_code ON public.catalogue_items(item_code);
CREATE INDEX IF NOT EXISTS idx_catalogue_items_schema_type ON public.catalogue_items(schema_type, schema_version);
CREATE INDEX IF NOT EXISTS idx_catalogue_items_extracted_fields_gin ON public.catalogue_items USING gin(extracted_fields);

DROP TRIGGER IF EXISTS trg_catalogue_items_updated_at ON public.catalogue_items;
CREATE TRIGGER trg_catalogue_items_updated_at
    BEFORE UPDATE ON public.catalogue_items
    FOR EACH ROW
    EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- TABLE: catalogue_item_variants
-- Variants for catalogue_items (mirrors fabric_variants).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.catalogue_item_variants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id         UUID NOT NULL REFERENCES public.catalogue_items(id) ON DELETE CASCADE,
    event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    vendor_id       UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,

    variant_name    TEXT,
    colour_code     TEXT,
    colour_name     TEXT,
    sizing          TEXT,

    status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'sample', 'partial', 'discontinued')),

    extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_by      UUID NOT NULL REFERENCES public.profiles(id),
    updated_by      UUID REFERENCES public.profiles(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalogue_item_variants_item_id ON public.catalogue_item_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_item_variants_event_id ON public.catalogue_item_variants(event_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_item_variants_vendor_id ON public.catalogue_item_variants(vendor_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_item_variants_extracted_fields_gin ON public.catalogue_item_variants USING gin(extracted_fields);

DROP TRIGGER IF EXISTS trg_catalogue_item_variants_updated_at ON public.catalogue_item_variants;
CREATE TRIGGER trg_catalogue_item_variants_updated_at
    BEFORE UPDATE ON public.catalogue_item_variants
    FOR EACH ROW
    EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Mirrors fabric_styles/fabric_variants patterns: event-scoped,
-- owner/admin delete, members can read/insert/update.
-- ============================================================
ALTER TABLE public.catalogue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_item_variants ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "members can select catalogue_items"
    ON public.catalogue_items FOR SELECT TO authenticated
    USING (public.is_event_member(event_id));

CREATE POLICY "members can select catalogue_item_variants"
    ON public.catalogue_item_variants FOR SELECT TO authenticated
    USING (public.is_event_member(event_id));

-- INSERT
CREATE POLICY "members can insert catalogue_items"
    ON public.catalogue_items FOR INSERT TO authenticated
    WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "members can insert catalogue_item_variants"
    ON public.catalogue_item_variants FOR INSERT TO authenticated
    WITH CHECK (public.is_event_member(event_id));

-- UPDATE
CREATE POLICY "members can update catalogue_items"
    ON public.catalogue_items FOR UPDATE TO authenticated
    USING (public.is_event_member(event_id))
    WITH CHECK (public.is_event_member(event_id));

CREATE POLICY "members can update catalogue_item_variants"
    ON public.catalogue_item_variants FOR UPDATE TO authenticated
    USING (public.is_event_member(event_id))
    WITH CHECK (public.is_event_member(event_id));

-- DELETE (owner/admin only)
CREATE POLICY "owners can delete catalogue_items"
    ON public.catalogue_items FOR DELETE TO authenticated
    USING (public.is_event_member(event_id) AND public.event_role(event_id) IN ('owner', 'admin'));

CREATE POLICY "owners can delete catalogue_item_variants"
    ON public.catalogue_item_variants FOR DELETE TO authenticated
    USING (public.is_event_member(event_id) AND public.event_role(event_id) IN ('owner', 'admin'));

-- ============================================================
-- scan_sessions extensions for catalogue items
-- Additive: item_id mirrors style_id; widen scan_type for garment scans.
-- ============================================================
ALTER TABLE public.scan_sessions
    ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.catalogue_items(id) ON DELETE SET NULL;

-- Drop and recreate the scan_type check constraint to include garment scan types.
-- This is additive intent: old values remain valid, new garment values are allowed.
ALTER TABLE public.scan_sessions
    DROP CONSTRAINT IF EXISTS scan_sessions_scan_type_check;

ALTER TABLE public.scan_sessions
    ADD CONSTRAINT scan_sessions_scan_type_check
    CHECK (
        scan_type IN (
            'vendor_card', 'vendor_signage', 'vendor_brochure', 'vendor_catalog',
            'product_tag', 'stock_sheet', 'fabric_card', 'multi_variant_sheet',
            'garment_flat', 'garment_hanging', 'garment_worn', 'garment_label'
        )
    );

CREATE INDEX IF NOT EXISTS idx_scan_sessions_item_id ON public.scan_sessions(item_id);

-- ============================================================
-- RPC: commit_catalogue_item
-- Atomic insert of catalogue_items + scan_sessions finalisation,
-- mirroring commit_fabric_style. Derives schema_type/schema_version
-- from the scan session's extraction run columns, not from the client.
-- ============================================================
CREATE OR REPLACE FUNCTION public.commit_catalogue_item(
    p_event_id UUID,
    p_vendor_id UUID,
    p_scan_session_id UUID,
    p_item_code TEXT,
    p_name TEXT,
    p_extracted_fields JSONB,
    p_reviewed_payload JSONB,
    p_created_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_schema_type TEXT;
    v_schema_version INTEGER;
    v_item_id UUID;
    v_existing_item_id UUID;
    v_scan_vendor_id UUID;
BEGIN
    -- Lock scan session and read schema provenance + vendor match
    SELECT vendor_id, schema_type, schema_version
    INTO v_scan_vendor_id, v_schema_type, v_schema_version
    FROM public.scan_sessions
    WHERE id = p_scan_session_id
    FOR UPDATE;

    IF v_scan_vendor_id IS NULL THEN
        RAISE EXCEPTION 'Scan session not found';
    END IF;

    IF v_scan_vendor_id <> p_vendor_id THEN
        RAISE EXCEPTION 'vendor_id does not match scan session';
    END IF;

    IF v_schema_type IS NULL OR v_schema_version IS NULL THEN
        RAISE EXCEPTION 'Scan session missing schema provenance; run extraction first';
    END IF;

    -- Idempotency / duplicate guard
    SELECT id INTO v_existing_item_id
    FROM public.catalogue_items
    WHERE vendor_id = p_vendor_id AND item_code = p_item_code;

    IF v_existing_item_id IS NOT NULL THEN
        RAISE EXCEPTION 'Duplicate item_code: %', p_item_code;
    END IF;

    -- Insert catalogue item
    INSERT INTO public.catalogue_items (
        event_id,
        vendor_id,
        schema_type,
        schema_version,
        item_code,
        name,
        extracted_fields,
        status,
        created_by,
        updated_by
    ) VALUES (
        p_event_id,
        p_vendor_id,
        v_schema_type,
        v_schema_version,
        p_item_code,
        p_name,
        p_extracted_fields,
        'active',
        p_created_by,
        p_created_by
    )
    RETURNING id INTO v_item_id;

    -- Finalize scan session
    UPDATE public.scan_sessions
    SET reviewed_payload = p_reviewed_payload,
        reviewed_by = p_created_by,
        reviewed_at = now(),
        item_id = v_item_id
    WHERE id = p_scan_session_id;

    RETURN jsonb_build_object('item_id', v_item_id, 'schema_type', v_schema_type, 'schema_version', v_schema_version);
END;
$$;
