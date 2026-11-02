/**
 * useCatalogueItemDetail tests (FR-CAT-01).
 *
 * Supabase is mocked (recorded-fixture style chains, never live). Proves the
 * detail query maps the item row, wires variants/images/definition, throws on
 * item failure (unknown id, wrong vendor), and degrades variants/images/
 * definition to empty on failure. Vendor scoping is asserted via eq filters.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
}))

vi.mock('@/config/env', () => ({
  env: {
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-key',
  },
}))

import { supabase } from '@/lib/supabase/client'
import { useCatalogueItemDetail } from '../hooks/useCatalogueItemDetail'
import { clearCatalogueTypeCache } from '../api/catalogueRegistry'

const GARMENT_DEF = {
  slug: 'garment',
  kind: 'catalogue_type',
  display_name: 'Garment',
  version: 2,
  schema: {
    output_root: 'item',
    fields: [
      { path: 'item.garment_type', type: 'string', label: 'Garment Type', required: true },
      { path: 'item.fit', type: 'string', label: 'Fit' },
    ],
  },
}

const ITEM_ROW = {
  id: 'uuid-1',
  item_code: 'G-001',
  name: 'Denim Jacket',
  schema_type: 'garment',
  schema_version: 2,
  extracted_fields: { garment_type: 'Jacket', fit: 'Relaxed' },
  created_at: '2026-01-01T00:00:00Z',
}

const VARIANT_ROWS = [
  {
    id: 'var-1',
    variant_name: 'Indigo',
    colour_code: '#1A2B4A',
    colour_name: 'Indigo',
    sizing: 'M',
    status: 'active',
  },
]

const SCAN_ROWS = [
  {
    item_id: 'uuid-1',
    source_image_url: 'https://example.com/a.jpg',
    source_image_path: null,
  },
]

function itemsChain(result: unknown, eqCalls: unknown[][]) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn((...args: unknown[]) => {
    eqCalls.push(args)
    return chain
  })
  chain.maybeSingle = vi.fn(() => Promise.resolve(result))
  return chain
}

function variantsChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => Promise.resolve(result))
  return chain
}

function scansChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => Promise.resolve(result))
  return chain
}

function catalogueTypesChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => Promise.resolve(result))
  return chain
}

interface Fixtures {
  item?: unknown
  variants?: unknown
  scans?: unknown
  types?: unknown
}

function mockTables(fx: Fixtures, eqCalls: unknown[][]) {
  const itemResult = fx.item ?? { data: ITEM_ROW, error: null }
  const variantsResult = fx.variants ?? { data: VARIANT_ROWS, error: null }
  const scansResult = fx.scans ?? { data: SCAN_ROWS, error: null }
  const typesResult = fx.types ?? { data: [GARMENT_DEF], error: null }
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'catalogue_items') {return itemsChain(itemResult, eqCalls)}
    if (table === 'catalogue_item_variants') {return variantsChain(variantsResult)}
    if (table === 'scan_sessions') {return scansChain(scansResult)}
    if (table === 'catalogue_types') {return catalogueTypesChain(typesResult)}
    throw new Error(`unexpected table ${table}`)
  }) as never)
}

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useCatalogueItemDetail [FR-CAT-01]', () => {
  let eqCalls: unknown[][]

  beforeEach(() => {
    vi.clearAllMocks()
    clearCatalogueTypeCache()
    eqCalls = []
  })

  it('maps the item row with definition-driven fields, variants, images and vendor scoping', async () => {
    mockTables({}, eqCalls)

    const { result } = renderHook(() => useCatalogueItemDetail('v-1', 'uuid-1'), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const data = result.current.data
    expect(data?.item.id).toBe('uuid-1')
    expect(data?.item.item_code).toBe('G-001')
    expect(data?.definition?.display_name).toBe('Garment')
    expect(data?.definition?.version).toBe(2)
    // Definition-driven fields (output_root stripped, primitives formatted).
    expect(data?.fields).toContainEqual({ label: 'Garment Type', value: 'Jacket' })
    expect(data?.fields).toContainEqual({ label: 'Fit', value: 'Relaxed' })
    // Variants and thumbnails wired through.
    expect(data?.variants).toHaveLength(1)
    expect(data?.variants[0].variant_name).toBe('Indigo')
    expect(data?.imageUrls).toEqual(['https://example.com/a.jpg'])
    // Complete extraction: no warnings, no review flag.
    expect(data?.warnings).toEqual([])
    expect(data?.needsReview).toBe(false)
    // Vendor scoping: item query filters by id + vendor_id + active status.
    expect(eqCalls).toContainEqual(['id', 'uuid-1'])
    expect(eqCalls).toContainEqual(['vendor_id', 'v-1'])
    expect(eqCalls).toContainEqual(['status', 'active'])
  })

  it('flags missing required fields with warnings and needsReview', async () => {
    mockTables(
      {
        item: {
          data: {
            ...ITEM_ROW,
            extracted_fields: { garment_type: '', fit: 'Relaxed' },
          },
          error: null,
        },
      },
      eqCalls,
    )

    const { result } = renderHook(() => useCatalogueItemDetail('v-1', 'uuid-1'), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.fields).toContainEqual({
      label: 'Garment Type',
      value: 'Not extracted',
    })
    expect(result.current.data?.warnings).toEqual([
      'Garment Type is required but was not extracted — confirm or fill it.',
    ])
    expect(result.current.data?.needsReview).toBe(true)
  })

  it('throws when the item query fails', async () => {
    mockTables({ item: { data: null, error: { message: 'denied' } } }, eqCalls)

    const { result } = renderHook(() => useCatalogueItemDetail('v-1', 'uuid-1'), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ message: 'Failed to load item' })
  })

  it('throws Item not found for unknown id or wrong vendor', async () => {
    mockTables({ item: { data: null, error: null } }, eqCalls)

    const { result } = renderHook(() => useCatalogueItemDetail('v-9', 'nope'), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ message: 'Item not found' })
  })

  it('degrades to empty variants when the variants query fails', async () => {
    mockTables({ variants: { data: null, error: { message: 'boom' } } }, eqCalls)

    const { result } = renderHook(() => useCatalogueItemDetail('v-1', 'uuid-1'), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.variants).toEqual([])
    // Item itself still maps.
    expect(result.current.data?.item.id).toBe('uuid-1')
  })

  it('degrades to empty images when the scans query fails', async () => {
    mockTables({ scans: { data: null, error: { message: 'boom' } } }, eqCalls)

    const { result } = renderHook(() => useCatalogueItemDetail('v-1', 'uuid-1'), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.imageUrls).toEqual([])
    expect(result.current.data?.item.id).toBe('uuid-1')
  })

  it('falls back to raw fields when the type definition is missing', async () => {
    mockTables({ types: { data: [], error: null } }, eqCalls)

    const { result } = renderHook(() => useCatalogueItemDetail('v-1', 'uuid-1'), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.definition).toBeNull()
    expect(result.current.data?.fields).toContainEqual({
      label: 'Garment type',
      value: 'Jacket',
    })
  })
})
