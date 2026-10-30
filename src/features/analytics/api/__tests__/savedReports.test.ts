/**
 * Saved Reports API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client - define inline to avoid hoisting issues
vi.mock('@/lib/supabase/client', () => {
  const mockChain: any = {
    select: vi.fn(function(this: any) { return mockChain }),
    insert: vi.fn(function(this: any) { return mockChain }),
    update: vi.fn(function(this: any) { return mockChain }),
    eq: vi.fn(function(this: any) { return mockChain }),
    order: vi.fn(function(this: any) { return mockChain }),
    single: vi.fn(function(this: any) { return mockChain }),
  }
  return {
    supabase: {
      from: vi.fn(function(this: any) { return mockChain }),
    },
  }
})

import { supabase } from '@/lib/supabase/client'
import {
  saveReport,
  getSavedReports,
  getReportById,
  deleteReport,
} from '../savedReports'

describe('savedReports API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('saveReport', () => {
    it('should insert a new report', async () => {
      const mockReport = {
        id: 'report-1',
        name: 'My Report',
        description: 'Test report',
        user_id: 'user-1',
        event_id: 'event-1',
        config: { dimensions: ['vendor'], metrics: ['count'] },
        report_type: 'custom',
        schedule_interval: null,
        schedule_recipient: null,
        last_scheduled_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      }

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockReport,
              error: null,
            } as never),
          }),
        }),
      } as any)

      const result = await saveReport({
        name: 'My Report',
        description: 'Test report',
        config: { dimensions: ['vendor'], metrics: ['count'], filters: [] },
        report_type: 'custom',
        event_id: 'event-1',
        schedule_interval: null,
        schedule_recipient: null,
        last_scheduled_at: null,
      } as any)

      expect(result).toEqual(mockReport)
      expect(supabase.from).toHaveBeenCalledWith('saved_reports')
    })

    it('should throw on insert error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            } as never),
          }),
        }),
      } as any)

      await expect(
        saveReport({
          name: 'My Report',
          description: 'Test',
          config: { dimensions: [], metrics: [], filters: [] },
          report_type: 'custom',
          event_id: null,
          schedule_interval: null,
          schedule_recipient: null,
          last_scheduled_at: null,
        } as any)
      ).rejects.toThrow('Failed to save report: Insert failed')
    })
  })

  describe('getSavedReports', () => {
    it('should fetch all saved reports for user', async () => {
      const mockReports = [
        { id: 'report-1', name: 'Report 1' },
        { id: 'report-2', name: 'Report 2' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockReports,
            error: null,
          } as never),
        }),
      } as any)

      const result = await getSavedReports()

      expect(result).toEqual(mockReports)
      expect(supabase.from).toHaveBeenCalledWith('saved_reports')
    })

    it('should filter by event_id when provided', async () => {
      const emptyResult = Promise.resolve({
        data: [],
        error: null,
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => emptyResult),
          })),
          order: vi.fn(() => emptyResult),
        })),
      } as any)

      const result = await getSavedReports('event-1')

      expect(result).toEqual([])
      expect(supabase.from).toHaveBeenCalledWith('saved_reports')
    })
  })

  describe('getReportById', () => {
    it('should fetch a single report by id', async () => {
      const mockReport = {
        id: 'report-1',
        name: 'My Report',
        config: { dimensions: ['vendor'], metrics: ['count'] },
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockReport,
              error: null,
            } as never),
          }),
        }),
      } as any)

      const result = await getReportById('report-1')

      expect(result).toEqual(mockReport)
    })

    it('should return null if report not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            } as never),
          }),
        }),
      } as any)

      const result = await getReportById('report-1')

      expect(result).toBeNull()
    })
  })

  describe('deleteReport', () => {
    it('should soft delete a report', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'report-1', deleted_at: '2024-01-01T00:00:00Z' },
              error: null,
            } as never),
          }),
        }),
      } as any)

      await deleteReport('report-1')

      expect(supabase.from).toHaveBeenCalledWith('saved_reports')
    })

    it('should throw on delete error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Delete failed' },
            } as never),
          }),
        }),
      } as any)

      await expect(deleteReport('report-1')).rejects.toThrow(
        'Failed to delete report: Delete failed'
      )
    })
  })
})
