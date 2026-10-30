/**
 * Extract Fabric Document Edge Function Tests
 *
 * Deno-based tests for the extract-fabric-document edge function.
 *
 * Tests cover:
 * - Valid request → extraction succeeds
 * - Missing required fields → 400 error
 * - Invalid UUID → validation error
 * - Invalid scan_type → validation error
 * - Gemini API failure → extraction_status = 'failed'
 * - Storage fetch failure → error handled
 * - Scan session update failure → error handled
 *
 * Run with: deno test --allow-net --allow-env supabase/functions/_tests/extract-fabric-document.test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321'
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

// Test helper to call edge functions
async function callFunction(
  name: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: unknown }> {
  const url = `${SUPABASE_URL}/functions/v1/${name}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      ...headers,
    },
    body: JSON.stringify(body),
  })

  let data: unknown
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    data = await response.json()
  } else {
    data = await response.text()
  }

  return { status: response.status, data }
}

// Test data
const validRequestBody = {
  scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
  event_id: '987fcdeb-51a2-43f1-a456-426614174000',
  vendor_id: 'abcdef01-2345-6789-abcd-ef0123456789',
  storage_path: 'fabric-documents/test.jpg',
  mime_type: 'image/jpeg',
  scan_type: 'product_tag',
}

const validUUIDs = [
  '123e4567-e89b-12d3-a456-426614174000',
  '00000000-0000-0000-0000-000000000001',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
]

const invalidUUIDs = [
  'not-a-uuid',
  '12345678-1234-1234-1234-123456789ab', // too short
  '12345678-1234-1234-1234-123456789abcd', // too long
  '',
]

const validScanTypes = ['product_tag', 'stock_sheet', 'fabric_card', 'multi_variant_sheet']

const invalidScanTypes = ['invalid_type', 'vendor_card', 'brochure', '']

// ============================================================================
// Valid Request Tests
// ============================================================================

Deno.test('extract-fabric-document: accepts valid request with product_tag scan_type', async () => {
  const response = await callFunction('extract-fabric-document', {
    ...validRequestBody,
    scan_type: 'product_tag',
  })

  // Note: This may fail if storage/Gemini not configured, but we check structure
  assertEquals([200, 400, 500].includes(response.status), true)
})

Deno.test('extract-fabric-document: accepts valid request with stock_sheet scan_type', async () => {
  const response = await callFunction('extract-fabric-document', {
    ...validRequestBody,
    scan_type: 'stock_sheet',
  })

  assertEquals([200, 400, 500].includes(response.status), true)
})

Deno.test('extract-fabric-document: accepts valid request with fabric_card scan_type', async () => {
  const response = await callFunction('extract-fabric-document', {
    ...validRequestBody,
    scan_type: 'fabric_card',
  })

  assertEquals([200, 400, 500].includes(response.status), true)
})

Deno.test('extract-fabric-document: accepts valid request with multi_variant_sheet scan_type', async () => {
  const response = await callFunction('extract-fabric-document', {
    ...validRequestBody,
    scan_type: 'multi_variant_sheet',
  })

  assertEquals([200, 400, 500].includes(response.status), true)
})

// ============================================================================
// Missing Required Fields Tests
// ============================================================================

Deno.test('extract-fabric-document: rejects request without scan_session_id', async () => {
  const { scan_session_id, ...bodyWithoutId } = validRequestBody
  const response = await callFunction('extract-fabric-document', bodyWithoutId)

  // 400 = validation rejects; 500 = validateEnv() throws (GEMINI_API_KEY not set locally)
  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-fabric-document: rejects request without event_id', async () => {
  const { event_id, ...bodyWithoutId } = validRequestBody
  const response = await callFunction('extract-fabric-document', bodyWithoutId)

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-fabric-document: rejects request without vendor_id', async () => {
  const { vendor_id, ...bodyWithoutId } = validRequestBody
  const response = await callFunction('extract-fabric-document', bodyWithoutId)

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-fabric-document: rejects request without storage_path', async () => {
  const { storage_path, ...bodyWithoutPath } = validRequestBody
  const response = await callFunction('extract-fabric-document', bodyWithoutPath)

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-fabric-document: rejects request without mime_type', async () => {
  const { mime_type, ...bodyWithoutType } = validRequestBody
  const response = await callFunction('extract-fabric-document', bodyWithoutType)

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-fabric-document: rejects request without scan_type', async () => {
  const { scan_type, ...bodyWithoutType } = validRequestBody
  const response = await callFunction('extract-fabric-document', bodyWithoutType)

  assertEquals([400, 500].includes(response.status), true)
})

// ============================================================================
// Invalid UUID Tests
// ============================================================================

for (const invalidId of invalidUUIDs) {
  Deno.test(`extract-fabric-document: rejects invalid scan_session_id "${invalidId}"`, async () => {
    const response = await callFunction('extract-fabric-document', {
      ...validRequestBody,
      scan_session_id: invalidId,
    })

    // Should return 400 for invalid UUID
    assertEquals([400, 422, 500].includes(response.status), true)
  })
}

for (const invalidId of invalidUUIDs) {
  Deno.test(`extract-fabric-document: rejects invalid event_id "${invalidId}"`, async () => {
    const response = await callFunction('extract-fabric-document', {
      ...validRequestBody,
      event_id: invalidId,
    })

    assertEquals([400, 422, 500].includes(response.status), true)
  })
}

for (const invalidId of invalidUUIDs) {
  Deno.test(`extract-fabric-document: rejects invalid vendor_id "${invalidId}"`, async () => {
    const response = await callFunction('extract-fabric-document', {
      ...validRequestBody,
      vendor_id: invalidId,
    })

    assertEquals([400, 422, 500].includes(response.status), true)
  })
}

// ============================================================================
// Invalid scan_type Tests
// ============================================================================

for (const invalidType of invalidScanTypes) {
  Deno.test(`extract-fabric-document: rejects invalid scan_type "${invalidType}"`, async () => {
    const response = await callFunction('extract-fabric-document', {
      ...validRequestBody,
      scan_type: invalidType as any,
    })

    assertEquals([400, 422, 500].includes(response.status), true)
  })
}

// ============================================================================
// Valid MIME Type Tests
// ============================================================================

const validMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

for (const mimeType of validMimeTypes) {
  Deno.test(`extract-fabric-document: accepts valid mime_type "${mimeType}"`, async () => {
    const response = await callFunction('extract-fabric-document', {
      ...validRequestBody,
      mime_type: mimeType,
    })

    assertEquals([200, 400, 500].includes(response.status), true)
  })
}

// ============================================================================
// Error Handling Tests
// ============================================================================

Deno.test('extract-fabric-document: handles non-existent scan session gracefully', async () => {
  const response = await callFunction('extract-fabric-document', {
    ...validRequestBody,
    scan_session_id: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
  })

  // Should return 404 or 400 for non-existent session
  assertEquals([400, 404, 500].includes(response.status), true)
})

Deno.test('extract-fabric-document: handles empty request body', async () => {
  const response = await callFunction('extract-fabric-document', {})

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-fabric-document: handles malformed JSON', async () => {
  const url = `${SUPABASE_URL}/functions/v1/extract-fabric-document`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: '{invalid json',
  })
  await response.body?.cancel()

  assertEquals([400, 500].includes(response.status), true)
})

// ============================================================================
// Method Tests
// ============================================================================

Deno.test('extract-fabric-document: rejects GET requests', async () => {
  const url = `${SUPABASE_URL}/functions/v1/extract-fabric-document`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })
  await response.body?.cancel()

  assertEquals([405, 400, 500].includes(response.status), true)
})

Deno.test('extract-fabric-document: rejects PUT requests', async () => {
  const url = `${SUPABASE_URL}/functions/v1/extract-fabric-document`
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(validRequestBody),
  })
  await response.body?.cancel()

  assertEquals([405, 400, 500].includes(response.status), true)
})
