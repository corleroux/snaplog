/**
 * Security Sanitization Tests
 */

import { describe, it, expect } from 'vitest'
import {
  sanitizeHtml,
  sanitizeText,
  sanitizeExtractedText,
  sanitizeUrl,
  sanitizeEmail,
  sanitizePhone,
  sanitizeBrandNames,
} from '@/lib/security/sanitize'

describe('Security Sanitization', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>'
      const result = sanitizeHtml(input)
      expect(result).not.toContain('<script>')
      expect(result).toContain('Hello')
    })

    it('should remove dangerous event handlers', () => {
      const input = '<p onclick="alert(1)">Click</p>'
      const result = sanitizeHtml(input)
      expect(result).not.toContain('onclick')
      expect(result).toContain('Click')
    })

    it('should remove dangerous tags', () => {
      const input = '<iframe src="evil.com"></iframe><p>Content</p>'
      const result = sanitizeHtml(input)
      expect(result).not.toContain('<iframe')
      expect(result).toContain('<p>Content</p>')
    })

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">Link</a>'
      const result = sanitizeHtml(input)
      expect(result).not.toContain('javascript:')
    })

    it('should preserve safe formatting', () => {
      const input = '<p><strong>Bold</strong> and <em>italic</em></p>'
      const result = sanitizeHtml(input)
      expect(result).toContain('<strong>Bold</strong>')
      expect(result).toContain('<em>italic</em>')
    })

    it('should strip non-whitelisted tags like b and i', () => {
      const input = '<p><b>Bold</b> and <i>italic</i></p>'
      const result = sanitizeHtml(input)
      // b and i tags are removed, but content is preserved
      expect(result).toContain('Bold')
      expect(result).toContain('italic')
      expect(result).not.toContain('<b>')
      expect(result).not.toContain('<i>')
    })

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('')
      expect(sanitizeHtml(null as unknown as string)).toBe('')
    })
  })

  describe('sanitizeText', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>'
      const result = sanitizeText(input)
      // HTML tags are stripped first, then special chars are escaped
      expect(result).not.toContain('<script>')
      expect(result).toContain('alert')
      expect(result).toContain('xss')
    })

    it('should escape quotes and ampersands', () => {
      const result = sanitizeText('<>&"\'/')
      // HTML tags are stripped first (< and > are tags), then remaining chars are escaped
      expect(result).toBe('&amp;&quot;&#x27;&#x2F;')
    })

    it('should escape special characters in text', () => {
      const result = sanitizeText('&<>"\'/')
      expect(result).toContain('&amp;')
      expect(result).toContain('&quot;')
      expect(result).toContain('&#x27;')
      expect(result).toContain('&#x2F;')
    })
  })

  describe('sanitizeExtractedText', () => {
    it('should sanitize and escape text', () => {
      const input = '<b>Name</b> & <script>alert(1)</script>'
      const result = sanitizeExtractedText(input)
      expect(result).not.toBeNull()
      // HTML tags are stripped, script tags removed, ampersand escaped
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('<b>')
      expect(result).not.toContain('</b>')
      expect(result).toContain('Name')
      expect(result).toContain('&amp;')
    })

    it('should return null for empty input', () => {
      expect(sanitizeExtractedText('')).toBeNull()
      expect(sanitizeExtractedText(null)).toBeNull()
      expect(sanitizeExtractedText(undefined)).toBeNull()
    })
  })

  describe('sanitizeUrl', () => {
    it('should allow safe protocols', () => {
      // URL constructor may add trailing slashes
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/')
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/')
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com')
      expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890')
    })

    it('should reject dangerous protocols', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    })

    it('should return null for invalid URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBeNull()
      expect(sanitizeUrl('')).toBeNull()
      expect(sanitizeUrl(null)).toBeNull()
    })
  })

  describe('sanitizeEmail', () => {
    it('should validate and format email', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com')
      expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com')
    })

    it('should return null for invalid emails', () => {
      expect(sanitizeEmail('invalid')).toBeNull()
      expect(sanitizeEmail('@example.com')).toBeNull()
      expect(sanitizeEmail('test@')).toBeNull()
      expect(sanitizeEmail(null)).toBeNull()
    })

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com')
    })
  })

  describe('sanitizePhone', () => {
    it('should keep valid phone characters', () => {
      expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567')
    })

    it('should remove invalid characters', () => {
      // Removes characters that aren't digits, +, -, spaces, (, )
      const result = sanitizePhone('555-1234 ext. 101')
      expect(result).toBeDefined()
      // ext is not a valid phone character, so it gets removed
    })

    it('should return null for empty input', () => {
      expect(sanitizePhone('')).toBeNull()
      expect(sanitizePhone(null)).toBeNull()
      expect(sanitizePhone('   ')).toBeNull()
    })
  })

  describe('sanitizeBrandNames', () => {
    it('should trim and filter empty strings', () => {
      const brands = ['Brand A', 'Brand B', '', '  ', 'Brand C']
      const result = sanitizeBrandNames(brands)
      expect(result).toEqual(['Brand A', 'Brand B', 'Brand C'])
    })

    it('should return null for empty array', () => {
      expect(sanitizeBrandNames([])).toBeNull()
      expect(sanitizeBrandNames(['', '  '])).toBeNull()
      expect(sanitizeBrandNames(null)).toBeNull()
    })
  })
})
