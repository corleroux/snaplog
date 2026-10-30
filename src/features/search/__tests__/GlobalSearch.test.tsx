/**
 * GlobalSearch Component Tests
 *
 * GlobalSearch is a controlled component — the trigger lives in BottomNavigation.
 * Tests render with isOpen={true} to exercise the search dialog directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryProvider } from '@/app/QueryProvider'

// Mock the hooks
vi.mock('../hooks/useSearch', () => ({
  useGlobalSearch: vi.fn(),
  useRecentSearches: vi.fn(),
  useSaveSearchHistory: vi.fn(),
  useClearSearchHistory: vi.fn(),
}))

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: unknown) => value,
}))

import { GlobalSearch } from '../GlobalSearch'
import { useGlobalSearch, useRecentSearches, useSaveSearchHistory, useClearSearchHistory } from '../hooks/useSearch'

function renderOpen(props: { eventId?: string } = {}) {
  const onOpenChange = vi.fn()
  const result = render(
    <QueryProvider>
      <MemoryRouter>
        <GlobalSearch isOpen={true} onOpenChange={onOpenChange} {...props} />
      </MemoryRouter>
    </QueryProvider>
  )
  return { ...result, onOpenChange }
}

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useGlobalSearch).mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    vi.mocked(useRecentSearches).mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    vi.mocked(useSaveSearchHistory).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      mutate: vi.fn(),
    } as any)

    vi.mocked(useClearSearchHistory).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      mutate: vi.fn(),
    } as any)
  })

  it('renders nothing when closed', () => {
    render(
      <QueryProvider>
        <MemoryRouter>
          <GlobalSearch isOpen={false} onOpenChange={vi.fn()} />
        </MemoryRouter>
      </QueryProvider>
    )
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument()
  })

  it('renders search input when open', () => {
    renderOpen()
    expect(screen.getByPlaceholderText(/search vendors/i)).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when Escape is pressed', async () => {
    const { onOpenChange } = renderOpen()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('displays search results when query returns matches', async () => {
    const mockResults = [
      { type: 'vendor', id: '1', name: 'Test Vendor', snippet: 'Category', rank: 0.9 },
      { type: 'style', id: '2', name: 'Test Style', snippet: 'Description', rank: 0.8 },
    ]
    vi.mocked(useGlobalSearch).mockReturnValue({
      data: mockResults,
      isLoading: false,
    } as any)

    renderOpen()

    const input = screen.getByPlaceholderText(/search vendors/i)
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument()
      expect(screen.getByText('Test Style')).toBeInTheDocument()
    })
  })

  it('displays recent searches when input is empty', async () => {
    const mockRecentSearches = [
      { id: '1', query: 'recent search 1', result_type: 'vendor', created_at: '2024-01-01' },
      { id: '2', query: 'recent search 2', result_type: 'style', created_at: '2024-01-02' },
    ]
    vi.mocked(useRecentSearches).mockReturnValue({
      data: mockRecentSearches,
      isLoading: false,
    } as any)

    renderOpen()

    await waitFor(() => {
      expect(screen.getByText('Recent Searches')).toBeInTheDocument()
      expect(screen.getByText('recent search 1')).toBeInTheDocument()
      expect(screen.getByText('recent search 2')).toBeInTheDocument()
    })
  })

  it('shows loading state while searching', async () => {
    vi.mocked(useGlobalSearch).mockReturnValue({
      data: [],
      isLoading: true,
    } as any)

    renderOpen()

    const input = screen.getByPlaceholderText(/search vendors/i)
    fireEvent.change(input, { target: { value: 'test' } })

    await waitFor(() => {
      expect(screen.getByText(/searching/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no results found', async () => {
    vi.mocked(useGlobalSearch).mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    renderOpen()

    const input = screen.getByPlaceholderText(/search vendors/i)
    fireEvent.change(input, { target: { value: 'xyznotfound' } })

    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no query and no recent searches', async () => {
    renderOpen()

    await waitFor(() => {
      expect(screen.getByText(/search the catalogue/i)).toBeInTheDocument()
      expect(screen.getByText(/find vendors, styles, and events/i)).toBeInTheDocument()
    })
  })
})
