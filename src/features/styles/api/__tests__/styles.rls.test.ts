// @vitest-environment node
/**
 * RLS Policy Integration Tests — fabric_styles
 *
 * Verifies that Supabase Row-Level Security policies for the fabric_styles table
 * enforce event membership, role-based DELETE, and soft-delete filtering.
 *
 * Effective policies (after all migrations):
 *   SELECT  — is_event_member(event_id) AND deleted_at IS NULL          (064_soft_delete_rls)
 *   INSERT  — is_event_member(event_id)                                 (033_rls_role_aware)
 *   UPDATE  — is_event_member(event_id)                                 (033_rls_role_aware)
 *   DELETE  — is_event_member(event_id) AND role IN ('owner','admin')   (033_rls_role_aware)
 *
 * Requirements:
 *   Local Supabase running:  supabase start
 *   Opt-in env var:          RLS_TESTS_ENABLED=1
 *
 * Run:
 *   RLS_TESTS_ENABLED=1 npx vitest run src/features/styles/api/__tests__/styles.rls.test.ts
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

describe.skipIf(!rlsEnabled)('fabric_styles RLS policies', () => {
  let eventId: string
  let vendorId: string
  let styleId: string
  let softDeletedStyleId: string
  let styleForOwnerDeleteId: string
  let styleForEditorDeleteAttemptId: string
  let ownerUserId: string
  let nonMemberUserId: string
  let editorUserId: string
  let ownerClient: SupabaseClient
  let nonMemberClient: SupabaseClient
  let editorClient: SupabaseClient

  beforeAll(async () => {
    const ts = Date.now()

    // ── 1. Create owner, editor, non-member users ─────────────────────────────
    const owner = await createUserWithProfile(
      `rls-styles-owner-${ts}@example.com`,
      'owner-pw-123'
    )
    ownerUserId = owner.userId
    ownerClient = owner.client

    const editor = await createUserWithProfile(
      `rls-styles-editor-${ts}@example.com`,
      'editor-pw-123'
    )
    editorUserId = editor.userId
    editorClient = editor.client

    const nonMember = await createUserWithProfile(
      `rls-styles-nonmember-${ts}@example.com`,
      'nonmember-pw-123'
    )
    nonMemberUserId = nonMember.userId
    nonMemberClient = nonMember.client

    // ── 2. Create test event ──────────────────────────────────────────────────
    const { data: event, error: eventError } = await service
      .from('events')
      .insert({ name: `RLS Styles Test ${ts}`, created_by: ownerUserId })
      .select('id')
      .single()
    if (eventError) throw new Error(`Event creation failed: ${eventError.message}`)
    eventId = event.id

    // ── 3. Add owner and editor to event_members ──────────────────────────────
    const { error: membershipError } = await service.from('event_members').insert([
      { event_id: eventId, user_id: ownerUserId, role: 'owner' },
      { event_id: eventId, user_id: editorUserId, role: 'editor' },
    ])
    if (membershipError)
      throw new Error(`Event membership insert failed: ${membershipError.message}`)

    // ── 4. Create vendor (required FK for styles) ─────────────────────────────
    const { data: vendor, error: vendorError } = await service
      .from('vendors')
      .insert({
        event_id: eventId,
        company_name: 'RLS Test Vendor',
        created_by: ownerUserId,
        status: 'active',
      })
      .select('id')
      .single()
    if (vendorError) throw new Error(`Vendor creation failed: ${vendorError.message}`)
    vendorId = vendor.id

    // ── 5. Create styles ──────────────────────────────────────────────────────
    async function insertStyle(itemCode: string, name: string, extra: Record<string, unknown> = {}) {
      const { data, error } = await service
        .from('fabric_styles')
        .insert({
          event_id: eventId,
          vendor_id: vendorId,
          item_code: itemCode,
          name,
          created_by: ownerUserId,
          status: 'active',
          ...extra,
        })
        .select('id')
        .single()
      if (error) throw new Error(`Style insert failed (${itemCode}): ${error.message}`)
      return data.id as string
    }

    styleId = await insertStyle('RLS-001', 'Active Style')
    softDeletedStyleId = await insertStyle('RLS-DEL', 'Soft Deleted Style', {
      deleted_at: new Date().toISOString(),
    })
    styleForOwnerDeleteId = await insertStyle('RLS-OWN', 'Style Owner Will Delete')
    styleForEditorDeleteAttemptId = await insertStyle('RLS-EDI', 'Style Editor Cannot Delete')
  })

  afterAll(async () => {
    if (eventId) {
      await service.from('events').delete().eq('id', eventId)
    }
    for (const userId of [ownerUserId, editorUserId, nonMemberUserId]) {
      if (userId) await service.auth.admin.deleteUser(userId)
    }
  })

  it('event member can SELECT active styles in their event', async () => {
    const { data, error } = await ownerClient
      .from('fabric_styles')
      .select('id, name')
      .eq('event_id', eventId)

    expect(error).toBeNull()
    const ids = data!.map((s) => s.id)
    expect(ids).toContain(styleId)
  })

  it('soft-deleted style is NOT returned by member SELECT', async () => {
    const { data, error } = await ownerClient
      .from('fabric_styles')
      .select('id')
      .eq('event_id', eventId)

    expect(error).toBeNull()
    const ids = data!.map((s) => s.id)
    expect(ids).not.toContain(softDeletedStyleId)
  })

  it('non-member gets empty result when SELECT on fabric_styles', async () => {
    const { data, error } = await nonMemberClient
      .from('fabric_styles')
      .select('id')
      .eq('event_id', eventId)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('editor (non-owner) cannot DELETE fabric_styles', async () => {
    // Role in event_members is 'editor' — DELETE policy requires 'owner' or 'admin'
    const { data, error } = await editorClient
      .from('fabric_styles')
      .delete()
      .eq('id', styleForEditorDeleteAttemptId)
      .select('id')

    expect(error).toBeNull()
    // RLS blocks → no rows returned (record still exists)
    expect(data).toHaveLength(0)

    // Confirm the style still exists via service role
    const { data: check } = await service
      .from('fabric_styles')
      .select('id')
      .eq('id', styleForEditorDeleteAttemptId)
      .single()
    expect(check).not.toBeNull()
  })

  it('owner CAN DELETE fabric_styles', async () => {
    const { data, error } = await ownerClient
      .from('fabric_styles')
      .delete()
      .eq('id', styleForOwnerDeleteId)
      .select('id')

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].id).toBe(styleForOwnerDeleteId)
  })
})
