-- Migration 083: Catalogue type schema registry
-- Stores versioned schemas for catalogue types (fabric, garment) and document
-- types (vendor). Edge functions, the client and Modal all read from this table.
-- STAGING ONLY: deploy with supabase db push --project-ref <project-ref>

-- ============================================================
-- TABLE: catalogue_types
-- ============================================================
CREATE TABLE IF NOT EXISTS public.catalogue_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL,
    kind            TEXT NOT NULL
                        CHECK (kind IN ('catalogue_type', 'document')),
    display_name    TEXT NOT NULL,
    version         INTEGER NOT NULL,
    schema          JSONB NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (slug, version)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_catalogue_types_slug_version
    ON public.catalogue_types(slug, version);

CREATE INDEX IF NOT EXISTS idx_catalogue_types_kind_active
    ON public.catalogue_types(kind, is_active);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.catalogue_types ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active schemas.
-- Writes are intentionally omitted; schemas are seeded by migrations and managed
-- server-side so that adding a category never requires client code changes.
CREATE POLICY "Authenticated users can read catalogue types"
    ON public.catalogue_types FOR SELECT
    TO authenticated
    USING (is_active = true);

-- ============================================================
-- SEED: fabric v1
-- Faithful transcription of extract-fabric-document/index.ts
-- ============================================================
INSERT INTO public.catalogue_types (slug, kind, display_name, version, schema)
VALUES (
    'fabric',
    'catalogue_type',
    'Fabric',
    1,
    jsonb_build_object(
        'translate_to_english', true,
        'rules', jsonb_build_array(
            'All numeric fields should be numbers, not strings.',
            'If information is not visible, use null.',
            'For variants, extract all color/size/wash variations visible and translate to English.',
            'For prices, extract currency, amount, and unit clearly.',
            'Weight and width should be numeric values in both metric and imperial if shown.',
            'Item code is the most important field — extract it carefully.',
            'Return ONLY valid JSON, no markdown formatting.',
            'TRANSLATE ALL CHINESE TEXT TO ENGLISH before including in the JSON response.'
        ),
        'scan_types', jsonb_build_object(
            'product_tag', 'This is a product tag. Extract style code, name, composition, and any variant/color information.',
            'stock_sheet', 'This is a stock sheet. Focus on item codes, variants, quantities, and inventory information.',
            'fabric_card', 'This is a fabric card or swatch card. Extract all specifications including composition, weight, width, and construction.',
            'multi_variant_sheet', 'This shows multiple variants. Extract the main style info and all variants with their specific attributes.'
        ),
        'output_root', 'style',
        'fields', jsonb_build_array(
            jsonb_build_object(
                'path', 'style.item_code',
                'type', 'string',
                'label', 'Item code',
                'hint', 'style/product code',
                'required', false
            ),
            jsonb_build_object(
                'path', 'style.name',
                'type', 'string',
                'label', 'Name',
                'hint', 'style name',
                'required', false
            ),
            jsonb_build_object(
                'path', 'style.composition',
                'type', 'string',
                'label', 'Composition',
                'hint', 'fiber content, e.g., "100% Cotton", "80% Cotton 20% Polyester"',
                'required', false
            ),
            jsonb_build_object(
                'path', 'style.category',
                'type', 'string',
                'label', 'Category',
                'hint', 'product category',
                'required', false
            ),
            jsonb_build_object(
                'path', 'style.construction',
                'type', 'string',
                'label', 'Construction',
                'hint', 'weave/knit type, e.g., "Plain Weave", "Jersey Knit"',
                'required', false
            ),
            jsonb_build_object(
                'path', 'style.finish',
                'type', 'string',
                'label', 'Finish',
                'hint', 'surface finish',
                'required', false
            ),
            jsonb_build_object(
                'path', 'style.pattern',
                'type', 'string',
                'label', 'Pattern',
                'hint', 'pattern type, e.g., "Solid", "Stripe", "Floral"',
                'required', false
            ),
            jsonb_build_object(
                'path', 'style.width_cm',
                'type', 'number',
                'label', 'Width (cm)',
                'hint', 'width in centimeters',
                'required', false
            ),
            jsonb_build_object(
                'path', 'style.width_in',
                'type', 'number',
                'label', 'Width (in)',
                'hint', 'width in inches',
                'required', false
            ),
            jsonb_build_object(
                'path', 'style.weight_gsm',
                'type', 'number',
                'label', 'Weight (gsm)',
                'hint', 'weight in grams per square meter',
                'required', false
            ),
            jsonb_build_object(
                'path', 'style.weight_ozsy',
                'type', 'number',
                'label', 'Weight (oz/sq yd)',
                'hint', 'weight in ounces per square yard',
                'required', false
            ),
            jsonb_build_object(
                'path', 'style.season',
                'type', 'string',
                'label', 'Season',
                'hint', 'season code like SS25, FW25',
                'required', false
            ),
            jsonb_build_object(
                'path', 'style.metadata',
                'type', 'object',
                'label', 'Metadata',
                'hint', 'any additional info as object',
                'required', false
            ),
            jsonb_build_object(
                'path', 'style.variants',
                'type', 'array',
                'label', 'Variants',
                'hint', 'color/size/wash variations visible',
                'required', false,
                'items', jsonb_build_object(
                    'type', 'group',
                    'fields', jsonb_build_array(
                        jsonb_build_object('path', 'color_code', 'type', 'string', 'label', 'Color code', 'hint', 'color code', 'required', false),
                        jsonb_build_object('path', 'color_name', 'type', 'string', 'label', 'Color name', 'hint', 'color name', 'required', false),
                        jsonb_build_object('path', 'variant_name', 'type', 'string', 'label', 'Variant name', 'hint', 'custom variant description', 'required', false),
                        jsonb_build_object('path', 'wash_code', 'type', 'string', 'label', 'Wash code', 'hint', 'wash code for denim', 'required', false),
                        jsonb_build_object('path', 'finish_override', 'type', 'string', 'label', 'Finish override', 'hint', 'variant-specific finish', 'required', false),
                        jsonb_build_object('path', 'quantity', 'type', 'number', 'label', 'Quantity', 'hint', 'observed stock quantity', 'required', false),
                        jsonb_build_object('path', 'unit', 'type', 'string', 'label', 'Unit', 'hint', 'unit like meters, yards, pieces', 'required', false),
                        jsonb_build_object('path', 'batch_no', 'type', 'string', 'label', 'Batch number', 'hint', 'batch/lot number', 'required', false),
                        jsonb_build_object('path', 'metadata', 'type', 'object', 'label', 'Metadata', 'hint', 'any additional info as object', 'required', false),
                        jsonb_build_object(
                            'path', 'price',
                            'type', 'group',
                            'label', 'Price',
                            'required', false,
                            'fields', jsonb_build_array(
                                jsonb_build_object('path', 'currency', 'type', 'string', 'label', 'Currency', 'hint', 'e.g., USD, EUR', 'required', false),
                                jsonb_build_object('path', 'price', 'type', 'number', 'label', 'Price', 'hint', 'price value', 'required', false),
                                jsonb_build_object('path', 'price_unit', 'type', 'string', 'label', 'Price unit', 'hint', 'price unit like meter, yard', 'required', false),
                                jsonb_build_object('path', 'minimum_order_quantity', 'type', 'number', 'label', 'Minimum order quantity', 'hint', 'minimum order quantity', 'required', false),
                                jsonb_build_object('path', 'minimum_order_unit', 'type', 'string', 'label', 'Minimum order unit', 'hint', 'minimum order unit', 'required', false),
                                jsonb_build_object('path', 'lead_time_value', 'type', 'number', 'label', 'Lead time value', 'hint', 'lead time value', 'required', false),
                                jsonb_build_object('path', 'lead_time_unit', 'type', 'string', 'label', 'Lead time unit', 'hint', 'e.g., days, weeks', 'required', false),
                                jsonb_build_object('path', 'notes', 'type', 'string', 'label', 'Notes', 'hint', 'any other relevant information', 'required', false)
                            )
                        )
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
-- SEED: vendor v1
-- Faithful transcription of extract-vendor-document/index.ts
-- ============================================================
INSERT INTO public.catalogue_types (slug, kind, display_name, version, schema)
VALUES (
    'vendor',
    'document',
    'Vendor',
    1,
    jsonb_build_object(
        'translate_to_english', true,
        'rules', jsonb_build_array(
            'company_name is REQUIRED and must never be null.',
            'If information is not visible in the image, use null.',
            'For brand_names, extract all brand/textile brand logos visible and translate to English.',
            'Phone numbers should include the country code if visible (e.g., +86 for China).',
            'Websites should start with https:// if implied.',
            'Return ONLY valid JSON, no markdown formatting.',
            'TRANSLATE ALL CHINESE TEXT TO ENGLISH before including in the JSON response.'
        ),
        'scan_types', jsonb_build_object(
            'vendor_card', 'This is a business card. Extract company name, contact details, and any brand information.',
            'vendor_signage', 'This is booth signage. Focus on company name, booth number, and brand names.',
            'vendor_brochure', 'This is a brochure. Extract all company, contact, and product information visible.',
            'vendor_catalog', 'This is a catalog cover. Extract company name, brands, and any contact information.'
        ),
        'output_root', 'document',
        'fields', jsonb_build_array(
            jsonb_build_object(
                'path', 'document.company_name',
                'type', 'string',
                'label', 'Company name',
                'hint', 'the main company name',
                'required', true
            ),
            jsonb_build_object(
                'path', 'document.booth_number',
                'type', 'string',
                'label', 'Booth number',
                'hint', 'booth/stand number if visible',
                'required', false
            ),
            jsonb_build_object(
                'path', 'document.contact_person',
                'type', 'string',
                'label', 'Contact person',
                'hint', 'name of contact person',
                'required', false
            ),
            jsonb_build_object(
                'path', 'document.email',
                'type', 'string',
                'label', 'Email',
                'hint', 'email address',
                'required', false
            ),
            jsonb_build_object(
                'path', 'document.phone',
                'type', 'string',
                'label', 'Phone',
                'hint', 'phone number with country code if available',
                'required', false
            ),
            jsonb_build_object(
                'path', 'document.whatsapp',
                'type', 'string',
                'label', 'WhatsApp',
                'hint', 'WhatsApp number if shown separately',
                'required', false
            ),
            jsonb_build_object(
                'path', 'document.website_url',
                'type', 'string',
                'label', 'Website URL',
                'hint', 'website URL (should start with https:// if implied)',
                'required', false
            ),
            jsonb_build_object(
                'path', 'document.address',
                'type', 'string',
                'label', 'Address',
                'hint', 'physical address',
                'required', false
            ),
            jsonb_build_object(
                'path', 'document.country_of_origin',
                'type', 'string',
                'label', 'Country of origin',
                'hint', 'country where the vendor is based',
                'required', false
            ),
            jsonb_build_object(
                'path', 'document.brand_names',
                'type', 'array',
                'label', 'Brand names',
                'hint', 'array of brand names shown',
                'required', false,
                'items', jsonb_build_object(
                    'type', 'string'
                )
            ),
            jsonb_build_object(
                'path', 'document.notes',
                'type', 'string',
                'label', 'Notes',
                'hint', 'any other relevant information',
                'required', false
            )
        )
    )
)
ON CONFLICT (slug, version) DO UPDATE
SET schema = EXCLUDED.schema,
    display_name = EXCLUDED.display_name,
    kind = EXCLUDED.kind,
    is_active = true;
