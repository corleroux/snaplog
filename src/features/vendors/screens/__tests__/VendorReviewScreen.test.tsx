/**
 * VendorReviewScreen tests (part of TEST-01)
 *
 * Tests that:
 * - Renders extracted data fields (as input values)
 * - Renders confidence indicators (High/Medium/Low badges)
 * - Renders warnings when present
 * - Allows field editing
 * - Calls onSave when Save button clicked with valid data
 * - Shows saving state
 * - Calls onBack when Back button clicked
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VendorReviewScreen } from '../VendorReviewScreen'
import type { VendorExtractionResult } from '@/types/vendor'

function createExtractionResult(overrides: Partial<VendorExtractionResult> = {}): VendorExtractionResult {
  return {
    status: 'success',
    extractedAt: '2026-01-15T10:30:00Z',
    sourceImageId: 'img-1',
    confidence: {
      companyName: 'high',
      boothNumber: 'medium',
      contactPerson: 'high',
      email: 'high',
      phone: 'low',
      website: 'medium',
      address: 'low',
    },
    fields: {
      companyName: 'Test Fabrics Inc.',
      boothNumber: 'A-101',
      contactPerson: 'Jane Doe',
      email: 'jane@testfabrics.com',
      phone: '+91-9876543210',
      website: 'https://testfabrics.com',
      address: '123 Textile Lane',
      countryOfOrigin: 'India',
      brandNames: 'TestBrand',
      notes: '',
    },
    warnings: [],
    ...overrides,
  }
}

describe('VendorReviewScreen', () => {
  const mockOnSave = vi.fn()
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders extracted data fields as input values', () => {
    const result = createExtractionResult()

    render(
      <VendorReviewScreen
        extractionResult={result}
        infoImage={null}
        onSave={mockOnSave}
      />
    )

    // Fields should appear as input values
    expect(screen.getByDisplayValue('Test Fabrics Inc.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A-101')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('jane@testfabrics.com')).toBeInTheDocument()
  })

  it('renders confidence indicators', () => {
    const result = createExtractionResult()

    render(
      <VendorReviewScreen
        extractionResult={result}
        infoImage={null}
        onSave={mockOnSave}
      />
    )

    // Confidence badges should be rendered (multiple may exist for each level)
    expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Medium').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Low').length).toBeGreaterThanOrEqual(1)
  })

  it('renders warnings when present', () => {
    const result = createExtractionResult({
      warnings: ['Image quality is low', 'Phone number unclear'],
    })

    render(
      <VendorReviewScreen
        extractionResult={result}
        infoImage={null}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('Image quality is low')).toBeInTheDocument()
    expect(screen.getByText('Phone number unclear')).toBeInTheDocument()
  })

  it('renders no warnings section when no warnings', () => {
    const result = createExtractionResult({ warnings: [] })

    render(
      <VendorReviewScreen
        extractionResult={result}
        infoImage={null}
        onSave={mockOnSave}
      />
    )

    expect(screen.queryByText('Extraction Warnings')).not.toBeInTheDocument()
  })

  it('allows field editing', () => {
    const result = createExtractionResult()

    render(
      <VendorReviewScreen
        extractionResult={result}
        infoImage={null}
        onSave={mockOnSave}
      />
    )

    const companyInput = screen.getByDisplayValue('Test Fabrics Inc.')
    fireEvent.change(companyInput, { target: { value: 'Updated Fabrics' } })

    expect(screen.getByDisplayValue('Updated Fabrics')).toBeInTheDocument()
  })

  it('calls onSave when Save button clicked with valid data', () => {
    const result = createExtractionResult()

    render(
      <VendorReviewScreen
        extractionResult={result}
        infoImage={null}
        onSave={mockOnSave}
      />
    )

    fireEvent.click(screen.getByText('Save Vendor'))
    expect(mockOnSave).toHaveBeenCalledOnce()
    // Verify it passes the form data
    const savedData = mockOnSave.mock.calls[0][0]
    expect(savedData.companyName).toBe('Test Fabrics Inc.')
  })

  it('shows saving state', () => {
    const result = createExtractionResult()

    render(
      <VendorReviewScreen
        extractionResult={result}
        infoImage={null}
        onSave={mockOnSave}
        isSaving={true}
      />
    )

    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })

  it('calls onBack when Back button clicked', () => {
    const result = createExtractionResult()

    render(
      <VendorReviewScreen
        extractionResult={result}
        infoImage={null}
        onSave={mockOnSave}
        onBack={mockOnBack}
      />
    )

    fireEvent.click(screen.getByText('Back'))
    expect(mockOnBack).toHaveBeenCalledOnce()
  })

  it('renders custom header when provided', () => {
    const result = createExtractionResult()

    render(
      <VendorReviewScreen
        extractionResult={result}
        infoImage={null}
        onSave={mockOnSave}
        headerContent={<div data-testid="custom-header">Custom</div>}
      />
    )

    expect(screen.getByTestId('custom-header')).toBeInTheDocument()
  })

  it('renders AI Extracted badge', () => {
    const result = createExtractionResult()

    render(
      <VendorReviewScreen
        extractionResult={result}
        infoImage={null}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('AI Extracted')).toBeInTheDocument()
  })
})
