/**
 * Delta Tracking - Field-level change detection
 *
 * Compares two flat objects to determine which fields were modified.
 * Used to show edit indicators on the review screen and store deltas
 * in the commit payload for audit purposes.
 */

export interface FieldDelta {
  field: string
  original: unknown
  modified: unknown
}

/**
 * Compare two objects and return changed fields.
 * Uses shallow comparison (top-level keys only).
 */
export function computeDeltas(
  original: Record<string, unknown>,
  modified: Record<string, unknown>,
  fieldLabels: Record<string, string>
): FieldDelta[] {
  const deltas: FieldDelta[] = []

  for (const key of Object.keys(modified)) {
    if (modified[key] !== original[key]) {
      deltas.push({
        field: fieldLabels[key] || key,
        original: original[key],
        modified: modified[key],
      })
    }
  }

  return deltas
}

/**
 * Check if a specific field was modified.
 */
export function isFieldModified(
  original: Record<string, unknown>,
  modified: Record<string, unknown>,
  field: string
): boolean {
  return original[field] !== modified[field]
}
