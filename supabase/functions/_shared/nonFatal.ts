/**
 * Shared helpers for non-fatal async operations.
 * Keep domain-specific payload construction and logging local to each handler.
 */

export interface NonFatalResult<T> {
  data: T | null
  error: unknown | null
}

/**
 * Executes an async operation in a best-effort / non-fatal manner.
 *
 * Wraps any async operation that should not throw or fail the entire flow.
 * Returns a normalized result object so the caller can decide how to handle
 * success or failure (e.g., log warning, continue, etc.).
 *
 * Handles both:
 * - Thrown exceptions (caught and returned in error field)
 * - Supabase-style results with { data, error } shape
 *
 * @param operation - The async operation to execute
 * @returns A result object with data (if successful) or error (if failed)
 */
export async function attemptNonFatal<T>(
  operation: () => Promise<{ data?: T | null; error?: unknown | null }>
): Promise<NonFatalResult<T>> {
  try {
    const result = await operation()

    return {
      data: result?.data ?? null,
      error: result?.error ?? null,
    }
  } catch (error) {
    return {
      data: null,
      error,
    }
  }
}
