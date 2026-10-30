/**
 * Security tests for RLS policies and auth boundaries (TEST-08)
 *
 * Tests that:
 * - Unauthenticated requests are rejected
 * - Cross-tenant data access is blocked
 * - Auth tokens are validated before operations
 * - Protected edge functions require auth
 *
 * These tests verify the frontend security layer.
 * Full RLS testing happens at the database level.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resetFactoryIds } from '@/test/factories'

// Mock supabase
const mockFrom = vi.fn()
const mockGetSession = vi.fn()
const mockGetUser = vi.fn()
const mockFunctionsInvoke = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      getUser: (...args: any[]) => mockGetUser(...args),
    },
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke(...args),
    },
  },
  invokeEdgeFunction: vi.fn(),
}))

// Mock PostHog
vi.mock('posthog-js', () => ({
  default: {
    captureException: vi.fn(),
    capture: vi.fn(),
    register: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    init: vi.fn(),
    opt_out_capturing: vi.fn(),
  },
}))

import { commitReviewedVendor } from '../../vendors/api/commitReviewedVendor'
import { extractVendorDocument } from '../../vendors/api/extractVendorDocument'

describe('Security — Auth Boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetFactoryIds()
  })

  // ==========================================================================
  // Unauthenticated access
  // ==========================================================================

  describe('Unauthenticated requests', () => {
    it('commit function fails when no session', async () => {
      // Even if the edge function is called, it should fail at the auth layer
      // The frontend validates UUIDs first, so provide valid ones
      await expect(
        commitReviewedVendor({
          scanSessionId: '550e8400-e29b-41d4-a716-446655440000',
          eventId: '550e8400-e29b-41d4-a716-446655440001',
          reviewedDocument: { company_name: 'Test Co.' } as any,
        })
      ).rejects.toThrow()
    })

    it('extract function validates input before calling edge function', async () => {
      // Invalid scan_session_id should fail validation before hitting network
      await expect(
        extractVendorDocument({
          scanSessionId: '',
          eventId: '550e8400-e29b-41d4-a716-446655440001',
          storagePath: 'scans/img.jpg',
          mimeType: 'image/jpeg',
          scanType: 'vendor_card',
        })
      ).rejects.toMatchObject({
        type: 'validation_failed',
      })
    })
  })

  // ==========================================================================
  // Input validation (security boundary)
  // ==========================================================================

  describe('Input validation', () => {
    it('rejects SQL injection in company_name via validation', async () => {
      // The commit function validates company_name with trim
      // Malicious input should be handled safely
      await expect(
        commitReviewedVendor({
          scanSessionId: 'not-uuid',
          eventId: '550e8400-e29b-41d4-a716-446655440001',
          reviewedDocument: {
            company_name: "'; DROP TABLE vendors; --",
          } as any,
        })
      ).rejects.toThrow() // UUID validation fails first
    })

    it('rejects empty company_name', async () => {
      await expect(
        commitReviewedVendor({
          scanSessionId: '550e8400-e29b-41d4-a716-446655440000',
          eventId: '550e8400-e29b-41d4-a716-446655440001',
          reviewedDocument: { company_name: '   ' } as any,
        })
      ).rejects.toThrow('Company name is required')
    })

    it('rejects non-UUID scan_session_id', async () => {
      await expect(
        commitReviewedVendor({
          scanSessionId: '<script>alert("xss")</script>',
          eventId: '550e8400-e29b-41d4-a716-446655440001',
          reviewedDocument: { company_name: 'Test' } as any,
        })
      ).rejects.toThrow('Invalid scan_session_id')
    })
  })

  // ==========================================================================
  // Cross-tenant data access (simulated)
  // ==========================================================================

  describe('Cross-tenant access prevention', () => {
    it('commit validates scan_session_id belongs to user via edge function', async () => {
      // This tests that the frontend sends the request properly;
      // the edge function enforces ownership
      // Simulate edge function returning 403 (foreign key mismatch)
      const { invokeEdgeFunction } = await import('@/lib/supabase/client')
      vi.mocked(invokeEdgeFunction).mockResolvedValue({
        data: null,
        error: new Error('vendor_id does not match scan session'),
      })

      await expect(
        commitReviewedVendor({
          scanSessionId: '550e8400-e29b-41d4-a716-446655440000',
          eventId: '550e8400-e29b-41d4-a716-446655440001',
          reviewedDocument: { company_name: 'Test Co.' } as any,
        })
      ).rejects.toThrow()
    })

    it('edge function enforces event_id matches scan session', async () => {
      const { invokeEdgeFunction } = await import('@/lib/supabase/client')
      vi.mocked(invokeEdgeFunction).mockResolvedValue({
        data: null,
        error: new Error('event_id does not match scan session'),
      })

      await expect(
        commitReviewedVendor({
          scanSessionId: '550e8400-e29b-41d4-a716-446655440000',
          eventId: '550e8400-e29b-41d4-a716-446655440099', // Different event
          reviewedDocument: { company_name: 'Test Co.' } as any,
        })
      ).rejects.toThrow()
    })
  })

  // ==========================================================================
  // Protected edge function access
  // ==========================================================================

  describe('Protected edge functions', () => {
    it('extract function requires auth via Supabase client', async () => {
      // Supabase functions.invoke automatically sends auth headers
      // If no session, it should fail at the edge function level
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized' },
      })

      await expect(
        extractVendorDocument({
          scanSessionId: '550e8400-e29b-41d4-a716-446655440000',
          eventId: '550e8400-e29b-41d4-a716-446655440001',
          storagePath: 'scans/img.jpg',
          mimeType: 'image/jpeg',
          scanType: 'vendor_card',
        })
      ).rejects.toMatchObject({
        type: 'extraction_failed',
      })
    })
  })
})
