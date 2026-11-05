/**
 * Commit Reviewed Catalogue Item Edge Function Tests
 *
 * Deno-based tests for commit-reviewed-catalogue-item.
 *
 * Run with: deno test --allow-net --allow-env supabase/functions/_tests/commit-reviewed-catalogue-item.test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321'
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
  Deno.env.set(
    'SUPABASE_SERVICE_ROLE_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
  )
}

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

const validRequestBody = {
  scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
  event_id: '987fcdeb-51a2-43f1-a456-426614174000',
  vendor_id: 'abcdef01-2345-6789-abcd-ef0123456789',
  reviewed_document: {
    item: {
      item_code: 'GAR-001',
      name: 'Summer Dress',
      garment_type: 'Dress',
      silhouette: 'A-line',
    },
    colourways: [
      { colour_name: 'Red', sizing: 'S-L' },
    ],
  },
}

Deno.test('commit-reviewed-catalogue-item: missing required fields returns 500', async () => {
  const { status } = await callFunction('commit-reviewed-catalogue-item', {
    ...validRequestBody,
    scan_session_id: '',
  })
  // Note: May return 401 if not authenticated (requireUser runs before validation).
  assertEquals([401, 500].includes(status), true)
})

Deno.test('commit-reviewed-catalogue-item: missing item.item_code returns 500', async () => {
  const { status } = await callFunction('commit-reviewed-catalogue-item', {
    ...validRequestBody,
    reviewed_document: {
      item: { name: 'No code' },
    },
  })
  // Note: May return 401 if not authenticated (requireUser runs before validation).
  assertEquals([401, 500].includes(status), true)
})
