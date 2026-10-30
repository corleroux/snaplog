/**
 * Vendor Attendance List Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryProvider } from '@/app/QueryProvider'
import { VendorAttendanceList } from '../VendorAttendanceList'

// Mock the hook
vi.mock('../hooks/useVendorAttendance', () => ({
  useVendorAttendance: vi.fn(),
}))

import { useVendorAttendance } from '../hooks/useVendorAttendance'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryProvider>
      <MemoryRouter initialEntries={['/events/test-event/attendance']}>
        <Routes>
          <Route path="/events/:eventId/attendance" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryProvider>
  )
}

describe('VendorAttendanceList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('should show loading state while fetching attendance', () => {
    vi.mocked(useVendorAttendance).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    renderWithProviders(<VendorAttendanceList />)

    expect(screen.getByText(/loading vendor attendance/i)).toBeInTheDocument()
  })

  it('should show error state on fetch failure', () => {
    vi.mocked(useVendorAttendance).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any)

    renderWithProviders(<VendorAttendanceList />)

    expect(screen.getByText(/failed to load attendance/i)).toBeInTheDocument()
  })

  it('should display vendor attendance when loaded', async () => {
    const mockAttendance = {
      captured: [
        {
          id: 'v1',
          name: 'Vendor A',
          category: 'Textiles',
          booth_number: 'A101',
          styles_count: 3,
        },
      ],
      not_captured: [
        {
          id: 'v2',
          name: 'Vendor B',
          category: 'Leather',
          booth_number: 'B205',
          styles_count: 0,
        },
      ],
      total: 2,
      captured_count: 1,
    }

    vi.mocked(useVendorAttendance).mockReturnValue({
      data: mockAttendance,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<VendorAttendanceList />)

    await waitFor(() => {
      expect(screen.getByText('Vendor A')).toBeInTheDocument()
      expect(screen.getByText('Vendor B')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // Total
      expect(screen.getAllByText('1')).toHaveLength(2) // Captured and Not Captured both show 1
    })
  })

  it('should calculate and display completion percentage', async () => {
    const mockAttendance = {
      captured: [
        { id: 'v1', name: 'Vendor A', category: 'Textiles', booth_number: 'A101', styles_count: 2 },
      ],
      not_captured: [
        { id: 'v2', name: 'Vendor B', category: 'Leather', booth_number: 'B205', styles_count: 0 },
        { id: 'v3', name: 'Vendor C', category: 'Textiles', booth_number: 'C301', styles_count: 0 },
      ],
      total: 3,
      captured_count: 1,
    }

    vi.mocked(useVendorAttendance).mockReturnValue({
      data: mockAttendance,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<VendorAttendanceList />)

    await waitFor(() => {
      expect(screen.getByText('33%')).toBeInTheDocument()
    })
  })

  it('should show empty states when no vendors', async () => {
    const mockAttendance = {
      captured: [],
      not_captured: [],
      total: 0,
      captured_count: 0,
    }

    vi.mocked(useVendorAttendance).mockReturnValue({
      data: mockAttendance,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<VendorAttendanceList />)

    await waitFor(() => {
      expect(screen.getByText(/no vendors captured yet/i)).toBeInTheDocument()
      expect(screen.getByText(/all vendors captured/i)).toBeInTheDocument()
    })
  })

  it('should display category filter buttons', async () => {
    const mockAttendance = {
      captured: [
        { id: 'v1', name: 'Vendor A', category: 'Textiles', booth_number: 'A101', styles_count: 2 },
        { id: 'v2', name: 'Vendor B', category: 'Leather', booth_number: 'B205', styles_count: 1 },
      ],
      not_captured: [],
      total: 2,
      captured_count: 2,
    }

    vi.mocked(useVendorAttendance).mockReturnValue({
      data: mockAttendance,
      isLoading: false,
      error: null,
    } as any)

    renderWithProviders(<VendorAttendanceList />)

    await waitFor(() => {
      expect(screen.getByText('All Categories')).toBeInTheDocument()
      expect(screen.getByText('Textiles')).toBeInTheDocument()
      expect(screen.getByText('Leather')).toBeInTheDocument()
    })
  })
})
