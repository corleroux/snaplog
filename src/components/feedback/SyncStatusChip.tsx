/**
 * SyncStatusChip - Displays sync state for uploads and queued operations.
 *
 * Shows visual indicators for:
 * - idle: Local draft only
 * - queued: Waiting to process
 * - uploading: Currently processing
 * - failed: Error occurred (shows error message inline or expanded)
 * - synced: Successfully completed
 *
 * Props:
 * - status: The current sync status
 * - error: Optional error message for failed state
 * - size: Optional size variant (default 'sm')
 * - showError: Show error text inline below chip (mobile-friendly)
 * - expandable: Allow tap to expand/collapse error message
 */

import { useState } from 'react'
import type { QueueItemStatus } from '@/lib/offline/types'

export interface SyncStatusChipProps {
  status: QueueItemStatus | 'idle'
  error?: string | null
  size?: 'sm' | 'md'
  className?: string
  showError?: boolean  // Show error inline (mobile-friendly)
  expandable?: boolean // Allow tap to toggle error visibility
}

const STATUS_CONFIG = {
  queued: {
    label: 'Queued',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgClass: 'bg-muted/80',
    textClass: 'text-muted-foreground',
    borderClass: 'border-border',
  },
  uploading: {
    label: 'Uploading',
    icon: (
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-500/20',
  },
  failed: {
    label: 'Failed',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgClass: 'bg-destructive/10',
    textClass: 'text-destructive',
    borderClass: 'border-destructive/20',
  },
  synced: {
    label: 'Synced',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    bgClass: 'bg-green-500/10',
    textClass: 'text-green-600 dark:text-green-400',
    borderClass: 'border-green-500/20',
  },
  idle: {
    label: 'Draft',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    bgClass: 'bg-muted/60',
    textClass: 'text-muted-foreground',
    borderClass: 'border-border',
  },
}

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs gap-1.5',
  md: 'px-2.5 py-1 text-sm gap-2',
}

export function SyncStatusChip({
  status,
  error,
  size = 'sm',
  className = '',
  showError = false,
  expandable = false,
}: SyncStatusChipProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = STATUS_CONFIG[status]

  if (status === 'idle' && !config) return null

  const hasError = status === 'failed' && error
  const shouldShowError = showError || (expandable && isExpanded)

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => expandable && hasError && setIsExpanded(!isExpanded)}
        className={`inline-flex items-center border rounded-full ${SIZE_CLASSES[size]} ${config.bgClass} ${config.textClass} ${config.borderClass} ${className} ${expandable && hasError ? 'cursor-pointer' : ''}`}
        title={error || undefined}
      >
        {config.icon}
        <span className="font-medium">{config.label}</span>
        {expandable && hasError && (
          <svg
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      {shouldShowError && hasError && (
        <p className="text-xs text-destructive max-w-[200px] text-right">
          {error}
        </p>
      )}
    </div>
  )
}
