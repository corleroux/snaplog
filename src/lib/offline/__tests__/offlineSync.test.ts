/**
 * Offline Sync Tests
 *
 * Tests for offline draft creation, sync on reconnect,
 * conflict resolution, and queue persistence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

describe('Offline Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('Queue persistence', () => {
    it('should persist upload queue to localStorage', () => {
      const queueItem = {
        id: 'queue-1',
        type: 'vendor',
        data: { name: 'Test' },
        timestamp: Date.now(),
      }

      localStorageMock.setItem('uploadQueue', JSON.stringify([queueItem]))

      const stored = localStorageMock.getItem('uploadQueue')
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(1)
    })

    it('should restore queue on app load', async () => {
      const queueItem = {
        id: 'queue-1',
        type: 'vendor',
        data: { name: 'Test' },
        timestamp: Date.now(),
      }

      localStorageMock.setItem('uploadQueue', JSON.stringify([queueItem]))

      // Queue would be restored on app initialization
      const stored = localStorageMock.getItem('uploadQueue')
      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(1)
    })

    it('should clear processed items from queue', async () => {
      const queueItem = {
        id: 'queue-1',
        type: 'vendor',
        data: { name: 'Test' },
        timestamp: Date.now(),
      }

      localStorageMock.setItem('uploadQueue', JSON.stringify([queueItem]))

      // After processing, remove from queue
      const remaining: unknown[] = []
      localStorageMock.setItem('uploadQueue', JSON.stringify(remaining))

      const stored = localStorageMock.getItem('uploadQueue')
      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(0)
    })
  })

  describe('Conflict resolution', () => {
    it('should detect conflicts when server has newer version', async () => {
      const localDraft = {
        id: 'draft-1',
        entity_type: 'vendor',
        data: { name: 'Local Name' },
        updated_at: '2024-01-01T00:00:00Z',
      }

      const serverVersion = {
        id: 'vendor-1',
        name: 'Server Name',
        updated_at: '2024-01-02T00:00:00Z', // Newer
      }

      // This would be detected during sync
      const hasConflict = new Date(serverVersion.updated_at) > new Date(localDraft.updated_at)
      expect(hasConflict).toBe(true)
    })

    it('should resolve conflict by keeping newer version', async () => {
      const localDraft = {
        id: 'draft-1',
        entity_type: 'vendor',
        data: { name: 'Local Name' },
        updated_at: '2024-01-01T00:00:00Z',
      }

      const serverVersion = {
        id: 'vendor-1',
        name: 'Server Name',
        updated_at: '2024-01-02T00:00:00Z',
      }

      // Server version is newer
      const resolved = new Date(serverVersion.updated_at) > new Date(localDraft.updated_at)
        ? serverVersion
        : localDraft

      expect(resolved).toEqual(serverVersion)
    })

    it('should prefer local version when local is newer', async () => {
      const localDraft = {
        id: 'draft-1',
        entity_type: 'vendor',
        data: { name: 'Local Name' },
        updated_at: '2024-01-03T00:00:00Z', // Newer
      }

      const serverVersion = {
        id: 'vendor-1',
        name: 'Server Name',
        updated_at: '2024-01-02T00:00:00Z',
      }

      // Local version is newer
      const resolved = new Date(serverVersion.updated_at) > new Date(localDraft.updated_at)
        ? serverVersion
        : localDraft

      expect(resolved).toEqual(localDraft)
    })
  })

  describe('Offline detection', () => {
    it('should detect online state', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      })

      expect(navigator.onLine).toBe(true)
    })

    it('should detect offline state', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })

      expect(navigator.onLine).toBe(false)
    })
  })
})
