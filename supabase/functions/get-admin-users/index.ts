/**
 * get-admin-users
 *
 * Returns the full user list from auth.users for the admin panel.
 * This cannot be done from the browser client — auth.users is only
 * accessible via the service-role key (admin client).
 *
 * Auth: caller must be an authenticated admin (role='admin' in profiles).
 * Method: GET
 *
 * Response: { users: AdminUser[] }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, requireMethod, json, forbidden, internalError } from '../_shared/http.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'
import { createLogger } from '../_shared/logger.ts'

const log = createLogger('get-admin-users')

export interface AdminUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  raw_user_meta_data: {
    full_name?: string
    role?: string
    avatar_url?: string
  }
}

serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const methodErr = requireMethod(req, 'GET')
  if (methodErr) return methodErr

  // Verify caller is authenticated
  const { user, response: authErr } = await requireUser(req)
  if (authErr) return authErr

  // Verify caller has admin role (use admin client — profiles RLS may restrict reads)
  const adminClient = createAdminClient()
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (profileError || !profile) {
    log.warn('Profile lookup failed', { userId: user!.id, error: profileError?.message })
    return forbidden('Admin access required', req)
  }

  if (profile.role !== 'admin') {
    log.warn('Non-admin access attempt', { userId: user!.id, role: profile.role })
    return forbidden('Admin access required', req)
  }

  // Fetch all users via admin auth API
  const { data: authData, error: usersError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (usersError) {
    log.error('Failed to list users', { error: usersError.message })
    return internalError('Failed to fetch users', 'Internal server error', req)
  }

  // Fetch profiles for the role field (source of truth for app role)
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, role')

  const roleByUserId = new Map<string, string>()
  profiles?.forEach((p: { id: string; role: string }) => {
    roleByUserId.set(p.id, p.role)
  })

  const users: AdminUser[] = authData.users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    raw_user_meta_data: {
      full_name: u.user_metadata?.full_name,
      // Prefer the profiles table role (updated by updateUserRole), fall back to user metadata
      role: roleByUserId.get(u.id) ?? u.user_metadata?.role,
      avatar_url: u.user_metadata?.avatar_url,
    },
  }))

  log.info('Admin user list returned', { count: users.length, requestedBy: user!.id })

  return json({ users }, 200, req)
})
