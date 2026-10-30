/**
 * Extraction Timeout Utility
 *
 * Wraps extraction calls with a configurable timeout.
 * When the call exceeds the timeout, throws a distinctive error
 * that can be identified by `isTimeoutError()` for targeted UI handling.
 *
 * Uses AbortController where supported, falls back to Promise.race.
 */

import { createLogger } from '@/lib/logger'

const logger = createLogger('ExtractionTimeout')

/** Default timeout for extraction calls: 30 seconds */
export const DEFAULT_EXTRACTION_TIMEOUT_MS = 30000

/** Timeout configuration */
export interface TimeoutConfig {
  /** Timeout in milliseconds. Default: 30000 */
  timeoutMs?: number
}

/**
 * Symbol used to mark timeout errors.
 * Allows reliable identification without string matching.
 */
const TIMEOUT_SYMBOL = Symbol.for('extraction.timeout')

/**
 * Error thrown when an extraction call exceeds the timeout.
 */
export class ExtractionTimeoutError extends Error {
  readonly [TIMEOUT_SYMBOL] = true
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`Extraction timed out after ${timeoutMs}ms. The server is taking too long to respond.`)
    this.name = 'ExtractionTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

/**
 * Check if an error is a timeout error from `withExtractionTimeout`.
 */
export function isTimeoutError(error: unknown): error is ExtractionTimeoutError {
  return (
    typeof error === 'object' &&
    error !== null &&
    TIMEOUT_SYMBOL in error &&
    (error as ExtractionTimeoutError)[TIMEOUT_SYMBOL] === true
  )
}

/**
 * Execute a function with a timeout.
 *
 * - If the function completes before the timeout, returns its result.
 * - If the timeout fires first, throws an `ExtractionTimeoutError`.
 * - If the function throws before the timeout, re-throws the original error.
 *
 * @param fn - Async function to execute
 * @param config - Timeout configuration
 * @returns The function's return value
 * @throws ExtractionTimeoutError on timeout, or the original error from fn
 */
export async function withExtractionTimeout<T>(
  fn: () => Promise<T>,
  config: TimeoutConfig = {}
): Promise<T> {
  const timeoutMs = config.timeoutMs ?? DEFAULT_EXTRACTION_TIMEOUT_MS

  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new ExtractionTimeoutError(timeoutMs))
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([fn(), timeoutPromise])
    return result
  } catch (error) {
    if (isTimeoutError(error)) {
      logger.warn(`Extraction timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }
}
