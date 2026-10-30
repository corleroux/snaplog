/**
 * Edit Screen Common States
 *
 * Shared loading and error state components for edit screens.
 * Provides consistent UX across all edit screens.
 */

import { Link } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import { AppFrame } from '@/components/ui'
import { Button } from '@/components/ui/button'

export interface EditScreenLoadingProps {
  /** The entity being loaded */
  entity: string
  /** Additional className */
  className?: string
}

/**
 * Loading state for edit screens
 */
export function EditScreenLoading({ entity, className }: EditScreenLoadingProps) {
  return (
    <AppFrame className={className}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-muted-foreground">Loading {entity}...</p>
      </div>
    </AppFrame>
  )
}

export interface EditScreenErrorProps {
  /** The entity that failed to load */
  entity: string
  /** Error message to display */
  errorMessage?: string | null
  /** Back link URL */
  backUrl: string
  /** Optional retry callback */
  onRetry?: () => void
  /** Additional className */
  className?: string
}

/**
 * Error state for edit screens
 */
export function EditScreenError({
  entity,
  errorMessage,
  backUrl,
  onRetry,
  className,
}: EditScreenErrorProps) {
  return (
    <AppFrame className={`flex items-center justify-center px-4 ${className}`}>
      <div className="max-w-md w-full text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">Failed to load {entity}</h2>
        <p className="text-muted-foreground">{errorMessage || 'Please try again.'}</p>
        <div className="flex gap-3 justify-center">
          {onRetry && (
            <Button onClick={onRetry} variant="outline" radius="pill">
              Retry
            </Button>
          )}
          <Link to={backUrl}>
            <Button variant="ghost" radius="pill">
              Back
            </Button>
          </Link>
        </div>
      </div>
    </AppFrame>
  )
}
