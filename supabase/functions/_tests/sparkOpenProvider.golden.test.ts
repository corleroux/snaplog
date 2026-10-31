/**
 * Muse Spark Open provider golden + parity tests (FR-MOD-02b).
 *
 * Proves the muse-spark-open provider (Modal shared endpoint, OpenAI-
 * compatible chat completions) produces the SAME normalised payload as the
 * Gemini baseline for the same captures, and documents the prompted-JSON
 * fallback used when the endpoint rejects `response_format`:
 * - parity: the spark-open fixtures in ./fixtures/spark-open/ (chat
 *   completions shape) normalise to exactly the Gemini golden payloads;
 * - schema derivation: same fixed-depth, all-required JSON Schema contract
 *   as the muse-spark provider (Meta rejects recursive schemas);
 * - request parity: Bearer MODAL_PROXY_TOKEN, Modal shared-endpoint URL,
 *   data-URL image parts, json_schema response_format + prompted-JSON
 *   fallback path;
 * - run metadata: provider/model/usage/latency reported per extraction.
 *
 * Fixtures are crafted offline — no live model API is ever called; fetch is
 * stubbed for the full-pipeline tests. The live probe (owner's explicit go,
 * proxy token present) confirms the exact model ID and structured-output
 * support against the real endpoint. Run with: pnpm test:edge (or deno test
 * --allow-net --allow-env --no-check this file).
 */

import { assertEquals, assertRejects } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { buildPrompt } from '../_shared/providers/extractionPrompt.ts'
import { normaliseModelOutput } from '../_shared/providers/extractionNormaliser.ts'
import {
  buildRequestBody,
  buildResponseSchema,
  getSparkOpenModel,
  isStructuredOutputRejection,
  parsePromptedJson,
  parseSparkOpenResponse,
  sparkOpenProvider,
} from '../_shared/providers/sparkOpenProvider.ts'
import fabricProductTagFixture from './fixtures/spark-open/fabric-product-tag.json' with { type: 'json' }
import vendorCardFixture from './fixtures/spark-open/vendor-card.json' with { type: 'json' }
import geminiFabricFixture from './fixtures/gemini/fabric-product-tag.json' with { type: 'json' }
import geminiVendorFixture from './fixtures/gemini/vendor-card.json' with { type: 'json' }
import {
  expectedFabricJson,
  expectedVendorJson,
  fabricSchema,
  geminiNormalised,
  chatCompletionsNormalised,
  vendorSchema,
} from './fixtures/schemas.ts'

// ============================================================================
// HELPERS — fetch stub + env restore (mirrors the muse-spark golden tests)
// ============================================================================

interface FetchCall {
  url: string
  headers: Record<string, string>
  body: Record<string, unknown>
}

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

// ============================================================================
// GOLDEN PARSE + NORMALISATION — fixture in, Gemini golden payload out
// ============================================================================

Deno.test('sparkOpenProvider: fabric fixture parses and normalises to the Gemini golden payload', () => {
  const { rawText, usage } = parseSparkOpenResponse(fabricProductTagFixture)
  assertEquals(usage, { inputTokens: 1512, outputTokens: 284 })
  assertEquals(rawText, fabricProductTagFixture.choices[0].message.content)
  const json = normaliseModelOutput(JSON.parse(rawText), fabricSchema)
  assertEquals(json, expectedFabricJson)
})

Deno.test('sparkOpenProvider: vendor fixture parses and normalises to the Gemini golden payload', () => {
  const { rawText, usage } = parseSparkOpenResponse(vendorCardFixture)
  assertEquals(usage, { inputTokens: 998, outputTokens: 131 })
  assertEquals(rawText, vendorCardFixture.choices[0].message.content)
  const json = normaliseModelOutput(JSON.parse(rawText), vendorSchema)
  assertEquals(json, expectedVendorJson)
})

Deno.test('sparkOpenProvider: identical normalised payload as the Gemini provider for the same capture', () => {
  assertEquals(
    chatCompletionsNormalised(fabricProductTagFixture, fabricSchema),
    geminiNormalised(geminiFabricFixture, fabricSchema)
  )
  assertEquals(
    chatCompletionsNormalised(vendorCardFixture, vendorSchema),
    geminiNormalised(geminiVendorFixture, vendorSchema)
  )
})

// ============================================================================
// SCHEMA DERIVATION + REQUEST BODY
// ============================================================================

Deno.test('sparkOpenProvider: derives a nullable fixed-shape JSON schema from the fabric registry schema', () => {
  const schema = buildResponseSchema(fabricSchema) as {
    type: string
    properties: Record<string, { type: unknown }>
    required: string[]
  }
  assertEquals(schema.type, 'object')
  assertEquals(schema.required, ['style'])
  assertEquals((schema.properties.style as { required: string[] }).required.includes('item_code'), true)
})

Deno.test('sparkOpenProvider: defaults to the Modal shared-endpoint model', () => {
  const saved = Deno.env.get('SPARK_OPEN_MODEL')
  Deno.env.delete('SPARK_OPEN_MODEL')
  try {
    assertEquals(getSparkOpenModel(), 'meta-models/Muse-Spark-Open-816B-A42B')
  } finally {
    restoreEnv({ SPARK_OPEN_MODEL: saved })
  }
})

Deno.test('sparkOpenProvider.extract: full offline run against the fabric fixture', async () => {
  const savedEnv = {
    token: Deno.env.get('MODAL_PROXY_TOKEN'),
    model: Deno.env.get('SPARK_OPEN_MODEL'),
  }
  Deno.env.set('MODAL_PROXY_TOKEN', 'test-proxy-token')
  Deno.env.delete('SPARK_OPEN_MODEL')
  const originalFetch = globalThis.fetch
  const calls = stubFetch(() =>
    new Response(JSON.stringify(fabricProductTagFixture), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  try {
    const result = await sparkOpenProvider.extract({
      images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
      schema: fabricSchema,
      scanType: 'product_tag',
    })

    // Request parity: Modal shared endpoint, proxy-token bearer auth.
    assertEquals(calls.length, 1)
    assertEquals(calls[0].url, 'https://inference.us-west.modal.direct/v1/chat/completions')
    assertEquals(calls[0].headers, {
      'Authorization': 'Bearer test-proxy-token',
      'Content-Type': 'application/json',
    })
    assertEquals(
      calls[0].body,
      buildRequestBody(buildPrompt(fabricSchema, 'product_tag'), [
        { base64: 'QUJD', mimeType: 'image/jpeg' },
      ], fabricSchema)
    )

    // Run metadata recorded per extraction (FR-MOD-01/FR-MOD-02b).
    assertEquals(result.provider, 'muse-spark-open')
    assertEquals(result.model, 'meta-models/Muse-Spark-Open-816B-A42B')
    assertEquals(result.usage, { inputTokens: 1512, outputTokens: 284 })
    assertEquals(result.confidences, null)
    assertEquals(typeof result.latencyMs, 'number')
    assertEquals(result.latencyMs >= 0, true)
    assertEquals(result.raw, fabricProductTagFixture.choices[0].message.content)
    assertEquals(result.json, expectedFabricJson)
    assertEquals(result.json, geminiNormalised(geminiFabricFixture, fabricSchema))
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ MODAL_PROXY_TOKEN: savedEnv.token, SPARK_OPEN_MODEL: savedEnv.model })
  }
})

Deno.test('sparkOpenProvider.extract: prompted-JSON fallback when structured output is rejected', async () => {
  const savedEnv = {
    token: Deno.env.get('MODAL_PROXY_TOKEN'),
    model: Deno.env.get('SPARK_OPEN_MODEL'),
  }
  Deno.env.set('MODAL_PROXY_TOKEN', 'test-proxy-token')
  Deno.env.delete('SPARK_OPEN_MODEL')
  const originalFetch = globalThis.fetch

  const fencedContent = '```json\n' + fabricProductTagFixture.choices[0].message.content + '\n```'
  const calls = stubFetch((call) =>
    'response_format' in (call.body as Record<string, unknown>)
      ? new Response(JSON.stringify({ error: 'response_format json_schema not supported' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
      : new Response(
        JSON.stringify({
          ...fabricProductTagFixture,
          choices: [{ ...fabricProductTagFixture.choices[0], message: { role: 'assistant', content: fencedContent } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
  )

  try {
    const result = await sparkOpenProvider.extract({
      images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
      schema: fabricSchema,
      scanType: 'product_tag',
    })

    // Two calls: structured first, prompted-JSON retry without response_format.
    assertEquals(calls.length, 2)
    assertEquals('response_format' in (calls[0].body as Record<string, unknown>), true)
    assertEquals('response_format' in (calls[1].body as Record<string, unknown>), false)
    assertEquals(result.provider, 'muse-spark-open')
    assertEquals(result.json, expectedFabricJson)
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ MODAL_PROXY_TOKEN: savedEnv.token, SPARK_OPEN_MODEL: savedEnv.model })
  }
})

Deno.test('sparkOpenProvider.extract: surfaces Modal HTTP errors', async () => {
  const savedEnv = { token: Deno.env.get('MODAL_PROXY_TOKEN') }
  Deno.env.set('MODAL_PROXY_TOKEN', 'test-proxy-token')
  const originalFetch = globalThis.fetch
  stubFetch(() => new Response('upstream overloaded', { status: 503 }))

  try {
    await assertRejects(
      () =>
        sparkOpenProvider.extract({
          images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
          schema: fabricSchema,
          scanType: 'product_tag',
        }),
      Error,
      'Muse Spark Open API error: 503'
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ MODAL_PROXY_TOKEN: savedEnv.token })
  }
})

Deno.test('sparkOpenProvider.extract: throws when MODAL_PROXY_TOKEN is missing', async () => {
  const saved = Deno.env.get('MODAL_PROXY_TOKEN')
  Deno.env.delete('MODAL_PROXY_TOKEN')
  try {
    await assertRejects(
      () =>
        sparkOpenProvider.extract({
          images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
          schema: fabricSchema,
        }),
      Error,
      'MODAL_PROXY_TOKEN is not configured'
    )
  } finally {
    restoreEnv({ MODAL_PROXY_TOKEN: saved })
  }
})

Deno.test('sparkOpenProvider.extract: throws on an empty model response', async () => {
  const savedEnv = { token: Deno.env.get('MODAL_PROXY_TOKEN') }
  Deno.env.set('MODAL_PROXY_TOKEN', 'test-proxy-token')
  const originalFetch = globalThis.fetch
  stubFetch(() =>
    new Response(JSON.stringify({ choices: [{ message: { content: null } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  try {
    await assertRejects(
      () =>
        sparkOpenProvider.extract({
          images: [{ base64: 'QUJD', mimeType: 'image/jpeg' }],
          schema: fabricSchema,
        }),
      Error,
      'Empty response from Muse Spark Open'
    )
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv({ MODAL_PROXY_TOKEN: savedEnv.token })
  }
})

// ============================================================================
// PURE HELPERS
// ============================================================================

Deno.test('isStructuredOutputRejection: 400s and 422s mentioning the format qualify', () => {
  assertEquals(isStructuredOutputRejection(400, 'response_format json_schema not supported'), true)
  assertEquals(isStructuredOutputRejection(400, 'JSON_SCHEMA validation failed'), true)
  assertEquals(isStructuredOutputRejection(422, 'structured output unavailable for this model'), true)
  assertEquals(isStructuredOutputRejection(422, 'Unprocessable Entity: response_format'), true)
  assertEquals(isStructuredOutputRejection(400, 'rate limit exceeded'), false)
  assertEquals(isStructuredOutputRejection(503, 'response_format unavailable'), false)
})

Deno.test('parsePromptedJson: strips markdown fences', () => {
  assertEquals(parsePromptedJson('```json\n{"a":1}\n```'), { a: 1 })
  assertEquals(parsePromptedJson('{"a":1}'), { a: 1 })
})
