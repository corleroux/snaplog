import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui'
import { Button } from '@/components/ui'

interface ArchiveVariantModalProps {
  isOpen: boolean
  onClose: () => void
  variantName: string | null
  colorName: string | null
  onConfirm: () => void
  isArchiving?: boolean
}

/**
 * ArchiveVariantModal — confirmation dialog for soft-deleting a variant.
 *
 * Soft-deleted variants are hidden from the main UI by default but
 * their data remains in the database with status 'discontinued'.
 */
export function ArchiveVariantModal({
  isOpen,
  onClose,
  variantName,
  colorName,
  onConfirm,
  isArchiving = false,
}: ArchiveVariantModalProps) {
  const displayName = variantName || colorName || 'this variant'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Archive Variant"
      size="sm"
      showClose={!isArchiving}
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isArchiving}
            type="button"
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isArchiving}
            type="button"
            className="w-full sm:w-auto"
          >
            {isArchiving ? 'Archiving...' : 'Archive'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Are you sure you want to archive {displayName}?
            </p>
            <p className="text-sm text-muted-foreground">
              This variant will be marked as "discontinued" and hidden from the main view.
              You can still view it by toggling "Show archived" in the variants section.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
