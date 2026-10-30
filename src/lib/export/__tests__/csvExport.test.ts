/**
 * CSV Export utility tests
 *
 * Tests:
 * - Empty data returns just header
 * - Single row
 * - Multiple rows
 * - Values with commas are quoted
 * - Values with quotes are escaped
 * - null/undefined becomes empty string
 * - Object values are JSON-serialized
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { objectsToCsv, downloadCsv } from '../csvExport'

describe('objectsToCsv', () => {
  const columns = [
    { key: 'name' as const, label: 'Name' },
    { key: 'email' as const, label: 'Email' },
    { key: 'phone' as const, label: 'Phone' },
  ]

  it('returns just header for empty data', () => {
    const result = objectsToCsv([], columns)
    expect(result).toBe('Name,Email,Phone')
  })

  it('returns header and single row', () => {
    const data = [{ name: 'Alice', email: 'alice@example.com', phone: '123' }]
    const result = objectsToCsv(data, columns)
    expect(result).toBe('Name,Email,Phone\nAlice,alice@example.com,123')
  })

  it('returns header and multiple rows', () => {
    const data = [
      { name: 'Alice', email: 'alice@example.com', phone: '123' },
      { name: 'Bob', email: 'bob@example.com', phone: '456' },
    ]
    const result = objectsToCsv(data, columns)
    expect(result).toBe(
      'Name,Email,Phone\nAlice,alice@example.com,123\nBob,bob@example.com,456'
    )
  })

  it('quotes values containing commas', () => {
    const data = [{ name: 'Alice, Inc.', email: 'alice@example.com', phone: '123' }]
    const result = objectsToCsv(data, columns)
    expect(result).toBe('Name,Email,Phone\n"Alice, Inc.",alice@example.com,123')
  })

  it('escapes double quotes by doubling them', () => {
    const data = [{ name: 'Alice "Al" Smith', email: 'alice@example.com', phone: '123' }]
    const result = objectsToCsv(data, columns)
    expect(result).toBe('Name,Email,Phone\n"Alice ""Al"" Smith",alice@example.com,123')
  })

  it('quotes values containing newlines', () => {
    const data = [{ name: 'Alice\nSmith', email: 'alice@example.com', phone: '123' }]
    const result = objectsToCsv(data, columns)
    expect(result).toBe('Name,Email,Phone\n"Alice\nSmith",alice@example.com,123')
  })

  it('converts null to empty string', () => {
    const data = [{ name: 'Alice', email: null as unknown as string, phone: '123' }]
    const result = objectsToCsv(data, columns)
    expect(result).toBe('Name,Email,Phone\nAlice,,123')
  })

  it('converts undefined to empty string', () => {
    const data = [{ name: 'Alice', email: undefined as unknown as string, phone: '123' }]
    const result = objectsToCsv(data, columns)
    expect(result).toBe('Name,Email,Phone\nAlice,,123')
  })

  it('JSON-serializes object values', () => {
    const data = [{ name: 'Alice', email: 'alice@example.com', phone: { area: '555' } as unknown as string }]
    const result = objectsToCsv(data, columns)
    expect(result).toBe('Name,Email,Phone\nAlice,alice@example.com,{"area":"555"}')
  })

  it('converts numbers to strings', () => {
    const data = [{ name: 'Alice', email: 'alice@example.com', phone: 123 as unknown as string }]
    const result = objectsToCsv(data, columns)
    expect(result).toBe('Name,Email,Phone\nAlice,alice@example.com,123')
  })
})

describe('downloadCsv', () => {
  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })

    // Mock document.createElement to track the anchor element
    const mockClick = vi.fn()
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
      style: {},
    }

    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLAnchorElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as unknown as HTMLAnchorElement)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as unknown as HTMLAnchorElement)
  })

  it('creates a blob URL and triggers download', () => {
    downloadCsv('Name,Email\nAlice,alice@test.com', 'test.csv')

    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})
