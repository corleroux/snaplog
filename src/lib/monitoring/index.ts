/**
 * Monitoring barrel export.
 *
 * Centralises access to extraction tracing, retry logic, and metrics.
 */

export {
  startExtractionTrace,
  generateCorrelationId,
  getRecentMetrics,
  getExtractionStats,
  recordExtractionMetric,
  type ExtractionTraceContext,
  type ExtractionEntityType,
  type ExtractionMetric,
} from './extractionTracing'

export {
  withRetry,
  isRetryableError,
  classifyExtractionError,
  type RetryConfig,
} from './extractionRetry'

export {
  withExtractionTimeout,
  isTimeoutError,
  ExtractionTimeoutError,
  DEFAULT_EXTRACTION_TIMEOUT_MS,
  type TimeoutConfig,
} from './extractionTimeout'
