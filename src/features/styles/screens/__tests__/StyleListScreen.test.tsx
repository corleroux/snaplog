/**
 * StyleListScreen tests (part of TEST-01)
 *
 * Tests that:
 * - Renders style cards when styles provided
 * - Renders empty state when no styles
 * - Shows "Capture First Style" CTA in empty state
 * - Calls onAddStyle from CTA
 * - Shows style count
 * - Renders vendor name in header
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

    expect(screen.getByText('No styles yet')).toBeInTheDocument()
    expect(screen.getByText('Add Your First Style')).toBeInTheDocument()
  })

  it('calls onAddStyle when empty state CTA clicked', () => {
    renderWithRouter(
      <StyleListScreen
        styles={[]}
        onAddStyle={mockOnAddStyle}
      />
    )

    fireEvent.click(screen.getByText('Add Your First Style'))
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
})
