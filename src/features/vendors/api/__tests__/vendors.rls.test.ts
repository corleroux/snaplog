// @vitest-environment node
/**
 * RLS Policy Integration Tests — Vendors
 *
 * Verifies that Supabase Row-Level Security policies for the vendors table
 * enforce event membership and soft-delete filtering correctly.
 *
 * Effective policies (after all migrations):
 *   SELECT  — is_event_member(event_id) AND deleted_at IS NULL   (064_soft_delete_rls)
 *   INSERT  — is_event_member(event_id) AND created_by = uid()   (014_rls)
 *   UPDATE  — is_event_member(event_id)                          (014_rls)
 *   DELETE  — no policy → always blocked                         (soft-delete only)
 *
 * Requirements:
 *   Local Supabase running:  supabase start
 *   Opt-in env var:          RLS_TESTS_ENABLED=1
 *
 * Run:
 *   RLS_TESTS_ENABLED=1 npx vitest run src/features/vendors/api/__tests__/vendors.rls.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const LOCAL_URL = 'http://127.0.0.1:54321'
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const rlsEnabled = process.env.RLS_TESTS_ENABLED === '1'

// Service role client — bypasses RLS for setup/teardown
const service = createClient(LOCAL_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function anonClientWithToken(token: string): SupabaseClient {
  return createClient(LOCAL_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

/** Create an auth user + matching profile, then sign in and return a client. */
async function createUserWithProfile(
  email: string,
  password: string
): Promise<{ userId: string; client: SupabaseClient }> {
  const { data: user, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError) throw new Error(`User creation failed (${email}): ${createError.message}`)

  const { error: profileError } = await service
    .from('profiles')
    .upsert({ id: user.user.id, full_name: email.split('@')[0] }, { onConflict: 'id' })
  if (profileError) throw new Error(`Profile creation failed (${email}): ${profileError.message}`)

  const anon = createClient(LOCAL_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: auth, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError) throw new Error(`Sign-in failed (${email}): ${signInError.message}`)

  return { userId: user.user.id, client: anonClientWithToken(auth.session!.access_token) }
}

describe.skipIf(!rlsEnabled)('Vendor RLS policies', () => {
  let eventId: string
  let vendorId: string
  let softDeletedVendorId: string
  let memberUserId: string
  let nonMemberUserId: string
  let memberClient: SupabaseClient
  let nonMemberClient: SupabaseClient

  beforeAll(async () => {
    const ts = Date.now()

    // ── 1. Create member and non-member users ─────────────────────────────────
    const member = await createUserWithProfile(
      `rls-vendor-member-${ts}@example.com`,
      'member-pw-123'
    )
    memberUserId = member.userId
    memberClient = member.client

    const nonMember = await createUserWithProfile(
      `rls-vendor-nonmember-${ts}@example.com`,
      'nonmember-pw-123'
    )
    nonMemberUserId = nonMember.userId
    nonMemberClient = nonMember.client

    // ── 2. Create test event ──────────────────────────────────────────────────
    const { data: event, error: eventError } = await service
      .from('events')
      .insert({ name: `RLS Vendor Test ${ts}`, created_by: memberUserId })
      .select('id')
      .single()
    if (eventError) throw new Error(`Event creation failed: ${eventError.message}`)
    eventId = event.id

    // ── 3. Add member to event_members ────────────────────────────────────────
    const { error: membershipError } = await service
      .from('event_members')
      .insert({ event_id: eventId, user_id: memberUserId, role: 'owner' })
    if (membershipError)
      throw new Error(`Event membership insert failed: ${membershipError.message}`)

    // ── 4. Create a visible (active) vendor ───────────────────────────────────
    const { data: vendor, error: vendorError } = await service
      .from('vendors')
      .insert({
        event_id: eventId,
        company_name: 'RLS Test Vendor Active',
        created_by: memberUserId,
        status: 'active',
      })
      .select('id')
      .single()
    if (vendorError) throw new Error(`Vendor creation failed: ${vendorError.message}`)
    vendorId = vendor.id

    // ── 5. Create a soft-deleted vendor ───────────────────────────────────────
    const { data: deletedVendor, error: deletedVendorError } = await service
      .from('vendors')
      .insert({
        event_id: eventId,
        company_name: 'RLS Test Vendor Deleted',
        created_by: memberUserId,
        status: 'active',
        deleted_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (deletedVendorError)
      throw new Error(`Soft-deleted vendor creation failed: ${deletedVendorError.message}`)
    softDeletedVendorId = deletedVendor.id
  })

  afterAll(async () => {
    if (eventId) {
      await service.from('events').delete().eq('id', eventId)
    }
    for (const userId of [memberUserId, nonMemberUserId]) {
      if (userId) await service.auth.admin.deleteUser(userId)
    }
  })

  it('event member can SELECT active vendors in their event', async () => {
    const { data, error } = await memberClient
      .from('vendors')
      .select('id, company_name')
      .eq('event_id', eventId)

    expect(error).toBeNull()
    const ids = data!.map((v) => v.id)
    expect(ids).toContain(vendorId)
  })

  it('soft-deleted vendor is NOT returned by member SELECT', async () => {
    const { data, error } = await memberClient
      .from('vendors')
      .select('id')
      .eq('event_id', eventId)

    expect(error).toBeNull()
    const ids = data!.map((v) => v.id)
    expect(ids).not.toContain(softDeletedVendorId)
  })

  it('non-member gets empty result when SELECT on vendors', async () => {
    const { data, error } = await nonMemberClient
      .from('vendors')
      .select('id')
      .eq('event_id', eventId)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('DELETE is blocked for all authenticated users (no DELETE policy on vendors)', async () => {
    // There is intentionally no DELETE policy on vendors — soft-delete only.
    // RLS returns 0 rows affected rather than an error.
    const { data, error } = await memberClient
      .from('vendors')
      .delete()
      .eq('id', vendorId)
      .select('id')

    expect(error).toBeNull()
    // RLS blocks → no rows returned (record still exists)
    expect(data).toHaveLength(0)

    // Confirm the vendor still exists via service role
    const { data: check } = await service
      .from('vendors')
      .select('id')
      .eq('id', vendorId)
      .single()
    expect(check).not.toBeNull()
  })
})
