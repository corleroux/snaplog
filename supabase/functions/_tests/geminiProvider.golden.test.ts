/**
 * Gemini provider golden tests (FR-MOD-01).
 *
 * Proves the schema-driven Gemini provider reproduces the behaviour of the
 * pre-registry extractors (extract-fabric-document / extract-vendor-document
 * at FR-SCH-01):
 * - normalisation parity: the recorded raw Gemini responses in
 *   ./fixtures/gemini/ normalise to exactly the payloads the legacy
 *   per-field normalisers produced (trim / number / null — never defaults);
 * - prompt parity: the built prompts keep the exact scan-type guidance,
 *   translation block, rules and JSON skeleton shape (generation config is
 *   asserted against the legacy values temperature 0.1, maxOutputTokens
 *   4096, responseMimeType application/json);
 * - run metadata: provider/model/usage/latency are reported per extraction.
 *
 * The fixtures mirror the shape of recorded generateContent responses (they
 * are crafted offline — no live model API is ever called; fetch is stubbed
 * for the full-pipeline tests). Run with: pnpm test:edge (or
 * deno test --allow-net --allow-env --no-check this file).
 */

import { assertEquals, assertRejects } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import type { CatalogueSchema, SchemaField } from '../_shared/catalogueSchemaRegistry.ts'
import {
  buildRequestBody,
  geminiProvider,
  parseGeminiResponse,
} from '../_shared/providers/geminiProvider.ts'
import { buildPrompt } from '../_shared/providers/extractionPrompt.ts'
import { normaliseModelOutput } from '../_shared/providers/extractionNormaliser.ts'
import fabricProductTagFixture from './fixtures/gemini/fabric-product-tag.json' with { type: 'json' }
import vendorCardFixture from './fixtures/gemini/vendor-card.json' with { type: 'json' }

// ============================================================================
// INLINE SCHEMAS — mirror the seeds in migration 083 (fabric v1 / vendor v1)
// ============================================================================

const fabricSchema: CatalogueSchema = {
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

const vendorSchema: CatalogueSchema = {
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
// EXPECTED NORMALISED OUTPUT — what the legacy per-field normalisers
// produced for the same raw model output (trim / number / null, all keys
// present, no defaults)
// ============================================================================

const expectedFabricJson = {
  style: {
    item_code: 'TF-2401',
    name: 'Cotton Twill 2401',
    composition: '98% Cotton 2% Elastane',
    category: 'Denim',
    construction: 'Twill Weave 3/1',
    finish: 'Enzyme Washed',
    pattern: 'Solid',
    width_cm: 150,
    width_in: null, // "59" is a string — never coerced to a number
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
        finish_override: null, // "" is empty — flagged as missing, not guessed
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
        // Missing keys normalise to explicit nulls, like the legacy normaliser.
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

const expectedVendorJson = {
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
    brand_names: ['SunRise', 'EastLoom'], // trimmed, empties dropped
    notes: 'Specialises in linen and ramie blends',
  },
}

// ============================================================================
// GOLDEN NORMALISATION — fixture in, legacy normalised output out
// ============================================================================

Deno.test('geminiProvider: fabric fixture parses and normalises to the legacy payload', () => {
  const { rawText, usage } = parseGeminiResponse(fabricProductTagFixture)
  assertEquals(usage, { inputTokens: 1487, outputTokens: 296 })
  assertEquals(rawText, fabricProductTagFixture.candidates[0].content.parts[0].text)

  const json = normaliseModelOutput(JSON.parse(rawText), fabricSchema)
  assertEquals(json, expectedFabricJson)
})

Deno.test('geminiProvider: vendor fixture parses and normalises to the legacy payload', () => {
  const { rawText, usage } = parseGeminiResponse(vendorCardFixture)
  assertEquals(usage, { inputTokens: 964, outputTokens: 138 })

  const json = normaliseModelOutput(JSON.parse(rawText), vendorSchema)
  assertEquals(json, expectedVendorJson)
})

Deno.test('geminiProvider: legacy flat vendor model output normalises identically', () => {
  // The pre-registry vendor prompt asked for a flat object; the provider
  // still accepts that shape (output_root absent → flat container).
  const nested = JSON.parse(vendorCardFixture.candidates[0].content.parts[0].text)
  const flatLegacyOutput = nested.document

  assertEquals(normaliseModelOutput(flatLegacyOutput, vendorSchema), expectedVendorJson)
})

Deno.test('geminiProvider: missing output root yields explicit nulls, never defaults', () => {
  const json = normaliseModelOutput({}, fabricSchema)
  const style = json.style as Record<string, unknown>
  assertEquals(style.item_code, null)
  assertEquals(style.name, null)
  assertEquals(style.width_cm, null)
  assertEquals(style.metadata, null)
  assertEquals(style.variants, null)
})

Deno.test('geminiProvider: required string missing normalises to empty string (legacy behaviour)', () => {
  const json = normaliseModelOutput({ document: { booth_number: 'B-42' } }, vendorSchema)
  const document = json.document as Record<string, unknown>
  assertEquals(document.company_name, '')
  assertEquals(document.booth_number, 'B-42')
})

Deno.test('geminiProvider: non-object metadata normalises to null instead of passing through', () => {
  const json = normaliseModelOutput(
    { style: { item_code: 'X-1', metadata: 'not an object' } },
    fabricSchema
  )
  assertEquals((json.style as Record<string, unknown>).metadata, null)
})

Deno.test('geminiProvider: non-object model output normalises to all nulls', () => {
  const json = normaliseModelOutput(JSON.parse('"just a string"'), fabricSchema)
  assertEquals((json.style as Record<string, unknown>).item_code, null)
})

// ============================================================================
// PROMPT PARITY
// ============================================================================

const EXPECTED_FABRIC_PRODUCT_TAG_PROMPT = `You are a textile trade fair fabric data extraction assistant.

This is a product tag. Extract style code, name, composition, and any variant/color information.

Extract the following information from this image and return ONLY a JSON object with this exact structure:

{
  "style": {
    "item_code": "string or null (style/product code)",
    "name": "string or null (style name)",
    "composition": "string or null (fiber content, e.g., "100% Cotton", "80% Cotton 20% Polyester")",
    "category": "string or null (product category)",
    "construction": "string or null (weave/knit type, e.g., "Plain Weave", "Jersey Knit")",
    "finish": "string or null (surface finish)",
    "pattern": "string or null (pattern type, e.g., "Solid", "Stripe", "Floral")",
    "width_cm": "number or null (width in centimeters)",
    "width_in": "number or null (width in inches)",
    "weight_gsm": "number or null (weight in grams per square meter)",
    "weight_ozsy": "number or null (weight in ounces per square yard)",
    "season": "string or null (season code like SS25, FW25)",
    "metadata": {} or null (any additional info as object),
    "variants": [
      {
        "color_code": "string or null (color code)",
        "color_name": "string or null (color name)",
        "variant_name": "string or null (custom variant description)",
        "wash_code": "string or null (wash code for denim)",
        "finish_override": "string or null (variant-specific finish)",
        "quantity": "number or null (observed stock quantity)",
        "unit": "string or null (unit like meters, yards, pieces)",
        "batch_no": "string or null (batch/lot number)",
        "metadata": {} or null (any additional info as object),
        "price": {
          "currency": "string or null (e.g., USD, EUR)",
          "price": "number or null (price value)",
          "price_unit": "string or null (price unit like meter, yard)",
          "minimum_order_quantity": "number or null (minimum order quantity)",
          "minimum_order_unit": "string or null (minimum order unit)",
          "lead_time_value": "number or null (lead time value)",
          "lead_time_unit": "string or null (e.g., days, weeks)",
          "notes": "string or null (any other relevant information)"
        }
      }
    ] or null
  }
}

IMPORTANT TRANSLATION REQUIREMENT:
- If the image contains Chinese text, you MUST translate ALL extracted information to English
- Return ONLY English translated text in the JSON response
- Disregard the original Chinese characters - do not include them in your response
- All field values must be in English, even if the source text is in Chinese

Rules:
- All numeric fields should be numbers, not strings.
- If information is not visible, use null.
- For variants, extract all color/size/wash variations visible and translate to English.
- For prices, extract currency, amount, and unit clearly.
- Weight and width should be numeric values in both metric and imperial if shown.
- Item code is the most important field — extract it carefully.
- Return ONLY valid JSON, no markdown formatting.
- TRANSLATE ALL CHINESE TEXT TO ENGLISH before including in the JSON response.`

const EXPECTED_VENDOR_CARD_PROMPT = `You are a textile trade fair vendor data extraction assistant.

This is a business card. Extract company name, contact details, and any brand information.

Extract the following information from this image and return ONLY a JSON object with this exact structure:

{
  "document": {
    "company_name": "string (required - the main company name)",
    "booth_number": "string or null (booth/stand number if visible)",
    "contact_person": "string or null (name of contact person)",
    "email": "string or null (email address)",
    "phone": "string or null (phone number with country code if available)",
    "whatsapp": "string or null (WhatsApp number if shown separately)",
    "website_url": "string or null (website URL (should start with https:// if implied))",
    "address": "string or null (physical address)",
    "country_of_origin": "string or null (country where the vendor is based)",
    "brand_names": ["array of brand names shown"] or null,
    "notes": "string or null (any other relevant information)"
  }
}

IMPORTANT TRANSLATION REQUIREMENT:
- If the image contains Chinese text, you MUST translate ALL extracted information to English
- Return ONLY English translated text in the JSON response
- Disregard the original Chinese characters - do not include them in your response
- All field values must be in English, even if the source text is in Chinese

Rules:
- company_name is REQUIRED and must never be null.
- If information is not visible in the image, use null.
- For brand_names, extract all brand/textile brand logos visible and translate to English.
- Phone numbers should include the country code if visible (e.g., +86 for China).
- Websites should start with https:// if implied.
- Return ONLY valid JSON, no markdown formatting.
- TRANSLATE ALL CHINESE TEXT TO ENGLISH before including in the JSON response.`

Deno.test('geminiProvider: fabric product_tag prompt matches the schema-built golden prompt', () => {
  assertEquals(buildPrompt(fabricSchema, 'product_tag'), EXPECTED_FABRIC_PRODUCT_TAG_PROMPT)
})

Deno.test('geminiProvider: vendor vendor_card prompt matches the schema-built golden prompt', () => {
  assertEquals(buildPrompt(vendorSchema, 'vendor_card'), EXPECTED_VENDOR_CARD_PROMPT)
})

// Exact strings from the pre-registry hardcoded prompts that must survive
// the move to the schema registry (migration 083 transcribed them verbatim).
const LEGACY_SCAN_TYPE_GUIDANCE = [
  'This is a product tag. Extract style code, name, composition, and any variant/color information.',
  'This is a stock sheet. Focus on item codes, variants, quantities, and inventory information.',
  'This is a fabric card or swatch card. Extract all specifications including composition, weight, width, and construction.',
  'This shows multiple variants. Extract the main style info and all variants with their specific attributes.',
  'This is a business card. Extract company name, contact details, and any brand information.',
  'This is booth signage. Focus on company name, booth number, and brand names.',
  'This is a brochure. Extract all company, contact, and product information visible.',
  'This is a catalog cover. Extract company name, brands, and any contact information.',
]

Deno.test('geminiProvider: every scan-type guidance line is byte-exact vs the legacy prompts', () => {
  const fabricGuidance = Object.values(fabricSchema.schema.scan_types ?? {})
  const vendorGuidance = Object.values(vendorSchema.schema.scan_types ?? {})

  for (const guidance of [...fabricGuidance, ...vendorGuidance]) {
    assertEquals(LEGACY_SCAN_TYPE_GUIDANCE.includes(guidance), true)
  }
  assertEquals(LEGACY_SCAN_TYPE_GUIDANCE.length, fabricGuidance.length + vendorGuidance.length)
})

Deno.test('geminiProvider: prompt keeps legacy descriptor lines byte-exact', () => {
  const fabricPrompt = buildPrompt(fabricSchema, 'product_tag')
  for (const line of [
    '"item_code": "string or null (style/product code)"',
    '"metadata": {} or null (any additional info as object),',
    '"variants": [',
    '] or null',
  ]) {
    assertEquals(fabricPrompt.includes(line), true)
  }

  const vendorPrompt = buildPrompt(vendorSchema, 'vendor_card')
  for (const line of [
    '"company_name": "string (required - the main company name)"',
    '"brand_names": ["array of brand names shown"] or null,',
    '"notes": "string or null (any other relevant information)"',
  ]) {
    assertEquals(vendorPrompt.includes(line), true)
  }
})

Deno.test('geminiProvider: unknown scan type renders an empty guidance line (legacy fallback)', () => {
  const prompt = buildPrompt(fabricSchema, 'not_a_scan_type')
  assertEquals(prompt.split('\n')[2], '')
  assertEquals(prompt.includes('This is a product tag'), false)
})

// ============================================================================
// REQUEST PARITY — legacy generation config and part ordering
// ============================================================================

Deno.test('geminiProvider: request body keeps the legacy generation config and parts', () => {
  const body = buildRequestBody('PROMPT TEXT', [
    { base64: 'QUJD', mimeType: 'image/jpeg' },
    { base64: 'REVG', mimeType: 'image/png' },
  ]) as {
    contents: Array<{ parts: Array<Record<string, unknown>> }>
    generationConfig: Record<string, unknown>
  }

  assertEquals(body.generationConfig, {
    temperature: 0.1,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
  })
  assertEquals(body.contents.length, 1)
  assertEquals(body.contents[0].parts, [
    { text: 'PROMPT TEXT' },
    { inline_data: { mime_type: 'image/jpeg', data: 'QUJD' } },
    { inline_data: { mime_type: 'image/png', data: 'REVG' } },
  ])
})

// ============================================================================
// FULL PIPELINE (offline) — fetch stubbed, never a live model API
// ============================================================================

interface FetchCall {
  url: string
  body: Record<string, unknown>
}

/** Stub globalThis.fetch to serve a canned generateContent response. */
function stubFetch(respond: (call: FetchCall) => Response): FetchCall[] {
  const calls: FetchCall[] = []
  globalThis.fetch = ((_url: string | URL, init?: RequestInit): Promise<Response> => {
    const call: FetchCall = {
      url: String(_url),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    }
    calls.push(call)
    return Promise.resolve(respond(call))
  }) as typeof fetch
  return calls
}

function restoreEnv(saved: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) Deno.env.delete(key)
    else Deno.env.set(key, value)
  }
}

Deno.test('geminiProvider.extract: full offline run against the fabric fixture', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('GEMINI_API_KEY'),
    model: Deno.env.get('GEMINI_MODEL'),
  }
  Deno.env.set('GEMINI_API_KEY', 'test-key')
  Deno.env.delete('GEMINI_MODEL')
  const originalFetch = globalThis.fetch
  const calls = stubFetch(() =>
    new Response(JSON.stringify(fabricProductTagFixture), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  try {
    const result = await geminiProvider.extract({
      images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
      schema: fabricSchema,
      scanType: 'product_tag',
    })

    // Request parity: legacy URL and schema-built body.
    assertEquals(calls.length, 1)
    assertEquals(
      calls[0].url,
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=test-key'
    )
    assertEquals(
      calls[0].body,
      buildRequestBody(buildPrompt(fabricSchema, 'product_tag'), [
        { base64: 'QUJD', mimeType: 'image/jpeg' },
      ])
    )

    // Run metadata recorded per extraction (FR-MOD-01).
    assertEquals(result.provider, 'gemini')
    assertEquals(result.model, 'gemini-flash-lite-latest')
    assertEquals(result.usage, { inputTokens: 1487, outputTokens: 296 })
    assertEquals(result.confidences, null)
    assertEquals(typeof result.latencyMs, 'number')
    assertEquals(result.latencyMs >= 0, true)
    assertEquals(result.raw, fabricProductTagFixture.candidates[0].content.parts[0].text)
    assertEquals(result.json, expectedFabricJson)
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ GEMINI_API_KEY: savedEnv.apiKey, GEMINI_MODEL: savedEnv.model })
  }
})

Deno.test('geminiProvider.extract: reports the GEMINI_MODEL override as the model', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('GEMINI_API_KEY'),
    model: Deno.env.get('GEMINI_MODEL'),
  }
  Deno.env.set('GEMINI_API_KEY', 'test-key')
  Deno.env.set('GEMINI_MODEL', 'gemini-2.0-flash')
  const originalFetch = globalThis.fetch
  stubFetch(() =>
    new Response(JSON.stringify(vendorCardFixture), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  try {
    const result = await geminiProvider.extract({
      images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
      schema: vendorSchema,
      scanType: 'vendor_card',
    })
    assertEquals(result.model, 'gemini-2.0-flash')
    assertEquals(result.json, expectedVendorJson)
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ GEMINI_API_KEY: savedEnv.apiKey, GEMINI_MODEL: savedEnv.model })
  }
})

Deno.test('geminiProvider.extract: requires an image', async () => {
  await assertRejects(
    () => geminiProvider.extract({ images: [], schema: fabricSchema }),
    Error,
    'At least one image is required'
  )
})

Deno.test('geminiProvider.extract: throws the legacy error when GEMINI_API_KEY is missing', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('GEMINI_API_KEY'),
    model: Deno.env.get('GEMINI_MODEL'),
  }
  Deno.env.delete('GEMINI_API_KEY')
  const originalFetch = globalThis.fetch
  globalThis.fetch = (() => {
    throw new Error('network must never be called from tests')
  }) as typeof fetch

  try {
    await assertRejects(
      () =>
        geminiProvider.extract({
          images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
          schema: fabricSchema,
        }),
      Error,
      'GEMINI_API_KEY is not configured'
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ GEMINI_API_KEY: savedEnv.apiKey, GEMINI_MODEL: savedEnv.model })
  }
})

Deno.test('geminiProvider.extract: surfaces Gemini HTTP errors with the legacy message', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('GEMINI_API_KEY'),
    model: Deno.env.get('GEMINI_MODEL'),
  }
  Deno.env.set('GEMINI_API_KEY', 'test-key')
  Deno.env.delete('GEMINI_MODEL')
  const originalFetch = globalThis.fetch
  stubFetch(() => new Response('quota exceeded', { status: 429 }))

  try {
    await assertRejects(
      () =>
        geminiProvider.extract({
          images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
          schema: fabricSchema,
        }),
      Error,
      'Gemini API error: 429 quota exceeded'
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ GEMINI_API_KEY: savedEnv.apiKey, GEMINI_MODEL: savedEnv.model })
  }
})

Deno.test('geminiProvider.extract: throws the legacy error on an empty model response', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('GEMINI_API_KEY'),
    model: Deno.env.get('GEMINI_MODEL'),
  }
  Deno.env.set('GEMINI_API_KEY', 'test-key')
  Deno.env.delete('GEMINI_MODEL')
  const originalFetch = globalThis.fetch
  stubFetch(() => new Response(JSON.stringify({}), { status: 200 }))

  try {
    await assertRejects(
      () =>
        geminiProvider.extract({
          images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
          schema: fabricSchema,
        }),
      Error,
      'Empty response from Gemini'
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ GEMINI_API_KEY: savedEnv.apiKey, GEMINI_MODEL: savedEnv.model })
  }
})

Deno.test('geminiProvider.extract: throws the legacy error on non-JSON model output', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('GEMINI_API_KEY'),
    model: Deno.env.get('GEMINI_MODEL'),
  }
  Deno.env.set('GEMINI_API_KEY', 'test-key')
  Deno.env.delete('GEMINI_MODEL')
  const originalFetch = globalThis.fetch
  stubFetch(() =>
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'not json {' }] } }],
      }),
      { status: 200 }
    )
  )

  try {
    await assertRejects(
      () =>
        geminiProvider.extract({
          images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
          schema: fabricSchema,
        }),
      Error,
      'Failed to parse Gemini extraction response as JSON'
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ GEMINI_API_KEY: savedEnv.apiKey, GEMINI_MODEL: savedEnv.model })
  }
})
