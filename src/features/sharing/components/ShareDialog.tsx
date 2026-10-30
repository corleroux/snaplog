/**
 * Share Dialog Component
 *
 * Modal dialog for creating and managing public share links for events.
 */

import { useState, useCallback } from 'react'
import { Share2, Copy, Check, Plus, Trash2, Eye } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  createShareLink,
  deleteShareLink,
  getEventShareLinks,
  getShareLinkUrl,
  type ShareLink,
  type ShareLinkInput
} from '../api/createShareLink'

interface ShareDialogProps {
  /** Event ID to share */
  eventId: string
  /** Event name for display */
  eventName?: string
  /** Optional additional className */
  className?: string
  /** Trigger element */
  trigger?: React.ReactNode
  /** Open state controlled from parent */
  defaultOpen?: boolean
  /** Callback when dialog closes */
  onClose?: () => void
}

/**
 * Share Dialog for creating and managing public share links
 */
export function ShareDialog({ eventId, eventName, className, trigger, defaultOpen, onClose }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { showToast } = useToast()

  // New link form state
  const [newLinkName, setNewLinkName] = useState('')
  const [newLinkDescription, setNewLinkDescription] = useState('')
  const [newLinkPassword, setNewLinkPassword] = useState('')
  const [newLinkExpiresIn, setNewLinkExpiresIn] = useState<number | null>(null)

  const loadShareLinks = useCallback(async () => {
    setIsLoading(true)
    try {
      const links = await getEventShareLinks(eventId)
      setShareLinks(links)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load share links'
      showToast({
        title: 'Error loading links',
        description: message,
        variant: 'error',
        duration: 5000
      })
    } finally {
      setIsLoading(false)
    }
  }, [eventId, showToast])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    loadShareLinks()
  }, [loadShareLinks])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setNewLinkName('')
    setNewLinkDescription('')
    setNewLinkPassword('')
    setNewLinkExpiresIn(null)
    onClose?.()
  }, [onClose])

  const handleCopyLink = useCallback(async (token: string) => {
    const url = getShareLinkUrl(token)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
      showToast({
        title: 'Link copied',
        variant: 'success',
        duration: 2000
      })
    } catch (error) {
      showToast({
        title: 'Failed to copy',
        variant: 'error',
        duration: 3000
      })
    }
  }, [showToast])

  const handleCreateLink = useCallback(async () => {
    const input: ShareLinkInput = {
      eventId,
      name: newLinkName || undefined,
      description: newLinkDescription || undefined,
      password: newLinkPassword || undefined,
      expiresAt: newLinkExpiresIn
        ? new Date(Date.now() + newLinkExpiresIn * 60 * 60 * 1000)
        : undefined
    }

    setIsLoading(true)
    try {
      await createShareLink(input)
      await loadShareLinks()
      setNewLinkName('')
      setNewLinkDescription('')
      setNewLinkPassword('')
      setNewLinkExpiresIn(null)
      showToast({
        title: 'Share link created',
        variant: 'success',
        duration: 3000
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create share link'
      showToast({
        title: 'Creation failed',
        description: message,
        variant: 'error',
        duration: 5000
      })
    } finally {
      setIsLoading(false)
    }
  }, [eventId, newLinkName, newLinkDescription, newLinkPassword, newLinkExpiresIn, loadShareLinks, showToast])

  const handleDeleteLink = useCallback(async (shareLinkId: string) => {
    setIsLoading(true)
    try {
      await deleteShareLink(shareLinkId)
      await loadShareLinks()
      showToast({
        title: 'Share link removed',
        variant: 'success',
        duration: 3000
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete share link'
      showToast({
        title: 'Deletion failed',
        description: message,
        variant: 'error',
        duration: 5000
      })
    } finally {
      setIsLoading(false)
    }
  }, [loadShareLinks, showToast])

  const triggerElement = trigger || (
    <Button variant="outline" size="sm">
      <Share2 className="h-4 w-4 mr-2" />
      Share
    </Button>
  )

  if (!isOpen) {
    return <span onClick={handleOpen} className={cn('cursor-pointer', className)}>{triggerElement}</span>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Share Event</h2>
              {eventName && (
                <p className="text-sm text-muted-foreground">{eventName}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Existing links */}
          {shareLinks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Active Share Links</h3>
              {shareLinks.map((link) => {
                const url = getShareLinkUrl(link.token)
                const isCopied = copiedToken === link.token

                return (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{link.name || 'Unnamed Link'}</span>
                        {link.requiresPassword && (
                          <Eye className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{url}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{link.accessCount} views</span>
                        {link.expiresAt && (
                          <span>Expires {new Date(link.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyLink(link.token)}
                        className="h-8 w-8 p-0"
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLink(link.id)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Create new link */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Link
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Link Name (optional)</label>
                <input
                  type="text"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  placeholder="e.g., Trade Fair 2024"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  value={newLinkDescription}
                  onChange={(e) => setNewLinkDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password Protection (optional)</label>
                <input
                  type="password"
                  value={newLinkPassword}
                  onChange={(e) => setNewLinkPassword(e.target.value)}
                  placeholder="Enter password to protect link"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Expiration (optional)</label>
                <select
                  value={newLinkExpiresIn ?? ''}
                  onChange={(e) => setNewLinkExpiresIn(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Never expires</option>
                  <option value="24">24 hours</option>
                  <option value="168">7 days</option>
                  <option value="720">30 days</option>
                </select>
              </div>
            </div>

            <Button
              onClick={handleCreateLink}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Creating...' : 'Create Share Link'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
