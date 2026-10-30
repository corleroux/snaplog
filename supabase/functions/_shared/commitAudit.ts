/**
 * Shared audit log helpers for commit flows.
 * Keep domain-specific log context explicit in each handler.
 */

export interface CommitAuditLogger {
  info: (message: string, context?: Record<string, unknown>) => void
  warn: (message: string, context?: Record<string, unknown>) => void
  error: (message: string, context?: Record<string, unknown>) => void
}

/**
 * Creates a set of commit-flow audit log helpers.
 *
 * Standardizes common log event patterns used across vendor and fabric commit flows.
 * All domain-specific context must be provided explicitly by the caller.
 */
export function createCommitAudit(log: CommitAuditLogger) {
  return {
    /**
     * Logs that the request body was successfully parsed.
     */
    requestParsed(context: Record<string, unknown> = {}) {
      log.info('Request parsed', context)
    },

    /**
     * Logs that an idempotent replay was detected (duplicate commit).
     */
    replayDetected(context: Record<string, unknown> = {}) {
      log.info('Duplicate/idempotent replay detected', context)
    },

    /**
     * Logs that a related record was successfully created.
     */
    relatedRecordCreated(recordLabel: string, context: Record<string, unknown> = {}) {
      log.info(`${recordLabel} created`, context)
    },

    /**
     * Logs that a related record failed to create in a non-fatal context.
     */
    relatedRecordFailedNonFatal(recordLabel: string, context: Record<string, unknown> = {}) {
      log.warn(`Failed to create ${recordLabel} (non-critical)`, context)
    },

    /**
     * Logs that the scan session was updated after commit.
     */
    scanSessionUpdated(context: Record<string, unknown> = {}) {
      log.info('Scan session updated', context)
    },

    /**
     * Logs that the scan session update failed.
     */
    scanSessionUpdateFailed(context: Record<string, unknown> = {}) {
      log.error('Scan session update failed', context)
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
  }
}
