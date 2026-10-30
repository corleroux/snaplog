/**
 * Vendor Repository Context - React Provider, hooks, and module-level exports
 *
 * Provides React Context-based access to the vendor repository,
 * replacing the mock store pattern with real Supabase persistence.
 */

import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { VendorRecord } from '@/types/vendor'
import { createLogger } from '@/lib/logger'
import { setBusinessContext } from '@/lib/posthog'
import {
  vendorRepository,
  type VendorCreateInput,
  type VendorUpdateInput,
} from './vendorRepository'

const logger = createLogger('VendorRepo')

/**
 * Re-export repository and mapper types for backward compatibility
 */
export type { VendorRepository, VendorCreateInput, VendorUpdateInput } from './vendorRepository'
export { vendorRepository, createVendorRepository, SupabaseVendorRepository } from './vendorRepository'
export {
  vendorRowToVendorRecord,
  vendorImageToVendorImageRecord,
  vendorCreateInputToVendorRow,
} from './vendorMappers'

/**
 * Repository context value
 */
interface VendorRepositoryContextValue {
  /** All vendors for the current event */
  vendors: VendorRecord[]
  /** Loading state */
  loading: boolean
  /** Error state */
  error: string | null
  /** Refresh vendors for an event */
  refresh: () => Promise<void>
  /** Get a vendor by ID (from cached list) */
  getVendor: (id: string) => VendorRecord | null
  /** Create a new vendor */
  createVendor: (input: VendorCreateInput) => Promise<VendorRecord>
  /** Update an existing vendor */
  updateVendor: (id: string, input: VendorUpdateInput, expectedVersion: number) => Promise<VendorRecord>
  /** Archive (soft-delete) a vendor */
  archiveVendor: (id: string) => Promise<void>
}

const VendorRepositoryContext = createContext<VendorRepositoryContextValue | null>(null)

/**
 * Vendor Repository Provider props
 */
export interface VendorRepositoryProviderProps {
  children: ReactNode
  /** Event ID to load vendors for */
  eventId: string
}

/**
 * Vendor Repository Provider component
 *
 * Wraps the app to provide vendor state management backed by the repository.
 *
 * @example
 * ```tsx
 * <VendorRepositoryProvider eventId="event-123">
 *   <App />
 * </VendorRepositoryProvider>
 * ```
 */
export function VendorRepositoryProvider({
  children,
  eventId,
}: VendorRepositoryProviderProps) {
  const [vendors, setVendors] = useState<VendorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load vendors when eventId changes
  const refresh = useCallback(async () => {
    setBusinessContext({ eventId })
    setLoading(true)
    setError(null)
    try {
      const loaded = await vendorRepository.getByEvent(eventId)
      setVendors(loaded)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load vendors'
      setError(message)
      logger.error('Error loading vendors', { error: String(err) })
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Get vendor by ID from cache
  const getVendor = useCallback(
    (id: string) => {
      return vendors.find((v) => v.id === id) || null
    },
    [vendors]
  )

  // Create vendor
  const createVendor = useCallback(async (input: VendorCreateInput) => {
    const created = await vendorRepository.createFromReviewedCapture(input)
    // Refresh to get updated list
    await refresh()
    return created
  }, [refresh])

  // Update vendor
  const updateVendor = useCallback(async (id: string, input: VendorUpdateInput, expectedVersion: number) => {
    const updated = await vendorRepository.update(id, input, expectedVersion)
    // Update local state optimistically
    setVendors((prev) =>
      prev.map((v) => (v.id === id ? updated : v))
    )
    return updated
  }, [])

  // Archive vendor
  const archiveVendor = useCallback(async (id: string) => {
    await vendorRepository.archive(id)
    // Remove from local state
    setVendors((prev) => prev.filter((v) => v.id !== id))
  }, [])

  const value: VendorRepositoryContextValue = {
    vendors,
    loading,
    error,
    refresh,
    getVendor,
    createVendor,
    updateVendor,
    archiveVendor,
  }

  return (
    <VendorRepositoryContext.Provider value={value}>
      {children}
    </VendorRepositoryContext.Provider>
  )
}

/**
 * Hook to access the vendor repository
 *
 * @throws Error if used outside of VendorRepositoryProvider
 *
 * @example
 * ```tsx
 * const { vendors, loading, error, refresh, getVendor, createVendor, updateVendor } = useVendorRepository()
 * ```
 */
export function useVendorRepository(): VendorRepositoryContextValue {
  const context = useContext(VendorRepositoryContext)
  if (!context) {
    throw new Error('useVendorRepository must be used within VendorRepositoryProvider')
  }
  return context
}

/**
 * Hook to get vendors for a specific event (convenience wrapper)
 *
 * @example
 * ```tsx
 * const { vendors, loading, error } = useVendorsForEvent('event-123')
 * ```
 */
export function useVendorsForEvent(_eventId: string): {
  vendors: VendorRecord[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  // For useVendorsForEvent, we need to find the repository context
  // This is a convenience hook that returns a subset of the repository context
  const context = useContext(VendorRepositoryContext)

  if (!context) {
    // Return empty state if not in provider (fallback)
    return {
      vendors: [],
      loading: false,
      error: null,
      refresh: async () => {},
    }
  }

  return {
    vendors: context.vendors,
    loading: context.loading,
    error: context.error,
    refresh: context.refresh,
  }
}

/**
 * Hook to get a single vendor by ID
 *
 * @example
 * ```tsx
 * const { vendor, loading, error } = useVendor('vendor-123')
 * ```
 */
export function useVendor(vendorId: string): {
  vendor: VendorRecord | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const { vendors, loading, error, refresh } = useVendorRepository()

  const vendor = vendors.find((v) => v.id === vendorId) || null

  return {
    vendor,
    loading,
    error,
    refresh,
  }
}
