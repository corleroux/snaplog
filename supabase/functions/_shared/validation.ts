/**
 * Shared primitive validation helpers for edge functions.
 * Keep business-rule validation local to each handler.
 */

/**
 * Validates that a value is a valid UUID.
 * @throws Error if the value is not a valid UUID
 */
export function validateUUID(value: string, fieldName: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    throw new Error(`Invalid ${fieldName}: must be a valid UUID`)
  }
}

/**
 * Requires that a field is present (not null or undefined).
 * Returns the value if present, throws otherwise.
 * @throws Error if the value is null or undefined
 */
export function requireField<T>(
  value: T | null | undefined,
  fieldName: string
): T {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`)
  }
  return value
}

/**
 * Requires that a string field is present and non-empty after trimming.
 * Returns the trimmed value if valid, throws otherwise.
 * @throws Error if the value is missing or empty
 */
export function requireNonEmptyString(
  value: string | null | undefined,
  fieldName: string
): string {
  if (!value || value.trim() === '') {
    throw new Error(`${fieldName} is required`)
  }
  return value
}

/**
 * Requires that a value is a plain object (not null, not an array).
 * @throws Error if the value is not an object or is an array
 */
export function requireObject(
  value: unknown,
  fieldName: string
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${fieldName} is required`)
  }
  return value as Record<string, unknown>
}

/**
 * Requires that a value is an array.
 * @throws Error if the value is not an array
 */
export function requireArray<T>(
  value: T[] | null | undefined,
  fieldName: string
): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} is required`)
  }
  return value
}
