/**
 * Shared structured logging for Supabase Edge Functions
 *
 * Provides a factory for consistent log formatting across all functions.
 */

export function createLogger(functionName: string) {
  const base = (
    level: 'info' | 'warn' | 'error',
    message: string,
    context: Record<string, unknown> = {}
  ) => {
    const payload = JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      function: functionName,
      ...context,
    })

    if (level === 'info') console.log(payload)
    else if (level === 'warn') console.warn(payload)
    else console.error(payload)
  }

  return {
    info: (message: string, context: Record<string, unknown> = {}) =>
      base('info', message, context),
    warn: (message: string, context: Record<string, unknown> = {}) =>
      base('warn', message, context),
    error: (message: string, context: Record<string, unknown> = {}) =>
      base('error', message, context),
  }
}
