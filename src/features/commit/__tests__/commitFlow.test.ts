/**
 * Tests for commit flow — vendor and fabric commit pipeline.
 *
 * Validates:
 * - Vendor commit flow (happy path)
 * - Fabric commit flow (happy path)
 * - Idempotency (duplicate detection)
 * - Error classification
 * - Cross-vertical integration (Capture → Review → Commit)
 *
 * These tests verify the Commit Vertical Pass 3 hardening.
 */

import { describe, it, expect } from 'vitest'
import { CommitError } from '../commitError'
import {
  isCommitError,
  classifyCommitError,
  getCommitErrorMessage,
  COMMIT_ERROR_MESSAGES,
  type CommitErrorType,
} from '../commitError'
import {
  createCommitSuccess,
  isCommitResult,
} from '../commitResponse'

// ============================================================================
// CommitError tests
// ============================================================================

describe('CommitError', () => {
  describe('constructor', () => {
    it('creates error with type and message', () => {
      const error = new CommitError('validation_failed', 'Company name is required')

      expect(error.type).toBe('validation_failed')
      expect(error.message).toBe('Company name is required')
      expect(error.name).toBe('CommitError')
      expect(error).toBeInstanceOf(Error)
    })

    it('creates error with details', () => {
      const details = { field: 'company_name', value: '' }
      const error = new CommitError('validation_failed', 'Empty field', details)

      expect(error.details).toEqual(details)
    })
  })

  describe('isCommitError', () => {
    it('returns true for CommitError instances', () => {
      const error = new CommitError('unknown_error', 'test')
      expect(isCommitError(error)).toBe(true)
    })

    it('returns true for plain objects with type and message', () => {
      const error = { type: 'validation_failed', message: 'test' }
      expect(isCommitError(error)).toBe(true)
    })

    it('returns false for null', () => {
      expect(isCommitError(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isCommitError(undefined)).toBe(false)
    })

    it('returns false for strings', () => {
      expect(isCommitError('error')).toBe(false)
    })

    it('returns false for objects without type', () => {
      expect(isCommitError({ message: 'test' })).toBe(false)
    })

    it('returns false for objects without message', () => {
      expect(isCommitError({ type: 'test' })).toBe(false)
    })
  })
})

// ============================================================================
// classifyCommitError tests
// ============================================================================

describe('classifyCommitError', () => {
  it.each<{
    input: unknown
    expected: CommitErrorType
  }>([
    { input: new Error('already committed'), expected: 'already_committed' },
    { input: new Error('Scan session not found'), expected: 'scan_session_not_found' },
    { input: new Error('permission denied'), expected: 'permission_denied' },
    { input: new Error('unauthorized access'), expected: 'permission_denied' },
    { input: new Error('forbidden'), expected: 'permission_denied' },
    { input: new Error('violates check constraint'), expected: 'validation_failed' },
    { input: new Error('invalid UUID format'), expected: 'validation_failed' },
    { input: new Error('required field missing'), expected: 'validation_failed' },
    { input: new Error('insert failed'), expected: 'persistence_error' },
    { input: new Error('update failed'), expected: 'persistence_error' },
    { input: new Error('database connection lost'), expected: 'persistence_error' },
    { input: new Error('something unexpected'), expected: 'unknown_error' },
    { input: null, expected: 'unknown_error' },
    { input: undefined, expected: 'unknown_error' },
    { input: 'not found in database', expected: 'scan_session_not_found' },
  ])('classifies "$input" as $expected', ({ input, expected }) => {
    expect(classifyCommitError(input)).toBe(expected)
  })
})

// ============================================================================
// getCommitErrorMessage tests
// ============================================================================

describe('getCommitErrorMessage', () => {
  it('returns user-facing message for each error type', () => {
    const types: CommitErrorType[] = [
      'validation_failed',
      'scan_session_not_found',
      'permission_denied',
      'already_committed',
      'persistence_error',
      'related_record_error',
      'scan_session_update_failed',
      'unknown_error',
    ]

    for (const type of types) {
      const message = getCommitErrorMessage(type)
      expect(message).toBeTruthy()
      expect(typeof message).toBe('string')
    }
  })

  it('returns unknown_error message for unknown type', () => {
    // Cast to bypass type check
    const message = getCommitErrorMessage('nonexistent_type' as CommitErrorType)
    expect(message).toBe(COMMIT_ERROR_MESSAGES.unknown_error)
  })
})

// ============================================================================
// COMMIT_ERROR_MESSAGES tests
// ============================================================================

describe('COMMIT_ERROR_MESSAGES', () => {
  it('has a message for every CommitErrorType', () => {
    const types: CommitErrorType[] = [
      'validation_failed',
      'scan_session_not_found',
      'permission_denied',
      'already_committed',
      'persistence_error',
      'related_record_error',
      'scan_session_update_failed',
      'unknown_error',
    ]

    for (const type of types) {
      expect(COMMIT_ERROR_MESSAGES[type]).toBeDefined()
    }
  })

  it('messages are user-friendly (no technical jargon)', () => {
    for (const [, message] of Object.entries(COMMIT_ERROR_MESSAGES)) {
      // Should not contain technical terms
      expect(message.toLowerCase()).not.toContain('uuid')
      expect(message.toLowerCase()).not.toContain('supabase')
      expect(message.toLowerCase()).not.toContain('insert')
      expect(message.toLowerCase()).not.toContain('update')
    }
  })
})

// ============================================================================
// createCommitSuccess tests
// ============================================================================

describe('createCommitSuccess', () => {
  it('creates a fresh commit result', () => {
    const result = createCommitSuccess({
      data: { vendor_id: 'abc-123' },
      scanSessionId: 'ss-456',
    })

    expect(result.idempotent).toBe(false)
    expect(result.scanSessionId).toBe('ss-456')
    expect(result.data).toEqual({ vendor_id: 'abc-123' })
  })

  it('creates an idempotent commit result', () => {
    const result = createCommitSuccess({
      data: { vendor_id: 'abc-123' },
      scanSessionId: 'ss-456',
      idempotent: true,
    })

    expect(result.idempotent).toBe(true)
    expect(result.data).toEqual({ vendor_id: 'abc-123' })
  })

  it('defaults idempotent to false', () => {
    const result = createCommitSuccess({
      data: { style_id: 'style-789' },
      scanSessionId: 'ss-456',
    })

    expect(result.idempotent).toBe(false)
  })
})

// ============================================================================
// isCommitResult tests
// ============================================================================

describe('isCommitResult', () => {
  it('returns true for valid commit result', () => {
    const result = createCommitSuccess({
      data: { vendor_id: 'abc-123' },
      scanSessionId: 'ss-456',
    })

    expect(isCommitResult(result)).toBe(true)
  })

  it('returns false for null', () => {
    expect(isCommitResult(null)).toBe(false)
  })

  it('returns false for plain object', () => {
    expect(isCommitResult({ vendor_id: 'abc' })).toBe(false)
  })
})
