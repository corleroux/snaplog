/**
 * Shared audit log helpers for extraction flows.
 * Keep domain-specific extraction context explicit in each handler.
 */

export interface ExtractAuditLogger {
  info: (message: string, context?: Record<string, unknown>) => void
  warn: (message: string, context?: Record<string, unknown>) => void
  error: (message: string, context?: Record<string, unknown>) => void
}

/**
 * Creates a set of extract-flow audit log helpers.
 *
 * Standardizes common log event patterns used across vendor and fabric extraction flows.
 * All domain-specific context must be provided explicitly by the caller.
 */
export function createExtractAudit(log: ExtractAuditLogger) {
  return {
    /**
     * Logs that the request body was successfully parsed.
     */
    requestParsed(context: Record<string, unknown> = {}) {
      log.info('Request received', context)
    },

    /**
     * Logs that extraction processing has started (scan session marked processing).
     */
    processingStarted(context: Record<string, unknown> = {}) {
      log.info('Scan session set to processing', context)
    },

    /**
     * Logs that source data fetch from storage has started.
     */
    sourceDataFetchStarted(context: Record<string, unknown> = {}) {
      log.info('Storage fetch started', context)
    },

    /**
     * Logs that the AI extraction call has started.
     */
    extractionStarted(context: Record<string, unknown> = {}) {
      log.info('Gemini call started', context)
    },

    /**
     * Logs that the AI extraction completed successfully.
     */
    extractionCompleted(context: Record<string, unknown> = {}) {
      log.info('Extraction completed', context)
    },

    /**
     * Logs that payload normalization completed.
     */
    normalizationCompleted(context: Record<string, unknown> = {}) {
      log.info('Normalization completed', context)
    },

    /**
     * Logs that the scan session was updated with extraction results.
     */
    scanSessionUpdated(context: Record<string, unknown> = {}) {
      log.info('Scan session updated successfully', context)
    },

    /**
     * Logs that the function completed successfully.
     */
    completed(context: Record<string, unknown> = {}) {
      log.info('Function completed', context)
    },

    /**
     * Logs that the function failed.
     */
    failed(context: Record<string, unknown> = {}) {
      log.error('Function failed', context)
    },

    /**
     * Logs that updating scan session to failed state failed (non-critical).
     */
    failedStateUpdateWarning(context: Record<string, unknown> = {}) {
      log.warn('Failed to update scan session with error status', context)
    },

    /**
     * Logs that the AI extraction call failed.
     */
    extractionFailed(context: Record<string, unknown> = {}) {
      log.error('Gemini call failed', context)
    },

    /**
     * Logs that validation failed.
     */
    validationFailed(context: Record<string, unknown> = {}) {
      log.error('Validation failed', context)
    },
  }
}
