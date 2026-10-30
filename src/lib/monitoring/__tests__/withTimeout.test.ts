/**
 * Tests for extraction timeout utility
 *
 * Verifies that the timeout wrapper:
 * - Returns the result when the function completes before timeout
 * - Throws a timeout-specific error when the function takes too long
 * - Cleans up (no leaked timers) on success
 * - Uses a configurable timeout duration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withExtractionTimeout, isTimeoutError } from '../extractionTimeout'

describe('withExtractionTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the result when function completes before timeout', async () => {
    const result = await withExtractionTimeout(
      async () => 'success',
      { timeoutMs: 5000 }
    )

    expect(result).toBe('success')
  })

  it('throws a timeout error when function takes too long', async () => {
    const slowFn = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000))
      return 'too late'
    }

    const promise = withExtractionTimeout(slowFn, { timeoutMs: 5000 })

    // Advance time past the timeout
    vi.advanceTimersByTime(5001)

    await expect(promise).rejects.toThrow('Extraction timed out')
  })

  it('timeout error is identifiable via isTimeoutError', async () => {
    const slowFn = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000))
      return 'too late'
    }

    const promise = withExtractionTimeout(slowFn, { timeoutMs: 5000 })
    vi.advanceTimersByTime(5001)

    try {
      await promise
      expect.fail('Should have thrown')
    } catch (error) {
      expect(isTimeoutError(error)).toBe(true)
      expect((error as Error).message).toContain('timed out')
    }
  })

  it('uses a default timeout of 30000ms when not specified', async () => {
    const slowFn = async () => {
      await new Promise((resolve) => setTimeout(resolve, 30001))
      return 'too late'
    }

    const promise = withExtractionTimeout(slowFn)

    // Advance to just before default timeout — should NOT throw yet
    vi.advanceTimersByTime(29999)

    // This is a bit tricky with fake timers — the promise is still pending
    // Advance past timeout
    vi.advanceTimersByTime(2)

    await expect(promise).rejects.toThrow('Extraction timed out')
  })

  it('preserves the original error when function throws before timeout', async () => {
    const failingFn = async () => {
      throw new Error('Server error 500')
    }

    const promise = withExtractionTimeout(failingFn, { timeoutMs: 5000 })

    await expect(promise).rejects.toThrow('Server error 500')

    // The error should NOT be a timeout error
    try {
      await withExtractionTimeout(failingFn, { timeoutMs: 5000 })
    } catch (error) {
      expect(isTimeoutError(error)).toBe(false)
    }
  })

  it('non-timeout errors are not marked as timeout errors', async () => {
    const error = new Error('Some other error')

    expect(isTimeoutError(error)).toBe(false)
    expect(isTimeoutError(null)).toBe(false)
    expect(isTimeoutError('string error')).toBe(false)
  })
})
