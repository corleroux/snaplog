/**
 * Centralized camelCase ↔ snake_case mapping utility.
 *
 * Eliminates manual field-by-field conversion throughout the codebase.
 * Handles nested objects and arrays recursively.
 *
 * Usage:
 *   import { toCamelCase, toSnakeCase } from '@/utils/caseMapping'
 *   const snakeObj = toSnakeCase({ companyName: 'Test' })  // { company_name: 'Test' }
 *   const camelObj = toCamelCase({ company_name: 'Test' })  // { companyName: 'Test' }
 */

/**
 * Convert a snake_case string to camelCase.
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert a camelCase string to snake_case.
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Recursively convert all object keys from snake_case to camelCase.
 *
 * Handles:
 * - Plain objects: keys are converted
 * - Arrays: each element is recursively converted
 * - Primitives: returned as-is
 * - null/undefined: returned as-is
 */
export function toCamelCase<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item)) as T
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key)
    result[camelKey] = toCamelCase(value)
  }
  return result as T
}

/**
 * Recursively convert all object keys from camelCase to snake_case.
 *
 * Handles:
 * - Plain objects: keys are converted
 * - Arrays: each element is recursively converted
 * - Primitives: returned as-is
 * - null/undefined: returned as-is
 */
export function toSnakeCase<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item)) as T
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key)
    result[snakeKey] = toSnakeCase(value)
  }
  return result as T
}

/**
 * Convert an object's keys using an explicit key mapping.
 *
 * Use this when field names differ between representations
 * beyond simple case conversion (e.g., `website` ↔ `website_url`).
 *
 * @param obj Source object
 * @param keyMap Mapping of source keys to target keys
 * @returns New object with mapped keys
 */
export function mapKeys<T extends Record<string, unknown>>(
  obj: T,
  keyMap: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const targetKey = keyMap[key] ?? key
    result[targetKey] = value
  }
  return result
}
