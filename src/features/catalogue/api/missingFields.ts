/**
 * Missing-field helpers for catalogue review badges (FR-SCH-05b).
 *
 * Pure functions over extracted payloads — no Supabase, no React, so the
 * review UI can flag gappy items from available data only.
 */

import { isMissingValue } from './catalogueRegistry'

/** Fraction of missing leaf fields above which an item gets the REVIEW badge. */
export const REVIEW_MISSING_RATIO = 1 / 3

function countLeaves(value: unknown, counts: { total: number; missing: number }): void {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      counts.total += 1
      counts.missing += 1
      return
    }
    for (const entry of value) {countLeaves(entry, counts)}
    return
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      counts.total += 1
      counts.missing += 1
      return
    }
    for (const [, entry] of entries) {countLeaves(entry, counts)}
    return
  }
  counts.total += 1
  if (isMissingValue(value)) {counts.missing += 1}
}

/** Missing-field ratio of an extracted payload (0–1). */
export function missingRatio(fields: Record<string, unknown>): number {
  const counts = { total: 0, missing: 0 }
  countLeaves(fields, counts)
  if (counts.total === 0) {return 1}
  return counts.missing / counts.total
}
