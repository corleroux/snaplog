/**
 * Extract Isolated Item Edge Function Tests
 *
 * Deno-based tests for the extract-isolated-item edge function.
 * Modal calls this function with the VIDEO_CALLBACK_SECRET — the client
 * never calls it directly.
 *
 * Run with: deno test --allow-net --allow-env supabase/functions/_tests/extract-isolated-item.test.ts
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
  parent_scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
  video_job_id: '987fcdeb-51a2-43f1-a456-426614174000',
  item_scan_session_id: 'abcdef01-2345-6789-abcd-ef0123456789',
  storage_path: 'video-crops/job/track-a.jpg',
  mime_type: 'image/jpeg',
  scan_type: 'garment_flat',
  catalogue_type: 'garment',
}

Deno.test('extract-isolated-item: rejects calls without the callback secret', async () => {
  // Service-secret auth runs before validation, so this is deterministic:
  // any bearer other than VIDEO_CALLBACK_SECRET gets 401.
  const { status } = await callFunction('extract-isolated-item', validRequestBody)
  assertEquals(status, 401)
})

Deno.test('extract-isolated-item: missing required fields returns 500 with valid secret', async () => {
  const secret = Deno.env.get('VIDEO_CALLBACK_SECRET')
  if (!secret) {
    // Secret not configured locally — nothing to exercise.
    return
  }
  const { status } = await callFunction(
    'extract-isolated-item',
    { ...validRequestBody, item_scan_session_id: '' },
    { 'Authorization': `Bearer ${secret}` }
  )
  assertEquals(status, 500)
})
