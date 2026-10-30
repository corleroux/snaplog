/**
 * Duplicate Vendor Check Tests
 *
 * Tests the checkDuplicateVendor function:
 * - Returns false when no company name provided
 * - Returns true when matching vendor exists
 * - Returns false when no match found
 * - Excludes specified vendor ID
 * - Returns false gracefully on Supabase error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(() => ({ data: { session: null }, error: null })),
      refreshSession: vi.fn(() => ({ data: { session: null }, error: null })),
    },
  },
}))

import { supabase } from '@/lib/supabase/client'
import { checkDuplicateVendor } from '../checkDuplicateVendor'

const mockFrom = vi.mocked(supabase.from)

function createMockQueryChain(resolvedValue: any) {
  const chain: any = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.ilike = vi.fn().mockReturnValue(chain)
  chain.neq = vi.fn().mockReturnValue(chain)
  // Make chain thenable for queries resolved via await
  chain.then = (resolve: any, reject: any) => {
    Promise.resolve(resolvedValue).then(resolve, reject)
  }
  return chain
}

describe('checkDuplicateVendor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return isDuplicate false when no company name provided', async () => {
    const result = await checkDuplicateVendor({
      companyName: '',
      eventId: 'evt-1',
    })

    expect(result.isDuplicate).toBe(false)
    expect(result.existingVendors).toHaveLength(0)
    // Should not even query the database
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('should return isDuplicate false when company name is only whitespace', async () => {
    const result = await checkDuplicateVendor({
      companyName: '   ',
      eventId: 'evt-1',
    })

    expect(result.isDuplicate).toBe(false)
    expect(result.existingVendors).toHaveLength(0)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('should return isDuplicate true when matching vendor exists', async () => {
    const existingVendor = {
      id: 'v-1',
      company_name: 'Test Textile Co.',
      booth_number: 'A-42',
      event_id: 'evt-1',
      status: 'active',
    }

    const chain = createMockQueryChain({ data: [existingVendor], error: null })
    mockFrom.mockReturnValue(chain)

    const result = await checkDuplicateVendor({
      companyName: 'Test Textile Co.',
      eventId: 'evt-1',
    })

    expect(result.isDuplicate).toBe(true)
    expect(result.existingVendors).toHaveLength(1)
    expect(result.existingVendors[0].company_name).toBe('Test Textile Co.')
    expect(mockFrom).toHaveBeenCalledWith('vendors')
    expect(chain.eq).toHaveBeenCalledWith('event_id', 'evt-1')
    expect(chain.ilike).toHaveBeenCalledWith('company_name', 'Test Textile Co.')
    expect(chain.neq).toHaveBeenCalledWith('status', 'archived')
  })

  it('should return isDuplicate false when no match found', async () => {
    const chain = createMockQueryChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    const result = await checkDuplicateVendor({
      companyName: 'Unique Vendor Name',
      eventId: 'evt-1',
    })

    expect(result.isDuplicate).toBe(false)
    expect(result.existingVendors).toHaveLength(0)
  })

  it('should exclude specified vendor ID from the check', async () => {
    const chain = createMockQueryChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    await checkDuplicateVendor({
      companyName: 'Test Co.',
      eventId: 'evt-1',
      excludeVendorId: 'v-999',
    })

    // neq should be called twice: once for status, once for excludeVendorId
    expect(chain.neq).toHaveBeenCalledWith('status', 'archived')
    expect(chain.neq).toHaveBeenCalledWith('id', 'v-999')
  })

  it('should return false gracefully on Supabase error', async () => {
    const chain = createMockQueryChain({
      data: null,
      error: { message: 'Network error' },
    })
    mockFrom.mockReturnValue(chain)

    // Should not throw — just log warning and return false
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await checkDuplicateVendor({
      companyName: 'Test Co.',
      eventId: 'evt-1',
    })

    expect(result.isDuplicate).toBe(false)
    expect(result.existingVendors).toHaveLength(0)
    expect(warnSpy).toHaveBeenCalledWith(
      '[checkDuplicateVendor]',
      'Duplicate vendor check failed',
      { error: 'Network error' }
    )
    warnSpy.mockRestore()
  })

  it('should trim company name before checking', async () => {
    const chain = createMockQueryChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    await checkDuplicateVendor({
      companyName: '  Test Co.  ',
      eventId: 'evt-1',
    })

    expect(chain.ilike).toHaveBeenCalledWith('company_name', 'Test Co.')
  })

  it('should not call neq for excludeVendorId when not provided', async () => {
    const chain = createMockQueryChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    await checkDuplicateVendor({
      companyName: 'Test Co.',
      eventId: 'evt-1',
    })

    // neq should only be called once (for status), not for vendor ID
    expect(chain.neq).toHaveBeenCalledTimes(1)
    expect(chain.neq).toHaveBeenCalledWith('status', 'archived')
  })
})
