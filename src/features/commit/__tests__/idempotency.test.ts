/**
 * Tests for idempotency utilities.
 *
 * Validates:
 * - isAlreadyCommitted check logic
 * - getExistingCommitId return values
 * - Convenience wrappers (isVendorCommitted, isStyleCommitted)
 * - IdempotencyCheckResult interface
 *
 * These tests mock the Supabase client calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  isAlreadyCommitted,
  getExistingCommitId,
  isVendorCommitted,
  isStyleCommitted,
  getCommittedVendorId,
  getCommittedStyleId,
} from '../idempotency'

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}))

// Import after mock is set up
import { supabase } from '@/lib/supabase/client'

describe('Idempotency Utilities', () => {
  // Helper to set up mock chain: .from().select().eq().single()
  function mockSingleReturn(data: any, error: any = null) {
    const singleFn = vi.fn().mockResolvedValue({ data, error })
    const eqFn = vi.fn().mockReturnValue({ single: singleFn })
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn })

    ;(supabase.from as any).mockReturnValue({ select: selectFn })

    return { singleFn, eqFn, selectFn }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isAlreadyCommitted', () => {
    it('returns true when entity reference exists', async () => {
      mockSingleReturn({ vendor_id: 'vendor-123' }, null)

      const result = await isAlreadyCommitted('session-456', 'vendor_id')
      expect(result).toBe(true)
    })

    it('returns false when entity reference is null', async () => {
      mockSingleReturn({ vendor_id: null }, null)

      const result = await isAlreadyCommitted('session-456', 'vendor_id')
      expect(result).toBe(false)
    })

    it('returns false on query error', async () => {
      mockSingleReturn(null, { message: 'Not found' })

      const result = await isAlreadyCommitted('session-456', 'vendor_id')
      expect(result).toBe(false)
    })

    it('works with style_id column', async () => {
      mockSingleReturn({ style_id: 'style-789' }, null)

      const result = await isAlreadyCommitted('session-456', 'style_id')
      expect(result).toBe(true)
    })
  })

  describe('getExistingCommitId', () => {
    it('returns existing ID when committed', async () => {
      mockSingleReturn({ vendor_id: 'vendor-123' }, null)

      const result = await getExistingCommitId('session-456', 'vendor_id')
      expect(result.alreadyCommitted).toBe(true)
      expect(result.existingId).toBe('vendor-123')
    })

    it('returns null ID when not committed', async () => {
      mockSingleReturn({ vendor_id: null }, null)

      const result = await getExistingCommitId('session-456', 'vendor_id')
      expect(result.alreadyCommitted).toBe(false)
      expect(result.existingId).toBeNull()
    })

    it('returns not committed on error', async () => {
      mockSingleReturn(null, { message: 'Query failed' })

      const result = await getExistingCommitId('session-456', 'vendor_id')
      expect(result.alreadyCommitted).toBe(false)
      expect(result.existingId).toBeNull()
    })
  })

  describe('isVendorCommitted', () => {
    it('delegates to isAlreadyCommitted with vendor_id', async () => {
      mockSingleReturn({ vendor_id: 'vendor-123' }, null)

      const result = await isVendorCommitted('session-456')
      expect(result).toBe(true)
    })
  })

  describe('isStyleCommitted', () => {
    it('delegates to isAlreadyCommitted with style_id', async () => {
      mockSingleReturn({ style_id: 'style-789' }, null)

      const result = await isStyleCommitted('session-456')
      expect(result).toBe(true)
    })
  })

  describe('getCommittedVendorId', () => {
    it('returns existing vendor ID', async () => {
      mockSingleReturn({ vendor_id: 'vendor-123' }, null)

      const id = await getCommittedVendorId('session-456')
      expect(id).toBe('vendor-123')
    })

    it('returns null when not committed', async () => {
      mockSingleReturn({ vendor_id: null }, null)

      const id = await getCommittedVendorId('session-456')
      expect(id).toBeNull()
    })
  })

  describe('getCommittedStyleId', () => {
    it('returns existing style ID', async () => {
      mockSingleReturn({ style_id: 'style-789' }, null)

      const id = await getCommittedStyleId('session-456')
      expect(id).toBe('style-789')
    })
  })
})
