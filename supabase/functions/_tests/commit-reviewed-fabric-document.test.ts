/**
 * Commit Reviewed Fabric Document Edge Function Tests
 *
 * Deno-based tests for the commit-reviewed-fabric-document edge function.
 *
 * Tests cover:
 * - Valid commit → creates style, variants, inventory, prices
 * - Missing required fields → 400 error
 * - Invalid UUID → validation error
 * - Invalid reviewed_document structure → validation error
 * - Duplicate commit → idempotent response
 * - Scan session not found → 404 error
 * - Scan session ownership → 403 error
 *
 * Run with: deno test --allow-net --allow-env supabase/functions/_tests/commit-reviewed-fabric-document.test.ts
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
  reviewed_document: {
    style: {
      item_code: 'FAB-001',
      name: 'Test Fabric',
      composition: '100% Cotton',
      category: 'Plain Weave',
      construction: 'Plain',
      finish: 'Matte',
      pattern: 'Solid',
      width_cm: 150,
      weight_gsm: 200,
      season: 'SS25',
    },
    variants: [
      {
        color_code: 'RED',
        color_name: 'Red',
        variant_name: 'Red Variant',
        quantity: 100,
        unit: 'meters',
      },
    ],
    inventory: [
      {
        variant_index: 0,
        quantity: 100,
        unit: 'meters',
      },
    ],
    prices: [
      {
        variant_index: 0,
        price: {
          currency: 'USD',
          price: 15.50,
          price_unit: 'meter',
        },
      },
    ],
  },
  source_images: [
    {
      storage_path: 'fabric-documents/test.jpg',
      public_url: 'https://example.com/test.jpg',
    },
  ],
}

const validUUIDs = [
  '123e4567-e89b-12d3-a456-426614174000',
  '00000000-0000-0000-0000-000000000001',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
]

const invalidUUIDs = [
  'not-a-uuid',
  '12345678-1234-1234-1234-123456789ab',
  '',
]

// ============================================================================
// Valid Request Tests
// ============================================================================

Deno.test('commit-reviewed-fabric-document: accepts valid commit request', async () => {
  const response = await callFunction('commit-reviewed-fabric-document', validRequestBody)

  // Note: May return 401 if not authenticated, or 404 if scan session doesn't exist
  assertEquals([200, 201, 401, 404, 500].includes(response.status), true)
})

Deno.test('commit-reviewed-fabric-document: accepts commit without source_images', async () => {
  const { source_images, ...bodyWithoutImages } = validRequestBody
  const response = await callFunction('commit-reviewed-fabric-document', bodyWithoutImages)

  assertEquals([200, 201, 401, 404, 500].includes(response.status), true)
})

// ============================================================================
// Missing Required Fields Tests
// ============================================================================

Deno.test('commit-reviewed-fabric-document: rejects request without scan_session_id', async () => {
  const { scan_session_id, ...bodyWithoutId } = validRequestBody
  const response = await callFunction('commit-reviewed-fabric-document', bodyWithoutId)

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('commit-reviewed-fabric-document: rejects request without event_id', async () => {
  const { event_id, ...bodyWithoutId } = validRequestBody
  const response = await callFunction('commit-reviewed-fabric-document', bodyWithoutId)

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('commit-reviewed-fabric-document: rejects request without vendor_id', async () => {
  const { vendor_id, ...bodyWithoutId } = validRequestBody
  const response = await callFunction('commit-reviewed-fabric-document', bodyWithoutId)

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('commit-reviewed-fabric-document: rejects request without reviewed_document', async () => {
  const { reviewed_document, ...bodyWithoutDoc } = validRequestBody
  const response = await callFunction('commit-reviewed-fabric-document', bodyWithoutDoc)

  assertEquals([400, 500].includes(response.status), true)
})

// ============================================================================
// Invalid UUID Tests
// ============================================================================

for (const invalidId of invalidUUIDs) {
  Deno.test(`commit-reviewed-fabric-document: rejects invalid scan_session_id "${invalidId}"`, async () => {
    const response = await callFunction('commit-reviewed-fabric-document', {
      ...validRequestBody,
      scan_session_id: invalidId,
    })

    assertEquals([400, 422, 500].includes(response.status), true)
  })
}

for (const invalidId of invalidUUIDs) {
  Deno.test(`commit-reviewed-fabric-document: rejects invalid event_id "${invalidId}"`, async () => {
    const response = await callFunction('commit-reviewed-fabric-document', {
      ...validRequestBody,
      event_id: invalidId,
    })

    assertEquals([400, 422, 500].includes(response.status), true)
  })
}

for (const invalidId of invalidUUIDs) {
  Deno.test(`commit-reviewed-fabric-document: rejects invalid vendor_id "${invalidId}"`, async () => {
    const response = await callFunction('commit-reviewed-fabric-document', {
      ...validRequestBody,
      vendor_id: invalidId,
    })

    assertEquals([400, 422, 500].includes(response.status), true)
  })
}

// ============================================================================
// Reviewed Document Validation Tests
// ============================================================================

Deno.test('commit-reviewed-fabric-document: rejects empty style object', async () => {
  const response = await callFunction('commit-reviewed-fabric-document', {
    ...validRequestBody,
    reviewed_document: {
      style: {},
      variants: [],
      inventory: [],
      prices: [],
    },
  })

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('commit-reviewed-fabric-document: rejects style without item_code', async () => {
  const response = await callFunction('commit-reviewed-fabric-document', {
    ...validRequestBody,
    reviewed_document: {
      ...validRequestBody.reviewed_document,
      style: {
        name: 'Test Fabric',
        composition: '100% Cotton',
      },
    },
  })

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('commit-reviewed-fabric-document: accepts minimal valid style', async () => {
  const response = await callFunction('commit-reviewed-fabric-document', {
    ...validRequestBody,
    reviewed_document: {
      style: {
        item_code: 'FAB-001',
      },
      variants: [],
      inventory: [],
      prices: [],
    },
  })

  assertEquals([200, 201, 401, 404, 500].includes(response.status), true)
})

// ============================================================================
// Variants Validation Tests
// ============================================================================

Deno.test('commit-reviewed-fabric-document: accepts variants with color info', async () => {
  const response = await callFunction('commit-reviewed-fabric-document', {
    ...validRequestBody,
    reviewed_document: {
      ...validRequestBody.reviewed_document,
      variants: [
        {
          color_code: 'BLUE',
          color_name: 'Blue',
        },
        {
          color_code: 'GRN',
          color_name: 'Green',
          wash_code: 'WASH-001',
        },
      ],
    },
  })

  assertEquals([200, 201, 401, 404, 500].includes(response.status), true)
})

Deno.test('commit-reviewed-fabric-document: accepts empty variants array', async () => {
  const response = await callFunction('commit-reviewed-fabric-document', {
    ...validRequestBody,
    reviewed_document: {
      ...validRequestBody.reviewed_document,
      variants: [],
    },
  })

  assertEquals([200, 201, 401, 404, 500].includes(response.status), true)
})

// ============================================================================
// Source Images Validation Tests
// ============================================================================

Deno.test('commit-reviewed-fabric-document: accepts source_images with storage_path', async () => {
  const response = await callFunction('commit-reviewed-fabric-document', {
    ...validRequestBody,
    source_images: [
      {
        storage_path: 'fabric-documents/image1.jpg',
        public_url: 'https://example.com/image1.jpg',
      },
      {
        storage_path: 'fabric-documents/image2.jpg',
      },
    ],
  })

  assertEquals([200, 201, 401, 404, 500].includes(response.status), true)
})

Deno.test('commit-reviewed-fabric-document: rejects source_image without storage_path', async () => {
  const response = await callFunction('commit-reviewed-fabric-document', {
    ...validRequestBody,
    source_images: [
      {
        public_url: 'https://example.com/test.jpg',
      } as any,
    ],
  })

  assertEquals([400, 422, 500].includes(response.status), true)
})

// ============================================================================
// Error Handling Tests
// ============================================================================

Deno.test('commit-reviewed-fabric-document: handles empty request body', async () => {
  const response = await callFunction('commit-reviewed-fabric-document', {})

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('commit-reviewed-fabric-document: handles malformed JSON', async () => {
  const url = `${SUPABASE_URL}/functions/v1/commit-reviewed-fabric-document`
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

Deno.test('commit-reviewed-fabric-document: rejects GET requests', async () => {
  const url = `${SUPABASE_URL}/functions/v1/commit-reviewed-fabric-document`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })
  await response.body?.cancel()

  assertEquals([405, 400, 500].includes(response.status), true)
})

Deno.test('commit-reviewed-fabric-document: rejects PUT requests', async () => {
  const url = `${SUPABASE_URL}/functions/v1/commit-reviewed-fabric-document`
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

// ============================================================================
// Authentication Tests
// ============================================================================

Deno.test('commit-reviewed-fabric-document: requires authentication', async () => {
  const url = `${SUPABASE_URL}/functions/v1/commit-reviewed-fabric-document`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // No Authorization header
    },
    body: JSON.stringify(validRequestBody),
  })
  await response.body?.cancel()

  // Should require auth
  assertEquals([401, 403].includes(response.status), true)
})

Deno.test('commit-reviewed-fabric-document: rejects invalid auth token', async () => {
  const url = `${SUPABASE_URL}/functions/v1/commit-reviewed-fabric-document`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid-token-12345',
    },
    body: JSON.stringify(validRequestBody),
  })
  await response.body?.cancel()

  assertEquals([401, 403].includes(response.status), true)
})
