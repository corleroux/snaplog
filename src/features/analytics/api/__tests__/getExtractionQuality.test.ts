/**
 * Extraction Quality API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client - define inline to avoid hoisting issues
vi.mock('@/lib/supabase/client', () => {
  const createMockChain = (data: any, error: any = null) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        in: vi.fn(() => ({
          then: (resolve: any) => resolve({ data, error }),
        })),
      })),
    })),
  })

  return {
    supabase: {
      from: vi.fn(() => createMockChain([])),
    },
  }
})

import { supabase } from '@/lib/supabase/client'
import { getExtractionQuality } from '../getExtractionQuality'

describe('getExtractionQuality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch extraction quality metrics for event', async () => {
    const mockScanSessions = [
      {
        id: 'ss-1',
        event_id: 'event-123',
        normalized_payload: {
          metadata: {
            confidence_scores: {
              name: 0.95,
              composition: 0.88,
              category: 0.72,
            },
          },
        },
        status: 'completed',
      },
      {
        id: 'ss-2',
        event_id: 'event-123',
        normalized_payload: {
          metadata: {
            confidence_scores: {
              name: 0.45,
              composition: 0.25, // Below 0.3 = critical
              category: 0.68,
            },
          },
        },
        status: 'completed',
      },
      {
        id: 'ss-3',
        event_id: 'event-123',
        normalized_payload: {
          metadata: {
            confidence_scores: {
              name: 0.92,
              composition: 0.85,
            },
          },
        },
        status: 'completed',
      },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ data: mockScanSessions, error: null })),
        })),
      })),
    } as any)

    const quality = await getExtractionQuality('event-123')

    expect(quality.total_extractions).toBe(3)
    expect(quality.low_confidence_count).toBe(1) // 1 field below 0.5 but above 0.3 (name=0.45)
    expect(quality.critical_confidence_count).toBe(1) // 1 field below 0.3 threshold (composition=0.25)
    expect(quality.average_confidence).toBeCloseTo(0.72, 1) // Average of all scores

    // Check field confidence with approximate values
    expect(quality.field_confidence.name.avg).toBeCloseTo(0.77, 1)
    expect(quality.field_confidence.name.min).toBe(0.45)
    expect(quality.field_confidence.name.max).toBe(0.95)
    expect(quality.field_confidence.name.count).toBe(3)

    expect(quality.field_confidence.composition.avg).toBeCloseTo(0.66, 1)
    expect(quality.field_confidence.composition.min).toBe(0.25)
    expect(quality.field_confidence.composition.max).toBe(0.88)
    expect(quality.field_confidence.composition.count).toBe(3)

    expect(quality.field_confidence.category.avg).toBeCloseTo(0.70, 1)
    expect(quality.field_confidence.category.count).toBe(2)
  })

  it('should return empty metrics when event has no extractions', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    } as any)

    const quality = await getExtractionQuality('event-123')

    expect(quality).toEqual({
      total_extractions: 0,
      low_confidence_count: 0,
      critical_confidence_count: 0,
      average_confidence: 0,
      field_confidence: {},
    })
  })

  it('should handle extractions without confidence scores', async () => {
    const mockScanSessions = [
      {
        id: 'ss-1',
        event_id: 'event-123',
        normalized_payload: {
          metadata: {},
        },
        status: 'completed',
      },
      {
        id: 'ss-2',
        event_id: 'event-123',
        normalized_payload: {
          metadata: {
            confidence_scores: {
              name: 0.85,
            },
          },
        },
        status: 'completed',
      },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ data: mockScanSessions, error: null })),
        })),
      })),
    } as any)

    const quality = await getExtractionQuality('event-123')

    expect(quality.total_extractions).toBe(2)
    expect(quality.average_confidence).toBe(0.85)
    expect(quality.field_confidence).toEqual({
      name: { avg: 0.85, min: 0.85, max: 0.85, count: 1 },
    })
  })
})
