/**
 * SchemaReviewForm render tests (FR-SCH-05 + FR-EXT-06).
 *
 * Verifies schema-driven rendering: labels from the definition, missing-field
 * flags for null values, and per-field confidence display.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SchemaReviewForm } from '../components/SchemaReviewForm'
import type { SchemaField } from '../api/catalogueRegistry'

const FIELDS: SchemaField[] = [
  { path: 'item.garment_type', type: 'string', label: 'Garment type', hint: 'e.g., Dress' },
  { path: 'item.fit', type: 'string', label: 'Fit', allowed_values: ['Slim', 'Regular', 'Relaxed'] },
]

describe('SchemaReviewForm', () => {
  it('renders fields from the schema definition', () => {
    render(
      <SchemaReviewForm
        fields={FIELDS}
        values={{ item: { garment_type: 'Dress', fit: 'Slim' } }}
        onFieldChange={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Garment type')).toHaveValue('Dress')
    expect(screen.getByLabelText('Fit')).toHaveValue('Slim')
  })

  it('flags missing fields as not extracted (FR-EXT-06)', () => {
    render(
      <SchemaReviewForm
        fields={FIELDS}
        values={{ item: { garment_type: null, fit: null } }}
        onFieldChange={vi.fn()}
      />
    )

    expect(screen.getAllByText(/not extracted — confirm or fill/i)).toHaveLength(2)
  })

  it('shows per-field confidence when supplied', () => {
    render(
      <SchemaReviewForm
        fields={FIELDS}
        values={{ item: { garment_type: 'Dress', fit: null } }}
        confidences={{ 'item.garment_type': 0.92 }}
        onFieldChange={vi.fn()}
      />
    )

    expect(screen.getByText('92%')).toBeInTheDocument()
  })
})
