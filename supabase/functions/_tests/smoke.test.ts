/**
 * Edge Function Smoke Tests
 *
 * Lightweight tests for Supabase Edge Functions.
 * These tests verify basic function behavior without requiring full integration.
 *
 * Run with: deno test --allow-net --allow-env supabase/functions/_tests/smoke.test.ts
 */

import { assertEquals, assertExists, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts'

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

// ============================================================================
// Environment Validation Tests
// ============================================================================

Deno.test('Environment validation module exports validateEnv function', async () => {
  const module = await import('../_shared/envValidation.ts')
  assertExists(module.validateEnv)
  assertEquals(typeof module.validateEnv, 'function')
})

// ============================================================================
// Extract Vendor Document Tests
// ============================================================================

Deno.test('extract-vendor-document: rejects missing scan_session_id', async () => {
  const response = await callFunction('extract-vendor-document', {
    event_id: '00000000-0000-0000-0000-000000000000',
    storage_path: 'test.jpg',
    mime_type: 'image/jpeg',
    scan_type: 'vendor_card',
  })

  // Should return 400 or 500 for validation error
  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: rejects invalid UUID', async () => {
  const response = await callFunction('extract-vendor-document', {
    scan_session_id: 'not-a-uuid',
    event_id: '00000000-0000-0000-0000-000000000000',
    storage_path: 'test.jpg',
    mime_type: 'image/jpeg',
    scan_type: 'vendor_card',
  })

  // Should return error for invalid UUID
  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-vendor-document: rejects invalid scan_type', async () => {
  const response = await callFunction('extract-vendor-document', {
    scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
    event_id: '00000000-0000-0000-0000-000000000000',
    storage_path: 'test.jpg',
    mime_type: 'image/jpeg',
    scan_type: 'invalid_type',
  })

  assertEquals([400, 500].includes(response.status), true)
})

// ============================================================================
// Extract Fabric Document Tests
// ============================================================================

Deno.test('extract-fabric-document: rejects missing vendor_id', async () => {
  const response = await callFunction('extract-fabric-document', {
    scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
    event_id: '00000000-0000-0000-0000-000000000000',
    storage_path: 'test.jpg',
    mime_type: 'image/jpeg',
    scan_type: 'product_tag',
  })

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('extract-fabric-document: rejects invalid fabric scan_type', async () => {
  const response = await callFunction('extract-fabric-document', {
    scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
    event_id: '00000000-0000-0000-0000-000000000000',
    vendor_id: '00000000-0000-0000-0000-000000000001',
    storage_path: 'test.jpg',
    mime_type: 'image/jpeg',
    scan_type: 'invalid_type',
  })

  assertEquals([400, 500].includes(response.status), true)
})

// ============================================================================
// Commit Reviewed Vendor Document Tests
// ============================================================================

Deno.test('commit-reviewed-vendor-document: rejects missing company_name', async () => {
  const response = await callFunction('commit-reviewed-vendor-document', {
    scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
    event_id: '00000000-0000-0000-0000-000000000000',
    reviewed_document: {
      company_name: '',
    },
  })

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('commit-reviewed-vendor-document: requires authentication', async () => {
  // Call without auth header
  const url = `${SUPABASE_URL}/functions/v1/commit-reviewed-vendor-document`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
      event_id: '00000000-0000-0000-0000-000000000000',
      reviewed_document: {
        company_name: 'Test Co.',
      },
    }),
  })
  await response.body?.cancel()

  // Should return 401 for unauthorized
  assertEquals(response.status, 401)
})

// ============================================================================
// Commit Reviewed Fabric Document Tests
// ============================================================================

Deno.test('commit-reviewed-fabric-document: rejects missing item_code', async () => {
  const response = await callFunction('commit-reviewed-fabric-document', {
    scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
    event_id: '00000000-0000-0000-0000-000000000000',
    vendor_id: '00000000-0000-0000-0000-000000000001',
    reviewed_document: {
      style: {
        item_code: '',
      },
      variants: [],
      inventory: [],
      prices: [],
    },
  })

  assertEquals([400, 500].includes(response.status), true)
})

Deno.test('commit-reviewed-fabric-document: requires authentication', async () => {
  const url = `${SUPABASE_URL}/functions/v1/commit-reviewed-fabric-document`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
      event_id: '00000000-0000-0000-0000-000000000000',
      vendor_id: '00000000-0000-0000-0000-000000000001',
      reviewed_document: {
        style: {
          item_code: 'TEST-001',
        },
        variants: [],
        inventory: [],
        prices: [],
      },
    }),
  })
  await response.body?.cancel()

  assertEquals(response.status, 401)
})

// ============================================================================
// Shared Validation Module Tests
// ============================================================================

Deno.test('validation module: validateUUID rejects invalid UUIDs', async () => {
  const { validateUUID } = await import('../_shared/validation.ts')

  const invalidUUIDs = [
    'not-a-uuid',
    '12345678-1234-1234-1234-123456789ab', // too short
    '12345678-1234-1234-1234-123456789abcd', // too long
    '',
  ]

  for (const uuid of invalidUUIDs) {
    let threw = false
    try {
      validateUUID(uuid, 'test_field')
    } catch (e) {
      threw = true
    }
    assertEquals(threw, true, `Expected validateUUID to throw for: ${uuid}`)
  }
})

Deno.test('validation module: validateUUID accepts valid UUIDs', async () => {
  const { validateUUID } = await import('../_shared/validation.ts')

  const validUUIDs = [
    '123e4567-e89b-12d3-a456-426614174000',
    '00000000-0000-0000-0000-000000000001',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
  ]

  for (const uuid of validUUIDs) {
    let threw = false
    try {
      validateUUID(uuid, 'test_field')
    } catch (e) {
      threw = true
    }
    assertEquals(threw, false, `Expected validateUUID to accept: ${uuid}`)
  }
})

Deno.test('validation module: requireNonEmptyString rejects empty strings', async () => {
  const { requireNonEmptyString } = await import('../_shared/validation.ts')

  let threw = false
  try {
    requireNonEmptyString('', 'test_field')
  } catch (e) {
    threw = true
  }
  assertEquals(threw, true)

  threw = false
  try {
    requireNonEmptyString('   ', 'test_field')
  } catch (e) {
    threw = true
  }
  assertEquals(threw, true)
})

Deno.test('validation module: requireNonEmptyString accepts valid strings', async () => {
  const { requireNonEmptyString } = await import('../_shared/validation.ts')

  const result = requireNonEmptyString('valid string', 'test_field')
  assertEquals(result, 'valid string')
})

// ============================================================================
// Logger Module Tests
// ============================================================================

Deno.test('logger module: creates logger with correct interface', async () => {
  const { createLogger } = await import('../_shared/logger.ts')

  const log = createLogger('test-function')

  assertExists(log.info)
  assertExists(log.warn)
  assertExists(log.error)
  assertEquals(typeof log.info, 'function')
  assertEquals(typeof log.warn, 'function')
  assertEquals(typeof log.error, 'function')
})

// ============================================================================
// Environment Validation Tests
// ============================================================================

Deno.test('envValidation: throws when GEMINI_API_KEY is missing', async () => {
  // Save original env
  const originalKey = Deno.env.get('GEMINI_API_KEY')

  // Delete the key
  Deno.env.delete('GEMINI_API_KEY')

  const { validateEnv } = await import('../_shared/envValidation.ts')

  let threw = false
  try {
    validateEnv()
  } catch (e) {
    threw = true
    // Error should mention GEMINI_API_KEY (other vars may also be missing in test env)
    assertStringIncludes((e as Error).message, 'GEMINI_API_KEY is required')
  }

  assertEquals(threw, true)

  // Restore original key
  if (originalKey) {
    Deno.env.set('GEMINI_API_KEY', originalKey)
  }
})

// ============================================================================
// Test Summary
// ============================================================================

console.log(`
========================================
Edge Function Smoke Tests Complete
========================================

Tests verify:
- Validation modules work correctly
- Edge functions reject invalid input
- Edge functions require authentication
- Environment validation catches missing vars
- Logger creates proper interface

Note: Some tests may fail if:
- Supabase local instance is not running
- Environment variables are not set
- Edge functions are not deployed

Run with: deno test --allow-net --allow-env supabase/functions/_tests/smoke.test.ts
========================================
`)
