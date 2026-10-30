/**
 * QR Code Button Component
 *
 * Button to generate and display QR codes for vendors or styles.
 */

import { useState, useEffect } from 'react'
import { QrCode, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { generateQRCode, downloadQRCode } from '@/lib/qrcode/generateQRCode'
import { useSharedLinks, type CreateSharedLinkOptions } from '@/features/sharing'
import { createLogger } from '@/lib/logger'

const log = createLogger('QRCodeButton')

interface QRCodeButtonProps {
  type: 'vendor' | 'style'
  id: string
  name: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
  className?: string
}

/**
 * Button to generate and display a QR code for an entity
 */
export function QRCodeButton({
  type,
  id,
  name,
  variant = 'outline',
  size = 'default',
  className = '',
}: QRCodeButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)

  const { createLink, getPublicUrl, isLoading: isLoadingLink } = useSharedLinks()

  const handleGenerateQRCode = async () => {
    setIsGenerating(true)

    try {
      // First, create a shared link for this entity
      const linkType: CreateSharedLinkOptions['type'] = type === 'vendor' ? 'vendor' : 'style'
      const link = await createLink({
        type: linkType,
        [type === 'vendor' ? 'vendorId' : 'styleId']: id,
        expiresInDays: 30, // QR codes are valid for 30 days
      })

      const url = getPublicUrl(link.token)
      setShareToken(link.token)

      // Generate QR code for the share URL
      const dataUrl = await generateQRCode(url, {
        width: 300,
        margin: 2,
      })

      setQrCodeDataUrl(dataUrl)
      setIsOpen(true)
    } catch (error) {
      log.error('Failed to generate QR code', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!shareToken) return

    setIsDownloading(true)

    try {
      const filename = `${name.replace(/[^a-z0-9]/gi, '_')}_qrcode.png`
      const url = getPublicUrl(shareToken)
      await downloadQRCode(url, filename)
    } catch (error) {
      log.error('Failed to download QR code', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setQrCodeDataUrl(null)
    setShareToken(null)
  }

  if (size === 'icon') {
    return (
      <>
        <Button
          variant={variant}
          size="icon"
          onClick={handleGenerateQRCode}
          disabled={isGenerating || isLoadingLink}
          className={className}
          title="Generate QR Code"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <QrCode className="h-4 w-4" />
          )}
        </Button>

        <Modal
          isOpen={isOpen}
          onClose={handleClose}
          title={`QR Code for ${name}`}
          description="Scan this QR code to view on your device."
          footer={
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </>
                )}
              </Button>
            </div>
          }
          size="sm"
        >
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeDataUrl && (
              <div className="p-4 bg-white rounded-lg border">
                <img src={qrCodeDataUrl} alt={`QR Code for ${name}`} className="w-64 h-64" />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Valid for 30 days
            </p>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleGenerateQRCode}
        disabled={isGenerating || isLoadingLink}
        className={className}
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <QrCode className="mr-2 h-4 w-4" />
            QR Code
          </>
        )}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={`QR Code for ${name}`}
        description="Scan this QR code to view on your device."
        footer={
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </>
              )}
            </Button>
          </div>
        }
        size="sm"
      >
        <div className="flex flex-col items-center gap-4 py-4">
          {qrCodeDataUrl && (
            <div className="p-4 bg-white rounded-lg border">
              <img src={qrCodeDataUrl} alt={`QR Code for ${name}`} className="w-64 h-64" />
            </div>
          )}
          <p className="text-sm text-muted-foreground text-center">
            Valid for 30 days
          </p>
        </div>
      </Modal>
    </>
  )
}

/**
 * Simple QR Code display component
 */
interface QRCodeDisplayProps {
  url: string
  name: string
  size?: number
  className?: string
}

export function QRCodeDisplay({ url, name, size = 200, className = '' }: QRCodeDisplayProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (qrCodeDataUrl) return

    setIsGenerating(true)

    try {
      const dataUrl = await generateQRCode(url, {
        width: size,
        margin: 2,
      })
      setQrCodeDataUrl(dataUrl)
    } catch (error) {
      log.error('Failed to generate QR code', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate on mount
  useEffect(() => {
    handleGenerate()
  }, [])

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {isGenerating && (
        <div className="w-full aspect-square flex items-center justify-center bg-muted rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isGenerating && qrCodeDataUrl && (
        <div className="p-2 bg-white rounded-lg border">
          <img
            src={qrCodeDataUrl}
            alt={`QR Code for ${name}`}
            className="w-full h-full"
            style={{ width: size, height: size }}
          />
        </div>
      )}

      {!isGenerating && !qrCodeDataUrl && (
        <div className="w-full aspect-square flex items-center justify-center bg-muted rounded-lg text-muted-foreground">
          Failed to generate QR code
        </div>
      )}
    </div>
  )
}
