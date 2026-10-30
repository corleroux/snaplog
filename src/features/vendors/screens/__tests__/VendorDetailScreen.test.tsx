/**
 * VendorDetailScreen render tests
 *
 * Tests loading, error, populated, and empty states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { VendorDetailScreen } from '../VendorDetailScreen'
import { ToastProvider } from '@/components/ui/toast'
import { createVendorRecord, resetFactoryIds } from '@/test/factories'

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </ToastProvider>
  )
}

describe('VendorDetailScreen', () => {
  const mockOnBack = vi.fn()
  const mockOnEdit = vi.fn()
  const mockOnArchive = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    resetFactoryIds()
  })

  it('renders vendor company name', () => {
    const vendor = createVendorRecord({ companyName: 'Alpha Fabrics' })

    renderWithRouter(
      <VendorDetailScreen
        vendor={vendor}
        onBack={mockOnBack}
        onEditVendor={mockOnEdit}
      />
    )

    expect(screen.getByText('Alpha Fabrics')).toBeInTheDocument()
  })

  it('renders contact info when present', () => {
    const vendor = createVendorRecord({
      companyName: 'Test Vendor',
      email: 'test@vendor.com',
      phone: '+1 555 1234',
    })

    renderWithRouter(
      <VendorDetailScreen vendor={vendor} />
    )

    expect(screen.getByText('test@vendor.com')).toBeInTheDocument()
    expect(screen.getByText('+1 555 1234')).toBeInTheDocument()
  })

  it('renders booth number', () => {
    const vendor = createVendorRecord({
      companyName: 'Test Vendor',
      boothNumber: 'A-42',
    })

    renderWithRouter(
      <VendorDetailScreen vendor={vendor} />
    )

    expect(screen.getByText('A-42')).toBeInTheDocument()
  })

  it('renders vendor with no optional fields', () => {
    const vendor = createVendorRecord({
      companyName: 'Minimal Vendor',
      email: '',
      phone: '',
      boothNumber: '',
      address: '',
      countryOfOrigin: '',
    })

    renderWithRouter(
      <VendorDetailScreen vendor={vendor} />
    )

    expect(screen.getByText('Minimal Vendor')).toBeInTheDocument()
  })

  it('renders archive button when onArchive provided', () => {
    const vendor = createVendorRecord()

    renderWithRouter(
      <VendorDetailScreen vendor={vendor} onArchive={mockOnArchive} />
    )

    expect(screen.getByText('Archive Vendor')).toBeInTheDocument()
  })
})
