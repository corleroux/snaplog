/**
 * StyleListScreen tests (part of TEST-01; FR-CAT-01 unified rows)
 *
 * Tests that:
 * - Renders style cards when styles provided
 * - Renders empty state when no styles (FR-CAT-01 category-neutral copy)
 * - Shows "Add Your First Item" CTA in empty state
 * - Calls onAddStyle from CTA
 * - Shows style count
 * - Renders vendor name in header
 * - Catalogue (`ci-`) rows render REVIEW / AI Extracted badges with no
 *   shortlist heart and no detail navigation; fabric rows unchanged
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StyleListScreen } from '../StyleListScreen'
import {
  createStyleRecord,
  resetFactoryIds,
} from '@/test/factories'

// Mock NotificationBell to avoid QueryClient requirement
vi.mock('@/components/notifications', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('StyleListScreen', () => {
  const mockOnAddStyle = vi.fn()
  const mockOnStyleClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    resetFactoryIds()
  })

  it('renders style cards when styles provided', () => {
    const styles = [
      createStyleRecord({ styleName: 'Cotton Twill' }),
      createStyleRecord({ styleName: 'Silk Charmeuse' }),
    ]

    renderWithRouter(
      <StyleListScreen
        styles={styles}
        vendorName="Test Fabrics"
        onStyleClick={mockOnStyleClick}
      />
    )

    expect(screen.getByText('Styles')).toBeInTheDocument()
    expect(screen.getByText('Test Fabrics')).toBeInTheDocument()
    expect(screen.getByText('Cotton Twill')).toBeInTheDocument()
    expect(screen.getByText('Silk Charmeuse')).toBeInTheDocument()
  })

  it('renders empty state when no styles', () => {
    renderWithRouter(
      <StyleListScreen
        styles={[]}
        vendorName="Test Fabrics"
        onAddStyle={mockOnAddStyle}
      />
    )

    expect(screen.getByText('No items yet')).toBeInTheDocument()
    expect(screen.getByText('Capture items from this vendor to build your catalogue')).toBeInTheDocument()
    expect(screen.getByText('Add Your First Item')).toBeInTheDocument()
  })

  it('calls onAddStyle when empty state CTA clicked', () => {
    renderWithRouter(
      <StyleListScreen
        styles={[]}
        onAddStyle={mockOnAddStyle}
      />
    )

    fireEvent.click(screen.getByText('Add Your First Item'))
    expect(mockOnAddStyle).toHaveBeenCalledOnce()
  })

  it('shows FAB button when onAddStyle provided', () => {
    const styles = [createStyleRecord()]

    renderWithRouter(
      <StyleListScreen
        styles={styles}
        onAddStyle={mockOnAddStyle}
      />
    )

    expect(screen.getByLabelText('Add new item')).toBeInTheDocument()
  })

  it('calls onAddStyle when FAB button clicked', () => {
    const styles = [createStyleRecord()]

    renderWithRouter(
      <StyleListScreen
        styles={styles}
        onAddStyle={mockOnAddStyle}
      />
    )

    fireEvent.click(screen.getByLabelText('Add new item'))
    expect(mockOnAddStyle).toHaveBeenCalledOnce()
  })

  it('shows style count', () => {
    const styles = [
      createStyleRecord(),
      createStyleRecord(),
    ]

    renderWithRouter(
      <StyleListScreen styles={styles} />
    )

    expect(screen.getByText('2 styles')).toBeInTheDocument()
  })

  it('shows singular style count for one style', () => {
    const styles = [createStyleRecord()]

    renderWithRouter(
      <StyleListScreen styles={styles} />
    )

    expect(screen.getByText('1 style')).toBeInTheDocument()
  })

  it('renders default header when no vendorName', () => {
    renderWithRouter(
      <StyleListScreen styles={[]} />
    )

    expect(screen.getByText('Styles')).toBeInTheDocument()
  })

  it('renders custom empty state content when provided', () => {
    renderWithRouter(
      <StyleListScreen
        styles={[]}
        emptyStateContent={<div data-testid="custom-empty">Custom empty</div>}
      />
    )

    expect(screen.getByTestId('custom-empty')).toBeInTheDocument()
  })

  it('renders custom header content when provided', () => {
    renderWithRouter(
      <StyleListScreen
        styles={[]}
        headerContent={<div data-testid="custom-header">Custom header</div>}
      />
    )

    expect(screen.getByTestId('custom-header')).toBeInTheDocument()
    expect(screen.queryByText('Styles')).not.toBeInTheDocument()
  })

  it('[FR-CAT-01] catalogue rows render an AI Extracted badge with no shortlist heart', () => {
    const catalogueStyle = createStyleRecord({
      id: 'ci-item-1',
      styleName: 'Denim Jacket',
      composition: 'Jacket · Relaxed · Size M',
    })

    renderWithRouter(
      <StyleListScreen
        styles={[catalogueStyle]}
        onStyleClick={mockOnStyleClick}
        onToggleShortlist={vi.fn()}
      />
    )

    expect(screen.getByText('Denim Jacket')).toBeInTheDocument()
    expect(screen.getByText('AI Extracted')).toBeInTheDocument()
    expect(screen.queryByLabelText(/shortlist/i)).not.toBeInTheDocument()
  })

  it('[FR-CAT-01] catalogue rows in needsReviewIds render a Review badge with no heart', () => {
    const catalogueStyle = createStyleRecord({
      id: 'ci-item-2',
      styleName: 'Linen Shirt',
    })

    renderWithRouter(
      <StyleListScreen
        styles={[catalogueStyle]}
        needsReviewIds={new Set(['ci-item-2'])}
        onStyleClick={mockOnStyleClick}
        onToggleShortlist={vi.fn()}
      />
    )

    expect(screen.getByText('Review')).toBeInTheDocument()
    expect(screen.queryByText('AI Extracted')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/shortlist/i)).not.toBeInTheDocument()
  })

  it('[FR-CAT-01] catalogue rows do not trigger detail navigation on click', () => {
    const catalogueStyle = createStyleRecord({
      id: 'ci-item-3',
      styleName: 'Wool Coat',
    })

    renderWithRouter(
      <StyleListScreen
        styles={[catalogueStyle]}
        onStyleClick={mockOnStyleClick}
        onToggleShortlist={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText('Wool Coat'))
    expect(mockOnStyleClick).not.toHaveBeenCalled()
  })

  it('[FR-CAT-01] fabric rows keep the shortlist heart and click behaviour', () => {
    const fabricStyle = createStyleRecord({ styleName: 'Cotton Twill' })
    const mockOnToggleShortlist = vi.fn()

    renderWithRouter(
      <StyleListScreen
        styles={[fabricStyle]}
        onStyleClick={mockOnStyleClick}
        onToggleShortlist={mockOnToggleShortlist}
      />
    )

    // No catalogue badges on fabric rows.
    expect(screen.queryByText('AI Extracted')).not.toBeInTheDocument()
    expect(screen.queryByText('Review')).not.toBeInTheDocument()

    // Heart present and clickable.
    fireEvent.click(screen.getByLabelText(/shortlist/i))
    expect(mockOnToggleShortlist).toHaveBeenCalledWith(fabricStyle.id, true)

    // Card click still navigates.
    fireEvent.click(screen.getByText('Cotton Twill'))
    expect(mockOnStyleClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: fabricStyle.id })
    )
  })
})
