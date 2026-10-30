/**
 * Accepts a raw payload from posthog_errors (stored as PostHog API issue shape).
 */
export interface ErrorReport {
  summary: string
  exception_type: string
  exception_message: string
  fingerprint: string | null
  stack_trace: string | null
  occurrences: number
  affected_users: number
  first_seen: string
  last_seen: string | null
  suggested_action: string
}

export function formatErrorReport(raw: Record<string, unknown>): ErrorReport {
  const exceptionType = String(raw.name ?? raw.exception_type ?? 'Unknown')
  const exceptionMessage = String(raw.description ?? raw.exception_message ?? '')
  const suggestedAction = inferSuggestedAction(exceptionType, exceptionMessage)

  return {
    summary: `[${String(raw.status ?? 'UNKNOWN').toUpperCase()}] ${exceptionType}: ${exceptionMessage}`,
    exception_type: exceptionType,
    exception_message: exceptionMessage,
    fingerprint: raw.fingerprint ? String(raw.fingerprint) : null,
    stack_trace: raw.exception_stack_trace ? String(raw.exception_stack_trace) : null,
    occurrences: Number(raw.occurrence_count ?? 0),
    affected_users: Number(raw.users_count ?? 0),
    first_seen: String(raw.first_seen ?? ''),
    last_seen: raw.last_seen ? String(raw.last_seen) : null,
    suggested_action: suggestedAction,
  }
}

function inferSuggestedAction(type: string, message: string): string {
  if (type === 'SupabaseApiError') {
    return 'Check the Supabase API endpoint, RLS policies, and network connectivity. Verify the table exists and the user has appropriate permissions.'
  }
  if (type === 'AuthSessionError') {
    return 'Check auth session handling — token refresh, session persistence, and sign-out flow. Verify Supabase auth configuration.'
  }
  if (type === 'ApplicationError') {
    return 'Review the feature code path identified in the error context. Check for unhandled edge cases.'
  }
  if (message.includes('chunk') || message.includes('loading')) {
    return 'Likely a deployment/CDN issue — check Vercel deployment logs and verify all chunks are deployed correctly.'
  }
  return 'Inspect the stack trace to identify the failing code path. Add error boundaries and explicit error handling at the source.'
}
