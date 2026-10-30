/**
 * Audit Log Screen
 *
 * Admin screen for viewing audit logs.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Filter, ChevronDown, ChevronRight } from 'lucide-react'
import { AdminPageHeader } from '../components/AdminLayout'
import { Button } from '@/components/ui/button'
import {
  getAuditLogs,
  getAuditLogStats,
  getActionBadgeColor,
  getEntityTypeLabel,
  type AuditLogEntryWithPerformer,
} from '../api/auditLogManagement'
import { formatDateTime } from '@/lib/utils/format'

export function AuditLogScreen() {
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [page, setPage] = useState(0)
  const pageSize = 50

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['admin-audit-logs', selectedEntityType, selectedAction, page],
    queryFn: () =>
      getAuditLogs({
        entityType: selectedEntityType === 'all' ? undefined : selectedEntityType,
        action: selectedAction === 'all' ? undefined : selectedAction,
        limit: pageSize,
        offset: page * pageSize,
      }),
  })

  const { data: stats } = useQuery({
    queryKey: ['admin-audit-stats'],
    queryFn: getAuditLogStats,
  })

  const entityTypes = stats?.byEntityType ? Object.keys(stats.byEntityType) : []
  const actions = stats?.byAction ? Object.keys(stats.byAction) : []

  const handleFilterChange = () => {
    setPage(0)
    refetch()
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit Log"
        subtitle="View system activity and changes"
      />

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
            <p className="text-2xl font-semibold mt-2">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Actions Today</p>
            <p className="text-2xl font-semibold mt-2">
              {Object.values(stats.byAction).reduce((a, b) => a + b, 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Entities Tracked</p>
            <p className="text-2xl font-semibold mt-2">{Object.keys(stats.byEntityType).length}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        <select
          value={selectedEntityType}
          onChange={(e) => {
            setSelectedEntityType(e.target.value)
            handleFilterChange()
          }}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Entity Types</option>
          {entityTypes.map((type) => (
            <option key={type} value={type}>
              {getEntityTypeLabel(type)}
            </option>
          ))}
        </select>

        <select
          value={selectedAction}
          onChange={(e) => {
            setSelectedAction(e.target.value)
            handleFilterChange()
          }}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Logs table */}
      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading audit logs...</div>
        ) : !logs || logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No audit logs found</div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <AuditLogEntry key={log.id} entry={log} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {logs && logs.length === pageSize && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Audit Log Entry Component
 */
interface AuditLogEntryProps {
  entry: AuditLogEntryWithPerformer
}

function AuditLogEntry({ entry }: AuditLogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="p-4 hover:bg-accent/50">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Activity className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(entry.action)}`}>
              {entry.action}
            </span>
            <span className="text-sm font-medium">{getEntityTypeLabel(entry.entity_type)}</span>
            <span className="text-xs text-muted-foreground font-mono">
              {entry.entity_id.slice(0, 8)}...
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>
              {entry.performed_by_name || entry.performed_by_email || 'Unknown'}
            </span>
            <span>•</span>
            <span>{formatDateTime(entry.created_at)}</span>
          </div>

          {entry.changes && Object.keys(entry.changes).length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                {Object.keys(entry.changes).length} changed field{Object.keys(entry.changes).length !== 1 ? 's' : ''}
              </button>

              {isExpanded && (
                <div className="mt-2 space-y-1">
                  {Object.entries(entry.changes).map(([field, change]) => (
                    <div key={field} className="text-xs bg-muted rounded p-2">
                      <span className="font-medium">{field}:</span>{' '}
                      <span className="text-destructive line-through mr-2">
                        {JSON.stringify(change.old)}
                      </span>
                      <span className="text-green-600">
                        {JSON.stringify(change.new)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
