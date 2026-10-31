/**
 * Muse Spark provider golden + parity tests (FR-MOD-02a).
 *
 * Proves the Muse Spark provider (Meta Model API, chat completions)
 * produces the SAME normalised payload as the Gemini baseline for the
 * same captures:
 * - parity: the muse-spark fixtures in ./fixtures/muse-spark/ (chat
 *   completions shape, structured-output style — every key present with
 *   explicit nulls) normalise to exactly the Gemini golden payloads in
 *   ./fixtures/gemini/ (generateContent shape, keys omitted when absent);
 * - schema derivation: the JSON Schema sent as response_format is derived
 *   from the registry schema, is fixed-depth (no $ref — Meta rejects
 *   recursive schemas), lists every property in required (explicit nulls,
 *   never omitted keys) and stays within Meta's structured-output limits;
 * - request parity: Bearer MODEL_API_KEY, data-URL image parts in a user
 *   message, json_schema response_format, doc-aligned sampling defaults;
 * - run metadata: provider/model/usage/latency reported per extraction.
 *
 * The fixtures mirror the shape of chat completions responses (crafted
 * offline — no live model API is ever called; fetch is stubbed for the
 * full-pipeline tests). Run with: pnpm test:edge (or deno test
 * --allow-net --allow-env --no-check this file).
 */

import { assertEquals, assertRejects } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { buildPrompt } from '../_shared/providers/extractionPrompt.ts'
import { normaliseModelOutput } from '../_shared/providers/extractionNormaliser.ts'
import {
  buildRequestBody,
  buildResponseSchema,
  getMuseSparkModel,
  museSparkProvider,
  parseMuseSparkResponse,
} from '../_shared/providers/museSparkProvider.ts'
import fabricProductTagFixture from './fixtures/muse-spark/fabric-product-tag.json' with { type: 'json' }
import vendorCardFixture from './fixtures/muse-spark/vendor-card.json' with { type: 'json' }
import geminiFabricFixture from './fixtures/gemini/fabric-product-tag.json' with { type: 'json' }
import geminiVendorFixture from './fixtures/gemini/vendor-card.json' with { type: 'json' }
import { fabricSchema, vendorSchema, expectedFabricJson, expectedVendorJson, geminiNormalised, chatCompletionsNormalised } from './fixtures/schemas.ts'


// ============================================================================
// GOLDEN PARSE + NORMALISATION — fixture in, Gemini golden payload out
// ============================================================================

Deno.test('museSparkProvider: fabric fixture parses and normalises to the Gemini golden payload', () => {
  const { rawText, usage } = parseMuseSparkResponse(fabricProductTagFixture)
  assertEquals(usage, { inputTokens: 1512, outputTokens: 284 })
  assertEquals(rawText, fabricProductTagFixture.choices[0].message.content)

  const json = normaliseModelOutput(JSON.parse(rawText), fabricSchema)
  assertEquals(json, expectedFabricJson)
})

Deno.test('museSparkProvider: vendor fixture parses and normalises to the Gemini golden payload', () => {
  const { rawText, usage } = parseMuseSparkResponse(vendorCardFixture)
  assertEquals(usage, { inputTokens: 998, outputTokens: 131 })

  const json = normaliseModelOutput(JSON.parse(rawText), vendorSchema)
  assertEquals(json, expectedVendorJson)
})

Deno.test('museSparkProvider: identical normalised payload as the Gemini provider for the same capture', () => {
  assertEquals(chatCompletionsNormalised(fabricProductTagFixture, fabricSchema), geminiNormalised(geminiFabricFixture, fabricSchema))
  assertEquals(chatCompletionsNormalised(vendorCardFixture, vendorSchema), geminiNormalised(geminiVendorFixture, vendorSchema))
})

Deno.test('museSparkProvider: structured-output explicit nulls and Gemini omitted keys normalise identically', () => {
  // Muse Spark's schema-constrained decoding emits every key with explicit
  // nulls; the Gemini fixture omits absent keys. Both normalise to the same
  // variant objects — missing values are flagged, never guessed (FR-EXT-06).
  const museVariants = (chatCompletionsNormalised(fabricProductTagFixture, fabricSchema).style as Record<string, unknown>).variants
  const geminiVariants = (geminiNormalised(geminiFabricFixture, fabricSchema).style as Record<string, unknown>).variants

  assertEquals(museVariants, geminiVariants)
  assertEquals((museVariants as Array<Record<string, unknown>>)[1], {
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
  })
})

// ============================================================================
// SCHEMA DERIVATION — registry schema -> response_format json_schema
// ============================================================================

Deno.test('museSparkProvider: derives a nullable fixed-shape JSON schema from the fabric registry schema', () => {
  const schema = buildResponseSchema(fabricSchema)
  assertEquals(schema.type, 'object')
  assertEquals(schema.required, ['style'])

  const style = schema.properties.style as Record<string, unknown>
  assertEquals(style.type, 'object')
  assertEquals(style.required, [
    'item_code', 'name', 'composition', 'category', 'construction', 'finish', 'pattern',
    'width_cm', 'width_in', 'weight_gsm', 'weight_ozsy', 'season', 'metadata', 'variants',
  ])
  assertEquals(style.properties.item_code, { type: ['string', 'null'], description: 'style/product code' })
  assertEquals(style.properties.width_cm, { type: ['number', 'null'], description: 'width in centimeters' })
  assertEquals(style.properties.metadata, { type: ['object', 'null'], description: 'any additional info as object' })

  const variants = style.properties.variants as Record<string, unknown>
  assertEquals(variants.type, ['array', 'null'])
  assertEquals(variants.description, 'color/size/wash variations visible')
  const variantItems = variants.items as Record<string, unknown>
  assertEquals(variantItems.type, 'object')
  const price = variantItems.properties.price as Record<string, unknown>
  assertEquals(price.type, ['object', 'null'])
  assertEquals(price.description, 'Price')
  assertEquals(price.required, [
    'currency', 'price', 'price_unit', 'minimum_order_quantity', 'minimum_order_unit',
    'lead_time_value', 'lead_time_unit', 'notes',
  ])
})

Deno.test('museSparkProvider: registry-required fields derive as non-nullable', () => {
  const schema = buildResponseSchema(vendorSchema)
  const document = schema.properties.document as Record<string, unknown>
  assertEquals(document.properties.company_name, { type: 'string', description: 'the main company name' })
  assertEquals(document.properties.brand_names, {
    type: ['array', 'null'],
    description: 'array of brand names shown',
    items: { type: 'string' },
  })
})

Deno.test('museSparkProvider: derived schema stays within Meta structured-output limits', () => {
  for (const derived of [buildResponseSchema(fabricSchema), buildResponseSchema(vendorSchema)]) {
    // Meta rejects schemas nested deeper than 10 levels, larger than 5,000
    // properties, or recursive ($ref cycles). Ours is fixed-depth by
    // construction.
    assertEquals(semanticDepth(derived) <= 10, true)
    assertEquals(countProperties(derived) <= 5000, true)
    assertEquals(containsRef(derived), false)
    // Every object lists all of its properties in required: the model emits
    // explicit nulls instead of omitting keys.
    assertEquals(requiredCoversProperties(derived), true)
  }
})

Deno.test('museSparkProvider: fixture model output conforms to the derived JSON schema', () => {
  const violations: string[] = []
  checkConformance(
    JSON.parse(fabricProductTagFixture.choices[0].message.content),
    buildResponseSchema(fabricSchema),
    '$',
    violations
  )
  checkConformance(
    JSON.parse(vendorCardFixture.choices[0].message.content),
    buildResponseSchema(vendorSchema),
    '$',
    violations
  )
  assertEquals(violations, [])
})

/** Depth of the JSON the schema describes (root object = 1). */
function semanticDepth(schema: Record<string, unknown>): number {
  const types = schemaTypes(schema)
  if (types.includes('object')) {
    const properties = (schema.properties as Record<string, Record<string, unknown>> | undefined) ?? {}
    const childDepths = Object.values(properties).map((p) => semanticDepth(p))
    return 1 + (childDepths.length > 0 ? Math.max(...childDepths) : 0)
  }
  if (types.includes('array')) {
    const items = schema.items as Record<string, unknown> | undefined
    return 1 + (items ? semanticDepth(items) : 0)
  }
  return 1
}

/** Total property count across the whole schema (Meta limit: 5,000). */
function countProperties(schema: Record<string, unknown>): number {
  let count = Object.keys((schema.properties as Record<string, unknown> | undefined) ?? {}).length
  for (const property of Object.values((schema.properties as Record<string, Record<string, unknown>> | undefined) ?? {})) {
    count += countProperties(property)
  }
  const items = schema.items as Record<string, unknown> | undefined
  if (items) count += countProperties(items)
  return count
}

/** True when the schema contains $ref / $defs / definitions (recursion). */
function containsRef(node: unknown): boolean {
  if (!isPlainObject(node)) return false
  if ('$ref' in node || '$defs' in node || 'definitions' in node) return true
  return Object.values(node).some((value) => containsRef(value))
}

/** True when every object schema's required list covers its properties. */
function requiredCoversProperties(schema: Record<string, unknown>): boolean {
  const properties = (schema.properties as Record<string, unknown> | undefined) ?? {}
  const required = (schema.required as string[] | undefined) ?? []
  const propertyKeys = Object.keys(properties).sort().join(',')
  const requiredKeysSorted = [...required].sort().join(',')
  if (propertyKeys !== requiredKeysSorted) return false
  for (const property of Object.values(properties as Record<string, Record<string, unknown>>)) {
    if (!requiredCoversProperties(property)) return false
  }
  const items = schema.items as Record<string, unknown> | undefined
  if (items && !requiredCoversProperties(items)) return false
  return true
}

function schemaTypes(schema: Record<string, unknown>): string[] {
  const type = schema.type
  return Array.isArray(type) ? type.map(String) : [String(type)]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Validate a value against the JSON Schema subset buildResponseSchema
 * emits (object/array/scalar, nullable type arrays, required, enum-free).
 * Appends one message per violation.
 */
function checkConformance(value: unknown, schema: Record<string, unknown>, path: string, violations: string[]): void {
  const types = schemaTypes(schema)

  if (value === null) {
    if (!types.includes('null')) violations.push(`${path}: null is not allowed (type ${JSON.stringify(schema.type)})`)
    return
  }

  if (types.includes('object')) {
    if (!isPlainObject(value)) {
      violations.push(`${path}: expected object, got ${typeof value}`)
      return
    }
    for (const key of (schema.required as string[] | undefined) ?? []) {
      if (!(key in value)) violations.push(`${path}.${key}: required key missing`)
    }
    const properties = (schema.properties as Record<string, Record<string, unknown>> | undefined) ?? {}
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (key in value) checkConformance(value[key], propertySchema, `${path}.${key}`, violations)
    }
    return
  }

  if (types.includes('array')) {
    if (!Array.isArray(value)) {
      violations.push(`${path}: expected array, got ${typeof value}`)
      return
    }
    const items = schema.items as Record<string, unknown> | undefined
    if (items) {
      value.forEach((item, index) => checkConformance(item, items, `${path}[${index}]`, violations))
    }
    return
  }

  if (types.includes('string') && typeof value !== 'string') {
    violations.push(`${path}: expected string, got ${typeof value}`)
  } else if (types.includes('number') && typeof value !== 'number') {
    violations.push(`${path}: expected number, got ${typeof value}`)
  } else if (types.includes('boolean') && typeof value !== 'boolean') {
    violations.push(`${path}: expected boolean, got ${typeof value}`)
  }
}

// ============================================================================
// REQUEST PARITY — chat completions body, bearer auth, data-URL images
// ============================================================================

Deno.test('museSparkProvider: defaults to muse-spark-1.3 Standard mode', () => {
  const saved = Deno.env.get('MUSE_SPARK_MODEL')
  Deno.env.delete('MUSE_SPARK_MODEL')
  try {
    assertEquals(getMuseSparkModel(), 'muse-spark-1.3')
  } finally {
    restoreEnv({ MUSE_SPARK_MODEL: saved })
  }
})

Deno.test('museSparkProvider: request body uses data-URL image parts and the derived json_schema response format', () => {
  const saved = Deno.env.get('MUSE_SPARK_MODEL')
  Deno.env.delete('MUSE_SPARK_MODEL')
  try {
    const body = buildRequestBody('PROMPT TEXT', [
      { base64: 'QUJD', mimeType: 'image/jpeg' },
      { base64: 'REVG', mimeType: 'image/png' },
    ], fabricSchema) as {
      model: string
      messages: Array<{ role: string; content: Array<Record<string, unknown>> }>
      response_format: Record<string, unknown>
      max_completion_tokens: number
    } & Record<string, unknown>

    assertEquals(body.model, 'muse-spark-1.3')
    assertEquals(body.messages.length, 1)
    assertEquals(body.messages[0].role, 'user')
    assertEquals(body.messages[0].content, [
      { type: 'text', text: 'PROMPT TEXT' },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,QUJD' } },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,REVG' } },
    ])
    assertEquals(body.response_format, {
      type: 'json_schema',
      json_schema: {
        name: 'fabric-extraction-v1',
        schema: buildResponseSchema(fabricSchema),
      },
    })
    assertEquals(body.max_completion_tokens, 8192)
    // Doc-aligned sampling: Muse Spark is tuned to its defaults; we do not
    // lower temperature/top_p or set reasoning_effort.
    assertEquals('temperature' in body, false)
    assertEquals('top_p' in body, false)
    assertEquals('reasoning_effort' in body, false)
  } finally {
    restoreEnv({ MUSE_SPARK_MODEL: saved })
  }
})

Deno.test('museSparkProvider: prompt text part reuses the shared schema-driven builder', () => {
  const body = buildRequestBody(buildPrompt(fabricSchema, 'product_tag'), [
    { base64: 'QUJD', mimeType: 'image/jpeg' },
  ], fabricSchema) as {
    messages: Array<{ role: string; content: Array<Record<string, unknown>> }>
  }

  // Byte-identical to the Gemini provider's prompt (FR-MOD-01 parity).
  assertEquals(body.messages[0].content[0], { type: 'text', text: buildPrompt(fabricSchema, 'product_tag') })
  assertEquals(
    (body.messages[0].content[0].text as string).includes('IMPORTANT TRANSLATION REQUIREMENT'),
    true
  )
})

// ============================================================================
// FULL PIPELINE (offline) — fetch stubbed, never a live model API
// ============================================================================

interface FetchCall {
  url: string
  headers: Record<string, string>
  body: Record<string, unknown>
}

/** Stub globalThis.fetch to serve a canned chat completions response. */
function stubFetch(respond: (call: FetchCall) => Response): FetchCall[] {
  const calls: FetchCall[] = []
  globalThis.fetch = ((_url: string | URL, init?: RequestInit): Promise<Response> => {
    const call: FetchCall = {
      url: String(_url),
      headers: (init?.headers ?? {}) as Record<string, string>,
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

Deno.test('museSparkProvider.extract: full offline run against the fabric fixture', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('MODEL_API_KEY'),
    model: Deno.env.get('MUSE_SPARK_MODEL'),
  }
  Deno.env.set('MODEL_API_KEY', 'test-key')
  Deno.env.delete('MUSE_SPARK_MODEL')
  const originalFetch = globalThis.fetch
  const calls = stubFetch(() =>
    new Response(JSON.stringify(fabricProductTagFixture), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  try {
    const result = await museSparkProvider.extract({
      images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
      schema: fabricSchema,
      scanType: 'product_tag',
    })

    // Request parity: documented endpoint, bearer auth, schema-built body.
    assertEquals(calls.length, 1)
    assertEquals(calls[0].url, 'https://api.meta.ai/v1/chat/completions')
    assertEquals(calls[0].headers, {
      'Authorization': 'Bearer test-key',
      'Content-Type': 'application/json',
    })
    assertEquals(
      calls[0].body,
      buildRequestBody(buildPrompt(fabricSchema, 'product_tag'), [
        { base64: 'QUJD', mimeType: 'image/jpeg' },
      ], fabricSchema)
    )

    // Run metadata recorded per extraction (FR-MOD-01/FR-MOD-02a).
    assertEquals(result.provider, 'muse-spark')
    assertEquals(result.model, 'muse-spark-1.3')
    assertEquals(result.usage, { inputTokens: 1512, outputTokens: 284 })
    assertEquals(result.confidences, null)
    assertEquals(typeof result.latencyMs, 'number')
    assertEquals(result.latencyMs >= 0, true)
    assertEquals(result.raw, fabricProductTagFixture.choices[0].message.content)
    // Identical normalised payload as the Gemini baseline (golden parity).
    assertEquals(result.json, expectedFabricJson)
    assertEquals(result.json, geminiNormalised(geminiFabricFixture, fabricSchema))
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ MODEL_API_KEY: savedEnv.apiKey, MUSE_SPARK_MODEL: savedEnv.model })
  }
})

Deno.test('museSparkProvider.extract: full offline run against the vendor fixture', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('MODEL_API_KEY'),
    model: Deno.env.get('MUSE_SPARK_MODEL'),
  }
  Deno.env.set('MODEL_API_KEY', 'test-key')
  Deno.env.delete('MUSE_SPARK_MODEL')
  const originalFetch = globalThis.fetch
  stubFetch(() =>
    new Response(JSON.stringify(vendorCardFixture), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  try {
    const result = await museSparkProvider.extract({
      images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
      schema: vendorSchema,
      scanType: 'vendor_card',
    })

    assertEquals(result.provider, 'muse-spark')
    assertEquals(result.model, 'muse-spark-1.3')
    assertEquals(result.usage, { inputTokens: 998, outputTokens: 131 })
    assertEquals(result.json, expectedVendorJson)
    assertEquals(result.json, geminiNormalised(geminiVendorFixture, vendorSchema))
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ MODEL_API_KEY: savedEnv.apiKey, MUSE_SPARK_MODEL: savedEnv.model })
  }
})

Deno.test('museSparkProvider.extract: sends every image as a data-URL part in order', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('MODEL_API_KEY'),
    model: Deno.env.get('MUSE_SPARK_MODEL'),
  }
  Deno.env.set('MODEL_API_KEY', 'test-key')
  Deno.env.delete('MUSE_SPARK_MODEL')
  const originalFetch = globalThis.fetch
  const calls = stubFetch(() =>
    new Response(JSON.stringify(vendorCardFixture), { status: 200 })
  )

  try {
    await museSparkProvider.extract({
      images: [
        { base64: 'QUJD', mimeType: 'image/jpeg' },
        { base64: 'REVG', mimeType: 'image/png' },
      ],
      schema: vendorSchema,
    })

    const message = (calls[0].body.messages as Array<{ content: Array<Record<string, unknown>> }>)[0]
    assertEquals(message.content.length, 3)
    assertEquals(message.content[1], { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,QUJD' } })
    assertEquals(message.content[2], { type: 'image_url', image_url: { url: 'data:image/png;base64,REVG' } })
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ MODEL_API_KEY: savedEnv.apiKey, MUSE_SPARK_MODEL: savedEnv.model })
  }
})

Deno.test('museSparkProvider.extract: reports the MUSE_SPARK_MODEL override as the model', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('MODEL_API_KEY'),
    model: Deno.env.get('MUSE_SPARK_MODEL'),
  }
  Deno.env.set('MODEL_API_KEY', 'test-key')
  Deno.env.set('MUSE_SPARK_MODEL', 'muse-spark-1.1')
  const originalFetch = globalThis.fetch
  stubFetch(() =>
    new Response(JSON.stringify(vendorCardFixture), { status: 200 })
  )

  try {
    const result = await museSparkProvider.extract({
      images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
      schema: vendorSchema,
    })
    assertEquals(result.model, 'muse-spark-1.1')
    assertEquals(result.json, expectedVendorJson)
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ MODEL_API_KEY: savedEnv.apiKey, MUSE_SPARK_MODEL: savedEnv.model })
  }
})

Deno.test('museSparkProvider.extract: requires an image', async () => {
  await assertRejects(
    () => museSparkProvider.extract({ images: [], schema: fabricSchema }),
    Error,
    'At least one image is required'
  )
})

Deno.test('museSparkProvider.extract: throws when MODEL_API_KEY is missing', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('MODEL_API_KEY'),
    model: Deno.env.get('MUSE_SPARK_MODEL'),
  }
  Deno.env.delete('MODEL_API_KEY')
  const originalFetch = globalThis.fetch
  globalThis.fetch = (() => {
    throw new Error('network must never be called from tests')
  }) as typeof fetch

  try {
    await assertRejects(
      () =>
        museSparkProvider.extract({
          images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
          schema: fabricSchema,
        }),
      Error,
      'MODEL_API_KEY is not configured'
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ MODEL_API_KEY: savedEnv.apiKey, MUSE_SPARK_MODEL: savedEnv.model })
  }
})

Deno.test('museSparkProvider.extract: surfaces Muse Spark HTTP errors', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('MODEL_API_KEY'),
    model: Deno.env.get('MUSE_SPARK_MODEL'),
  }
  Deno.env.set('MODEL_API_KEY', 'test-key')
  Deno.env.delete('MUSE_SPARK_MODEL')
  const originalFetch = globalThis.fetch
  stubFetch(() => new Response('quota exceeded', { status: 429 }))

  try {
    await assertRejects(
      () =>
        museSparkProvider.extract({
          images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
          schema: fabricSchema,
        }),
      Error,
      'Muse Spark API error: 429 quota exceeded'
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ MODEL_API_KEY: savedEnv.apiKey, MUSE_SPARK_MODEL: savedEnv.model })
  }
})

Deno.test('museSparkProvider.extract: throws on an empty model response', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('MODEL_API_KEY'),
    model: Deno.env.get('MUSE_SPARK_MODEL'),
  }
  Deno.env.set('MODEL_API_KEY', 'test-key')
  Deno.env.delete('MUSE_SPARK_MODEL')
  const originalFetch = globalThis.fetch
  stubFetch(() => new Response(JSON.stringify({}), { status: 200 }))

  try {
    await assertRejects(
      () =>
        museSparkProvider.extract({
          images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
          schema: fabricSchema,
        }),
      Error,
      'Empty response from Muse Spark'
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ MODEL_API_KEY: savedEnv.apiKey, MUSE_SPARK_MODEL: savedEnv.model })
  }
})

Deno.test('museSparkProvider.extract: throws on non-JSON model output', async () => {
  const savedEnv = {
    apiKey: Deno.env.get('MODEL_API_KEY'),
    model: Deno.env.get('MUSE_SPARK_MODEL'),
  }
  Deno.env.set('MODEL_API_KEY', 'test-key')
  Deno.env.delete('MUSE_SPARK_MODEL')
  const originalFetch = globalThis.fetch
  stubFetch(() =>
    new Response(
      JSON.stringify({
        choices: [{ index: 0, message: { role: 'assistant', content: 'not json {' }, finish_reason: 'stop' }],
      }),
      { status: 200 }
    )
  )

  try {
    await assertRejects(
      () =>
        museSparkProvider.extract({
          images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
          schema: fabricSchema,
        }),
      Error,
      'Failed to parse Muse Spark extraction response as JSON'
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ MODEL_API_KEY: savedEnv.apiKey, MUSE_SPARK_MODEL: savedEnv.model })
  }
})
