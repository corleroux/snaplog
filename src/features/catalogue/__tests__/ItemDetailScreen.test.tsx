/**
 * ItemDetailScreen tests (FR-CAT-01).
 *
 * Read-only garment/video detail mirroring StyleDetailScreen: loading, error
 * (with Back to Items link), loaded sections, variants hidden when empty,
 * archive button only when onArchive is passed. No supabase — pure props.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ItemDetailScreen } from '../screens/ItemDetailScreen'
import type { CatalogueItemDetailData } from '../hooks/useCatalogueItemDetail'
import type { CatalogueItemRow } from '../api/toStyleRecord'

const ITEM_ROW = {
  id: 'uuid-1',
  item_code: 'G-001',
  name: 'Denim Jacket',
  schema_type: 'garment',
  extracted_fields: { garment_type: 'Jacket' },
  created_at: '2026-01-01T00:00:00Z',
} as CatalogueItemRow

function createDetail(overrides: Partial<CatalogueItemDetailData> = {}): CatalogueItemDetailData {
  return {
    item: ITEM_ROW,
    variants: [
      {
        id: 'var-1',
        variant_name: 'Indigo',
        colour_code: '#1A2B4A',
        colour_name: 'Indigo',
        sizing: 'M',
        status: 'active',
      },
    ],
    imageUrls: ['https://example.com/a.jpg'],
    definition: {
      slug: 'garment',
      kind: 'catalogue_type',
      display_name: 'Garment',
      version: 2,
      schema: { output_root: 'item', fields: [] },
    },
    fields: [
      { label: 'Garment Type', value: 'Jacket' },
      { label: 'Fit', value: 'Not extracted' },
    ],
    warnings: [],
    needsReview: false,
    ...overrides,
  }
}

function renderAtItemRoute(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/events/e-1/vendors/v-1/items/uuid-1']}>
      <Routes>
        <Route path="/events/:eventId/vendors/:vendorId/items/:itemId" element={ui} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ItemDetailScreen [FR-CAT-01]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state', () => {
    renderAtItemRoute(<ItemDetailScreen loading={true} />)

    expect(screen.getByText('Loading item details...')).toBeInTheDocument()
  })

  it('shows error state with retry and Back to Items link', () => {
    const onRefresh = vi.fn()
    renderAtItemRoute(
      <ItemDetailScreen error="Network error" onRefresh={onRefresh} />
    )

    expect(screen.getByText('Failed to load item')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
    const retryButton = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(retryButton)
    expect(onRefresh).toHaveBeenCalledTimes(1)
    // Touch targets meet the 44px minimum.
    expect(retryButton).toHaveClass('min-h-[44px]')
    const backLink = screen.getByRole('link', { name: /back to items/i })
    expect(backLink).toHaveAttribute('href', '/events/e-1/vendors/v-1/styles')
    expect(screen.getByRole('button', { name: /back to items/i })).toHaveClass(
      'min-h-[44px]',
    )
  })

  it('shows error state when no data and no error', () => {
    renderAtItemRoute(<ItemDetailScreen />)

    expect(screen.getByText('Failed to load item')).toBeInTheDocument()
  })

  it('renders title, item code, type badge, details and variants', () => {
    renderAtItemRoute(<ItemDetailScreen data={createDetail()} />)

    expect(screen.getByText('Denim Jacket')).toBeInTheDocument()
    expect(screen.getByText('G-001')).toBeInTheDocument()
    expect(screen.getByText('Garment · v2')).toBeInTheDocument()
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Garment Type')).toBeInTheDocument()
    expect(screen.getByText('Jacket')).toBeInTheDocument()
    expect(screen.getByText('Variants & Colourways')).toBeInTheDocument()
    expect(screen.getByText('Indigo')).toBeInTheDocument()
    // Item-ID footer for traceability.
    expect(screen.getByText('uuid-1')).toBeInTheDocument()
  })

  it('renders Untitled Item fallback when name and code are missing', () => {
    renderAtItemRoute(
      <ItemDetailScreen
        data={createDetail({ item: { ...ITEM_ROW, name: null, item_code: '' } })}
      />
    )

    expect(screen.getByText('Untitled Item')).toBeInTheDocument()
  })

  it('hides the variants section when empty', () => {
    renderAtItemRoute(<ItemDetailScreen data={createDetail({ variants: [] })} />)

    expect(screen.queryByText('Variants & Colourways')).not.toBeInTheDocument()
    // Details still render without variants.
    expect(screen.getByText('Details')).toBeInTheDocument()
  })

  it('renders extraction warnings when present', () => {
    renderAtItemRoute(
      <ItemDetailScreen
        data={createDetail({
          warnings: ['Garment Type is required but was not extracted — confirm or fill it.'],
        })}
      />
    )

    expect(screen.getByText('Extraction Notes')).toBeInTheDocument()
    expect(
      screen.getByText(/Garment Type is required but was not extracted/)
    ).toBeInTheDocument()
  })

  it('shows the Archive Item button only when onArchive is passed', () => {
    const onArchive = vi.fn()
    const { rerender } = renderAtItemRoute(
      <ItemDetailScreen data={createDetail()} onArchive={onArchive} />
    )

    const archiveButton = screen.getByRole('button', { name: /archive item/i })
    fireEvent.click(archiveButton)
    expect(onArchive).toHaveBeenCalledTimes(1)

    rerender(
      <MemoryRouter initialEntries={['/events/e-1/vendors/v-1/items/uuid-1']}>
        <Routes>
          <Route
            path="/events/:eventId/vendors/:vendorId/items/:itemId"
            element={<ItemDetailScreen data={createDetail()} />}
          />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.queryByRole('button', { name: /archive item/i })).not.toBeInTheDocument()
  })

  it('renders the type badge as secondary with an icon', () => {
    const { container } = renderAtItemRoute(<ItemDetailScreen data={createDetail()} />)

    const badge = screen.getByText('Garment · v2')
    expect(badge).toHaveClass('text-sm')
    // Secondary variant styling.
    expect(badge).toHaveClass('bg-secondary')
    // Type icon (Shirt for garments) renders inside the badge.
    expect(badge.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('switches the badge icon for video items', () => {
    const garment = renderAtItemRoute(<ItemDetailScreen data={createDetail()} />)
    const garmentIcon = garment
      .getByText('Garment · v2')
      .querySelector('svg')?.outerHTML
    garment.unmount()

    renderAtItemRoute(
      <ItemDetailScreen
        data={createDetail({
          item: { ...ITEM_ROW, schema_type: 'video', name: 'Runway Clip' },
          definition: {
            slug: 'video',
            kind: 'catalogue_type',
            display_name: 'Video',
            version: 1,
            schema: { output_root: 'item', fields: [] },
          },
        })}
      />
    )

    const videoBadge = screen.getByText('Video · v1')
    const videoIcon = videoBadge.querySelector('svg')?.outerHTML
    expect(videoIcon).toBeDefined()
    // Shirt (garment) vs Video icon markup differs by schema_type.
    expect(videoIcon).not.toBe(garmentIcon)
  })

  it('renders an empty-details message when no fields were extracted', () => {
    const { container } = renderAtItemRoute(
      <ItemDetailScreen data={createDetail({ fields: [] })} />
    )

    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('No details extracted yet.')).toBeInTheDocument()
    expect(container.querySelector('dl')).not.toBeInTheDocument()
  })

  it('shows a generic review banner when needsReview without warnings', () => {
    renderAtItemRoute(
      <ItemDetailScreen data={createDetail({ needsReview: true, warnings: [] })} />
    )

    expect(
      screen.getByText('Needs review — verify the details below against the item photos.')
    ).toBeInTheDocument()
  })

  it('hides the generic review banner when not under review or warnings exist', () => {
    const bannerText =
      'Needs review — verify the details below against the item photos.'
    const { rerender } = renderAtItemRoute(
      <ItemDetailScreen data={createDetail({ needsReview: false, warnings: [] })} />
    )
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument()

    // Warnings render the Extraction Notes section instead of the generic banner.
    rerender(
      <MemoryRouter initialEntries={['/events/e-1/vendors/v-1/items/uuid-1']}>
        <Routes>
          <Route
            path="/events/:eventId/vendors/:vendorId/items/:itemId"
            element={
              <ItemDetailScreen
                data={createDetail({
                  needsReview: true,
                  warnings: ['Fit is required but was not extracted.'],
                })}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument()
    expect(screen.getByText('Extraction Notes')).toBeInTheDocument()
  })

  it('renders a colour swatch for hex colour_code variants', () => {
    const { container } = renderAtItemRoute(<ItemDetailScreen data={createDetail()} />)

    const swatch = container.querySelector('span[aria-hidden="true"]')
    expect(swatch).toBeInTheDocument()
    expect(swatch?.getAttribute('style')).toContain('background-color')
  })

  it('omits the swatch when colour_code is not a hex colour', () => {
    const { container } = renderAtItemRoute(
      <ItemDetailScreen
        data={createDetail({
          variants: [
            {
              id: 'var-2',
              variant_name: 'Custom Dye',
              colour_code: 'not-a-hex',
              colour_name: 'Custom Dye',
              sizing: null,
              status: 'active',
            },
          ],
        })}
      />
    )

    expect(screen.getByText('Custom Dye')).toBeInTheDocument()
    expect(container.querySelector('span[aria-hidden="true"]')).not.toBeInTheDocument()
  })
})
