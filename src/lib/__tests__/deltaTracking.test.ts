/**
 * Delta tracking tests
 */

import { describe, it, expect } from 'vitest'
import { computeDeltas, isFieldModified } from '../deltaTracking'

describe('computeDeltas', () => {
  it('returns empty array when nothing changed', () => {
    const deltas = computeDeltas(
      { name: 'Cotton', weight: '150gsm' },
      { name: 'Cotton', weight: '150gsm' },
      { name: 'Fabric Name', weight: 'Weight' }
    )
    expect(deltas).toEqual([])
  })

  it('detects a single changed field', () => {
    const deltas = computeDeltas(
      { name: 'Cotton', weight: '150gsm' },
      { name: 'Silk', weight: '150gsm' },
      { name: 'Fabric Name', weight: 'Weight' }
    )
    expect(deltas).toHaveLength(1)
    expect(deltas[0].field).toBe('Fabric Name')
    expect(deltas[0].original).toBe('Cotton')
    expect(deltas[0].modified).toBe('Silk')
  })

  it('detects multiple changed fields', () => {
    const deltas = computeDeltas(
      { name: 'Cotton', weight: '150gsm', width: '150cm' },
      { name: 'Silk', weight: '200gsm', width: '150cm' },
      { name: 'Name', weight: 'Weight', width: 'Width' }
    )
    expect(deltas).toHaveLength(2)
    expect(deltas.map(d => d.field)).toEqual(['Name', 'Weight'])
  })

  it('uses raw key when label not provided', () => {
    const deltas = computeDeltas(
      { name: 'Cotton' },
      { name: 'Silk' },
      {} // no labels
    )
    expect(deltas[0].field).toBe('name')
  })

  it('detects null to value change', () => {
    const deltas = computeDeltas(
      { name: null, weight: '150gsm' },
      { name: 'Silk', weight: '150gsm' },
      { name: 'Name' }
    )
    expect(deltas).toHaveLength(1)
    expect(deltas[0].original).toBe(null)
    expect(deltas[0].modified).toBe('Silk')
  })

  it('detects value to null change', () => {
    const deltas = computeDeltas(
      { name: 'Cotton' },
      { name: null },
      { name: 'Name' }
    )
    expect(deltas).toHaveLength(1)
    expect(deltas[0].original).toBe('Cotton')
    expect(deltas[0].modified).toBe(null)
  })
})

describe('isFieldModified', () => {
  it('returns true when field changed', () => {
    expect(isFieldModified({ name: 'A' }, { name: 'B' }, 'name')).toBe(true)
  })

  it('returns false when field unchanged', () => {
    expect(isFieldModified({ name: 'A' }, { name: 'A' }, 'name')).toBe(false)
  })

  it('returns true when field was null and now has value', () => {
    expect(isFieldModified({ name: null }, { name: 'B' }, 'name')).toBe(true)
  })

  it('returns false when field missing in both', () => {
    expect(isFieldModified({}, {}, 'name')).toBe(false)
  })
})
