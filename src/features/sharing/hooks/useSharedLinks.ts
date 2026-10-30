/**
 * React Hook for Shared Links
 *
 * Provides functions for creating and managing public share links.
 */

import { useState, useCallback } from 'react'
import {
  createSharedLink,
  getSharedLink,
  getMySharedLinks,
  deleteSharedLink,
  deactivateSharedLink,
  getSharedLinkUrl,
  type SharedLink,
  type CreateSharedLinkOptions,
} from '../api/sharedLinks'

export interface UseSharedLinksResult {
  isCreating: boolean
  isLoading: boolean
  error: string | null
  createLink: (options: CreateSharedLinkOptions) => Promise<SharedLink>
  getLink: (token: string) => Promise<SharedLink | null>
  getMyLinks: () => Promise<SharedLink[]>
  deleteLink: (linkId: string) => Promise<void>
  deactivateLink: (linkId: string) => Promise<void>
  getPublicUrl: (token: string) => string
  clearError: () => void
}

/**
 * Hook for shared links functionality
 */
export function useSharedLinks(): UseSharedLinksResult {
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createLink = useCallback(async (options: CreateSharedLinkOptions) => {
    setIsCreating(true)
    setError(null)

    try {
      const link = await createSharedLink(options)
      return link
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create shared link'
      setError(message)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  const getLink = useCallback(async (token: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const link = await getSharedLink(token)
      return link
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get shared link'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getMyLinks = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const links = await getMySharedLinks()
      return links
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch shared links'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteLink = useCallback(async (linkId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await deleteSharedLink(linkId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete shared link'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deactivateLink = useCallback(async (linkId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await deactivateSharedLink(linkId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate shared link'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getPublicUrl = useCallback((token: string) => {
    return getSharedLinkUrl(token)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isCreating,
    isLoading,
    error,
    createLink,
    getLink,
    getMyLinks,
    deleteLink,
    deactivateLink,
    getPublicUrl,
    clearError,
  }
}
