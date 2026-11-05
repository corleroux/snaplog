/**
 * Catalogue registry helper tests (FR-SCH-05 + FR-EXT-06).
 *
 * Pure helper tests — Supabase is mocked. Covers the missing-field rule,
 * dotted-path read/write (including variant array indices) and the
 * no-overwrite merge (re-extraction never overwrites reviewer edits).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
}))

import { supabase } from '@/lib/supabase/client'
import {
  getCatalogueTypes,
  getCatalogueType,
  clearCatalogueTypeCache,
  isMissingValue,
  readFieldValue,
  writeFieldValue,
  mergeReviewedEdits,
} from '../api/catalogueRegistry'

const GARMENT_ROW = {
  slug: 'garment',
  kind: 'catalogue_type',
  display_name: 'Garment',
  version: 1,
  schema: {
    output_root: 'item',
    fields: [
      { path: 'item.garment_type', type: 'string', label: 'Garment type', required: false },
      { path: 'item.colourways', type: 'array', label: 'Colourways', required: false },
    ],
  },
}

function mockRegistry(rows: unknown[]) {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: rows, error: null }),
  } as never)
}

describe('getCatalogueTypes', () => {
  beforeEach(() => {
    clearCatalogueTypeCache()
    vi.clearAllMocks()
  })

  it('fetches active rows and caches them', async () => {
    mockRegistry([GARMENT_ROW])
    const first = await getCatalogueTypes()
    const second = await getCatalogueTypes()
    expect(first).toHaveLength(1)
    expect(first[0].slug).toBe('garment')
    // Second call hits the cache — from() called once.
    expect(second).toBe(first)
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('getCatalogueType returns the latest version and throws when missing', async () => {
    mockRegistry([GARMENT_ROW, { ...GARMENT_ROW, version: 2 }])
    const def = await getCatalogueType('garment')
    expect(def.version).toBe(2)
    await expect(getCatalogueType('nope')).rejects.toThrow('not found')
  })
})

describe('isMissingValue', () => {
  it.each([null, undefined, '', '   ', []])('flags %p as missing', (value) => {
    expect(isMissingValue(value)).toBe(true)
  })

  it.each(['Dress', 0, 150, ['red'], { a: 1 }, false])('keeps %p as present', (value) => {
    expect(isMissingValue(value)).toBe(false)
  })
})

describe('readFieldValue / writeFieldValue', () => {
  it('reads dotted paths', () => {
    expect(readFieldValue({ item: { garment_type: 'Dress' } }, 'item.garment_type')).toBe('Dress')
    expect(readFieldValue({ item: {} }, 'item.garment_type')).toBeUndefined()
  })

  it('writes dotted paths, creating intermediate objects', () => {
    const out = writeFieldValue({ item: {} }, 'item.fit', 'Slim')
    expect(out).toEqual({ item: { fit: 'Slim' } })
  })

  it('writes array indices for variant rows', () => {
    const out = writeFieldValue(
      { item: { colourways: [{ colour_name: 'Red' }] } },
      'item.colourways.0.colour_name',
      'Crimson'
    )
    expect(out).toEqual({ item: { colourways: [{ colour_name: 'Crimson' }] } })
  })
})

describe('mergeReviewedEdits (FR-EXT-06 no-overwrite rule)', () => {
  it('reviewer edits win over re-extracted values', () => {
    const reExtracted = {
      item: { garment_type: 'Skirt', fit: 'Relaxed', silhouette: 'A-line' },
    }
    const userEdits = { 'item.garment_type': 'Dress', 'item.fit': 'Slim' }

    const merged = mergeReviewedEdits(reExtracted, userEdits)

    expect(merged).toEqual({
      item: { garment_type: 'Dress', fit: 'Slim', silhouette: 'A-line' },
    })
  })

  it('variant-row edits survive re-extraction', () => {
    const reExtracted = {
      item: { colourways: [{ colour_name: 'Red' }, { colour_name: 'Blue' }] },
    }
    const userEdits = { 'item.colourways.1.colour_name': 'Navy' }

    const merged = mergeReviewedEdits(reExtracted, userEdits)

    expect(merged).toEqual({
      item: { colourways: [{ colour_name: 'Red' }, { colour_name: 'Navy' }] },
    })
  })

  it('does not mutate the extraction payload', () => {
    const extracted = { item: { fit: 'Relaxed' } }
    mergeReviewedEdits(extracted, { 'item.fit': 'Slim' })
    expect(extracted).toEqual({ item: { fit: 'Relaxed' } })
  })
})
