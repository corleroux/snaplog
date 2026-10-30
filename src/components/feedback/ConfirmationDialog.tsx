/**
 * Confirmation Dialog Component
 *
 * A pre-configured Modal for confirmation actions.
 * Provides consistent UX for destructive or important actions.
 *
 * DESIGN ALIGNED:
 * - Premium dark surfaces
 * - Clear visual hierarchy
 * - Mobile-first touch-friendly sizing
 * - Consistent with design system tokens
 */

import { ReactNode } from 'react'
import { Modal } from '@/components/ui'
import { Button } from '@/components/ui'

export interface ConfirmationDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Called when user cancels or closes */
  onClose: () => void
  /** Called when user confirms */
  onConfirm: () => void
  /** Dialog title */
  title: string
  /** Dialog description */
  description?: string
  /** Text for confirm button (default: "Confirm") */
  confirmText?: string
  /** Text for cancel button (default: "Cancel") */
  cancelText?: string
  /** Variant for confirm button (default: "destructive") */
  variant?: 'destructive' | 'accent' | 'default'
  /** Icon to display next to title */
  icon?: ReactNode
  /** Whether confirm button shows loading state */
  isConfirming?: boolean
}

/**
 * Confirmation dialog component
 *
 * Use for:
 * - Confirming destructive actions (delete, remove)
 * - Confirming important state changes
 * - Warning about irreversible actions
 */
export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  icon,
  isConfirming = false,
}: ConfirmationDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      showClose={!isConfirming}
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isConfirming}
            type="button"
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={isConfirming}
            type="button"
            className="w-full sm:w-auto"
          >
            {isConfirming ? 'Confirming...' : confirmText}
          </Button>
        </div>
      }
    >
      {icon && (
        <div className="flex items-center gap-3 mb-2">
          {icon}
        </div>
      )}
    </Modal>
  )
}
