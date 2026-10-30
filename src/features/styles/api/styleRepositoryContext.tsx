/**
 * Style Repository Context - React Context Provider and Hooks
 *
 * Provides React Context-based access to the style repository,
 * replacing the mock store pattern with real Supabase persistence.
 */

import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { StyleRecord } from '@/types/style'
import { createLogger } from '@/lib/logger'
import { setBusinessContext } from '@/lib/posthog'
import { type StyleCreateInput, type StyleUpdateInput } from './styleMappers'
import { styleRepository } from './styleRepository'

const logger = createLogger('StyleRepo')

// Re-export everything consumers need from the sub-modules
export { styleRepository, createSupabaseStyleRepository, type StyleRepository } from './styleRepository'
export {
  type StyleCreateInput,
  type StyleUpdateInput,
  type FabricStyleRow,
  type FabricImageRow,
  styleRecordToFabricStyleRow,
  fabricStyleRowToStyleRecord,
  fabricImageToStyleImage,
} from './styleMappers'

/**
 * Repository context value
 */
interface StyleRepositoryContextValue {
  /** All styles for the current vendor */
  styles: StyleRecord[]
  /** Loading state */
  loading: boolean
  /** Error state */
  error: string | null
  /** Refresh styles for a vendor */
  refresh: () => Promise<void>
  /** Get a style by ID (from cached list) */
  getStyle: (id: string) => StyleRecord | null
  /** Create a new style */
  createStyle: (input: StyleCreateInput) => Promise<StyleRecord>
  /** Update an existing style */
  updateStyle: (id: string, input: StyleUpdateInput) => Promise<StyleRecord>
  /** Delete (soft-archive) a style */
  deleteStyle: (id: string) => Promise<void>
}

const StyleRepositoryContext = createContext<StyleRepositoryContextValue | null>(null)

/**
 * Style Repository Provider props
 */
export interface StyleRepositoryProviderProps {
  children: ReactNode
  /** Vendor ID to load styles for */
  vendorId: string
}

/**
 * Style Repository Provider component
 *
 * Wraps the app to provide style state management backed by the repository.
 *
 * @example
 * ```tsx
 * <StyleRepositoryProvider vendorId="vendor-123">
 *   <App />
 * </StyleRepositoryProvider>
 * ```
 */
export function StyleRepositoryProvider({
  children,
  vendorId,
}: StyleRepositoryProviderProps) {
  const [styles, setStyles] = useState<StyleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load styles when vendorId changes
  const refresh = useCallback(async () => {
    setBusinessContext({ vendorId })
    setLoading(true)
    setError(null)
    try {
      const loaded = await styleRepository.getStylesByVendor(vendorId)
      setStyles(loaded)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load styles'
      setError(message)
      logger.error('Error loading styles', { error: String(err) })
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Get style by ID from cache
  const getStyle = useCallback(
    (id: string) => {
      return styles.find((s) => s.id === id) || null
    },
    [styles]
  )

  // Create style
  const createStyle = useCallback(async (input: StyleCreateInput) => {
    const created = await styleRepository.createStyle(input)
    // Refresh to get updated list
    await refresh()
    return created
  }, [refresh])

  // Update style
  const updateStyle = useCallback(async (id: string, input: StyleUpdateInput) => {
    const updated = await styleRepository.updateStyle(id, input)
    // Update local state optimistically
    setStyles((prev) =>
      prev.map((s) => (s.id === id ? updated : s))
    )
    return updated
  }, [])

  // Delete style
  const deleteStyle = useCallback(async (id: string) => {
    await styleRepository.deleteStyle(id)
    // Remove from local state
    setStyles((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const value: StyleRepositoryContextValue = {
    styles,
    loading,
    error,
    refresh,
    getStyle,
    createStyle,
    updateStyle,
    deleteStyle,
  }

  return (
    <StyleRepositoryContext.Provider value={value}>
      {children}
    </StyleRepositoryContext.Provider>
  )
}

/**
 * Hook to access the style repository
 *
 * @throws Error if used outside of StyleRepositoryProvider
 *
 * @example
 * ```tsx
 * const { styles, loading, error, refresh, getStyle, createStyle, updateStyle } = useStyleRepository()
 * ```
 */
export function useStyleRepository(): StyleRepositoryContextValue {
  const context = useContext(StyleRepositoryContext)
  if (!context) {
    throw new Error('useStyleRepository must be used within StyleRepositoryProvider')
  }
  return context
}

/**
 * Hook to get styles for a specific vendor (convenience wrapper)
 *
 * @example
 * ```tsx
 * const { styles, loading, error } = useStylesForVendor('vendor-123')
 * ```
 */
export function useStylesForVendor(_vendorId: string): {
  styles: StyleRecord[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const context = useContext(StyleRepositoryContext)

  if (!context) {
    // Return empty state if not in provider (fallback)
    return {
      styles: [],
      loading: false,
      error: null,
      refresh: async () => {},
    }
  }

  return {
    styles: context.styles,
    loading: context.loading,
    error: context.error,
    refresh: context.refresh,
  }
}

/**
 * Hook to get a single style by ID
 *
 * @example
 * ```tsx
 * const { style, loading, error } = useStyle('style-123')
 * ```
 */
export function useStyle(styleId: string): {
  style: StyleRecord | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const { styles, loading, error, refresh } = useStyleRepository()

  const style = styles.find((s) => s.id === styleId) || null

  return {
    style,
    loading,
    error,
    refresh,
  }
}
