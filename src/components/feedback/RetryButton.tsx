/**
 * RetryButton - Mobile-friendly button for retrying failed queue items.
 *
 * Displays a retry action button with:
 * - Retry count indicator (e.g., "Retry (2)")
 * - Loading state while retrying
 * - Success/error feedback
 *
 * Props:
 * - onRetry: Callback function to execute on retry
 * - isRetrying: Whether a retry operation is in progress
 * - retryCount: Number of retry attempts (shows in button text)
 * - disabled: Whether the button is disabled
 * - variant: Visual style variant
 * - size: Button size
 * - className: Additional CSS classes
 *
 * Design notes:
 * - Uses clear, tappable button area (minimum 44px height for touch)
 * - Shows retry count to inform user of previous attempts
 * - Provides visual feedback during retry operation
 */

import { Button } from '@/components/ui/button'

export interface RetryButtonProps {
  /** Callback function to execute on retry */
  onRetry: () => void | Promise<void>
  /** Whether a retry operation is in progress */
  isRetrying?: boolean
  /** Number of retry attempts (shows in button text) */
  retryCount?: number
  /** Whether the button is disabled */
  disabled?: boolean
  /** Visual style variant */
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Additional CSS classes */
  className?: string
  /** Optional label override */
  label?: string
}

export function RetryButton({
  onRetry,
  isRetrying = false,
  retryCount = 0,
  disabled = false,
  variant = 'outline',
  size = 'default',
  className = '',
  label,
}: RetryButtonProps) {
  // Build button label with retry count if provided
  const buttonLabel = label ?? (retryCount > 0 ? `Retry (${retryCount})` : 'Retry')

  // Handle click with optional async support
  const handleClick = async () => {
    await onRetry()
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || isRetrying}
      className={className}
    >
      {isRetrying ? (
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Retrying...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582M20 9a8 8 0 11-16 0m12.357-2A8.001 8.001 0 004.582 9M9 11l3-3m0 0l3 3m-3-3v8"
            />
          </svg>
          {buttonLabel}
        </span>
      )}
    </Button>
  )
}

/**
 * Compact retry button for inline use (e.g., in status chips).
 */
export interface RetryButtonCompactProps {
  /** Callback function to execute on retry */
  onRetry: () => void | Promise<void>
  /** Whether a retry operation is in progress */
  isRetrying?: boolean
  /** Whether the button is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

export function RetryButtonCompact({
  onRetry,
  isRetrying = false,
  disabled = false,
  className = '',
}: RetryButtonCompactProps) {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={disabled || isRetrying}
      className={`
        inline-flex items-center justify-center
        min-h-[28px] px-2 py-1
        text-xs font-medium
        rounded-md
        border border-border
        bg-background
        hover:bg-accent hover:text-accent-foreground
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
        ${className}
      `}
      title="Retry failed operation"
    >
      {isRetrying ? (
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 9a8 8 0 11-16 0m12.357-2A8.001 8.001 0 004.582 9M9 11l3-3m0 0l3 3m-3-3v8" />
        </svg>
      )}
    </button>
  )
}
