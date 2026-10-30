/**
 * Public Catalogue View Component
 *
 * Public view for shared event catalogues.
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Lock, Calendar, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  getPublicShareLink,
  verifyShareLinkPassword,
  getPublicCatalogue,
  type PublicShareLink,
  type PublicCatalogueVendor
} from '../api/createShareLink'

interface PublicCatalogueViewProps {
  /** Optional additional className */
  className?: string
}

/**
 * Public catalogue view for shared events
 */
export function PublicCatalogueView({ className }: PublicCatalogueViewProps) {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [shareLink, setShareLink] = useState<PublicShareLink | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [catalogue, setCatalogue] = useState<PublicCatalogueVendor[]>([])
  const [catalogueLoading, setCatalogueLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch share link details
  useEffect(() => {
    if (!token) return

    const fetchShareLink = async () => {
      setIsLoading(true)
      try {
        const link = await getPublicShareLink(token)
        if (!link) {
          showToast({
            title: 'Invalid link',
            description: 'This share link is invalid or has expired.',
            variant: 'error',
            duration: 5000
          })
          return
        }

        setShareLink(link)

        // If no password required, auto-authenticate
        if (!link.requiresPassword) {
          setIsAuthenticated(true)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load share link'
        showToast({
          title: 'Error',
          description: message,
          variant: 'error',
          duration: 5000
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchShareLink()
  }, [token, showToast])

  // Fetch catalogue data after authentication
  useEffect(() => {
    if (!isAuthenticated || !token) return
    setCatalogueLoading(true)
    setError(null)
    getPublicCatalogue(token)
      .then(result => setCatalogue(result.vendors))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load catalogue'))
      .finally(() => setCatalogueLoading(false))
  }, [isAuthenticated, token])

  const handlePasswordSubmit = useCallback(async () => {
    if (!token) return

    try {
      const isValid = await verifyShareLinkPassword(token, password)
      if (isValid) {
        setIsAuthenticated(true)
        setPasswordError('')
      } else {
        setPasswordError('Incorrect password')
      }
    } catch (error) {
      setPasswordError('Failed to verify password')
    }
  }, [token, password])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('min-h-screen bg-background flex items-center justify-center', className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading catalogue...</p>
        </div>
      </div>
    )
  }

  // Invalid link
  if (!shareLink) {
    return (
      <div className={cn('min-h-screen bg-background flex items-center justify-center p-4', className)}>
        <div className="text-center max-w-md">
          <div className="bg-destructive/10 text-destructive rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Link Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This share link is invalid or has expired.
          </p>
          <Button onClick={() => navigate('/')}>
            Go to Homepage
          </Button>
        </div>
      </div>
    )
  }

  // Password required - not authenticated
  if (shareLink.requiresPassword && !isAuthenticated) {
    return (
      <div className={cn('min-h-screen bg-background flex items-center justify-center p-4', className)}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-primary/10 text-primary rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Password Required</h1>
            <p className="text-muted-foreground">
              {shareLink.name || 'This catalogue'} is password protected.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Enter password"
                className={cn(
                  'w-full px-3 py-2 rounded-md border bg-background text-sm',
                  passwordError && 'border-destructive'
                )}
                autoFocus
              />
              {passwordError && (
                <p className="text-sm text-destructive mt-1">{passwordError}</p>
              )}
            </div>

            <Button
              onClick={handlePasswordSubmit}
              disabled={!password}
              className="w-full"
            >
              Unlock Catalogue
            </Button>

            {shareLink.description && (
              <p className="text-sm text-muted-foreground text-center">
                {shareLink.description}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Authenticated - show catalogue
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{shareLink.name || 'Event Catalogue'}</h1>
              {shareLink.description && (
                <p className="text-sm text-muted-foreground">{shareLink.description}</p>
              )}
            </div>
            {shareLink.expiresAt && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Expires {new Date(shareLink.expiresAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Error display */}
      {error && (
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="container max-w-6xl mx-auto px-4 py-8">
        {catalogueLoading && (
          <div className="text-center py-8 text-muted-foreground">Loading catalogue...</div>
        )}
        {!catalogueLoading && catalogue.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No vendors found in this catalogue.</p>
          </div>
        )}
        {catalogue.map(vendor => (
          <div key={vendor.id} className="mb-10">
            <div className="flex items-center gap-3 mb-4 pb-2 border-b">
              <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <h3 className="font-semibold">{vendor.companyName}</h3>
                {vendor.boothNumber && (
                  <p className="text-sm text-muted-foreground">Booth {vendor.boothNumber}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {vendor.styles.map(style => (
                <div key={style.id} className="border rounded-lg overflow-hidden">
                  {style.images[0] && (
                    <img
                      src={style.images[0].uri}
                      alt={style.styleName}
                      className="w-full aspect-square object-cover"
                    />
                  )}
                  <div className="p-2">
                    <p className="text-sm font-medium truncate">{style.styleName}</p>
                    {style.color && <p className="text-xs text-muted-foreground truncate">{style.color}</p>}
                    {style.price && <p className="text-xs font-medium mt-1">{style.price}</p>}
                  </div>
                </div>
              ))}
              {vendor.styles.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">No styles captured yet.</p>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
