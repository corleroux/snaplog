/**
 * Shared Error Types for Edge Functions
 *
 * Provides standardized error classification across all edge functions.
 * Enables better error tracking, reporting, and user feedback.
 */

/**
 * Error type enum for categorizing errors.
 */
export enum ErrorType {
  /** Input validation failed (schema errors, missing fields) */
  VALIDATION_ERROR = 'validation_error',

  /** Network or connectivity issues */
  NETWORK_ERROR = 'network_error',

  /** Third-party provider errors (Gemini, external APIs) */
  PROVIDER_ERROR = 'provider_error',

  /** Request timeout */
  TIMEOUT_ERROR = 'timeout_error',

  /** Authentication or authorization failures */
  AUTHENTICATION_ERROR = 'authentication_error',

  /** Permission denied (user lacks access) */
  PERMISSION_ERROR = 'permission_error',

  /** Resource not found */
  NOT_FOUND_ERROR = 'not_found_error',

  /** Database or persistence errors */
  DATABASE_ERROR = 'database_error',

  /** Unknown or uncategorized errors */
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Classifies an error into a specific error type.
 *
 * @param err - The error to classify
 * @returns The classified ErrorType
 */
export function classifyError(err: unknown): ErrorType {
  if (!(err instanceof Error)) {
    return ErrorType.UNKNOWN_ERROR
  }

  const msg = err.message.toLowerCase()

  // Timeout errors
  if (
    msg.includes('timeout') ||
    msg.includes('timed out')
  ) {
    return ErrorType.TIMEOUT_ERROR
  }

  // Validation errors
  if (
    msg.includes('validation') ||
    msg.includes('invalid') ||
    msg.includes('required') ||
    msg.includes('must be') ||
    msg.includes('schema')
  ) {
    return ErrorType.VALIDATION_ERROR
  }

  // Authentication errors
  if (
    msg.includes('401') ||
    msg.includes('unauthorized') ||
    msg.includes('authentication') ||
    msg.includes('not authenticated') ||
    msg.includes('jwt')
  ) {
    return ErrorType.AUTHENTICATION_ERROR
  }

  // Permission errors
  if (
    msg.includes('403') ||
    msg.includes('forbidden') ||
    msg.includes('permission denied') ||
    msg.includes('unauthorized')
  ) {
    return ErrorType.PERMISSION_ERROR
  }

  // Not found errors
  if (
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('does not exist') ||
    msg.includes('no rows returned')
  ) {
    return ErrorType.NOT_FOUND_ERROR
  }

  // Network errors
  if (
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('connection') ||
    msg.includes('network') ||
    msg.includes('fetch')
  ) {
    return ErrorType.NETWORK_ERROR
  }

  // Provider errors (Gemini, external APIs)
  if (
    msg.includes('gemini') ||
    msg.includes('api error') ||
    msg.includes('provider') ||
    msg.includes('external service')
  ) {
    return ErrorType.PROVIDER_ERROR
  }

  // Database errors
  if (
    msg.includes('database') ||
    msg.includes('constraint') ||
    msg.includes('duplicate') ||
    msg.includes('foreign key') ||
    msg.includes('postgres')
  ) {
    return ErrorType.DATABASE_ERROR
  }

  return ErrorType.UNKNOWN_ERROR
}

/**
 * Gets a user-friendly message for an error type.
 *
 * @param errorType - The error type
 * @returns A user-friendly error message
 */
export function getUserFriendlyMessage(errorType: ErrorType): string {
  switch (errorType) {
    case ErrorType.VALIDATION_ERROR:
      return 'Please check your input and try again.'
    case ErrorType.NETWORK_ERROR:
      return 'Network connection issue. Please check your internet and try again.'
    case ErrorType.PROVIDER_ERROR:
      return 'External service is unavailable. Please try again later.'
    case ErrorType.TIMEOUT_ERROR:
      return 'Request took too long. Please try again.'
    case ErrorType.AUTHENTICATION_ERROR:
      return 'You need to sign in to perform this action.'
    case ErrorType.PERMISSION_ERROR:
      return 'You do not have permission to perform this action.'
    case ErrorType.NOT_FOUND_ERROR:
      return 'The requested resource was not found.'
    case ErrorType.DATABASE_ERROR:
      return 'A database error occurred. Please try again.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Creates an error response object with classified error type.
 *
 * @param err - The error to format
 * @returns An object with error type and user-friendly message
 */
export function formatErrorResponse(err: unknown): {
  error_type: string
  message: string
  user_friendly_message: string
} {
  const errorType = classifyError(err)

  return {
    error_type: errorType,
    message: err instanceof Error ? err.message : 'Unknown error',
    user_friendly_message: getUserFriendlyMessage(errorType),
  }
}
