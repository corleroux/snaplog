/**
 * Extraction Tracing Module
 *
 * Tracks extraction pipeline timing and reports metrics to PostHog.
 * Generates correlation IDs that propagate from frontend to edge functions,
 * enabling end-to-end request tracing.
 */

import { posthog } from '@/lib/posthog'
import { createLogger } from '@/lib/logger'

const logger = createLogger('ExtractionTrace')

/** Extraction entity type */
export type ExtractionEntityType = 'vendor' | 'fabric'

/** Context for an extraction trace */
export interface ExtractionTraceContext {
  eventId: string
  vendorId?: string
  styleId?: string
  scanSessionId?: string
  scanType?: string
}

/** A single timed span within an extraction trace */
export interface ExtractionSpan {
  name: string
  startedAt: number
  durationMs?: number
  status: 'ok' | 'error'
  error?: string
}

/** An extraction trace that tracks the full pipeline */
export interface ExtractionTrace {
  id: string
  entityType: ExtractionEntityType
  context: ExtractionTraceContext
  startedAt: number
  spans: ExtractionSpan[]
  status: 'ok' | 'error' | 'cancelled'
  error?: string
}

// Active traces for the current session
const activeTraces = new Map<string, ExtractionTrace>()

/**
 * Generate a correlation ID for request tracing.
 * Format: ext_{entity}_{timestamp}_{random}
 */
export function generateCorrelationId(entityType: ExtractionEntityType): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 8)
  return `ext_${entityType}_${ts}_${rand}`
}

/**
 * Start a new extraction trace.
 *
 * Creates a Sentry span and returns a trace object for tracking
 * child spans within the extraction pipeline.
 */
export function startExtractionTrace(
  entityType: ExtractionEntityType,
  context: ExtractionTraceContext
): ExtractionTrace & {
  span<T>(name: string, fn: () => Promise<T>): Promise<T>
  finish(): void
  finishWithError(error: unknown): void
  updateContext(updates: Partial<ExtractionTraceContext>): void
} {
  const id = generateCorrelationId(entityType)

  const trace: ExtractionTrace = {
    id,
    entityType,
    context,
    startedAt: Date.now(),
    spans: [],
    status: 'ok',
  }

  activeTraces.set(id, trace)

  // Register extraction context as PostHog super properties for this session
  posthog.register({
    'extraction.trace_id': id,
    'extraction.entity_type': entityType,
    ...(context.eventId ? { 'extraction.event_id': context.eventId } : {}),
    ...(context.vendorId ? { 'extraction.vendor_id': context.vendorId } : {}),
    ...(context.scanType ? { 'extraction.scan_type': context.scanType } : {}),
  })

  logger.info(`Extraction trace started: ${id}`, { entityType, ...context })

  return {
    ...trace,

    /**
     * Execute a function within a timed span.
     * Timing is recorded in the in-memory trace; PostHog receives the metric on finish.
     */
    async span<T>(name: string, fn: () => Promise<T>): Promise<T> {
      const spanStart = Date.now()
      try {
        const result = await fn()
        const durationMs = Date.now() - spanStart

        trace.spans.push({
          name,
          startedAt: spanStart,
          durationMs,
          status: 'ok',
        })

        logger.info(`Span completed: ${name}`, { traceId: id, durationMs })
        return result
      } catch (err) {
        const durationMs = Date.now() - spanStart
        const errorMessage = err instanceof Error ? err.message : String(err)

        trace.spans.push({
          name,
          startedAt: spanStart,
          durationMs,
          status: 'error',
          error: errorMessage,
        })

        logger.error(`Span failed: ${name}`, { traceId: id, error: errorMessage })
        throw err
      }
    },

    /**
     * Update trace context (e.g., add scanSessionId after creation).
     */
    updateContext(updates: Partial<ExtractionTraceContext>): void {
      Object.assign(trace.context, updates)
      if (updates.scanSessionId) {
        posthog.register({ 'extraction.scan_session_id': updates.scanSessionId })
      }
    },

    /**
     * Mark trace as successfully completed.
     */
    finish(): void {
      trace.status = 'ok'
      const totalDuration = Date.now() - trace.startedAt
      trace.spans.push({
        name: 'total',
        startedAt: trace.startedAt,
        durationMs: totalDuration,
        status: 'ok',
      })

      activeTraces.delete(id)

      logger.info(`Extraction trace completed: ${id}`, {
        totalDurationMs: totalDuration,
        spanCount: trace.spans.length,
      })

      recordExtractionMetric({
        entityType,
        scanType: context.scanType ?? 'unknown',
        status: 'success',
        durationMs: totalDuration,
        traceId: id,
      })
    },

    /**
     * Mark trace as failed with error details.
     */
    finishWithError(error: unknown): void {
      trace.status = 'error'
      trace.error = error instanceof Error ? error.message : String(error)
      const totalDuration = Date.now() - trace.startedAt

      activeTraces.delete(id)

      logger.error(`Extraction trace failed: ${id}`, {
        error: trace.error,
        totalDurationMs: totalDuration,
      })

      recordExtractionMetric({
        entityType,
        scanType: context.scanType ?? 'unknown',
        status: 'error',
        durationMs: totalDuration,
        traceId: id,
        error: trace.error,
      })
    },
  }
}

// ─── Metrics ─────────────────────────────────────────────────────────

export interface ExtractionMetric {
  entityType: ExtractionEntityType
  scanType: string
  status: 'success' | 'error' | 'retry' | 'offline_queued'
  durationMs: number
  traceId: string
  error?: string
  retryAttempt?: number
}

const MAX_METRICS = 100
const recentMetrics: ExtractionMetric[] = []

/**
 * Record an extraction metric.
 * Stores the last 100 metrics locally for diagnostics.
 * Also sends a custom event to PostHog for funnel and performance analysis.
 */
export function recordExtractionMetric(metric: ExtractionMetric): void {
  recentMetrics.push(metric)

  // Trim to max size
  while (recentMetrics.length > MAX_METRICS) {
    recentMetrics.shift()
  }

  posthog.capture('extraction_metric', {
    entity_type: metric.entityType,
    scan_type: metric.scanType,
    status: metric.status,
    duration_ms: metric.durationMs,
    trace_id: metric.traceId,
    ...(metric.error ? { error: metric.error } : {}),
    ...(metric.retryAttempt !== undefined ? { retry_attempt: metric.retryAttempt } : {}),
  })
}

/**
 * Get recent extraction metrics for diagnostics.
 */
export function getRecentMetrics(limit = 20): ExtractionMetric[] {
  return recentMetrics.slice(-limit)
}

/**
 * Get extraction success rate from recent metrics.
 */
export function getExtractionStats(): {
  total: number
  success: number
  error: number
  retried: number
  offlineQueued: number
  avgDurationMs: number
  successRate: number
} {
  const total = recentMetrics.length
  const success = recentMetrics.filter(m => m.status === 'success').length
  const error = recentMetrics.filter(m => m.status === 'error').length
  const retried = recentMetrics.filter(m => m.status === 'retry').length
  const offlineQueued = recentMetrics.filter(m => m.status === 'offline_queued').length
  const durations = recentMetrics.filter(m => m.status === 'success').map(m => m.durationMs)
  const avgDurationMs = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0

  return {
    total,
    success,
    error,
    retried,
    offlineQueued,
    avgDurationMs,
    successRate: total > 0 ? Math.round((success / total) * 100) : 0,
  }
}
