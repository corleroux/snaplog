/**
 * Vendor Detail Screen Component
 *
 * Displays complete vendor information with structured sections.
 *
 * DESIGN ALIGNED:
 * - AppShell + PageHeader layout pattern
 * - Premium surfaces with warm accent
 * - Clear information hierarchy
 * - Structured sections
 * - Mobile-first touch-friendly sizing
 * - Edit Vendor and Return to Styles CTAs
 */

import { type ReactNode } from 'react'
import { Building2, Mail, Phone, Globe, MapPin, User, AlertTriangle, Edit2, Archive } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui'
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge'
import { Badge } from '@/components/ui/badge'
import { SectionContainer } from '@/components/ui/section-container'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { QRCodeButton } from '@/components/qrcode/QRCodeButton'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import type { VendorRecord } from '@/types/vendor'
import { CommentThread } from '@/components/comments/CommentThread'
import { AssignmentSheet } from '@/features/assignments'
import { VendorPriceComparisonSection } from '../components/VendorPriceComparisonSection'

export interface VendorDetailScreenProps {
  /** The vendor record to display */
  vendor: VendorRecord
  /** Callback for back navigation */
  onBack?: () => void
  /** Callback for Edit Vendor action */
  onEditVendor?: () => void
  /** Callback for Return to Vendor Styles action */
  onReturnToStyles?: () => void
  /** Callback for Archive action */
  onArchive?: () => void
  /** Optional header content */
  headerContent?: ReactNode
  /** Additional className */
  className?: string
  /** Event ID for assignment context */
  eventId?: string
  /** Whether current user can assign */
  canAssign?: boolean
}

/**
 * Get relative time string
 */
function getRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

/**
 * Vendor detail screen component
 *
 * Shows:
 * - Header with vendor name, booth, and back button
 * - Primary image or placeholder
 * - Basic Information section
 * - Contact Information section
 * - Address / Notes section
 * - Extraction Notes if warnings exist
 * - Related Styles section (if styles provided)
 * - Optional Add Style CTA
 * - No edit or re-extraction actions
 */
export function VendorDetailScreen({
  vendor,
  onBack,
  onEditVendor,
  onReturnToStyles,
  onArchive,
  headerContent,
  className,
  eventId,
  canAssign,
}: VendorDetailScreenProps) {
  // Get primary image or use placeholder
  const primaryImage = vendor.images.length > 0 ? vendor.images[0] : null

  // Build subtitle from booth number or fallback
  const headerSubtitle = vendor.boothNumber
    ? `Booth ${vendor.boothNumber}`
    : undefined

  return (
    <AppShell>
      {/* Page header with back, title, optional edit action */}
      {headerContent || (
        <PageHeader
          title={vendor.companyName || 'Vendor Details'}
          subtitle={headerSubtitle}
          onBack={onBack}
          action={
            onEditVendor ? (
              <Button
                variant="accent"
                size="sm"
                onClick={onEditVendor}
                type="button"
              >
                <Edit2 className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Scrollable content area */}
      <main className="flex-1 overflow-y-auto px-4 pt-3">
        <div className={cn('space-y-6', className)}>
          {/* Confidence badge row (visible only when headerContent is not provided) */}
           {!headerContent && vendor.extractionConfidence != null && (
             <div className="-mt-1">
               <ConfidenceBadge confidence={vendor.extractionConfidence} />
             </div>
           )}

           {/* Primary image or placeholder */}
           <div className="w-full aspect-video sm:aspect-[16/9] rounded-2xl overflow-hidden bg-muted border border-border">
             {primaryImage ? (
               <ImageWithFallback
                 src={primaryImage.uri}
                 alt={vendor.companyName}
                 className="w-full h-full object-cover"
               />
             ) : (
               <div className="w-full h-full flex items-center justify-center">
                 <Building2 className="h-16 w-16 text-muted-foreground/30" />
               </div>
             )}
           </div>

           {/* Primary Actions */}
           <div className="space-y-3">
             {onReturnToStyles && (
               <Button
                 variant="accent"
                 onClick={onReturnToStyles}
                 type="button"
                 className="w-full shadow-md shadow-orange-500/10"
                 radius="pill"
                 size="lg"
               >
                 <Building2 className="h-5 w-5 mr-2" />
                 View Vendor Styles
               </Button>
             )}

             {onEditVendor && (
               <Button
                 variant="outline"
                 onClick={onEditVendor}
                 type="button"
                 className="w-full border-muted-foreground/20 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all duration-200"
                 radius="pill"
                 size="lg"
               >
                 <Edit2 className="h-4 w-4 mr-2" />
                 Edit Vendor Details
               </Button>
             )}

<QRCodeButton
                type="vendor"
                id={vendor.id}
                name={vendor.companyName || 'Vendor'}
                variant="outline"
                className="w-full"
              />

              {eventId && (
                <AssignmentSheet
                  entityType="vendor"
                  entityId={vendor.id}
                  eventId={eventId!}
                  canAssign={canAssign ?? false}
                />
              )}

              {onArchive && (
               <Button
                 variant="ghost"
                 onClick={onArchive}
                 type="button"
                 className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                 radius="pill"
                 size="lg"
               >
                 <Archive className="h-4 w-4 mr-2" />
                 Archive Vendor
               </Button>
             )}
           </div>

           {/* Extraction warning banner */}
           {vendor.extractionMeta?.warnings && vendor.extractionMeta.warnings.length > 0 && (
             <SectionContainer
               title="Extraction Notes"
               background="muted"
             >
               <div className="space-y-2">
                 {vendor.extractionMeta.warnings.map((warning, index) => (
                   <div
                     key={index}
                     className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
                   >
                     <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                     <p className="text-sm text-amber-700 dark:text-amber-400">{warning}</p>
                   </div>
                 ))}
               </div>
             </SectionContainer>
           )}

             {!headerContent && (
              <SectionContainer title="Comments">
                <CommentThread entityType="vendor" entityId={vendor.id} />
              </SectionContainer>
            )}

          {/* Basic Information */}
          <SectionContainer
            title="Basic Information"
            icon={<Building2 className="h-5 w-5" />}
          >
            <div className="space-y-4">
              {vendor.boothNumber && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Booth Number</p>
                  <Badge variant="outline" className="text-sm">
                    {vendor.boothNumber}
                  </Badge>
                </div>
              )}

              {vendor.countryOfOrigin && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Country of Origin</p>
                  <p className="text-sm text-foreground">{vendor.countryOfOrigin}</p>
                </div>
              )}

              {vendor.brandNames && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Brand Names</p>
                  <p className="text-sm text-foreground">{vendor.brandNames}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Added</p>
                <p className="text-sm text-foreground">{getRelativeTime(vendor.createdAt)}</p>
              </div>
            </div>
          </SectionContainer>

          {/* Contact Information */}
          {vendor.contactName || vendor.email || vendor.phone ? (
            <SectionContainer
              title="Contact Information"
              icon={<User className="h-5 w-5" />}
            >
              <div className="space-y-4">
                {vendor.contactName && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Contact Person</p>
                    <p className="text-sm text-foreground">{vendor.contactName}</p>
                  </div>
                )}

                {vendor.email && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                    <a
                      href={`mailto:${vendor.email}`}
                      className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {vendor.email}
                    </a>
                  </div>
                )}

                {vendor.phone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Phone</p>
                    <a
                      href={`tel:${vendor.phone}`}
                      className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {vendor.phone}
                    </a>
                  </div>
                )}
              </div>
            </SectionContainer>
          ) : null}

          {/* Website */}
          {vendor.website && (
            <SectionContainer title="Website">
              <a
                href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
              >
                <Globe className="h-3.5 w-3.5" />
                {vendor.website.replace(/^https?:\/\//, '')}
              </a>
            </SectionContainer>
          )}

          {/* Address */}
          {vendor.address && (
            <SectionContainer title="Address" icon={<MapPin className="h-5 w-5" />}>
              <p className="text-sm text-foreground">{vendor.address}</p>
            </SectionContainer>
          )}

          {/* Notes */}
          {vendor.notes && (
            <SectionContainer title="Notes">
              <p className="text-sm text-foreground whitespace-pre-wrap">{vendor.notes}</p>
            </SectionContainer>
          )}

          {/* Price comparison across events */}
          <VendorPriceComparisonSection vendorId={vendor.id} />

          {/* Image gallery */}
          {vendor.images.length > 1 && (
            <SectionContainer title={`Images (${vendor.images.length})`}>
              <div className="grid grid-cols-3 gap-2">
                {vendor.images.map((image) => (
                  <div
                    key={image.id}
                    className="aspect-square rounded-lg overflow-hidden bg-muted border border-border"
                  >
                    <ImageWithFallback
                      src={image.uri}
                      alt={image.caption || 'Vendor image'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </SectionContainer>
          )}

          {/* Metadata */}
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              Vendor ID: <span className="font-mono">{vendor.id}</span>
            </p>
          </div>
        </div>
      </main>

      {/* Bottom navigation */}
      <BottomNavigation />
    </AppShell>
  )
}
