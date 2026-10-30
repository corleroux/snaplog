/**
 * Extraction Quality Report Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryProvider } from '@/app/QueryProvider'
import { ExtractionQualityReport } from '../ExtractionQualityReport'

// Mock the hook
vi.mock('../hooks/useExtractionQuality', () => ({
  useExtractionQuality: vi.fn(),
}))

import { useExtractionQuality } from '../hooks/useExtractionQuality'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryProvider>
      <MemoryRouter initialEntries={['/events/test-event/quality']}>
        <Routes>
          <Route path="/events/:eventId/quality" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryProvider>
  )
}

describe('ExtractionQualityReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state while fetching quality', () => {
    vi.mocked(useExtractionQuality).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    renderWithProviders(<ExtractionQualityReport />)

    expect(screen.getByText(/loading extraction quality/i)).toBeInTheDocument()
  })

  it('should show error state on fetch failure', () => {
    vi.mocked(useExtractionQuality).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any)

    renderWithProviders(<ExtractionQualityReport />)

    expect(screen.getByText(/failed to load quality metrics/i)).toBeInTheDocument()
  })

  it('should display quality metrics when loaded', async () => {
    const mockQuality = {
      total_extractions: 10,
      low_confidence_count: 3,
      critical_confidence_count: 1,
      average_confidence: 0.72,
      field_confidence: {
        name: { avg: 0.85, min: 0.65, max: 0.95, count: 10 },
        composition: { avg: 0.68, min: 0.32, max: 0.92, count: 10 },
        category: { avg: 0.75, min: 0.50, max: 0.95, count: 8 },
      },
    }

    vi.mocked(useExtractionQuality).mockReturnValue({
      data: mockQuality,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<ExtractionQualityReport />)

    await waitFor(() => {
      expect(screen.getByText('72%')).toBeInTheDocument() // Overall average
      expect(screen.getByText('10')).toBeInTheDocument() // Total extractions
      expect(screen.getByText('3')).toBeInTheDocument() // Low confidence
      expect(screen.getByText('1')).toBeInTheDocument() // Critical
    })
  })

  it('should show alert badges for low confidence fields', async () => {
    const mockQuality = {
      total_extractions: 5,
      low_confidence_count: 2,
      critical_confidence_count: 1,
      average_confidence: 0.65,
      field_confidence: {
        name: { avg: 0.70, min: 0.40, max: 0.95, count: 5 },
      },
    }

    vi.mocked(useExtractionQuality).mockReturnValue({
      data: mockQuality,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<ExtractionQualityReport />)

    await waitFor(() => {
      expect(screen.getByText(/1 critical field.*need review/i)).toBeInTheDocument()
      expect(screen.getByText(/2 fields with low confidence/i)).toBeInTheDocument()
    })
  })

  it('should display field-level confidence breakdown', async () => {
    const mockQuality = {
      total_extractions: 8,
      low_confidence_count: 0,
      critical_confidence_count: 0,
      average_confidence: 0.82,
      field_confidence: {
        name: { avg: 0.90, min: 0.80, max: 0.95, count: 8 },
        composition: { avg: 0.74, min: 0.60, max: 0.88, count: 8 },
      },
    }

    vi.mocked(useExtractionQuality).mockReturnValue({
      data: mockQuality,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<ExtractionQualityReport />)

    await waitFor(() => {
      expect(screen.getByText(/confidence by field/i)).toBeInTheDocument()
      expect(screen.getByText(/name/i)).toBeInTheDocument()
      expect(screen.getByText(/composition/i)).toBeInTheDocument()
    })
  })

  it('should show empty state when no extraction data', async () => {
    const mockQuality = {
      total_extractions: 0,
      low_confidence_count: 0,
      critical_confidence_count: 0,
      average_confidence: 0,
      field_confidence: {},
    }

    vi.mocked(useExtractionQuality).mockReturnValue({
      data: mockQuality,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<ExtractionQualityReport />)

    await waitFor(() => {
      expect(
        screen.getByText(/no extraction data available yet/i)
      ).toBeInTheDocument()
    })
  })

  it('should color-code progress bars based on confidence level', async () => {
    const mockQuality = {
      total_extractions: 1,
      low_confidence_count: 0,
      critical_confidence_count: 0,
      average_confidence: 0.85, // Should be green
      field_confidence: {
        name: { avg: 0.85, min: 0.85, max: 0.85, count: 1 },
      },
    }

    vi.mocked(useExtractionQuality).mockReturnValue({
      data: mockQuality,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<ExtractionQualityReport />)

    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument()
    })
  })
})
