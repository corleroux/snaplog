/**
 * Shared Supabase client utilities for Edge Functions
 *
 * IMPORTANT: Client usage rules
 * - createUserClient(req): Creates anon-key client with forwarded auth header
 *   Use for: caller identity verification, RLS-aware reads
 * - createAdminClient(): Creates service-role client
 *   Use for: privileged writes that bypass RLS
 * - NEVER use service-role client to verify caller identity (will bypass RLS)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { json } from './http.ts'

export function getEnv() {
  return {
    supabaseUrl: Deno.env.get('SUPABASE_URL')!,
    supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY')!,
    supabaseServiceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  }
}

export function getAuthHeader(req: Request): string | null {
  // Support both lowercase and uppercase header names (fixes 401 issue)
  return req.headers.get('authorization') || req.headers.get('Authorization')
}

export function createUserClient(req: Request) {
  const { supabaseUrl, supabaseAnonKey } = getEnv()
  const authHeader = getAuthHeader(req)

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  })
}

export function createAdminClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getEnv()
  return createClient(supabaseUrl, supabaseServiceRoleKey)
}

export async function requireUser(req: Request) {
  const authHeader = getAuthHeader(req)

  if (!authHeader) {
    return {
      user: null,
      supabase: null,
      response: json(
        { error: 'Unauthorized', message: 'Missing authorization header' },
        401,
        req
      ),
    }
  }

  const supabase = createUserClient(req)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      supabase: null,
      response: json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        401,
        req
      ),
    }
  }

  return {
    user,
    supabase,
    response: null,
  }
}
