/**
 * Health Check Edge Function
 *
 * Returns 200 when all dependencies are reachable, 503 when degraded.
 * Checks:
 *  1. Database connectivity (via Supabase admin client)
 *  2. Active extraction provider reachability (FR-MOD-02c) — resolved the
 *     same way as getProvider (EXTRACTION_PROVIDER, default muse-spark),
 *     via each provider's lightweight models-list endpoint. Never sends a
 *     chat completion from a health probe (no inference spend).
 *
 * No authentication required — this is a public endpoint.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors, requireMethod, json } from '../_shared/http.ts'
import { createAdminClient } from '../_shared/supabase.ts'
import { createLogger } from '../_shared/logger.ts'

const log = createLogger('health-check')

interface ProviderCheck {
  ok: boolean
  provider: string
  latency_ms?: number
  error?: string
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded'
  checks: {
    database: { ok: boolean; latency_ms?: number; error?: string }
    extraction_api: ProviderCheck
  }
  timestamp: string
  version: string
}

/**
 * Resolve the active extraction provider the same way getProvider does
 * (EXTRACTION_PROVIDER, default muse-spark).
 */
function activeProvider(): string {
  return (Deno.env.get('EXTRACTION_PROVIDER') || 'muse-spark').trim().toLowerCase()
}

/**
 * Lightweight reachability probe for the active provider: a models-list GET
 * with a 5s timeout, no retries, no inference. Returns null when the
 * provider's key is not configured (same contract as the old check).
 */
async function checkProvider(provider: string): Promise<ProviderCheck> {
  const start = performance.now()
  const timedOut = (message: string): ProviderCheck => ({
    ok: false,
    provider,
    latency_ms: Math.round(performance.now() - start),
    error: message,
  })

  try {
    if (provider === 'muse-spark') {
      const apiKey = Deno.env.get('MODEL_API_KEY')
      if (!apiKey) return { ok: false, provider, error: 'MODEL_API_KEY not configured' }
      const response = await fetch('https://api.meta.ai/v1/models', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      return {
        ok: response.ok,
        provider,
        latency_ms: Math.round(performance.now() - start),
        ...(!response.ok ? { error: `HTTP ${response.status}` } : {}),
      }
    }

    if (provider === 'muse-spark-open') {
      const proxyToken = Deno.env.get('MODAL_PROXY_TOKEN')
      if (!proxyToken) return { ok: false, provider, error: 'MODAL_PROXY_TOKEN not configured' }
      const baseUrl = (Deno.env.get('SPARK_OPEN_BASE_URL') || 'https://inference.us-west.modal.direct/v1').replace(/\/+$/, '')
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${proxyToken}` },
        signal: AbortSignal.timeout(5000),
      })
      return {
        ok: response.ok,
        provider,
        latency_ms: Math.round(performance.now() - start),
        ...(!response.ok ? { error: `HTTP ${response.status}` } : {}),
      }
    }

    if (provider === 'gemini') {
      const apiKey = Deno.env.get('GEMINI_API_KEY')
      if (!apiKey) return { ok: false, provider, error: 'GEMINI_API_KEY not configured' }
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        },
      )
      return {
        ok: response.ok,
        provider,
        latency_ms: Math.round(performance.now() - start),
        ...(!response.ok ? { error: `HTTP ${response.status}` } : {}),
      }
    }

    return { ok: false, provider, error: `Unknown EXTRACTION_PROVIDER "${provider}"` }
  } catch (err) {
    return timedOut(err instanceof Error ? err.message : 'Unknown error')
  }
}

serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const methodErr = requireMethod(req, 'GET')
  if (methodErr) return methodErr

  const checks: HealthCheckResult['checks'] = {
    database: { ok: false },
    extraction_api: { ok: false, provider: activeProvider() },
  }

  // Check 1: Database connectivity
  const dbStart = performance.now()
  try {
    const adminClient = createAdminClient()
    const { error: dbError } = await adminClient
      .from('events')
      .select('id')
      .limit(1)
      .maybeSingle()

    checks.database = {
      ok: !dbError,
      latency_ms: Math.round(performance.now() - dbStart),
      ...(dbError ? { error: dbError.message } : {}),
    }
  } catch (err) {
    checks.database = {
      ok: false,
      latency_ms: Math.round(performance.now() - dbStart),
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }

  // Check 2: Active extraction provider reachability (FR-MOD-02c)
  checks.extraction_api = await checkProvider(activeProvider())

  const allHealthy = checks.database.ok && checks.extraction_api.ok
  const result: HealthCheckResult = {
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
    version: Deno.env.get('DENO_DEPLOYMENT_ID') ?? 'local',
  }

  log.info('Health check completed', { status: result.status })

  return json(result, allHealthy ? 200 : 503)
})
