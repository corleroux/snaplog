/**
 * Storage URL Utility Tests
 *
 * Tests for storagePathToPublicUrl and isSignedUrl in storageUrls.ts
 */

import { describe, it, expect, vi } from 'vitest'
import { storagePathToPublicUrl, isSignedUrl } from '../storageUrls'

// Mock env to provide a stable Supabase URL
vi.mock('@/config/env', () => ({
  env: {
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-key',
  },
}))

describe('storagePathToPublicUrl', () => {
  it('constructs a public URL from a storage path', () => {
    const url = storagePathToPublicUrl('evt-123/capture.webp')
    expect(url).toBe('https://example.supabase.co/storage/v1/object/public/scan-originals/evt-123/capture.webp')
  })

  it('handles nested paths with vendor ID', () => {
    const url = storagePathToPublicUrl('evt-123/vendor-456/capture.webp')
    expect(url).toBe('https://example.supabase.co/storage/v1/object/public/scan-originals/evt-123/vendor-456/capture.webp')
  })

  it('handles paths with special characters', () => {
    const url = storagePathToPublicUrl('evt-123/capture-2024-01-01.webp')
    expect(url).toContain('/object/public/scan-originals/evt-123/capture-2024-01-01.webp')
  })
})

describe('isSignedUrl', () => {
  it('returns true for URLs with token= query param', () => {
    expect(isSignedUrl('https://example.supabase.co/storage/v1/object/sign/scan-originals/img.webp?token=abc123')).toBe(true)
  })

  it('returns false for public URLs without token', () => {
    expect(isSignedUrl('https://example.supabase.co/storage/v1/object/public/scan-originals/img.webp')).toBe(false)
  })

  it('returns false for regular URLs', () => {
    expect(isSignedUrl('https://example.com/img.jpg')).toBe(false)
  })

  it('returns false for invalid URLs', () => {
    expect(isSignedUrl('not-a-url')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isSignedUrl('')).toBe(false)
  })
})
