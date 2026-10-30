/**
 * Shared Links API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

import { supabase } from '@/lib/supabase/client'
import {
  createSharedLink,
  getSharedLink,
  getMySharedLinks,
  deleteSharedLink,
  deactivateSharedLink,
  getSharedLinkUrl,
  validateSharedLinkPassword,
  type SharedLink,
} from '../sharedLinks'

describe('Shared Links API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSharedLink', () => {
    it('should create a shared link with unique token', async () => {
      const mockLink = {
        id: 'link-1',
        token: 'abc123',
        link_type: 'event_catalogue' as const,
        event_id: 'event-1',
        vendor_id: null,
        style_id: null,
        created_by: null,
        created_at: new Date().toISOString(),
        expires_at: null,
        last_accessed_at: null,
        access_count: 0,
        is_active: true,
      }

      // Setup uniqueness check mock
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockLink,
              error: null,
            }),
          }),
        }),
      } as any)

      const link = await createSharedLink({
        type: 'event_catalogue',
        eventId: 'event-1',
      })

      expect(link).toEqual(mockLink)
    })

    it('should generate password hash when password provided', async () => {
      const mockLink = {
        id: 'link-1',
        token: 'abc123',
        link_type: 'vendor' as const,
        password_hash: 'c2VjcmV0MTIz',
      }

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockLink,
              error: null,
            }),
          }),
        }),
      } as any)

      const link = await createSharedLink({
        type: 'vendor',
        vendorId: 'vendor-1',
        password: 'secret123',
      })

      expect(link).toBeDefined()
      expect(link.password_hash).toBe('c2VjcmV0MTIz')
    })

    it('should retry token generation if collision occurs', async () => {
      const mockLink = {
        id: 'link-1',
        token: 'xyz789',
        link_type: 'style' as const,
      }

      let callCount = 0
      const mockSingle = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({ data: { token: 'existing' }, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockLink,
              error: null,
            }),
          }),
        }),
      } as any)

      const link = await createSharedLink({
        type: 'style',
        styleId: 'style-1',
      })

      expect(link).toBeDefined()
    })
  })

  describe('getSharedLink', () => {
    it('should fetch shared link by token', async () => {
      const mockLink: SharedLink = {
        id: 'link-1',
        token: 'abc123',
        link_type: 'event_catalogue',
        event_id: 'event-1',
        vendor_id: null,
        style_id: null,
        created_by: null,
        created_at: new Date().toISOString(),
        expires_at: null,
        last_accessed_at: null,
        access_count: 0,
        is_active: true,
      }

      vi.mocked(supabase.rpc).mockResolvedValue({ error: null } as never)

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockLink,
        error: null,
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      } as any)

      const link = await getSharedLink('abc123')

      expect(link).toEqual(mockLink)
      expect(supabase.rpc).toHaveBeenCalledWith('increment_link_access', { link_id: 'link-1' })
    })

    it('should return null for expired link', async () => {
      const pastDate = new Date(Date.now() - 10000).toISOString()

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'link-1',
          token: 'abc123',
          link_type: 'event_catalogue',
          created_at: new Date().toISOString(),
          expires_at: pastDate,
          access_count: 0,
          is_active: true,
        },
        error: null,
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      } as any)

      const link = await getSharedLink('abc123')

      expect(link).toBeNull()
    })

    it('should return null on error', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      } as any)

      const link = await getSharedLink('abc123')

      expect(link).toBeNull()
    })
  })

  describe('getMySharedLinks', () => {
    it('should fetch all shared links', async () => {
      const mockLinks = [
        { id: 'link-1', token: 'abc123', created_at: new Date().toISOString(), access_count: 0, is_active: true },
        { id: 'link-2', token: 'def456', created_at: new Date().toISOString(), access_count: 5, is_active: true },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockLinks,
            error: null,
          }),
        }),
      } as any)

      const links = await getMySharedLinks()

      expect(links).toEqual(mockLinks)
    })
  })

  describe('deleteSharedLink', () => {
    it('should delete shared link', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      await expect(deleteSharedLink('link-1')).resolves.not.toThrow()

      expect(supabase.from).toHaveBeenCalledWith('shared_links')
    })
  })

  describe('deactivateSharedLink', () => {
    it('should deactivate shared link', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      await expect(deactivateSharedLink('link-1')).resolves.not.toThrow()

      expect(supabase.from).toHaveBeenCalledWith('shared_links')
    })
  })

  describe('getSharedLinkUrl', () => {
    it('should generate public URL with default base', () => {
      // Mock window.location.origin
      const originalOrigin = window.location.origin
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://example.com' },
        writable: true,
      })

      const url = getSharedLinkUrl('abc123')
      expect(url).toBe('https://example.com/share/abc123')

      // Restore
      Object.defineProperty(window, 'location', {
        value: { origin: originalOrigin },
        writable: true,
      })
    })

    it('should generate public URL with custom base', () => {
      const url = getSharedLinkUrl('abc123', 'https://custom.com')
      expect(url).toBe('https://custom.com/share/abc123')
    })
  })

  describe('validateSharedLinkPassword', () => {
    it('should return true when no password set', () => {
      const link: SharedLink = {
        id: 'link-1',
        token: 'abc123',
        link_type: 'event_catalogue',
        created_at: new Date().toISOString(),
        access_count: 0,
        is_active: true,
      }

      expect(validateSharedLinkPassword(link, 'anything')).toBe(true)
    })

    it('should validate password correctly', () => {
      const link: SharedLink = {
        id: 'link-1',
        token: 'abc123',
        link_type: 'event_catalogue',
        password_hash: btoa('secret123'),
        created_at: new Date().toISOString(),
        access_count: 0,
        is_active: true,
      }

      expect(validateSharedLinkPassword(link, 'secret123')).toBe(true)
      expect(validateSharedLinkPassword(link, 'wrong')).toBe(false)
    })
  })
})
