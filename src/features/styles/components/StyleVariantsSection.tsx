import { Link } from 'react-router-dom'
import { Palette, Trash2, Plus, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button, Badge } from '@/components/ui'
import { SectionContainer } from '@/components/ui/section-container'
import type { FabricVariant } from '@/lib/supabase/types'
import { AddVariantModal } from './AddVariantModal'
import { ArchiveVariantModal } from './ArchiveVariantModal'
import { useState } from 'react'

interface StyleVariantsSectionProps {
  variants: FabricVariant[]
  navBasePath: string
  onAddVariant: (data: any) => Promise<void>
  onArchiveVariant: (variant: FabricVariant) => Promise<void>
  isAddingVariant: boolean
  isArchivingVariant: boolean
}

export function StyleVariantsSection({
  variants,
  navBasePath,
  onAddVariant,
  onArchiveVariant,
  isAddingVariant,
  isArchivingVariant,
}: StyleVariantsSectionProps) {
  const [addVariantOpen, setAddVariantOpen] = useState(false)
  const [variantToArchive, setVariantToArchive] = useState<FabricVariant | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const handleAddSubmit = async (data: any) => {
    await onAddVariant(data)
    setAddVariantOpen(false)
  }

  const handleArchiveConfirm = async () => {
    if (variantToArchive) {
      await onArchiveVariant(variantToArchive)
      setVariantToArchive(null)
    }
  }

  return (
    <SectionContainer
      title={`Variants${variants.length > 0 ? ` (${variants.length})` : ''}`}
      icon={<Palette className="h-5 w-5" />}
      rightAction={
        variants.some(v => v.status === 'discontinued') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="h-8 px-2 text-xs font-normal"
          >
            {showArchived ? (
              <><EyeOff className="h-3.5 w-3.5 mr-1" /> Hide archived</>
            ) : (
              <><Eye className="h-3.5 w-3.5 mr-1" /> Show archived</>
            )}
          </Button>
        )
      }
    >
      {variants.length > 0 && (
        <div className="space-y-3 mb-3">
          {variants
            .filter(v => showArchived || v.status !== 'discontinued')
            .map((variant) => (
            <Link
              key={variant.id}
              to={`${navBasePath}/variants/${variant.id}/edit`}
              className={cn(
                "block",
                variant.status === 'discontinued' && "opacity-60"
              )}
            >
              <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/5 hover:border-orange-500/30 transition-all">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {variant.color_code && (
                    <div
                      className="w-6 h-6 rounded-full border border-border shrink-0"
                      style={{ backgroundColor: isValidColorCode(variant.color_code) ? variant.color_code : undefined }}
                      title={variant.color_code}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {variant.variant_name && (
                      <p className={cn(
                        "font-medium text-sm text-foreground",
                        variant.status === 'discontinued' && "line-through"
                      )}>
                        {variant.variant_name}
                      </p>
                    )}
                    <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                      {variant.color_name && (
                        <span className={variant.status === 'discontinued' ? "line-through" : ""}>
                          Color: {variant.color_name}
                        </span>
                      )}
                      {variant.color_code && (
                        <span className="font-mono">({variant.color_code})</span>
                      )}
                      {variant.wash_code && <span>Wash: {variant.wash_code}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setVariantToArchive(variant)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Badge variant="outline" size="sm">Edit</Badge>
                  <VariantStatusBadge status={variant.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAddVariantOpen(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Add Variant
      </Button>

      <AddVariantModal
        isOpen={addVariantOpen}
        onClose={() => setAddVariantOpen(false)}
        onSubmit={handleAddSubmit}
        isSubmitting={isAddingVariant}
      />

      <ArchiveVariantModal
        isOpen={variantToArchive !== null}
        onClose={() => setVariantToArchive(null)}
        variantName={variantToArchive?.variant_name || null}
        colorName={variantToArchive?.color_name || null}
        onConfirm={handleArchiveConfirm}
        isArchiving={isArchivingVariant}
      />
    </SectionContainer>
  )
}

function isValidColorCode(code: string): boolean {
  return /^#[0-9a-f]{3,8}$/i.test(code) || /^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(code)
}

function VariantStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    sample: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    discontinued: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  const className = styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  return (
    <span className={cn('text-xs px-2 py-1 rounded', className)}>
      {status}
    </span>
  )
}
