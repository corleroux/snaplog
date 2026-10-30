/**
 * System Health API
 *
 * Functions for monitoring system health in the admin panel.
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Health check result
 */
export interface HealthCheckResult {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  latency?: number
}

/**
 * System health summary
 */
export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  checks: HealthCheckResult[]
  timestamp: string
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const start = performance.now()
  try {
    const { error } = await supabase.from('events').select('id').limit(1)
    const latency = performance.now() - start

    if (error) {
      return {
        name: 'Database',
        status: latency > 1000 ? 'degraded' : 'unhealthy',
        message: error.message,
        latency,
      }
    }

    return {
      name: 'Database',
      status: latency > 1000 ? 'degraded' : 'healthy',
      latency,
    }
  } catch (err) {
    return {
      name: 'Database',
      status: 'unhealthy',
      message: err instanceof Error ? err.message : 'Unknown error',
      latency: performance.now() - start,
    }
  }
}

/**
 * Check storage connectivity
 */
async function checkStorage(): Promise<HealthCheckResult> {
  const start = performance.now()
  try {
    const { error } = await supabase.storage.from('event-assets').list('', { limit: 1 })
    const latency = performance.now() - start

    if (error) {
      return {
        name: 'Storage',
        status: 'unhealthy',
        message: error.message,
        latency,
      }
    }

    return {
      name: 'Storage',
      status: latency > 1000 ? 'degraded' : 'healthy',
      latency,
    }
  } catch (err) {
    return {
      name: 'Storage',
      status: 'unhealthy',
      message: err instanceof Error ? err.message : 'Unknown error',
      latency: performance.now() - start,
    }
  }
}

/**
 * Check auth service
 */
async function checkAuth(): Promise<HealthCheckResult> {
  const start = performance.now()
  try {
    const { error } = await supabase.auth.getSession()
    const latency = performance.now() - start

    // Auth session check always succeeds (just returns null if not logged in)
    // We're checking the auth service is responsive
    if (error) {
      return {
        name: 'Auth',
        status: 'unhealthy',
        message: error.message,
        latency,
      }
    }

    return {
      name: 'Auth',
      status: latency > 1000 ? 'degraded' : 'healthy',
      latency,
    }
  } catch (err) {
    return {
      name: 'Auth',
      status: 'unhealthy',
      message: err instanceof Error ? err.message : 'Unknown error',
      latency: performance.now() - start,
    }
  }
}

/**
 * Get storage usage statistics
 */
async function getStorageUsage(): Promise<{
  totalSize: number
  fileCount: number
  buckets: { name: string; size: number; files: number }[]
}> {
  // This is a simplified version - in production you'd query storage.size()
  // For now, we'll return mock data
  const buckets = ['event-assets', 'scan-originals', 'catalogue-exports']

  const bucketStats = await Promise.all(
    buckets.map(async (name) => {
      try {
        const { data, error } = await supabase.storage.from(name).list()
        if (error || !data) {
          return { name, size: 0, files: 0 }
        }
        // Rough estimate - actual size would need backend function
        return { name, size: data.length * 1024 * 100, files: data.length }
      } catch {
        return { name, size: 0, files: 0 }
      }
    })
  )

  const totalSize = bucketStats.reduce((sum, b) => sum + b.size, 0)
  const fileCount = bucketStats.reduce((sum, b) => sum + b.files, 0)

  return {
    totalSize,
    fileCount,
    buckets: bucketStats,
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats(): Promise<{
  tableSizes: { name: string; rows: number }[]
}> {
  const tables = ['events', 'vendors', 'fabric_styles', 'fabric_variants', 'fabric_images', 'audit_log']

  const tableStats = await Promise.all(
    tables.map(async (name) => {
      try {
        const { count } = await supabase.from(name).select('*', { count: 'exact', head: true })
        return { name, rows: count || 0 }
      } catch {
        return { name, rows: 0 }
      }
    })
  )

  return {
    tableSizes: tableStats,
  }
}

/**
 * Run all health checks
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const checks = await Promise.all([
    checkDatabase(),
    checkStorage(),
    checkAuth(),
  ])

  // Determine overall status
  const hasUnhealthy = checks.some((c) => c.status === 'unhealthy')
  const hasDegraded = checks.some((c) => c.status === 'degraded')

  const overall: SystemHealth['overall'] = hasUnhealthy
    ? 'unhealthy'
    : hasDegraded
      ? 'degraded'
      : 'healthy'

  return {
    overall,
    checks,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Get system statistics
 */
export async function getSystemStats() {
  const [storageUsage, databaseStats] = await Promise.all([
    getStorageUsage(),
    getDatabaseStats(),
  ])

  return {
    storage: storageUsage,
    database: databaseStats,
  }
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
