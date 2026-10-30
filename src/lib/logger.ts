/**
 * Frontend structured logging wrapper.
 *
 * Mirrors the edge function `createLogger` pattern.
 * Zero dependencies — uses console methods directly.
 *
 * BLAST RADIUS: ~38 importing files across the codebase.
 * Any rename, signature change, or removal of createLogger()
 * will touch all consumers.
 *
 * Log level is controlled via VITE_LOG_LEVEL env var:
 * - 'debug' → all messages (default in development)
 * - 'info'  → info, warn, error
 * - 'warn'  → warn, error (default in production)
 * - 'error' → error only
 *
 * @example
 * ```ts
 * const logger = createLogger('SyncEngine')
 * logger.info('Sync started', { itemCount: 3 })
 * logger.error('Sync failed', { error: err.message })
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel =
  (import.meta.env.VITE_LOG_LEVEL as LogLevel) ||
  (import.meta.env.PROD ? 'warn' : 'debug')

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel]
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
}

export function createLogger(scope: string): Logger {
  const prefix = `[${scope}]`

  return {
    debug(message: string, context?: Record<string, unknown>) {
      if (shouldLog('debug')) console.debug(prefix, message, context ?? '')
    },
    info(message: string, context?: Record<string, unknown>) {
      if (shouldLog('info')) console.info(prefix, message, context ?? '')
    },
    warn(message: string, context?: Record<string, unknown>) {
      if (shouldLog('warn')) console.warn(prefix, message, context ?? '')
    },
    error(message: string, context?: Record<string, unknown>) {
      if (shouldLog('error')) console.error(prefix, message, context ?? '')
    },
  }
}
