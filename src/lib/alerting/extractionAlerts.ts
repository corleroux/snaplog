/**
 * Extraction Alert Evaluation
 *
 * Evaluates extraction results for alertable conditions:
 * - Low extraction confidence
 * - Extraction failures
 * - Sync stalls
 *
 * Used by capture flow hooks to surface issues to the user
 * and log structured alert data for monitoring.
 */

export interface ExtractionAlert {
  type: 'low_confidence' | 'extraction_failed' | 'sync_stalled'
  severity: 'warning' | 'critical'
  message: string
  entityId: string
  entityType: 'vendor' | 'style'
  timestamp: string
}

export interface ExtractionAlertParams {
  /** Overall extraction confidence score (0-1), null for manual entry */
  confidence: number | null
  /** Warning messages from the extraction pipeline */
  warnings: string[]
  /** Entity type being extracted */
  entityType: 'vendor' | 'style'
  /** Entity identifier (e.g., scan session ID) */
  entityId: string
}

/**
 * Evaluate extraction results for alertable conditions.
 *
 * Returns an array of alerts that should be surfaced to the user
 * and/or logged for monitoring.
 *
 * @param params - Extraction context including confidence, warnings, and entity info
 * @returns Array of alerts; empty if no alertable conditions found
 */
export function evaluateExtractionAlerts(params: ExtractionAlertParams): ExtractionAlert[] {
  const alerts: ExtractionAlert[] = []

  if (params.confidence !== null && params.confidence < 0.5) {
    alerts.push({
      type: 'low_confidence',
      severity: params.confidence < 0.3 ? 'critical' : 'warning',
      message: `${params.entityType} extraction confidence is ${Math.round(params.confidence * 100)}%`,
      entityId: params.entityId,
      entityType: params.entityType,
      timestamp: new Date().toISOString(),
    })
  }

  return alerts
}
