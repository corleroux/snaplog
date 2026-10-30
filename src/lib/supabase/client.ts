import { createClient } from '@supabase/supabase-js'

import { env } from '@/config/env'
import { AuthSessionError, SupabaseApiError } from '@/lib/errors'
import { posthog } from '@/lib/posthog'

function createSupabaseFetch(): typeof fetch {
  return async (input, init) => {
    const response = await fetch(input, init)

    if (response.ok) return response

    const clone = response.clone()
    const path = typeof input === 'string' ? new URL(input).pathname : input instanceof URL ? input.pathname : input.url
    const method = init?.method ?? 'GET'

    let body: Record<string, unknown> | null = null
    try {
      body = await clone.json()
    } catch {
      try {
        body = { text: await clone.text() }
      } catch {
        // body already consumed elsewhere — ignore
      }
    }

    const supaCode = body?.code ? String(body.code) : undefined
    const supaMessage = typeof body?.message === 'string' ? body.message : undefined
    const supaHint = typeof body?.hint === 'string' ? body.hint : undefined
    const supaDetail = (supaCode ? ` [${supaCode}]` : '') + (supaHint ? ` — ${supaHint}` : '')
  const supabaseError = new SupabaseApiError({
    status: response.status,
    method,
    path,
    message: `Supabase ${response.status} ${method} ${path}${supaDetail}`,
    supabaseCode: supaCode,
    supabaseHint: supaHint,
  })

  posthog.captureException(supabaseError, {
    $exception_fingerprint: supabaseError.fingerprint,
    $session_id: posthog.get_session_id(),
    http_status: response.status,
    supabase_method: method,
    supabase_path: path,
    supabase_error_code: supaCode,
    supabase_error_message: supaMessage,
    supabase_hint: supaHint,
    response_body: body,
  })

    return response
  }
}

/**
 * Supabase client for frontend.
 *
 * This client handles authentication and database operations.
 * Auth sessions are automatically persisted to localStorage and
 * included in edge function invocations.
 */
export const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    global: { fetch: createSupabaseFetch() },
    auth: {
      // Store auth session in localStorage for persistence across page reloads
      storage: window.localStorage,
      // Automatically refresh token before expiry
      autoRefreshToken: true,
      // Detect session in URL hash for OAuth redirects
      detectSessionInUrl: true,
      // Persist session across browser sessions
      persistSession: true,
    },
  }
)

/**
 * Refresh the auth session to get a fresh access token.
 *
 * This should be called before invoking edge functions that require authentication.
 * It ensures the JWT is valid and not expired.
 *
 * @returns Promise that resolves when session is refreshed, or throws if not authenticated
 */
export async function refreshSession(): Promise<void> {
  posthog.addExceptionStep('Refreshing auth session')
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    // Session is corrupt — force sign out so user can re-authenticate
    await supabase.auth.signOut()
    throw new AuthSessionError(`Session error: ${error.message}`, 'init')
  }

  if (!session) {
    throw new AuthSessionError('Not authenticated: No active session', 'expired')
  }

  // Refresh the session to get a fresh access token
  const { error: refreshError } = await supabase.auth.refreshSession()

  if (refreshError) {
    // Refresh failed (expired/revoked token) — force sign out
    await supabase.auth.signOut()
    throw new AuthSessionError(`Failed to refresh session: ${refreshError.message}`, 'refresh')
  }

  posthog.addExceptionStep('Auth session refreshed successfully')
}

/**
 * Invoke an edge function with authentication.
 *
 * This helper refreshes the session before calling the edge function
 * to ensure the JWT is valid and not expired.
 *
 * For non-2xx responses, extracts the JSON error body (edge functions
 * return { error, message }) to provide meaningful error messages.
 *
 * @param name - Edge function name
 * @param options - Invoke options including body
 * @returns Promise with response data or error
 */
export async function invokeEdgeFunction<T = unknown>(
  name: string,
  options: {
    body?: Record<string, unknown>
  } = {}
): Promise<{ data: T | null; error: Error | null }> {
  // Refresh session to ensure we have a valid JWT
  await refreshSession()

  // Call edge function - Supabase client automatically includes auth header
  posthog.addExceptionStep(`Invoking edge function: ${name}`)
  const result = await supabase.functions.invoke<T>(name, {
    body: options.body,
  })

  // If there's an error, try to extract a useful message from the JSON body
  if (result.error) {
    // Check for 401 Unauthorized — session is invalid, force sign out
    const status = (result.error as any)?.status || (result.error as any)?.context?.status
    if (status === 401) {
      await supabase.auth.signOut()
      return { data: null, error: new AuthSessionError('Session expired. Please sign in again.', 'expired') }
    }

    // FunctionsHttpError stores the Response in .context
    const context = (result.error as any)?.context
    if (context && typeof context.json === 'function') {
      try {
        // The response body may already be consumed, but try to get useful info
        const body = (result.error as any).context
        // Some versions of the Supabase client parse the body into the error
        if (body?.message) {
          return { data: null, error: new Error(body.message) }
        }
      } catch {
        // Response body already consumed — fall through to original error
      }
    }

    // Check if the error message itself contains useful JSON
    try {
      const parsed = JSON.parse(result.error.message)
      if (parsed?.message) {
        return { data: null, error: new Error(parsed.message) }
      }
    } catch {
      // Not JSON — use as-is
    }
  }

  return result
}

/**
 * Check if user is authenticated.
 *
 * @returns Promise with authentication status
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  return session !== null
}

/**
 * Get current authenticated user.
 *
 * @returns Promise with user or null if not authenticated
 */
export async function getCurrentUser() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    return null
  }
  return session.user
}
