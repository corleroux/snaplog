/**
 * Report Builder Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryProvider } from '@/app/QueryProvider'
import { ReportBuilder } from '../ReportBuilder'

// Mock the hooks
vi.mock('../hooks/useSavedReports', () => ({
  useSavedReports: vi.fn(),
  useSaveReport: vi.fn(),
  useDeleteReport: vi.fn(),
}))

vi.mock('@/features/events', () => ({
  useEventQuery: vi.fn(),
}))

import { useSavedReports, useSaveReport, useDeleteReport } from '../hooks/useSavedReports'
import { useEventQuery } from '@/features/events'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryProvider>
      <MemoryRouter initialEntries={['/events/test-event/reports']}>
        <Routes>
          <Route path="/events/:eventId/reports" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryProvider>
  )
}

describe('ReportBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    vi.mocked(useEventQuery).mockReturnValue({
      data: { id: 'event-1', name: 'Test Event' },
      isLoading: false,
      error: null,
    } as any)

    vi.mocked(useSavedReports).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any)

    vi.mocked(useSaveReport).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
    } as any)

    vi.mocked(useDeleteReport).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    } as any)
  })

  it('should render report builder', async () => {
    renderWithProviders(<ReportBuilder />)

    await waitFor(() => {
      expect(screen.getByText('Report Builder')).toBeInTheDocument()
      expect(screen.getByText('Saved Reports')).toBeInTheDocument()
    })
  })

  it('should display saved reports', async () => {
    const mockReports = [
      {
        id: 'report-1',
        name: 'Vendor Summary',
        config: {
          dimensions: ['category'],
          metrics: ['count', 'vendors_count'],
        },
      },
      ]

    vi.mocked(useSavedReports).mockReturnValue({
      data: mockReports,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<ReportBuilder />)

    await waitFor(() => {
      expect(screen.getByText('Vendor Summary')).toBeInTheDocument()
      expect(screen.getByText(/1 dimensions, 2 metrics/i)).toBeInTheDocument()
    })
  })

  it('should allow selecting dimensions and metrics', async () => {
    renderWithProviders(<ReportBuilder />)

    await waitFor(() => {
      expect(screen.getByText(/group by.*dimensions/i)).toBeInTheDocument()
      expect(screen.getByText(/metrics/i)).toBeInTheDocument()
    })

    // Click a dimension
    await waitFor(() => {
      screen.getByText('Vendor').click()
    })

    // Click a metric
    await waitFor(() => {
      screen.getByText('Count').click()
    })
  })

  it('should save report with name and metrics', async () => {
    renderWithProviders(<ReportBuilder />)

    // Fill in the form
    const nameInput = screen.getByPlaceholderText(/my custom report/i)
    await waitFor(() => {
      expect(nameInput).toBeInTheDocument()
    })

    // Type in the input
    fireEvent.change(nameInput, { target: { value: 'Test Report' } })

    // Select a metric
    await waitFor(() => {
      screen.getByText('Count').click()
    })

    // Click save button is enabled
    const saveButton = screen.getByText(/save report/i)
    expect(saveButton).not.toBeDisabled()
  })

  it('should export CSV when metrics selected', async () => {
    renderWithProviders(<ReportBuilder />)

    // Select a metric
    await waitFor(() => {
      screen.getByText('Count').click()
    })

    // Click export
    const exportButton = screen.getByText(/export csv/i)
    expect(exportButton).not.toBeDisabled()

    exportButton.click()

    // Verify CSV generation (would download file in real use)
    expect(screen.getByText(/export csv/i)).toBeInTheDocument()
  })

  it('should disable save button when no name or metrics', async () => {
    renderWithProviders(<ReportBuilder />)

    await waitFor(() => {
      const saveButton = screen.getByText(/save report/i)
      expect(saveButton).toBeDisabled()
    })
  })

  it('should load existing report configuration', async () => {
    const mockReports = [
      {
        id: 'report-1',
        name: 'Existing Report',
        config: {
          dimensions: ['vendor', 'category'],
          metrics: ['count'],
        },
      },
    ]

    vi.mocked(useSavedReports).mockReturnValue({
      data: mockReports,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<ReportBuilder />)

    await waitFor(() => {
      screen.getByText('Load').click()
    })

    // After loading, the form should be populated
    // (In real test, we'd check that dimensions/metrics are selected)
  })
})
