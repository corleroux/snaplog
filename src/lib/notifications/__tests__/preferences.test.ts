/**
 * Notification Preferences API Tests
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
  getNotificationPreferences,
  updateNotificationPreference,
  shouldSendNotification,
  EVENT_TYPE_INFO,
} from '@/lib/notifications/preferences'

describe('Notification Preferences API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNotificationPreferences', () => {
    it('should fetch notification preferences for current user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      } as never)

      const mockPreferences = [
        {
          id: 'pref-1',
          user_id: 'user-123',
          event_type: 'vendor_created',
          enabled: true,
          channel_email: true,
          channel_in_app: true,
        },
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        error: null,
      } as never)

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockPreferences,
            error: null,
          }),
        }),
      } as any)

      const preferences = await getNotificationPreferences()

      expect(preferences).toEqual(mockPreferences)
      expect(supabase.rpc).toHaveBeenCalledWith('ensure_default_preferences', {
        p_user_id: 'user-123',
      })
    })

    it('should throw when user not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
      } as never)

      await expect(getNotificationPreferences()).rejects.toThrow('User not authenticated')
    })
  })

  describe('updateNotificationPreference', () => {
    it('should update notification preference', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      } as never)

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      } as any)

      await expect(
        updateNotificationPreference('vendor_created', { enabled: false })
      ).resolves.not.toThrow()

      expect(supabase.from).toHaveBeenCalledWith('notification_preferences')
    })
  })

  describe('shouldSendNotification', () => {
    it('should return true when preference enables channel', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  enabled: true,
                  channel_email: true,
                  channel_in_app: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      } as any)

      const shouldSend = await shouldSendNotification('user-123', 'vendor_created', 'email')

      expect(shouldSend).toBe(true)
    })

    it('should return false when preference disabled', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  enabled: false,
                  channel_email: true,
                  channel_in_app: true,
                },
                error: null,
              }),
            }),
          }),
        }),
      } as any)

      const shouldSend = await shouldSendNotification('user-123', 'vendor_created', 'email')

      expect(shouldSend).toBe(false)
    })

    it('should return true when no preference exists (default)', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      } as any)

      const shouldSend = await shouldSendNotification('user-123', 'vendor_created', 'email')

      expect(shouldSend).toBe(true)
    })
  })

  describe('EVENT_TYPE_INFO', () => {
    it('should have correct display info for all event types', () => {
      expect(EVENT_TYPE_INFO.vendor_created).toEqual({
        id: 'vendor_created',
        label: 'Vendor Created',
        description: 'When a new vendor is added to an event',
        defaultEmail: true,
        defaultInApp: true,
      })

      expect(EVENT_TYPE_INFO.style_committed).toEqual({
        id: 'style_committed',
        label: 'Style Committed',
        description: 'When a style is committed and goes live',
        defaultEmail: true,
        defaultInApp: true,
      })

      expect(EVENT_TYPE_INFO.extraction_error).toEqual({
        id: 'extraction_error',
        label: 'Extraction Errors',
        description: 'When AI extraction encounters an error',
        defaultEmail: true,
        defaultInApp: true,
      })
    })
  })
})
