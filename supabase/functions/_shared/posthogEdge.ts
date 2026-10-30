/**
 * Minimal PostHog client for Supabase Edge Functions (Deno runtime).
 *
 * Sends error and custom events to PostHog's /capture/ endpoint.
 * No external SDK dependency required.
 *
 * Usage:
 *   import { initEdgePostHog, captureException } from '../_shared/posthogEdge.ts'
 *   initEdgePostHog() // reads POSTHOG_API_KEY and POSTHOG_HOST from env
 *   // in catch blocks:
 *   captureException(error, { tags: { function: 'my-function' } })
 */

let _apiKey = ''
let _host = 'https://eu.i.posthog.com'
let _environment = 'production'

/**
 * Initialize PostHog by reading POSTHOG_API_KEY and POSTHOG_HOST from environment.
 * Call once at module level or function startup.
 */
export function initEdgePostHog(): void {
  _apiKey = Deno.env.get('POSTHOG_API_KEY') ?? ''
  _host = Deno.env.get('POSTHOG_HOST') ?? 'https://eu.i.posthog.com'
  _environment = Deno.env.get('DENO_ENV') || 'production'
}

/**
 * Capture a custom event in PostHog.
 * Returns immediately — errors are sent async and failures are silently ignored.
 */
export function captureEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {}
): void {
  if (!_apiKey) return

  fetch(`${_host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: _apiKey,
      event,
      distinct_id: distinctId,
      properties: {
        ...properties,
        environment: _environment,
        $lib: 'posthog-edge',
      },
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {
    // Silently ignore — PostHog is non-critical infrastructure
  })
}

/**
 * Capture an exception in PostHog.
 * The distinct_id is the edge function name so errors group by function.
 * Returns immediately — fire-and-forget.
 */
export function captureException(
  error: unknown,
  context: { tags?: Record<string, string>; extra?: Record<string, unknown> } = {}
): void {
  if (!_apiKey) return

  const err = error instanceof Error ? error : new Error(String(error))
  const functionName = context.tags?.['function'] ?? 'edge-function'

  captureEvent(functionName, '$exception', {
    $exception_message: err.message,
    $exception_type: err.name,
    $exception_stack_trace: err.stack,
    ...context.tags,
    ...context.extra,
  })
}
