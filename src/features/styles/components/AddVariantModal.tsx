/**
 * AddVariantModal — form for creating a new fabric variant.
 *
 * Fields: variant_name, color_name, color_code, wash_code, finish_override.
 * Follows existing modal and form patterns.
 */

import { useState } from 'react'
import { Modal } from '@/components/ui'
import { Button } from '@/components/ui'

interface AddVariantModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    variant_name: string
    color_name: string
    color_code: string
    wash_code: string
    finish_override: string
  }) => void | Promise<void>
  isSubmitting?: boolean
}

export function AddVariantModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: AddVariantModalProps) {
  const [variantName, setVariantName] = useState('')
  const [colorName, setColorName] = useState('')
  const [colorCode, setColorCode] = useState('')
  const [washCode, setWashCode] = useState('')
  const [finishOverride, setFinishOverride] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      variant_name: variantName,
      color_name: colorName,
      color_code: colorCode,
      wash_code: washCode,
      finish_override: finishOverride,
    })
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setVariantName('')
      setColorName('')
      setColorCode('')
      setWashCode('')
      setFinishOverride('')
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Variant"
      size="sm"
      placement="top"
      showClose={!isSubmitting}
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            type="button"
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={handleSubmit as any}
            disabled={isSubmitting}
            type="button"
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Adding...' : 'Add Variant'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Variant Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Variant Name
          </label>
          <input
            type="text"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            placeholder="e.g., Navy Base"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>

        {/* Color Name + Color Code row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <label className="block text-sm font-medium text-foreground mb-1">
              Color Name
            </label>
            <input
              type="text"
              value={colorName}
              onChange={(e) => setColorName(e.target.value)}
              placeholder="e.g., Navy"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-medium text-foreground mb-1">
              Color Code
            </label>
            <div className="flex min-w-0 items-center gap-2">
              <input
                type="text"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                placeholder="e.g., NV001"
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              {colorCode && (
                <div
                  className="w-9 h-9 rounded-md border border-border shrink-0"
                  style={{ backgroundColor: isValidHex(colorCode) ? colorCode : undefined }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Wash Code + Finish Override row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Wash Code
            </label>
            <input
              type="text"
              value={washCode}
              onChange={(e) => setWashCode(e.target.value)}
              placeholder="e.g., STW"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Finish Override
            </label>
            <input
              type="text"
              value={finishOverride}
              onChange={(e) => setFinishOverride(e.target.value)}
              placeholder="e.g., Brushed"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}

function isValidHex(str: string): boolean {
  return /^#[0-9a-f]{3,8}$/i.test(str) || /^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(str)
}
