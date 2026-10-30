/**
 * Health Check Edge Function
 *
 * Returns 200 when all dependencies are reachable, 503 when degraded.
 * Checks:
 *  1. Database connectivity (via Supabase admin client)
 *  2. Gemini API reachability (HTTP HEAD to endpoint)
 *
 * No authentication required — this is a public endpoint.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors, requireMethod, json } from '../_shared/http.ts'
import { createAdminClient } from '../_shared/supabase.ts'
import { createLogger } from '../_shared/logger.ts'

const log = createLogger('health-check')

interface HealthCheckResult {
  status: 'healthy' | 'degraded'
  checks: {
    database: { ok: boolean; latency_ms?: number; error?: string }
    gemini_api: { ok: boolean; latency_ms?: number; error?: string }
  }
  timestamp: string
  version: string
}

serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const methodErr = requireMethod(req, 'GET')
  if (methodErr) return methodErr

  const checks: HealthCheckResult['checks'] = {
    database: { ok: false },
    gemini_api: { ok: false },
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

  // Check 2: Gemini API reachability
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    checks.gemini_api = {
      ok: false,
      error: 'GEMINI_API_KEY not configured',
    }
  } else {
    const geminiStart = performance.now()
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        },
      )
      checks.gemini_api = {
        ok: response.ok,
        latency_ms: Math.round(performance.now() - geminiStart),
        ...(!response.ok ? { error: `HTTP ${response.status}` } : {}),
      }
    } catch (err) {
      checks.gemini_api = {
        ok: false,
        latency_ms: Math.round(performance.now() - geminiStart),
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  const allHealthy = checks.database.ok && checks.gemini_api.ok
  const result: HealthCheckResult = {
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
    version: Deno.env.get('DENO_DEPLOYMENT_ID') ?? 'local',
  }

  log.info('Health check completed', { status: result.status })

  return json(result, allHealthy ? 200 : 503)
})
