/**
 * Shared catalogue fixtures for provider golden tests.
 *
 * Inline schemas mirroring the seeds in migration 083 (fabric v1 / vendor
 * v1), the Gemini golden normalised payloads from FR-MOD-01, and helpers to
 * normalise recorded fixtures against them. Shared by the Gemini, Muse Spark
 * and Muse Spark Open golden tests so every provider proves parity against
 * the same shapes.
 */

import type { CatalogueSchema, SchemaField } from '../../_shared/catalogueSchemaRegistry.ts'
import { normaliseModelOutput } from '../../_shared/providers/extractionNormaliser.ts'

export const fabricSchema: CatalogueSchema = {
  slug: 'fabric',
  kind: 'catalogue_type',
  display_name: 'Fabric',
  version: 1,
  schema: {
    translate_to_english: true,
    rules: [
      'All numeric fields should be numbers, not strings.',
      'If information is not visible, use null.',
      'For variants, extract all color/size/wash variations visible and translate to English.',
      'For prices, extract currency, amount, and unit clearly.',
      'Weight and width should be numeric values in both metric and imperial if shown.',
      'Item code is the most important field — extract it carefully.',
      'Return ONLY valid JSON, no markdown formatting.',
      'TRANSLATE ALL CHINESE TEXT TO ENGLISH before including in the JSON response.',
    ],
    scan_types: {
      product_tag: 'This is a product tag. Extract style code, name, composition, and any variant/color information.',
      stock_sheet: 'This is a stock sheet. Focus on item codes, variants, quantities, and inventory information.',
      fabric_card: 'This is a fabric card or swatch card. Extract all specifications including composition, weight, width, and construction.',
      multi_variant_sheet: 'This shows multiple variants. Extract the main style info and all variants with their specific attributes.',
    },
    output_root: 'style',
    fields: [
      { path: 'style.item_code', type: 'string', label: 'Item code', hint: 'style/product code', required: false },
      { path: 'style.name', type: 'string', label: 'Name', hint: 'style name', required: false },
      { path: 'style.composition', type: 'string', label: 'Composition', hint: 'fiber content, e.g., "100% Cotton", "80% Cotton 20% Polyester"', required: false },
      { path: 'style.category', type: 'string', label: 'Category', hint: 'product category', required: false },
      { path: 'style.construction', type: 'string', label: 'Construction', hint: 'weave/knit type, e.g., "Plain Weave", "Jersey Knit"', required: false },
      { path: 'style.finish', type: 'string', label: 'Finish', hint: 'surface finish', required: false },
      { path: 'style.pattern', type: 'string', label: 'Pattern', hint: 'pattern type, e.g., "Solid", "Stripe", "Floral"', required: false },
      { path: 'style.width_cm', type: 'number', label: 'Width (cm)', hint: 'width in centimeters', required: false },
      { path: 'style.width_in', type: 'number', label: 'Width (in)', hint: 'width in inches', required: false },
      { path: 'style.weight_gsm', type: 'number', label: 'Weight (gsm)', hint: 'weight in grams per square meter', required: false },
      { path: 'style.weight_ozsy', type: 'number', label: 'Weight (oz/sq yd)', hint: 'weight in ounces per square yard', required: false },
      { path: 'style.season', type: 'string', label: 'Season', hint: 'season code like SS25, FW25', required: false },
      { path: 'style.metadata', type: 'object', label: 'Metadata', hint: 'any additional info as object', required: false },
      {
        path: 'style.variants',
        type: 'array',
        label: 'Variants',
        hint: 'color/size/wash variations visible',
        required: false,
        items: {
          type: 'group',
          fields: [
            { path: 'color_code', type: 'string', label: 'Color code', hint: 'color code', required: false },
            { path: 'color_name', type: 'string', label: 'Color name', hint: 'color name', required: false },
            { path: 'variant_name', type: 'string', label: 'Variant name', hint: 'custom variant description', required: false },
            { path: 'wash_code', type: 'string', label: 'Wash code', hint: 'wash code for denim', required: false },
            { path: 'finish_override', type: 'string', label: 'Finish override', hint: 'variant-specific finish', required: false },
            { path: 'quantity', type: 'number', label: 'Quantity', hint: 'observed stock quantity', required: false },
            { path: 'unit', type: 'string', label: 'Unit', hint: 'unit like meters, yards, pieces', required: false },
            { path: 'batch_no', type: 'string', label: 'Batch number', hint: 'batch/lot number', required: false },
            { path: 'metadata', type: 'object', label: 'Metadata', hint: 'any additional info as object', required: false },
            {
              path: 'price',
              type: 'group',
              label: 'Price',
              required: false,
              fields: [
                { path: 'currency', type: 'string', label: 'Currency', hint: 'e.g., USD, EUR', required: false },
                { path: 'price', type: 'number', label: 'Price', hint: 'price value', required: false },
                { path: 'price_unit', type: 'string', label: 'Price unit', hint: 'price unit like meter, yard', required: false },
                { path: 'minimum_order_quantity', type: 'number', label: 'Minimum order quantity', hint: 'minimum order quantity', required: false },
                { path: 'minimum_order_unit', type: 'string', label: 'Minimum order unit', hint: 'minimum order unit', required: false },
                { path: 'lead_time_value', type: 'number', label: 'Lead time value', hint: 'lead time value', required: false },
                { path: 'lead_time_unit', type: 'string', label: 'Lead time unit', hint: 'e.g., days, weeks', required: false },
                { path: 'notes', type: 'string', label: 'Notes', hint: 'any other relevant information', required: false },
              ],
            },
          ],
        },
      },
    ],
  },
}

export const vendorSchema: CatalogueSchema = {
  slug: 'vendor',
  kind: 'document',
  display_name: 'Vendor',
  version: 1,
  schema: {
    translate_to_english: true,
    rules: [
      'company_name is REQUIRED and must never be null.',
      'If information is not visible in the image, use null.',
      'For brand_names, extract all brand/textile brand logos visible and translate to English.',
      'Phone numbers should include the country code if visible (e.g., +86 for China).',
      'Websites should start with https:// if implied.',
      'Return ONLY valid JSON, no markdown formatting.',
      'TRANSLATE ALL CHINESE TEXT TO ENGLISH before including in the JSON response.',
    ],
    scan_types: {
      vendor_card: 'This is a business card. Extract company name, contact details, and any brand information.',
      vendor_signage: 'This is booth signage. Focus on company name, booth number, and brand names.',
      vendor_brochure: 'This is a brochure. Extract all company, contact, and product information visible.',
      vendor_catalog: 'This is a catalog cover. Extract company name, brands, and any contact information.',
    },
    output_root: 'document',
    fields: [
      { path: 'document.company_name', type: 'string', label: 'Company name', hint: 'the main company name', required: true },
      { path: 'document.booth_number', type: 'string', label: 'Booth number', hint: 'booth/stand number if visible', required: false },
      { path: 'document.contact_person', type: 'string', label: 'Contact person', hint: 'name of contact person', required: false },
      { path: 'document.email', type: 'string', label: 'Email', hint: 'email address', required: false },
      { path: 'document.phone', type: 'string', label: 'Phone', hint: 'phone number with country code if available', required: false },
      { path: 'document.whatsapp', type: 'string', label: 'WhatsApp', hint: 'WhatsApp number if shown separately', required: false },
      { path: 'document.website_url', type: 'string', label: 'Website URL', hint: 'website URL (should start with https:// if implied)', required: false },
      { path: 'document.address', type: 'string', label: 'Address', hint: 'physical address', required: false },
      { path: 'document.country_of_origin', type: 'string', label: 'Country of origin', hint: 'country where the vendor is based', required: false },
      {
        path: 'document.brand_names',
        type: 'array',
        label: 'Brand names',
        hint: 'array of brand names shown',
        required: false,
        // Scalar array item descriptor exactly as seeded in migration 083;
        // the registry's SchemaField type does not model this variant yet.
        items: { type: 'string' } as unknown as SchemaField,
      },
      { path: 'document.notes', type: 'string', label: 'Notes', hint: 'any other relevant information', required: false },
    ],
  },
}

// ============================================================================
// EXPECTED NORMALISED OUTPUT — the Gemini golden shape (FR-MOD-01). The
// Muse Spark fixtures must normalise to exactly this payload.
// ============================================================================

export const expectedFabricJson = {
  style: {
    item_code: 'TF-2401',
    name: 'Cotton Twill 2401',
    composition: '98% Cotton 2% Elastane',
    category: 'Denim',
    construction: 'Twill Weave 3/1',
    finish: 'Enzyme Washed',
    pattern: 'Solid',
    width_cm: 150,
    width_in: null,
    weight_gsm: 245.5,
    weight_ozsy: null,
    season: 'SS26',
    metadata: { mill: 'Ningbo Textile Mill', lot: 'A-12' },
    variants: [
      {
        color_code: 'IND-42',
        color_name: 'Indigo 42',
        variant_name: null,
        wash_code: 'STF',
        finish_override: null,
        quantity: 3000,
        unit: 'meters',
        batch_no: 'B-2026-04',
        metadata: null,
        price: {
          currency: 'USD',
          price: 4.85,
          price_unit: 'meter',
          minimum_order_quantity: 1000,
          minimum_order_unit: 'meters',
          lead_time_value: 21,
          lead_time_unit: 'days',
          notes: 'FOB Ningbo',
        },
      },
      {
        color_code: null,
        color_name: 'Raw',
        variant_name: null,
        wash_code: null,
        finish_override: null,
        quantity: 1500,
        unit: null,
        batch_no: null,
        metadata: null,
        price: null,
      },
    ],
  },
}

export const expectedVendorJson = {
  document: {
    company_name: 'Hangzhou Sunrise Fabrics Co., Ltd.',
    booth_number: '3.1 E71',
    contact_person: 'Li Wei',
    email: 'sales@sunrisefabrics.example.com',
    phone: '+86 571 8899 1234',
    whatsapp: null,
    website_url: 'https://sunrisefabrics.example.com',
    address: 'No. 88 Yanjiang Road, Hangzhou, Zhejiang, China',
    country_of_origin: 'China',
    brand_names: ['SunRise', 'EastLoom'],
    notes: 'Specialises in linen and ramie blends',
  },
}

/** Normalise a Gemini fixture's raw text against a schema. */
export function geminiNormalised(fixture: { candidates: Array<{ content: { parts: Array<{ text: string }> } }> }, schema: CatalogueSchema): Record<string, unknown> {
  return normaliseModelOutput(JSON.parse(fixture.candidates[0].content.parts[0].text), schema)
}

/** Parse a muse-spark fixture's raw text against a schema. */
export function chatCompletionsNormalised(fixture: { choices: Array<{ message: { content: string } }> }, schema: CatalogueSchema): Record<string, unknown> {
  return normaliseModelOutput(JSON.parse(fixture.choices[0].message.content), schema)
}
