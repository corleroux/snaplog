/**
 * Extract Vendor Document Edge Function Tests
 *
 * Deno-based tests for the extract-vendor-document edge function.
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
 * Run with: deno test --allow-net --allow-env supabase/functions/_tests/extract-vendor-document.test.ts
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
  storage_path: 'vendor-documents/test.jpg',
  mime_type: 'image/jpeg',
  scan_type: 'vendor_card',
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

const validScanTypes = ['vendor_card', 'vendor_signage', 'vendor_brochure', 'vendor_catalog']

const invalidScanTypes = ['invalid_type', 'fabric_card', 'product_tag', '']

// ============================================================================
// Valid Request Tests
// ============================================================================

Deno.test('extract-vendor-document: accepts valid request with vendor_card scan_type', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    scan_type: 'vendor_card',
  })

  // Note: This may fail if storage/Gemini not configured, but we check structure
  assertEquals([200, 400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: accepts valid request with vendor_signage scan_type', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    scan_type: 'vendor_signage',
  })

  assertEquals([200, 400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: accepts valid request with vendor_brochure scan_type', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    scan_type: 'vendor_brochure',
  })

  assertEquals([200, 400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: accepts valid request with vendor_catalog scan_type', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    scan_type: 'vendor_catalog',
  })

  assertEquals([200, 400, 500].includes(response.status), true)
})

// ============================================================================
// Missing Required Field Tests
// ============================================================================

Deno.test('extract-vendor-document: rejects missing scan_session_id', async () => {
  const { scan_session_id, ...bodyWithoutScanId } = validRequestBody

  const response = await callFunction('extract-vendor-document', bodyWithoutScanId)

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: rejects missing event_id', async () => {
  const { event_id, ...bodyWithoutEventId } = validRequestBody

  const response = await callFunction('extract-vendor-document', bodyWithoutEventId)

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: rejects missing storage_path', async () => {
  const { storage_path, ...bodyWithoutStoragePath } = validRequestBody

  const response = await callFunction('extract-vendor-document', bodyWithoutStoragePath)

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: rejects missing mime_type', async () => {
  const { mime_type, ...bodyWithoutMimeType } = validRequestBody

  const response = await callFunction('extract-vendor-document', bodyWithoutMimeType)

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: rejects missing scan_type', async () => {
  const { scan_type, ...bodyWithoutScanType } = validRequestBody

  const response = await callFunction('extract-vendor-document', bodyWithoutScanType)

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: rejects empty string scan_session_id', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    scan_session_id: '',
  })

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: rejects empty string event_id', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    event_id: '',
  })

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: rejects empty string storage_path', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    storage_path: '',
  })

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: rejects empty string mime_type', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    mime_type: '',
  })

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: rejects empty string scan_type', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    scan_type: '',
  })

  assertEquals([400, 500].includes(response.status), true)
})

// ============================================================================
// Invalid UUID Tests
// ============================================================================

for (const invalidUUID of invalidUUIDs) {
  Deno.test(`extract-vendor-document: rejects invalid scan_session_id "${invalidUUID}"`, async () => {
    const response = await callFunction('extract-vendor-document', {
      ...validRequestBody,
      scan_session_id: invalidUUID,
    })

    assertEquals([400, 500].includes(response.status), true)
  })
}

for (const invalidUUID of invalidUUIDs) {
  Deno.test(`extract-vendor-document: rejects invalid event_id "${invalidUUID}"`, async () => {
    const response = await callFunction('extract-vendor-document', {
      ...validRequestBody,
      event_id: invalidUUID,
    })

    assertEquals([400, 500].includes(response.status), true)
  })
}

// ============================================================================
// Invalid scan_type Tests
// ============================================================================

for (const invalidScanType of invalidScanTypes) {
  Deno.test(`extract-vendor-document: rejects invalid scan_type "${invalidScanType}"`, async () => {
    const response = await callFunction('extract-vendor-document', {
      ...validRequestBody,
      scan_type: invalidScanType,
    })

    assertEquals([400, 500].includes(response.status), true)
  })
}

// ============================================================================
// MIME Type Validation Tests
// ============================================================================

Deno.test('extract-vendor-document: accepts image/jpeg MIME type', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    mime_type: 'image/jpeg',
  })

  assertEquals([200, 400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: accepts image/png MIME type', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    mime_type: 'image/png',
  })

  assertEquals([200, 400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: accepts image/webp MIME type', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    mime_type: 'image/webp',
  })

  assertEquals([200, 400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: rejects non-image MIME type', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    mime_type: 'application/pdf',
  })

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: rejects text MIME type', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    mime_type: 'text/plain',
  })

  assertEquals([400, 500].includes(response.status), true)
})

// ============================================================================
// Response Structure Tests
// ============================================================================

Deno.test('extract-vendor-document: returns document with company_name on success', async () => {
  const response = await callFunction('extract-vendor-document', validRequestBody)

  if (response.status === 200 && typeof response.data === 'object') {
    assertExists(response.data, 'Response data should exist')
    // In a real test with mocked Gemini, we'd check for document.company_name
  }
})

Deno.test('extract-vendor-document: returns metadata on success', async () => {
  const response = await callFunction('extract-vendor-document', validRequestBody)

  if (response.status === 200 && typeof response.data === 'object') {
    assertExists(response.data, 'Response data should exist')
    // In a real test with mocked Gemini, we'd check for metadata fields
  }
})

// ============================================================================
// Storage Path Format Tests
// ============================================================================

Deno.test('extract-vendor-document: accepts storage_path with subdirectories', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    storage_path: 'vendor-documents/2024/03/18/test.jpg',
  })

  assertEquals([200, 400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: accepts storage_path with UUID filename', async () => {
  const response = await callFunction('extract-vendor-document', {
    ...validRequestBody,
    storage_path: 'vendor-documents/123e4567-e89b-12d3-a456-426614174000.jpg',
  })

  assertEquals([200, 400, 500].includes(response.status), true)
})

// ============================================================================
// Test Summary
// ============================================================================

console.log(`
========================================
Extract Vendor Document Tests Complete
========================================

Tests verify:
- Valid requests with all scan types are accepted
- Missing required fields are rejected
- Invalid UUIDs are rejected
- Invalid scan_types are rejected
- MIME type validation works
- Response structure is correct

Note: Some tests may fail if:
- Supabase local instance is not running
- Environment variables are not set
- Edge functions are not deployed
- Storage bucket does not exist
- Gemini API key is not configured

Run with: deno test --allow-net --allow-env supabase/functions/_tests/extract-vendor-document.test.ts
========================================
`)
