/**
 * toStyleRecord mapper tests (FR-CAT-01 unified styles screen).
 *
 * Pure mapper tests — no Supabase, no React. Covers id prefixing, '' defaults
 * (the list screen calls .toLowerCase() unguarded), category labels,
 * needsReview threshold, thumbnail mapping and name fallbacks.
 */

import { describe, it, expect } from 'vitest'
import {
  toStyleRecord,
  categoryLabel,
  summaryLine,
  type CatalogueItemRow,
} from '../api/toStyleRecord'
import { REVIEW_MISSING_RATIO } from '../api/missingFields'

function row(overrides: Partial<CatalogueItemRow> = {}): CatalogueItemRow {
  return {
    id: 'abc-123',
    item_code: 'G-001',
    name: 'Denim Jacket',
    schema_type: 'garment',
    extracted_fields: {
      item: { garment_type: 'Jacket', fit: 'Relaxed', sizing: 'M' },
    },
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('toStyleRecord [FR-CAT-01]', () => {
  it('prefixes mapped ids with ci-', () => {
    const { record } = toStyleRecord(row({ id: 'uuid-1' }), null, 'v-1')
    expect(record.id).toBe('ci-uuid-1')
    expect(record.vendorId).toBe('v-1')
  })

  it('defaults every searched string field to a string (unguarded toLowerCase safe)', () => {
    const { record } = toStyleRecord(
      row({ item_code: '', name: null, schema_type: 'garment', extracted_fields: {} }),
      null,
      'v-1',
    )
    for (const field of [
      record.styleName,
      record.sku,
      record.composition,
      record.supplierRef,
      record.notes,
      record.color,
      record.weight,
      record.width,
      record.price,
    ]) {
      expect(typeof field).toBe('string')
      expect(() => (field as string).toLowerCase()).not.toThrow()
    }
  })

  it('maps category labels for garment and video rows', () => {
    expect(toStyleRecord(row({ schema_type: 'garment' }), null, 'v-1').record.category).toBe('Garment')
    expect(toStyleRecord(row({ schema_type: 'video' }), null, 'v-1').record.category).toBe('Video')
  })

  it('falls back to item_code then Untitled Item for missing names', () => {
    expect(toStyleRecord(row({ name: null }), null, 'v-1').record.styleName).toBe('G-001')
    expect(toStyleRecord(row({ name: '   ' }), null, 'v-1').record.styleName).toBe('G-001')
    expect(
      toStyleRecord(row({ name: null, item_code: '' }), null, 'v-1').record.styleName,
    ).toBe('Untitled Item')
  })

  it('sets thumbnail images when a URL is available, [] otherwise', () => {
    const withThumb = toStyleRecord(row({ id: 'uuid-9' }), 'https://example.com/a.jpg', 'v-1')
    expect(withThumb.record.images).toEqual([{ id: 'ci-img-uuid-9', uri: 'https://example.com/a.jpg' }])

    const withoutThumb = toStyleRecord(row(), null, 'v-1')
    expect(withoutThumb.record.images).toEqual([])
  })

  it('flags gappy payloads for review and passes complete ones', () => {
    const complete = toStyleRecord(
      row({ extracted_fields: { item: { garment_type: 'Jacket', fit: 'Relaxed', sizing: 'M' } } }),
      null,
      'v-1',
    )
    expect(complete.needsReview).toBe(false)

    const gappy = toStyleRecord(row({ extracted_fields: {} }), null, 'v-1')
    expect(gappy.needsReview).toBe(true)
  })

  it('applies the REVIEW_MISSING_RATIO threshold on both sides', () => {
    // 1 of 4 leaves missing (0.25) is below the 1/3 threshold.
    const below = toStyleRecord(
      row({ extracted_fields: { item: { a: 'x', b: 'y', c: 'z', d: '' } } }),
      null,
      'v-1',
    )
    expect(below.needsReview).toBe(false)
    expect(1 / 4).toBeLessThanOrEqual(REVIEW_MISSING_RATIO)

    // 2 of 3 leaves missing (0.67) is above it.
    const above = toStyleRecord(
      row({ extracted_fields: { item: { a: 'x', b: '', c: '' } } }),
      null,
      'v-1',
    )
    expect(above.needsReview).toBe(true)
  })

  it('renders the garment summary line as composition and first colourway as color', () => {
    const { record } = toStyleRecord(
      row({
        extracted_fields: {
          item: {
            garment_type: 'Jacket',
            fit: 'Relaxed',
            sizing: 'M',
            colourways: [{ colour_name: 'Navy' }],
          },
        },
      }),
      null,
      'v-1',
    )
    expect(record.composition).toBe('Jacket · Relaxed · Size M')
    expect(record.color).toBe('Navy')
    expect(record.status).toBe('active')
    expect(record.isShortlisted).toBe(false)
  })
})

describe('categoryLabel [FR-CAT-01]', () => {
  it('labels known schema types', () => {
    expect(categoryLabel('garment')).toBe('Garment')
    expect(categoryLabel('video')).toBe('Video')
  })

  it('prettifies unknown slugs and falls back to Item when blank', () => {
    expect(categoryLabel('leather_goods')).toBe('Leather goods')
    expect(categoryLabel('')).toBe('Item')
  })
})

describe('summaryLine [FR-CAT-01]', () => {
  it('joins garment type, fit and sizing', () => {
    expect(
      summaryLine({ item: { garment_type: 'Jacket', fit: 'Relaxed', sizing: 'M' } }),
    ).toBe('Jacket · Relaxed · Size M')
  })

  it('reads flat fields without an item root', () => {
    expect(summaryLine({ garment_type: 'Dress' })).toBe('Dress')
  })

  it('returns null when nothing summarisable is present', () => {
    expect(summaryLine({})).toBeNull()
  })
})
