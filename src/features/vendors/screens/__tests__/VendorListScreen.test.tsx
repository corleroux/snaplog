/**
 * VendorListScreen tests (part of TEST-01)
 *
 * Tests that:
 * - Renders vendor cards when vendors provided
 * - Renders empty state when no vendors
 * - Renders search bar and filters vendors
 * - Shows "No vendors found" when search yields no results
 * - Calls onAddVendor from empty state CTA
 * - Calls onVendorClick when vendor card clicked
 * - Shows vendor count
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VendorListScreen } from '../VendorListScreen'
import {
  createVendorRecord,
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

describe('VendorListScreen', () => {
  const mockOnAddVendor = vi.fn()
  const mockOnVendorClick = vi.fn()
  const mockOnBack = vi.fn()
  const mockOnSearchChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    resetFactoryIds()
  })

  it('renders vendor cards when vendors provided', () => {
    const vendors = [
      createVendorRecord({ companyName: 'Alpha Fabrics' }),
      createVendorRecord({ companyName: 'Beta Textiles' }),
    ]

    renderWithRouter(
      <VendorListScreen
        vendors={vendors}
        eventName="Test Fair"
        onAddVendor={mockOnAddVendor}
        onVendorClick={mockOnVendorClick}
      />
    )

    expect(screen.getByText('Vendors')).toBeInTheDocument()
    expect(screen.getByText('Alpha Fabrics')).toBeInTheDocument()
    expect(screen.getByText('Beta Textiles')).toBeInTheDocument()
  })

  it('renders empty state when no vendors', () => {
    renderWithRouter(
      <VendorListScreen
        vendors={[]}
        eventName="Test Fair"
        onAddVendor={mockOnAddVendor}
      />
    )

    expect(screen.getByText('No vendors yet')).toBeInTheDocument()
    expect(screen.getByText('Add Your First Vendor')).toBeInTheDocument()
  })

  it('renders search bar when vendors exist and onSearchChange provided', () => {
    const vendors = [createVendorRecord()]

    renderWithRouter(
      <VendorListScreen
        vendors={vendors}
        onSearchChange={mockOnSearchChange}
      />
    )

    expect(screen.getByPlaceholderText('Search vendors...')).toBeInTheDocument()
  })

  it('does not render search bar when no vendors', () => {
    renderWithRouter(
      <VendorListScreen
        vendors={[]}
        onSearchChange={mockOnSearchChange}
      />
    )

    expect(screen.queryByPlaceholderText('Search vendors...')).not.toBeInTheDocument()
  })

  it('shows no results message when search filters out all vendors', () => {
    const vendors = [
      createVendorRecord({ companyName: 'Alpha Fabrics' }),
    ]

    renderWithRouter(
      <VendorListScreen
        vendors={vendors}
        searchQuery="xyznotfound"
        onSearchChange={mockOnSearchChange}
      />
    )

    // Updated to match new tab-style empty state pattern: "No active vendors"
    expect(screen.getByText('No active vendors')).toBeInTheDocument()
    expect(screen.queryByText('Alpha Fabrics')).not.toBeInTheDocument()
  })

  it('filters vendors by company name', () => {
    const vendors = [
      createVendorRecord({ companyName: 'Alpha Fabrics' }),
      createVendorRecord({ companyName: 'Beta Textiles' }),
    ]

    renderWithRouter(
      <VendorListScreen
        vendors={vendors}
        searchQuery="alpha"
        onSearchChange={mockOnSearchChange}
      />
    )

    expect(screen.getByText('Alpha Fabrics')).toBeInTheDocument()
    expect(screen.queryByText('Beta Textiles')).not.toBeInTheDocument()
  })

  it('calls onAddVendor when empty state CTA clicked', () => {
    renderWithRouter(
      <VendorListScreen
        vendors={[]}
        onAddVendor={mockOnAddVendor}
      />
    )

    fireEvent.click(screen.getByText('Add Your First Vendor'))
    expect(mockOnAddVendor).toHaveBeenCalledOnce()
  })

  it('calls onAddVendor when FAB button clicked', () => {
    const vendors = [createVendorRecord()]

    renderWithRouter(
      <VendorListScreen
        vendors={vendors}
        onAddVendor={mockOnAddVendor}
      />
    )

    fireEvent.click(screen.getByLabelText('Add new item'))
    expect(mockOnAddVendor).toHaveBeenCalledOnce()
  })

  it('shows vendor count', () => {
    const vendors = [
      createVendorRecord(),
      createVendorRecord(),
      createVendorRecord(),
    ]

    renderWithRouter(
      <VendorListScreen vendors={vendors} />
    )

    expect(screen.getByText(/^3 vendors$/)).toBeInTheDocument()
  })

  it('shows singular vendor count for one vendor', () => {
    const vendors = [createVendorRecord()]

    renderWithRouter(
      <VendorListScreen vendors={vendors} />
    )

    expect(screen.getByText(/^1 vendor$/)).toBeInTheDocument()
  })

  it('calls onBack when back button clicked', () => {
    renderWithRouter(
      <VendorListScreen
        vendors={[]}
        onBack={mockOnBack}
      />
    )

    // Back button renders when onBack is provided
    const backButton = screen.getByRole('button', { name: 'Go back' })
    fireEvent.click(backButton)
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('renders custom empty state content when provided', () => {
    renderWithRouter(
      <VendorListScreen
        vendors={[]}
        emptyStateContent={<div data-testid="custom-empty">Custom empty</div>}
      />
    )

    expect(screen.getByTestId('custom-empty')).toBeInTheDocument()
  })

  it('renders custom header content when provided', () => {
    renderWithRouter(
      <VendorListScreen
        vendors={[]}
        headerContent={<div data-testid="custom-header">Custom header</div>}
      />
    )

    expect(screen.getByTestId('custom-header')).toBeInTheDocument()
    expect(screen.queryByText('Vendors')).not.toBeInTheDocument()
  })
})
