/**
 * Extraction Retry Logic
 *
 * Provides configurable retry with exponential backoff for extraction calls.
 * Classifies errors as retryable vs permanent, and only retries transient failures.
 */

import { createLogger } from '@/lib/logger'
import { posthog } from '@/lib/posthog'
import { recordExtractionMetric, type ExtractionEntityType } from './extractionTracing'

const logger = createLogger('ExtractionRetry')

/** Configuration for retry behavior */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 2) */
  maxRetries: number
  /** Base delay in ms for exponential backoff (default: 2000) */
  baseDelayMs: number
  /** Maximum delay cap in ms (default: 15000) */
  maxDelayMs: number
  /** Jitter factor 0-1 to randomize delay (default: 0.25) */
  jitterFactor: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 2000,
  maxDelayMs: 15000,
  jitterFactor: 0.25,
}

/**
 * Error types that are safe to retry.
 * Network errors, timeouts, and server errors are transient.
 */
const RETRYABLE_ERROR_PATTERNS: readonly (string | RegExp)[] = [
  'Failed to fetch',
  'NetworkError',
  'Network request failed',
  'fetch failed',
  'timeout',
  'Timeout',
  'aborted',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  /5\d{2}/, // 5xx status codes
  'Service temporarily unavailable',
  'Internal server error',
  'Bad Gateway',
  'Gateway Timeout',
  'Service Unavailable',
  'The user aborted a request',
  'Load failed',
  'network error',
] as const

/**
 * Check if an error is retryable.
 *
 * Retryable errors include:
 * - Network failures (offline, DNS, connection reset)
 * - Timeouts
 * - Server errors (5xx)
 *
 * NOT retryable:
 * - Authentication errors (401, 403)
 * - Validation errors (400, 422)
 * - Not found (404)
 * - Rate limiting (429)
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false

  const message = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : String(error)

  return RETRYABLE_ERROR_PATTERNS.some(pattern => {
    if (typeof pattern === 'string') {
      return message.includes(pattern)
    }
    return pattern.test(message)
  })
}

/**
 * Classify an extraction error for user-facing messages.
 *
 * Returns a user-friendly message and suggested action.
 */
export function classifyExtractionError(error: unknown): {
  category: 'network' | 'timeout' | 'auth' | 'server' | 'validation' | 'unknown'
  userMessage: string
  suggestedAction: string
  retryable: boolean
} {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : String(error)

  const lowerMessage = message.toLowerCase()

  // Network errors
  if (
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('net::') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('enotfound') ||
    lowerMessage.includes('load failed')
  ) {
    return {
      category: 'network',
      userMessage: 'Network connection failed',
      suggestedAction: 'Check your internet connection and try again. If using a VPN, try disabling it temporarily.',
      retryable: true,
    }
  }

  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('aborted')) {
    return {
      category: 'timeout',
      userMessage: 'Extraction timed out',
      suggestedAction: 'The server is taking too long to respond. Try again in a moment, or check your connection speed.',
      retryable: true,
    }
  }

  // Authentication errors
  if (
    lowerMessage.includes('401') ||
    lowerMessage.includes('403') ||
    lowerMessage.includes('auth') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('forbidden')
  ) {
    return {
      category: 'auth',
      userMessage: 'Authentication required',
      suggestedAction: 'Your session may have expired. Please sign out and sign in again.',
      retryable: false,
    }
  }

  // Server errors
  if (
    lowerMessage.includes('500') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503') ||
    lowerMessage.includes('504') ||
    lowerMessage.includes('internal server') ||
    lowerMessage.includes('service unavailable')
  ) {
    return {
      category: 'server',
      userMessage: 'Server temporarily unavailable',
      suggestedAction: 'The extraction service is experiencing issues. Your data has been saved and will be retried automatically.',
      retryable: true,
    }
  }

  // Validation errors
  if (
    lowerMessage.includes('400') ||
    lowerMessage.includes('422') ||
    lowerMessage.includes('validation') ||
    lowerMessage.includes('no fabric detected') ||
    lowerMessage.includes('multiple fabrics detected')
  ) {
    return {
      category: 'validation',
      userMessage: lowerMessage.includes('no fabric detected') 
        ? 'No fabric detected in image' 
        : lowerMessage.includes('multiple fabrics detected')
          ? 'Multiple fabrics detected'
          : 'Invalid data',
      suggestedAction: lowerMessage.includes('no fabric detected')
        ? 'Make sure the fabric is clearly visible and well-lit.'
        : 'Try to capture only one fabric style at a time for best results.',
      retryable: false,
    }
  }

  // Unknown errors
  return {
    category: 'unknown',
    userMessage: 'Extraction failed',
    suggestedAction: 'An unexpected error occurred. Please try again. If the problem persists, save your work for later.',
    retryable: true, // Default to retryable for unknown errors
  }
}

/**
 * Execute a function with retry logic.
 *
 * Retries only on retryable errors with exponential backoff + jitter.
 * Reports each retry attempt to Sentry and metrics.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  entityType: ExtractionEntityType,
  scanType: string,
  traceId: string,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: unknown

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      const result = await fn()

      // Record successful retry if we had previous failures
      if (attempt > 0) {
        recordExtractionMetric({
          entityType,
          scanType,
          status: 'retry',
          durationMs: 0,
          traceId,
          retryAttempt: attempt,
        })

        logger.info(`Retry succeeded on attempt ${attempt}`, { traceId, attempt })
      }

      return result
    } catch (error) {
      lastError = error
      const classification = classifyExtractionError(error)

      // Don't retry non-retryable errors
      if (!classification.retryable) {
        logger.warn(`Non-retryable error: ${classification.category}`, {
          traceId,
          error: classification.userMessage,
        })
        throw error
      }

      // No more retries left
      if (attempt >= fullConfig.maxRetries) {
        logger.warn(`Max retries (${fullConfig.maxRetries}) exceeded`, {
          traceId,
          error: classification.userMessage,
        })
        throw error
      }

      // Calculate backoff delay with jitter
      const delayMs = Math.min(
        fullConfig.baseDelayMs * Math.pow(2, attempt) +
        Math.random() * fullConfig.baseDelayMs * fullConfig.jitterFactor,
        fullConfig.maxDelayMs
      )

      logger.info(`Retryable error, retrying in ${Math.round(delayMs)}ms`, {
        traceId,
        attempt: attempt + 1,
        maxRetries: fullConfig.maxRetries,
        category: classification.category,
      })

      posthog.capture('extraction_retry', {
        entity_type: entityType,
        attempt: attempt + 1,
        max_retries: fullConfig.maxRetries,
        error_category: classification.category,
        next_retry_ms: Math.round(delayMs),
        trace_id: traceId,
      })

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}
