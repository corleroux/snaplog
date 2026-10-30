/**
 * Style Detail Screen Component
 */

import { type ReactNode, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Edit3, Archive, AlertTriangle, Heart } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils/cn'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { LoadingState, ErrorState } from '@/components/ui'
import { QRCodeButton } from '@/components/qrcode/QRCodeButton'
import { AppShell, PageHeader, BottomNavigation } from '@/components/layout'
import type { FabricStyleDetail } from '@/lib/supabase/types'
import { createLogger } from '@/lib/logger'

const log = createLogger('StyleDetailScreen')
import { createVariant } from '@/features/styles/api/createVariant'
import { archiveVariant } from '@/features/styles/api/archiveVariant'
import { createInventoryRecord } from '@/features/styles/api/createInventoryRecord'
import { createPriceHistory } from '@/features/styles/api/createPriceHistory'

import { StyleImageGallery } from '../components/StyleImageGallery'
import { StyleSpecificationsSection } from '../components/StyleSpecificationsSection'
import { StyleVariantsSection } from '../components/StyleVariantsSection'
import { StyleInventorySection } from '../components/StyleInventorySection'
import { StylePricingSection } from '../components/StylePricingSection'
import { ExtractionWarnings } from '../components/ExtractionWarnings'
import { SectionContainer } from '@/components/ui/section-container'
import { ApprovalRequest, type ApprovalStatus } from '@/features/approvals'
import { CommentThread } from '@/components/comments/CommentThread'
import { AssignmentSheet } from '@/features/assignments'

export interface StyleDetailScreenProps {
  data?: FabricStyleDetail
  onBack?: () => void
  onEdit?: () => void
  onArchive?: () => void
  headerContent?: ReactNode
  basePath?: string
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  approvalStatus?: ApprovalStatus | null
  onRequestApproval?: () => Promise<void>
  onRespondToApproval?: (requestId: string, status: 'approved' | 'rejected', note?: string) => Promise<void>
  canRequestApproval?: boolean
  canRespondToApproval?: boolean
  canAssign?: boolean
  onToggleShortlist?: (value: boolean) => void
}

export function StyleDetailScreen({
  data, onBack, onEdit, onArchive, headerContent, basePath,
  loading = false, error = null, onRefresh,
  approvalStatus = null,
  onRequestApproval,
  onRespondToApproval,
  canRequestApproval = false,
  canRespondToApproval = false,
  canAssign = false,
  onToggleShortlist,
}: StyleDetailScreenProps) {
  const { eventId = '', vendorId = '', styleId = '' } = useParams()
  const [lightboxImage, setLightboxImage] = useState<number | null>(null)
  const lightboxUrls = data?.images?.filter(img => img.public_url).map(img => img.public_url!) ?? []
  const [isAddingVariant, setIsAddingVariant] = useState(false)
  const [isArchivingVariant, setIsArchivingVariant] = useState(false)
  const [isAddingInventory, setIsAddingInventory] = useState(false)
  const [isAddingPrice, setIsAddingPrice] = useState(false)

  if (loading) return (
    <AppShell>
      <PageHeader title="Style Details" onBack={onBack} />
      <main className="flex-1 px-4">
        <LoadingState message="Loading style details..." />
      </main>
    </AppShell>
  )

  if (error || !data) return (
    <AppShell>
      <PageHeader title="Style Details" onBack={onBack} />
      <div className="flex items-center justify-center min-h-screen bg-background">
        <ErrorState
          title="Failed to load style"
          message={error || 'Please try again.'}
          onRetry={onRefresh}
          icon={<AlertTriangle className="h-8 w-8 text-destructive" />}
          customAction={
            <div className="flex gap-3 justify-center">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  Retry
                </button>
              )}
              <Link to={`/events/${eventId}/vendors/${vendorId}/styles`}>
                <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
                  Back to Styles
                </button>
              </Link>
            </div>
          }
        />
      </div>
    </AppShell>
  )

  const { style, variants, inventory, prices, images } = data
  const navBasePath = basePath || `/events/${eventId}/vendors/${vendorId}/styles/${styleId}`

  const wrapAction = <T extends Record<string, any>>(setter: (v: boolean) => void, action: (data: T) => Promise<unknown>) => async (formData: T) => {
    setter(true)
    try {
      await action(formData)
      onRefresh?.()
    } catch (err) {
      log.error('Action failed', { error: err instanceof Error ? err.message : String(err) })
    } finally {
      setter(false)
    }
  }

  return (
    <AppShell>
      {headerContent || (
        <PageHeader
          title={style.name || 'Untitled Style'}
          subtitle={style.item_code}
          onBack={onBack}
          action={
            <div className="flex items-center gap-1">
              {onToggleShortlist && (
                <button
                  onClick={() => onToggleShortlist(!style.is_shortlisted)}
                  className="h-9 w-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                  aria-label={style.is_shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                >
                  <Heart
                    className={cn(
                      'h-5 w-5 transition-colors',
                      style.is_shortlisted
                        ? 'fill-rose-500 text-rose-500'
                        : 'text-gray-400'
                    )}
                  />
                </button>
              )}
              <QRCodeButton
                type="style"
                id={style.id}
                name={style.name || 'Style'}
                variant="ghost"
                size="icon"
                className="h-9 w-9 p-0 hover:bg-gray-100 rounded-full"
              />
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="h-9 w-9 flex items-center justify-center text-orange-500 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Edit3 className="h-5 w-5" />
                </button>
              )}
            </div>
          }
        />
      )}

      <main className="flex-1 overflow-y-auto px-4 pt-3">
        <div className="space-y-6 pb-6">
          <StyleImageGallery images={images} styleName={style.name || ''} onImageClick={(_url, index) => setLightboxImage(index)} />
          <ExtractionWarnings warnings={style.extraction_warnings as string[]} />
          <SectionContainer title="Comments">
            <CommentThread entityType="style" entityId={style.id} />
          </SectionContainer>
          <StyleSpecificationsSection style={style} />
          <StyleVariantsSection variants={variants} navBasePath={navBasePath} isAddingVariant={isAddingVariant}
            isArchivingVariant={isArchivingVariant}
            onAddVariant={wrapAction(setIsAddingVariant, (d) => createVariant({ styleId: style.id, eventId, vendorId, ...d }))}
            onArchiveVariant={wrapAction(setIsArchivingVariant, (v) => archiveVariant(v.id))} />
          <StylePricingSection prices={prices} isAddingPrice={isAddingPrice}
            onAddPrice={wrapAction(setIsAddingPrice, (d) => createPriceHistory({ styleId: style.id, eventId, vendorId, ...d, minimum_order_quantity: d.moq, minimum_order_unit: d.moq_unit }))} />
          <StyleInventorySection inventory={inventory} isAddingRecord={isAddingInventory}
            onAddRecord={wrapAction(setIsAddingInventory, (d) => createInventoryRecord({ styleId: style.id, eventId, vendorId, ...d }))} />

          {(onRequestApproval || approvalStatus) && (
            <SectionContainer title="Approval">
              <ApprovalRequest
                entityType="style"
                entityId={style.id}
                entityName={style.name || 'Untitled Style'}
                approvalStatus={approvalStatus}
                onRequestApproval={onRequestApproval}
                onRespondToApproval={onRespondToApproval}
                canRequest={canRequestApproval}
                canRespond={canRespondToApproval}
              />
            </SectionContainer>
          )}

          <SectionContainer title="Assignments">
            <AssignmentSheet
              entityType="style"
              entityId={style.id}
              eventId={eventId}
              canAssign={canAssign}
            />
          </SectionContainer>

          <div className="text-center py-4 text-xs text-muted-foreground">Style ID: <span className="font-mono">{style.id}</span></div>
          {onArchive && (
            <div className="pt-2 pb-4">
              <Button variant="ghost" onClick={onArchive} className="w-full text-destructive hover:bg-destructive/10" radius="pill" size="lg">
                <Archive className="h-4 w-4 mr-2" />
                Archive Style
              </Button>
            </div>
          )}
        </div>
      </main>
      <ImageLightbox
        src={lightboxImage !== null ? lightboxUrls[lightboxImage] : null}
        alt={style.name || 'Style image'}
        isOpen={lightboxImage !== null}
        onClose={() => setLightboxImage(null)}
        images={lightboxUrls}
        initialIndex={lightboxImage ?? 0}
      />
      <BottomNavigation />
    </AppShell>
  )
}