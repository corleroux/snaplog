/**
 * Conflict resolution tests
 *
 * Tests the last-write-wins conflict detection strategy.
 */

import { describe, it, expect } from 'vitest'
import { detectConflict } from '../conflictResolution'

describe('detectConflict', () => {
  it('returns no conflict when server has no data', () => {
    const result = detectConflict({
      localUpdatedAt: '2026-04-01T10:00:00Z',
      serverUpdatedAt: null,
    })

    expect(result.hasConflict).toBe(false)
    expect(result.resolution).toBe('no_conflict')
  })

  it('returns no conflict when local is newer', () => {
    const result = detectConflict({
      localUpdatedAt: '2026-04-01T10:01:00Z',
      serverUpdatedAt: '2026-04-01T10:00:00Z',
    })

    expect(result.hasConflict).toBe(false)
    expect(result.resolution).toBe('local_wins')
  })

  it('returns no conflict when timestamps are equal', () => {
    const result = detectConflict({
      localUpdatedAt: '2026-04-01T10:00:00Z',
      serverUpdatedAt: '2026-04-01T10:00:00Z',
    })

    expect(result.hasConflict).toBe(false)
    expect(result.resolution).toBe('local_wins')
  })

  it('returns conflict when server is newer', () => {
    const result = detectConflict({
      localUpdatedAt: '2026-04-01T10:00:00Z',
      serverUpdatedAt: '2026-04-01T10:01:00Z',
    })

    expect(result.hasConflict).toBe(true)
    expect(result.resolution).toBe('server_wins')
  })
})
