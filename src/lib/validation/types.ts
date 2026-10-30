/**
 * Shared validation types for the validation service.
 *
 * These types provide a consistent interface across extraction validation,
 * form input validation, and runtime validation.
 */

import type { ZodError, ZodSchema } from 'zod'

/**
 * Standard validation result.
 */
export interface ValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
}

/**
 * Detailed field-level validation error.
 */
export interface FieldError {
  path: string
  message: string
}

/**
 * Result of validating data against a Zod schema.
 */
export interface SchemaValidationResult<T = unknown> {
  success: boolean
  data?: T
  errors?: FieldError[]
}

/**
 * Convert a ZodError into a flat FieldError array.
 */
export function zodErrorsToFieldErrors(error: ZodError): FieldError[] {
  return error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

/**
 * Validate data against a Zod schema and return a SchemaValidationResult.
 */
export function validateWithSchema<T>(
  schema: ZodSchema<T>,
  data: unknown,
): SchemaValidationResult<T> {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return {
    success: false,
    errors: zodErrorsToFieldErrors(result.error),
  }
}
