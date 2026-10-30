/**
 * Extraction Quality API
 *
 * Functions for fetching extraction quality metrics for events.
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Field confidence statistics
 */
export interface FieldConfidenceStats {
  avg: number
  min: number
  max: number
  count: number
}

/**
 * Extraction quality metrics
 */
export interface ExtractionQuality {
  total_extractions: number
  low_confidence_count: number
  critical_confidence_count: number
  average_confidence: number
  field_confidence: Record<string, FieldConfidenceStats>
}

/**
 * Fetch extraction quality metrics for a specific event
 *
 * Analyzes confidence scores from scan session extraction metadata
 * to provide quality metrics for AI-based data extraction.
 *
 * @param eventId - The ID of the event
 * @returns Promise resolving to extraction quality metrics
 */
export async function getExtractionQuality(
  eventId: string
): Promise<ExtractionQuality> {
  // Get all scan sessions for this event with their extraction metadata
  const { data: scanSessions, error } = await supabase
    .from('scan_sessions')
    .select('id, event_id, normalized_payload, status')
    .eq('event_id', eventId)
    .in('status', ['completed', 'committed'])

  if (error) {
    throw new Error(`Failed to fetch extraction quality: ${error.message}`)
  }

  const total_extractions = scanSessions?.length || 0

  // Aggregate confidence scores by field
  const fieldScores: Record<string, number[]> = {}
  let allScores: number[] = []
  let lowConfidenceCount = 0
  let criticalConfidenceCount = 0

  const LOW_CONFIDENCE_THRESHOLD = 0.5
  const CRITICAL_CONFIDENCE_THRESHOLD = 0.3

  for (const session of scanSessions || []) {
    const confidenceScores =
      (session.normalized_payload as any)?.metadata?.confidence_scores || {}

    for (const [field, score] of Object.entries(confidenceScores)) {
      if (typeof score === 'number') {
        // Initialize array for this field if needed
        if (!fieldScores[field]) {
          fieldScores[field] = []
        }
        fieldScores[field].push(score)
        allScores.push(score)

        // Count low/critical confidence
        if (score < CRITICAL_CONFIDENCE_THRESHOLD) {
          criticalConfidenceCount++
        } else if (score < LOW_CONFIDENCE_THRESHOLD) {
          lowConfidenceCount++
        }
      }
    }
  }

  // Calculate per-field statistics
  const field_confidence: Record<string, FieldConfidenceStats> = {}
  for (const [field, scores] of Object.entries(fieldScores)) {
    field_confidence[field] = {
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      min: Math.min(...scores),
      max: Math.max(...scores),
      count: scores.length,
    }
  }

  // Calculate overall average confidence
  const average_confidence =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0

  return {
    total_extractions,
    low_confidence_count: lowConfidenceCount,
    critical_confidence_count: criticalConfidenceCount,
    average_confidence,
    field_confidence,
  }
}
