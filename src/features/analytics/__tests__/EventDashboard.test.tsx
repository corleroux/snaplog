/**
 * Event Dashboard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryProvider } from '@/app/QueryProvider'
import { EventDashboard } from '../EventDashboard'

// Mock the hook
vi.mock('../hooks/useEventStats', () => ({
  useEventStats: vi.fn(),
}))

import { useEventStats } from '../hooks/useEventStats'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryProvider>
      <MemoryRouter initialEntries={['/events/test-event/dashboard']}>
        <Routes>
          <Route path="/events/:eventId/dashboard" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryProvider>
  )
}

describe('EventDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state while fetching stats', () => {
    vi.mocked(useEventStats).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    renderWithProviders(<EventDashboard />)

    expect(screen.getByText(/loading event statistics/i)).toBeInTheDocument()
  })

  it('should show error state on fetch failure', () => {
    vi.mocked(useEventStats).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any)

    renderWithProviders(<EventDashboard />)

    expect(screen.getByText(/failed to load statistics/i)).toBeInTheDocument()
  })

  it('should display event statistics when loaded', async () => {
    const mockStats = {
      totalVendors: 15,
      totalStyles: 42,
      totalImages: 128,
      completedVendors: 12,
    }

    vi.mocked(useEventStats).mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<EventDashboard />)

    // Use findAllByText when multiple elements might have the same text
    expect(await screen.findAllByText('15')).toHaveLength(2) // Total Vendors (card + progress)
    expect(await screen.findAllByText('42')).toHaveLength(2) // Total Styles (card + progress)
    expect(await screen.findAllByText('128')).toHaveLength(2) // Total Images (card + progress)
    expect(screen.getByText('12')).toBeInTheDocument() // Completed Vendors (only in card)
  })

  it('should calculate and display completion percentage', async () => {
    const mockStats = {
      totalVendors: 20,
      totalStyles: 50,
      totalImages: 150,
      completedVendors: 15, // 75% completion
    }

    vi.mocked(useEventStats).mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<EventDashboard />)

    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument()
      expect(screen.getByText(/overall completion/i)).toBeInTheDocument()
    })
  })

  it('should show zero percent when no vendors', async () => {
    const mockStats = {
      totalVendors: 0,
      totalStyles: 0,
      totalImages: 0,
      completedVendors: 0,
    }

    vi.mocked(useEventStats).mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<EventDashboard />)

    await waitFor(() => {
      expect(screen.getAllByText('0%').length).toBeGreaterThan(0)
    })
  })

  it('should display capture progress section', async () => {
    const mockStats = {
      totalVendors: 10,
      totalStyles: 25,
      totalImages: 60,
      completedVendors: 5,
    }

    vi.mocked(useEventStats).mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<EventDashboard />)

    await waitFor(() => {
      expect(screen.getAllByText(/capture progress/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText('Vendors').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Styles').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Images').length).toBeGreaterThan(0)
    })
  })
})
