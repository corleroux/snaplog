/**
 * CatalogueItemsSection tests (FR-SCH-05b).
 *
 * - missingRatio flags review-worthy payloads from available data only.
 * - The section renders catalogue rows with badges and stays silent when
 *   the vendor has none (legacy pages keep their exact look).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { missingRatio } from '../api/missingFields'
import { CatalogueItemsSection } from '../components/CatalogueItemsSection'

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
}))

import { supabase } from '@/lib/supabase/client'

const calls: { eq: Array<[string, unknown]> } = { eq: [] }

function mockItems(rows: unknown[] | null, error: { message: string } | null = null) {
  calls.eq = []
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue({ data: rows, error }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockImplementation(((...args: [string, unknown]) => { calls.eq.push(args); return query }) as never)
  vi.mocked(supabase.from).mockReturnValue(query as never)
}

describe('missingRatio', () => {
  it('returns 1 for empty payloads', () => {
    expect(missingRatio({})).toBe(1)
  })

  it('counts nested and array leaves', () => {
    // 2 of 4 leaves missing → 0.5
    expect(
      missingRatio({
        item: {
          garment_type: 'Dress',
          fit: null,
          colourways: [{ colour_name: 'Red' }, { colour_name: null }],
        },
      })
    ).toBeCloseTo(0.5)
  })

  it('returns 0 when everything is filled', () => {
    expect(missingRatio({ item: { garment_type: 'Dress', fit: 'Slim' } })).toBe(0)
  })
})

describe('CatalogueItemsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders rows with a Review badge for gappy items', async () => {
    mockItems([
      {
        id: 'item-1',
        item_code: 'G-001',
        name: null,
        schema_type: 'garment',
        schema_version: 1,
        extracted_fields: { item: { garment_type: null, fit: null } },
        created_at: '2026-11-01T00:00:00Z',
      },
    ])

    render(<CatalogueItemsSection vendorId="v-1" />)

    await waitFor(() => {
      expect(screen.getByText('G-001')).toBeInTheDocument()
    })
    expect(screen.getByText('Review')).toBeInTheDocument()
    // Only active items are queried.
    expect(calls.eq).toContainEqual(['status', 'active'])
  })

  it('renders the AI Extracted badge for complete items', async () => {
    mockItems([
      {
        id: 'item-2',
        item_code: 'G-002',
        name: 'Summer Dress',
        schema_type: 'garment',
        schema_version: 1,
        extracted_fields: { item: { garment_type: 'Dress', fit: 'Slim', sizing: 'M' } },
        created_at: '2026-11-01T00:00:00Z',
      },
    ])

    render(<CatalogueItemsSection vendorId="v-1" />)

    await waitFor(() => {
      expect(screen.getByText('Summer Dress')).toBeInTheDocument()
    })
    expect(screen.getByText('AI Extracted')).toBeInTheDocument()
  })

  it('renders nothing when the vendor has no catalogue items', async () => {
    mockItems([])

    const { container } = render(<CatalogueItemsSection vendorId="v-1" />)

    await waitFor(() => {
      expect(container.textContent).toBe('')
    })
  })
})
