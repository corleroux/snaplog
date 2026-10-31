/**
 * Extraction warnings + required-field validation tests (FR-EXT-06).
 */

import { describe, it, expect } from 'vitest'
import {
  buildExtractionWarnings,
  validateRequiredFields,
} from '../hooks/useCatalogueItemCaptureFlow'
import type { CatalogueTypeDefinition } from '../api/catalogueRegistry'

const GARMENT = {
  slug: 'garment',
  kind: 'catalogue_type',
  display_name: 'Garment',
  version: 1,
  schema: {
    output_root: 'item',
    fields: [
      { path: 'item.garment_type', type: 'string', label: 'Garment type', required: false },
      { path: 'item.fit', type: 'string', label: 'Fit', required: true },
    ],
  },
} as CatalogueTypeDefinition

describe('buildExtractionWarnings', () => {
  it('warns on missing required fields', () => {
    const warnings = buildExtractionWarnings({ item: { garment_type: 'Dress' } }, GARMENT)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Fit')
  })

  it('warns on low-confidence fields', () => {
    const warnings = buildExtractionWarnings(
      { item: { garment_type: 'Dress', fit: 'Slim' } },
      GARMENT,
      { 'item.garment_type': 0.3 }
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('Garment type')
    expect(warnings[0]).toContain('30%')
  })

  it('is silent when everything is extracted confidently', () => {
    const warnings = buildExtractionWarnings(
      { item: { garment_type: 'Dress', fit: 'Slim' } },
      GARMENT,
      { 'item.garment_type': 0.95, 'item.fit': 0.9 }
    )
    expect(warnings).toHaveLength(0)
  })
})

describe('validateRequiredFields', () => {
  it('blocks save while a required field is missing', () => {
    expect(validateRequiredFields({ item: {} }, GARMENT)).toEqual({
      'item.fit': 'Fit is required',
    })
  })

  it('passes when required fields are present', () => {
    expect(validateRequiredFields({ item: { fit: 'Slim' } }, GARMENT)).toEqual({})
  })
})
