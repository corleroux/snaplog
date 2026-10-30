/**
 * Vendor Success Screen Component
 *
 * Displays success state after vendor creation.
 *
 * DESIGN ALIGNED:
 * - Premium light surfaces with warm accent
 * - Clear visual hierarchy
 * - Modern rounded surfaces
 * - Mobile-first touch-friendly sizing
 * - Consistent with design system tokens
 */

import { type ReactNode } from 'react'
import { CheckCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui'

export interface VendorSuccessScreenProps {
  /** ID of the created vendor */
  vendorId: string
  /** Optional company name for display */
  companyName?: string
  /** Callback when user wants to view the vendor */
  onViewVendor?: () => void
  /** Callback when user wants to add another vendor */
  onAddAnother?: () => void
  /** Optional additional content */
  children?: ReactNode
  /** Additional className */
  className?: string
}

/**
 * Success screen component for vendor creation
 *
 * Shows:
 * - Success icon and message
 * - Created vendor ID
 * - Option to view the vendor
 * - Option to add another vendor
 */
export function VendorSuccessScreen({
  vendorId,
  companyName,
  onViewVendor,
  onAddAnother,
  children,
  className,
}: VendorSuccessScreenProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[400px] px-6 py-8 text-center',
      className
    )}>
      {/* Success icon with animation */}
      <div className="mb-6 relative">
        <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
          <CheckCircle className="h-14 w-14 text-green-600 dark:text-green-400" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Success message */}
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Vendor Created!
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {companyName
          ? `${companyName} has been successfully added to your catalogue.`
          : 'The vendor has been successfully added to your catalogue.'}
      </p>

      {/* Vendor ID badge */}
      <div className="mb-8 px-4 py-2 bg-muted rounded-lg border border-border">
        <span className="text-sm text-muted-foreground">
          Vendor ID: <span className="font-mono font-medium text-foreground">{vendorId}</span>
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        {onViewVendor && (
          <Button
            variant="default"
            onClick={onViewVendor}
            type="button"
            className="flex-1"
          >
            View Vendor
          </Button>
        )}
        {onAddAnother && (
          <Button
            variant="outline"
            onClick={onAddAnother}
            type="button"
            className="flex-1"
          >
            Add Another Vendor
          </Button>
        )}
      </div>

      {/* Additional content */}
      {children}
    </div>
  )
}
