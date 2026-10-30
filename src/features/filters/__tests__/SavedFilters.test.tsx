/**
 * SavedFilters Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryProvider } from '@/app/QueryProvider'

// Mock the hooks
vi.mock('../hooks/useSavedFilters', () => ({
  useSavedFilters: vi.fn(),
  useSaveFilter: vi.fn(),
  useDeleteFilter: vi.fn(),
}))

import { SavedFilters } from '../SavedFilters'
import { useSavedFilters, useSaveFilter, useDeleteFilter } from '../hooks/useSavedFilters'

function renderWithProviders(ui: React.ReactElement) {
  return render(<QueryProvider>{ui}</QueryProvider>)
}

describe('SavedFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    vi.mocked(useSavedFilters).mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    vi.mocked(useSaveFilter).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      mutate: vi.fn(),
      isPending: false,
    } as any)

    vi.mocked(useDeleteFilter).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      mutate: vi.fn(),
    } as any)
  })

  it('should render empty state when no filters', () => {
    const onLoadFilter = vi.fn()

    renderWithProviders(
      <SavedFilters
        entityType="vendors"
        currentFilter={{}}
        onLoadFilter={onLoadFilter}
      />
    )

    expect(screen.getByText(/no saved filters/i)).toBeInTheDocument()
  })

  it('should render saved filters list', () => {
    const mockFilters = [
      {
        id: 'filter-1',
        name: 'Active Vendors',
        description: 'Show active vendors',
        entity_type: 'vendors' as const,
        filter_config: { status: ['active'] },
        is_shared: false,
        sort_order: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        deleted_at: null,
        user_id: 'user-1',
      },
    ]

    vi.mocked(useSavedFilters).mockReturnValue({
      data: mockFilters,
      isLoading: false,
    } as any)

    const onLoadFilter = vi.fn()

    renderWithProviders(
      <SavedFilters
        entityType="vendors"
        currentFilter={{}}
        onLoadFilter={onLoadFilter}
      />
    )

    expect(screen.getByText('Active Vendors')).toBeInTheDocument()
    expect(screen.getByText(/Status: 1/)).toBeInTheDocument()
  })

  it('should show shared badge for shared filters', () => {
    const mockFilters = [
      {
        id: 'filter-1',
        name: 'Team Filter',
        description: 'Shared with team',
        entity_type: 'vendors' as const,
        filter_config: {},
        is_shared: true,
        sort_order: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        deleted_at: null,
        user_id: 'user-1',
      },
    ]

    vi.mocked(useSavedFilters).mockReturnValue({
      data: mockFilters,
      isLoading: false,
    } as any)

    const onLoadFilter = vi.fn()

    renderWithProviders(
      <SavedFilters
        entityType="vendors"
        currentFilter={{}}
        onLoadFilter={onLoadFilter}
      />
    )

    expect(screen.getByText('Shared')).toBeInTheDocument()
  })

  it('should disable save button when no active filters', () => {
    const onLoadFilter = vi.fn()

    renderWithProviders(
      <SavedFilters
        entityType="vendors"
        currentFilter={{}}
        onLoadFilter={onLoadFilter}
      />
    )

    const saveButton = screen.getByText(/save current/i)
    expect(saveButton).toBeDisabled()
  })

  it('should enable save button when filters are active', () => {
    const onLoadFilter = vi.fn()

    renderWithProviders(
      <SavedFilters
        entityType="vendors"
        currentFilter={{ status: ['active'] }}
        onLoadFilter={onLoadFilter}
      />
    )

    const saveButton = screen.getByText(/save current/i)
    expect(saveButton).not.toBeDisabled()
  })

  it('should load filter when Load button clicked', async () => {
    const mockFilters = [
      {
        id: 'filter-1',
        name: 'Test Filter',
        description: null,
        entity_type: 'vendors' as const,
        filter_config: { category: ['clothing'] },
        is_shared: false,
        sort_order: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        deleted_at: null,
        user_id: 'user-1',
      },
    ]

    vi.mocked(useSavedFilters).mockReturnValue({
      data: mockFilters,
      isLoading: false,
    } as any)

    const onLoadFilter = vi.fn()

    renderWithProviders(
      <SavedFilters
        entityType="vendors"
        currentFilter={{}}
        onLoadFilter={onLoadFilter}
      />
    )

    fireEvent.click(screen.getByText('Load'))

    expect(onLoadFilter).toHaveBeenCalledWith({ category: ['clothing'] })
  })

  it('should show loading state', () => {
    vi.mocked(useSavedFilters).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any)

    const onLoadFilter = vi.fn()

    renderWithProviders(
      <SavedFilters
        entityType="vendors"
        currentFilter={{}}
        onLoadFilter={onLoadFilter}
      />
    )

    expect(screen.getByText(/loading saved filters/i)).toBeInTheDocument()
  })
})
