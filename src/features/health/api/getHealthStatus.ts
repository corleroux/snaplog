/**
 * System Health Status API
 *
 * Provides health checks for various system components.
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('HealthStatus')

/**
 * Health check result for a single component.
 */
export interface HealthCheck {
  /** Component name */
  name: string
  /** Whether the component is healthy */
  healthy: boolean
  /** Additional status message */
  message?: string
  /** Response time in milliseconds */
  responseTime?: number
}

/**
 * Overall system health status.
 */
export interface SystemHealthStatus {
  /** Overall system health */
  healthy: boolean
  /** Timestamp of the health check */
  timestamp: string
  /** Individual component checks */
  checks: {
    database: HealthCheck
    storage: HealthCheck
    auth: HealthCheck
  }
}

/**
 * Check database connectivity by executing a simple query.
 */
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = performance.now()

  try {
    const { error, count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })

    const responseTime = performance.now() - startTime

    if (error) {
      return {
        name: 'database',
        healthy: false,
        message: error.message,
        responseTime,
      }
    }

    return {
      name: 'database',
      healthy: true,
      message: `Connected (${count ?? 0} events)`,
      responseTime,
    }
  } catch (err) {
    const responseTime = performance.now() - startTime
    return {
      name: 'database',
      healthy: false,
      message: (err as Error).message,
      responseTime,
    }
  }
}

/**
 * Check storage connectivity by listing a bucket.
 */
async function checkStorage(): Promise<HealthCheck> {
  const startTime = performance.now()

  try {
    const { data, error } = await supabase
      .storage
      .getBucket('scan-originals')

    const responseTime = performance.now() - startTime

    if (error) {
      return {
        name: 'storage',
        healthy: false,
        message: error.message,
        responseTime,
      }
    }

    return {
      name: 'storage',
      healthy: true,
      message: `Bucket accessible (public: ${data?.public ?? false})`,
      responseTime,
    }
  } catch (err) {
    const responseTime = performance.now() - startTime
    return {
      name: 'storage',
      healthy: false,
      message: (err as Error).message,
      responseTime,
    }
  }
}

/**
 * Check auth service connectivity.
 */
async function checkAuth(): Promise<HealthCheck> {
  const startTime = performance.now()

  try {
    const { data, error } = await supabase.auth.getSession()

    const responseTime = performance.now() - startTime

    if (error) {
      return {
        name: 'auth',
        healthy: false,
        message: error.message,
        responseTime,
      }
    }

    return {
      name: 'auth',
      healthy: true,
      message: data.session ? 'Authenticated' : 'Not authenticated',
      responseTime,
    }
  } catch (err) {
    const responseTime = performance.now() - startTime
    return {
      name: 'auth',
      healthy: false,
      message: (err as Error).message,
      responseTime,
    }
  }
}

/**
 * Get overall system health status.
 *
 * Checks all major system components and returns their status.
 */
export async function getHealthStatus(): Promise<SystemHealthStatus> {
  logger.debug('Checking system health')

  const [database, storage, auth] = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkAuth(),
  ])

  const healthy = database.healthy && storage.healthy && auth.healthy

  return {
    healthy,
    timestamp: new Date().toISOString(),
    checks: {
      database,
      storage,
      auth,
    },
  }
}
