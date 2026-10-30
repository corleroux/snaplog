/**
 * Extraction alert evaluation tests
 */

import { describe, it, expect } from 'vitest'
import { evaluateExtractionAlerts, type ExtractionAlertParams } from '../extractionAlerts'

const baseParams: Omit<ExtractionAlertParams, 'confidence'> = {
  warnings: [],
  entityType: 'style',
  entityId: 'scan-session-001',
}

describe('evaluateExtractionAlerts', () => {
  it('returns no alerts for high confidence', () => {
    const alerts = evaluateExtractionAlerts({
      ...baseParams,
      confidence: 0.85,
    })
    expect(alerts).toEqual([])
  })

  it('returns warning for confidence between 0.3 and 0.5', () => {
    const alerts = evaluateExtractionAlerts({
      ...baseParams,
      confidence: 0.4,
    })
    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('low_confidence')
    expect(alerts[0].severity).toBe('warning')
    expect(alerts[0].message).toContain('40%')
    expect(alerts[0].entityType).toBe('style')
    expect(alerts[0].entityId).toBe('scan-session-001')
    expect(alerts[0].timestamp).toBeTruthy()
  })

  it('returns critical for confidence below 0.3', () => {
    const alerts = evaluateExtractionAlerts({
      ...baseParams,
      confidence: 0.2,
    })
    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('low_confidence')
    expect(alerts[0].severity).toBe('critical')
    expect(alerts[0].message).toContain('20%')
  })

  it('returns no alerts for null confidence (manual entry)', () => {
    const alerts = evaluateExtractionAlerts({
      ...baseParams,
      confidence: null,
    })
    expect(alerts).toEqual([])
  })

  it('returns no alerts for confidence exactly at threshold 0.5', () => {
    const alerts = evaluateExtractionAlerts({
      ...baseParams,
      confidence: 0.5,
    })
    expect(alerts).toEqual([])
  })

  it('returns warning for confidence just below 0.5', () => {
    const alerts = evaluateExtractionAlerts({
      ...baseParams,
      confidence: 0.49,
    })
    expect(alerts).toHaveLength(1)
    expect(alerts[0].severity).toBe('warning')
  })

  it('returns critical for confidence exactly at 0.3 boundary', () => {
    const alerts = evaluateExtractionAlerts({
      ...baseParams,
      confidence: 0.29,
    })
    expect(alerts).toHaveLength(1)
    expect(alerts[0].severity).toBe('critical')
  })

  it('uses correct entity type in message for vendor', () => {
    const alerts = evaluateExtractionAlerts({
      ...baseParams,
      entityType: 'vendor',
      confidence: 0.35,
    })
    expect(alerts[0].message).toContain('vendor')
    expect(alerts[0].entityType).toBe('vendor')
  })

  it('rounds confidence percentage correctly', () => {
    const alerts = evaluateExtractionAlerts({
      ...baseParams,
      confidence: 0.456,
    })
    expect(alerts[0].message).toContain('46%')
  })
})
