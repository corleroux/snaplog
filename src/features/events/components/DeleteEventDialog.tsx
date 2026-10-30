/**
 * DeleteEventDialog — confirmation dialog with data impact counts.
 *
 * Shows how many vendors, styles, variants, and images will be
 * cascade-deleted when an event is removed.
 */

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui'
import { Button } from '@/components/ui'
import { getEventDeletionImpact, type EventDeletionImpact } from '../api/getEventDeletionImpact'

interface DeleteEventDialogProps {
  isOpen: boolean
  eventId: string
  eventName: string
  onClose: () => void
  onConfirm: () => void
  isDeleting?: boolean
}

export function DeleteEventDialog({
  isOpen,
  eventId,
  eventName,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteEventDialogProps) {
  const [impact, setImpact] = useState<EventDeletionImpact | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setImpact(null)
      return
    }

    setLoading(true)
    getEventDeletionImpact(eventId)
      .then(setImpact)
      .finally(() => setLoading(false))
  }, [isOpen, eventId])

  const hasData = impact && (impact.vendorCount + impact.styleCount + impact.variantCount + impact.imageCount) > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Event"
      size="sm"
      showClose={!isDeleting}
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            type="button"
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            type="button"
            className="w-full sm:w-auto"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      }
    >
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <p className="text-sm text-muted-foreground">
          {loading
            ? 'Checking associated data...'
            : hasData
              ? `This will permanently delete "${eventName}" and all associated data:`
              : `This will permanently delete "${eventName}".`}
        </p>
      </div>

      {hasData && (
        <ul className="space-y-1 text-sm text-muted-foreground pl-8">
          {impact.vendorCount > 0 && (
            <li>{impact.vendorCount} vendor{impact.vendorCount !== 1 ? 's' : ''}</li>
          )}
          {impact.styleCount > 0 && (
            <li>{impact.styleCount} style{impact.styleCount !== 1 ? 's' : ''}</li>
          )}
          {impact.variantCount > 0 && (
            <li>{impact.variantCount} variant{impact.variantCount !== 1 ? 's' : ''}</li>
          )}
          {impact.imageCount > 0 && (
            <li>{impact.imageCount} image{impact.imageCount !== 1 ? 's' : ''}</li>
          )}
        </ul>
      )}
    </Modal>
  )
}
