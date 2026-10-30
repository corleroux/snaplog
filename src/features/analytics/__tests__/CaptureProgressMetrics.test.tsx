/**
 * Capture Progress Metrics Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryProvider } from '@/app/QueryProvider'
import { CaptureProgressMetrics } from '../CaptureProgressMetrics'

// Mock the hook
vi.mock('../hooks/useCaptureProgress', () => ({
  useCaptureProgress: vi.fn(),
}))

import { useCaptureProgress } from '../hooks/useCaptureProgress'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryProvider>
      <MemoryRouter initialEntries={['/events/test-event/progress']}>
        <Routes>
          <Route path="/events/:eventId/progress" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryProvider>
  )
}

describe('CaptureProgressMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state while fetching progress', () => {
    vi.mocked(useCaptureProgress).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    renderWithProviders(<CaptureProgressMetrics />)

    expect(screen.getByText(/loading capture progress/i)).toBeInTheDocument()
  })

  it('should show error state on fetch failure', () => {
    vi.mocked(useCaptureProgress).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any)

    renderWithProviders(<CaptureProgressMetrics />)

    expect(screen.getByText(/failed to load progress/i)).toBeInTheDocument()
  })

  it('should display progress metrics when loaded', async () => {
    const mockProgress = {
      total_vendors: 10,
      captured_vendors: 7,
      completion_percentage: 70,
      remaining_vendors: 3,
      captures_per_user: [],
      estimated_remaining_minutes: 45,
    }

    vi.mocked(useCaptureProgress).mockReturnValue({
      data: mockProgress,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<CaptureProgressMetrics />)

    await waitFor(() => {
      expect(screen.getByText('70%')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument() // Total
      expect(screen.getByText('7')).toBeInTheDocument() // Captured
      expect(screen.getByText('3')).toBeInTheDocument() // Remaining
      expect(screen.getByText('45m')).toBeInTheDocument() // Time estimate
    })
  })

  it('should not display captures per user when empty', async () => {
    const mockProgress = {
      total_vendors: 5,
      captured_vendors: 5,
      completion_percentage: 100,
      remaining_vendors: 0,
      captures_per_user: [],
      estimated_remaining_minutes: null,
    }

    vi.mocked(useCaptureProgress).mockReturnValue({
      data: mockProgress,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<CaptureProgressMetrics />)

    await waitFor(() => {
      expect(screen.queryByText(/captures per team member/i)).not.toBeInTheDocument()
    })
  })

  it('should handle zero progress correctly', async () => {
    const mockProgress = {
      total_vendors: 10,
      captured_vendors: 0,
      completion_percentage: 0,
      remaining_vendors: 10,
      captures_per_user: [],
      estimated_remaining_minutes: 150,
    }

    vi.mocked(useCaptureProgress).mockReturnValue({
      data: mockProgress,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<CaptureProgressMetrics />)

    await waitFor(() => {
      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByText('2h 30m')).toBeInTheDocument() // 150 minutes formatted
    })
  })

  it('should format time estimates correctly', async () => {
    const mockProgress = {
      total_vendors: 8,
      captured_vendors: 4,
      completion_percentage: 50,
      remaining_vendors: 4,
      captures_per_user: [
        { user_id: 'user-1', user_email: 'user@example.com', captured_count: 4 },
      ],
      estimated_remaining_minutes: 90, // 1h 30m
    }

    vi.mocked(useCaptureProgress).mockReturnValue({
      data: mockProgress,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<CaptureProgressMetrics />)

    await waitFor(() => {
      expect(screen.getByText('1h 30m')).toBeInTheDocument()
    })
  })

  it('should handle null time estimate when complete', async () => {
    const mockProgress = {
      total_vendors: 5,
      captured_vendors: 5,
      completion_percentage: 100,
      remaining_vendors: 0,
      captures_per_user: [
        { user_id: 'user-1', user_email: 'user@example.com', captured_count: 5 },
      ],
      estimated_remaining_minutes: null,
    }

    vi.mocked(useCaptureProgress).mockReturnValue({
      data: mockProgress,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<CaptureProgressMetrics />)

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument()
      // Time estimate card should not be shown when complete
      expect(screen.queryByText(/estimated time remaining/i)).not.toBeInTheDocument()
    })
  })
})
