/**
 * useCatalogueItemsQuery degradation tests (FR-CAT-01 unified styles screen).
 *
 * Supabase is mocked (recorded-fixture style chains, never live). Proves the
 * style list degrades to fabric-only when the items query fails, and to
 * imageless records when the thumbnail query fails.
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
import { useCatalogueItemsQuery } from '../hooks/useCatalogueItemsQuery'
import type { CatalogueItemRow } from '../api/toStyleRecord'

function catalogueItemsChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => Promise.resolve(result))
  return chain
}

function scanSessionsChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.in = vi.fn(() => Promise.resolve(result))
  return chain
}

function mockTables(items: unknown, scans: unknown) {
  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'catalogue_items') {return catalogueItemsChain(items)}
    if (table === 'scan_sessions') {return scanSessionsChain(scans)}
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

const COMPLETE_ROW: CatalogueItemRow = {
  id: 'row-1',
  item_code: 'G-001',
  name: 'Denim Jacket',
  schema_type: 'garment',
  extracted_fields: { item: { garment_type: 'Jacket', fit: 'Relaxed', sizing: 'M' } },
  created_at: '2026-01-01T00:00:00Z',
}

describe('useCatalogueItemsQuery [FR-CAT-01]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns [] when the items query fails (fabric-only degradation)', async () => {
    mockTables({ data: null, error: { message: 'denied' } }, { data: [], error: null })

    const { result } = renderHook(() => useCatalogueItemsQuery('v-1'), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('catalogue_items')
    expect(vi.mocked(supabase.from)).not.toHaveBeenCalledWith('scan_sessions')
  })

  it('returns records without images when the thumbnails query fails', async () => {
    mockTables(
      { data: [COMPLETE_ROW], error: null },
      { data: null, error: { message: 'boom' } },
    )

    const { result } = renderHook(() => useCatalogueItemsQuery('v-1'), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].record.id).toBe('ci-row-1')
    expect(result.current.data?.[0].record.images).toEqual([])
  })

  it('resolves public thumbnail URLs and rebuilds stale signed URLs from the path', async () => {
    const row2: CatalogueItemRow = { ...COMPLETE_ROW, id: 'row-2', item_code: 'G-002', name: 'Linen Shirt' }
    mockTables(
      { data: [COMPLETE_ROW, row2], error: null },
      {
        data: [
          { item_id: 'row-1', source_image_url: 'https://example.com/a.jpg', source_image_path: null },
          {
            item_id: 'row-2',
            source_image_url:
              'https://example.supabase.co/storage/v1/object/sign/scan-originals/x.webp?token=abc',
            source_image_path: 'evt-1/x.webp',
          },
        ],
        error: null,
      },
    )

    const { result } = renderHook(() => useCatalogueItemsQuery('v-1'), {
      wrapper: wrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].record.images).toEqual([
      { id: 'ci-img-row-1', uri: 'https://example.com/a.jpg' },
    ])
    expect(result.current.data?.[1].record.images).toEqual([
      {
        id: 'ci-img-row-2',
        uri: 'https://example.supabase.co/storage/v1/object/public/scan-originals/evt-1/x.webp',
      },
    ])
  })
})
