/**
 * System Health Screen
 *
 * Admin screen for monitoring system health.
 */

import { useQuery } from '@tanstack/react-query'
import { Activity, HardDrive, Database, Server, RefreshCw, Bug, AlertTriangle, Loader2 } from 'lucide-react'
import { AdminPageHeader } from '../components/AdminLayout'
import { Button } from '@/components/ui/button'
import {
  getSystemHealth,
  getSystemStats,
  formatBytes,
} from '../api/systemHealth'
import { ErrorTrackingProvider, useErrorTracking } from '@/lib/error-tracking/ErrorTrackingProvider'

export function SystemHealthScreen() {
  const { data: health, refetch } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: getSystemHealth,
    refetchInterval: 30000,
  })

  const { data: stats } = useQuery({
    queryKey: ['admin-system-stats'],
    queryFn: getSystemStats,
    refetchInterval: 60000,
  })

  return (
    <ErrorTrackingProvider>
      <div className="space-y-6">
        <AdminPageHeader
          title="System Health"
          subtitle="Monitor system performance and status"
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          }
        />

        {/* Overall Status */}
        {health && (
          // ... existing health status ...
          <div className={`rounded-lg border bg-card p-6 ${
            health.overall === 'healthy'
              ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20'
              : health.overall === 'degraded'
                ? 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20'
                : 'border-red-500/50 bg-red-50 dark:bg-red-950/20'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                health.overall === 'healthy'
                  ? 'bg-green-500/20'
                  : health.overall === 'degraded'
                    ? 'bg-yellow-500/20'
                    : 'bg-red-500/20'
              }`}>
                <Activity className={`h-6 w-6 ${
                  health.overall === 'healthy'
                    ? 'text-green-600'
                    : health.overall === 'degraded'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${
                  health.overall === 'healthy'
                    ? 'text-green-900 dark:text-green-100'
                    : health.overall === 'degraded'
                      ? 'text-yellow-900 dark:text-yellow-100'
                      : 'text-red-900 dark:text-red-100'
                }`}>
                  System {health.overall.charAt(0).toUpperCase() + health.overall.slice(1)}
                </h3>
                <p className={`text-sm ${
                  health.overall === 'healthy'
                    ? 'text-green-700 dark:text-green-300'
                    : health.overall === 'degraded'
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-red-700 dark:text-red-300'
                }`}>
                  Last checked: {new Date(health.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Health Checks */}
        {health && (
          <div className="grid gap-4 md:grid-cols-3">
            {health.checks.map((check) => (
              <HealthCheckCard key={check.name} check={check} />
            ))}
          </div>
        )}

        {/* Storage Stats */}
        {stats && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Usage
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Total Size</p>
                <p className="text-xl font-semibold mt-1">{formatBytes(stats.storage.totalSize)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-xl font-semibold mt-1">{stats.storage.fileCount.toLocaleString()}</p>
              </div>
              {stats.storage.buckets.map((bucket) => (
                <div key={bucket.name} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{bucket.name}</p>
                  <p className="text-xl font-semibold mt-1">{formatBytes(bucket.size)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{bucket.files} files</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Stats */}
        {stats && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Tables
            </h3>
            <div className="rounded-lg border border-border bg-card">
              <div className="divide-y divide-border">
                {stats.database.tableSizes.map((table) => (
                  <div key={table.name} className="flex items-center justify-between p-4">
                    <span className="font-medium">{table.name}</span>
                    <span className="text-muted-foreground">{table.rows.toLocaleString()} rows</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Tracking */}
        <ErrorTrackingCard />
      </div>
    </ErrorTrackingProvider>
  )
}

/**
 * Health Check Card Component
 */
interface HealthCheckCardProps {
  check: {
    name: string
    status: 'healthy' | 'degraded' | 'unhealthy'
    message?: string
    latency?: number
  }
}

function HealthCheckCard({ check }: HealthCheckCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-300'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'unhealthy':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-300'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const getIcon = (name: string) => {
    switch (name) {
      case 'Database':
        return Database
      case 'Storage':
        return HardDrive
      case 'Auth':
        return Server
      default:
        return Activity
    }
  }

  const Icon = getIcon(check.name)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{check.name}</span>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(check.status)}`}>
          {check.status}
        </span>
      </div>
      {check.latency !== undefined && (
        <p className="text-xs text-muted-foreground">
          Latency: {check.latency.toFixed(0)}ms
        </p>
      )}
      {check.message && (
        <p className="text-xs text-destructive mt-1">{check.message}</p>
      )}
    </div>
  )
}

/**
 * Error Tracking Card
 */
function ErrorTrackingCard() {
  const { errors, loading, lastSyncAt, sync } = useErrorTracking()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Error Tracking
        </h3>
        <div className="flex items-center gap-3">
          {lastSyncAt && (
            <span className="text-xs text-muted-foreground">
              Last sync: {new Date(lastSyncAt).toLocaleString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={sync} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync
          </Button>
        </div>
      </div>

      {errors.length === 0 && !loading && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No errors tracked. Click <strong>Sync</strong> to pull the latest from PostHog.
          </p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {errors.map((err, i) => (
              <div key={i} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                        {err.exception_type}
                      </span>
                      {err.occurrences > 1 && (
                        <span className="text-xs text-muted-foreground">
                          {err.occurrences}x
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{err.exception_message}</p>
                    {err.suggested_action && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {err.suggested_action}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {err.last_seen ? new Date(err.last_seen).toLocaleDateString() : 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {err.affected_users} user{err.affected_users !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
