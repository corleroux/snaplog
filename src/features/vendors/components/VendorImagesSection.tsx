import { useState, useRef, type ChangeEvent } from 'react'
import { Upload, Sparkles, X, Loader2, AlertTriangle, ImageIcon } from 'lucide-react'
import { SectionContainer } from '@/components/ui/section-container'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface VendorImage {
  id: string
  uri: string
  publicUrl?: string
  storagePath?: string
  caption?: string
}

export interface VendorImagesSectionProps {
  images: VendorImage[]
  eventId: string
  extractionEnabled: boolean
  onExtractionToggle: (enabled: boolean) => void
  onReplace: (file: File, extractionEnabled: boolean) => void
  isUploading: boolean
  uploadError?: string | null
  className?: string
}

export function VendorImagesSection({
  images,
  extractionEnabled,
  onExtractionToggle,
  onReplace,
  isUploading,
  uploadError,
  className,
}: VendorImagesSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const currentImage = images[0] ?? null

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleConfirmReplace = () => {
    if (!pendingFile) return
    onReplace(pendingFile, extractionEnabled)
  }

  const handleCancelReplace = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPendingFile(null)
    setPreviewUrl(null)
  }

  return (
    <SectionContainer
      title="Vendor Image"
      description="Manage the vendor's primary image"
      className={className}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {isUploading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Uploading new image...</p>
        </div>
      ) : pendingFile && previewUrl ? (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={previewUrl}
              alt="New image preview"
              className="w-full aspect-[4/3] object-contain rounded-lg border border-border bg-muted"
            />
            <div className="absolute top-2 right-2">
              <button
                type="button"
                onClick={handleCancelReplace}
                className="p-1.5 rounded-md bg-background/90 shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onExtractionToggle(!extractionEnabled)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                extractionEnabled
                  ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              )}
            >
              <Sparkles className={cn('h-4 w-4', extractionEnabled && 'text-orange-500')} />
              <span>{extractionEnabled ? 'AI Extraction On' : 'AI Extraction Off'}</span>
            </button>
          </div>

          {extractionEnabled && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-orange-500" />
              Existing vendor values will be replaced by extracted data (booth number preserved if missing)
            </p>
          )}

          <Button
            type="button"
            variant="accent"
            onClick={handleConfirmReplace}
            className="w-full"
            radius="pill"
          >
            {extractionEnabled ? 'Replace & Extract' : 'Replace Image'}
          </Button>
        </div>
      ) : currentImage ? (
        <div className="space-y-4">
          <ImageWithFallback
            src={currentImage.publicUrl || currentImage.uri}
            alt="Current vendor image"
            className="w-full aspect-[4/3] object-contain rounded-lg border border-border bg-muted"
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onExtractionToggle(!extractionEnabled)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                extractionEnabled
                  ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              )}
            >
              <Sparkles className={cn('h-4 w-4', extractionEnabled && 'text-orange-500')} />
              <span>AI Extraction</span>
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              Replace
            </Button>
          </div>
          {extractionEnabled && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-orange-500" />
              When you replace the image, AI extraction will run on the new image
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No vendor image</p>
          <p className="text-sm text-muted-foreground">Upload an image for this vendor</p>
          <Button
            type="button"
            variant="accent"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload Image
          </Button>
        </div>
      )}

      {uploadError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mt-4">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{uploadError}</p>
        </div>
      )}
    </SectionContainer>
  )
}
