/**
 * Input Sanitization Utilities
 *
 * Provides comprehensive input sanitization to prevent:
 * - XSS attacks via script injection
 * - SQL injection (when used with raw queries)
 * - Path traversal attacks
 * - Header injection
 * - HTML/Markdown injection in text fields
 *
 * All user input should be sanitized before:
 * - Displaying in UI (XSS prevention)
 * - Storing in database (data integrity)
 * - Using in file paths (path traversal prevention)
 * - Using in API calls (header injection prevention)
 */

import { createLogger } from '@/lib/logger'

const logger = createLogger('InputSanitization')

/**
 * HTML tag allowlist for basic rich text.
 * Only safe formatting tags are allowed.
 */
const HTML_ALLOWLIST = {
  tags: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  attributes: {
    a: ['href', 'title'],
    '*': ['class'], // Allow class on all elements for styling
  },
}

/**
 * Sanitize HTML to prevent XSS attacks.
 *
 * Removes all tags except safe formatting tags, and removes
 * dangerous attributes like onclick, onerror, etc.
 *
 * @param html - Raw HTML string
 * @param options - Sanitization options
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(
  html: string,
  options: { allowList?: typeof HTML_ALLOWLIST; stripAll?: boolean } = {}
): string {
  const { allowList = HTML_ALLOWLIST, stripAll = false } = options

  if (!html || typeof html !== 'string') {
    return ''
  }

  // Strip all HTML if requested
  if (stripAll) {
    return html.replace(/<[^>]*>/g, '')
  }

  // Basic XSS prevention - remove dangerous patterns
  let sanitized = html

  // Remove script tags and content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '')

  // Remove data: protocol (except images)
  sanitized = sanitized.replace(/data:(?!image\/)/gi, '')

  // Remove vbscript: protocol
  sanitized = sanitized.replace(/vbscript:/gi, '')

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')

  // Remove object/embed tags
  sanitized = sanitized.replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')

  // Remove style tags with content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // Remove meta tags
  sanitized = sanitized.replace(/<meta\b[^>]*>/gi, '')

  // Remove link tags
  sanitized = sanitized.replace(/<link\b[^>]*>/gi, '')

  // Allow only safe tags
  const allowedTags = allowList.tags.join('|')
  const tagPattern = new RegExp(`<(?!\/?(?:${allowedTags})\\b)[^>]*>`, 'gi')
  sanitized = sanitized.replace(tagPattern, '')

  return sanitized.trim()
}

/**
 * Strip all HTML tags from a string.
 *
 * @param html - HTML string
 * @returns Plain text without HTML tags
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  return html.replace(/<[^>]*>/g, '').trim()
}

/**
 * Sanitize a text field for display.
 *
 * Removes HTML tags and escapes special characters.
 *
 * @param text - Raw text input
 * @returns Sanitized text safe for display
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  // First strip HTML tags
  let sanitized = stripHtml(text)

  // Escape HTML special characters
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  sanitized = sanitized.replace(/[&<>"'/]/g, (char) => escapeMap[char] || char)

  return sanitized
}

/**
 * Sanitize a string for use in a file path.
 *
 * Prevents path traversal attacks by removing dangerous characters
 * and patterns.
 *
 * @param input - Raw input string
 * @param options - Sanitization options
 * @returns Safe string for file paths
 */
export function sanitizePath(
  input: string,
  options: { maxLength?: number; replacement?: string } = {}
): string {
  const { maxLength = 255, replacement = '-' } = options

  if (!input || typeof input !== 'string') {
    return ''
  }

  let sanitized = input

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Remove path traversal patterns
  sanitized = sanitized.replace(/\.\./g, '')
  sanitized = sanitized.replace(/~/g, '')

  // Remove path separators
  sanitized = sanitized.replace(/[\/\\]/g, replacement)

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')

  // Remove other dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '')

  // Replace multiple consecutive replacements with single
  sanitized = sanitized.replace(new RegExp(`${replacement}+`, 'g'), replacement)

  // Trim and limit length
  sanitized = sanitized.trim().slice(0, maxLength)

  // Remove leading/trailing replacements and dots
  sanitized = sanitized.replace(new RegExp(`^[${replacement}.]+`), '')
  sanitized = sanitized.replace(new RegExp(`[${replacement}.]+$`), '')

  return sanitized || 'unnamed'
}

/**
 * Sanitize a filename.
 *
 * Like sanitizePath but preserves file extensions.
 *
 * @param filename - Raw filename
 * @param options - Sanitization options
 * @returns Safe filename
 */
export function sanitizeFilename(
  filename: string,
  options: { maxLength?: number; preserveExtension?: boolean } = {}
): string {
  const { maxLength = 255, preserveExtension = true } = options

  if (!filename || typeof filename !== 'string') {
    return ''
  }

  let extension = ''
  let name = filename

  // Extract extension if preserving
  if (preserveExtension) {
    const lastDot = filename.lastIndexOf('.')
    if (lastDot > 0) {
      extension = filename.slice(lastDot)
      name = filename.slice(0, lastDot)
    }
  }

  // Sanitize the name portion
  const sanitizedName = sanitizePath(name, { maxLength: maxLength - extension.length })

  return sanitizedName + extension
}

/**
 * Sanitize email address.
 *
 * Removes dangerous characters while preserving valid email format.
 *
 * @param email - Raw email input
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: string | null): string | null {
  if (!email || typeof email !== 'string') {
    return null
  }

  const sanitized = email.trim().toLowerCase()

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(sanitized)) {
    logger.warn('Invalid email format', { email: sanitized.substring(0, 50) })
    return null
  }

  return sanitized
}

/**
 * Sanitize URL.
 *
 * Ensures URL uses safe protocol (http, https, mailto) and removes
 * dangerous components.
 *
 * @param url - Raw URL input
 * @param allowedProtocols - Allowed URL protocols
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(
  url: string | null,
  allowedProtocols: string[] = ['http:', 'https:', 'mailto:', 'tel:']
): string | null {
  if (!url || typeof url !== 'string') {
    return null
  }

  const sanitized = url.trim()

  try {
    const parsed = new URL(sanitized)

    // Check protocol
    if (!allowedProtocols.includes(parsed.protocol)) {
      logger.warn('Blocked URL with unsafe protocol', { protocol: parsed.protocol })
      return null
    }

    // Remove user/password components
    parsed.username = ''
    parsed.password = ''

    // Remove fragment (can be used for XSS)
    parsed.hash = ''

    return parsed.toString()
  } catch {
    // Invalid URL
    logger.warn('Invalid URL format', { url: sanitized.substring(0, 50) })
    return null
  }
}

/**
 * Sanitize phone number.
 *
 * Removes all non-numeric characters except +, -, (, ).
 *
 * @param phone - Raw phone input
 * @returns Sanitized phone number or null if empty
 */
export function sanitizePhone(phone: string | null): string | null {
  if (!phone || typeof phone !== 'string') {
    return null
  }

  // Keep only digits, +, -, (, ), and space
  const sanitized = phone.replace(/[^\d\+\-\(\)\s]/g, '').trim()

  // Return null if result is empty
  return sanitized || null
}

/**
 * Sanitize numeric input.
 *
 * Removes all non-numeric characters except decimal point and minus sign.
 *
 * @param input - Raw input
 * @param options - Options
 * @returns Sanitized numeric string or NaN
 */
export function sanitizeNumeric(
  input: string,
  options: { allowDecimal?: boolean; allowNegative?: boolean } = {}
): string {
  const { allowDecimal = true, allowNegative = true } = options

  if (!input || typeof input !== 'string') {
    return ''
  }

  let sanitized = input

  // Remove all characters except digits, decimal, minus
  sanitized = sanitized.replace(/[^\d.\-]/g, '')

  // Remove all but first decimal point
  if (allowDecimal) {
    const parts = sanitized.split('.')
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('')
    }
  } else {
    sanitized = sanitized.replace(/\./g, '')
  }

  // Remove all but leading minus
  if (!allowNegative) {
    sanitized = sanitized.replace(/-/g, '')
  } else {
    const parts = sanitized.split('-')
    sanitized = (parts[0] === '' ? '-' : '') + parts.join('')
  }

  return sanitized
}

/**
 * Sanitize JSON string.
 *
 * Attempts to parse and re-stringify JSON to ensure validity.
 *
 * @param json - JSON string
 * @returns Parsed and sanitized object, or null if invalid
 */
export function sanitizeJson<T = unknown>(json: string): T | null {
  if (!json || typeof json !== 'string') {
    return null
  }

  try {
    const parsed = JSON.parse(json)

    // Recursively sanitize strings in the object
    return sanitizeObject(parsed) as T
  } catch (err) {
    logger.warn('Invalid JSON', { error: String(err) })
    return null
  }
}

/**
 * Recursively sanitize strings in an object.
 *
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return sanitizeText(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize keys too
      const safeKey = sanitizePath(key, { replacement: '_' })
      sanitized[safeKey] = sanitizeObject(value)
    }
    return sanitized
  }

  return obj
}

/**
 * Sanitize user input for database queries.
 *
 * WARNING: This is NOT a replacement for parameterized queries.
 * Always use parameterized queries when possible.
 *
 * This provides basic SQL injection prevention for cases where
 * parameterized queries are not possible (e.g., dynamic SQL).
 *
 * @param input - Raw input
 * @returns Sanitized input safe for SQL literals
 */
export function sanitizeSql(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // Escape SQL special characters
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\x00/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z')
}

/**
 * Sanitize input for CSV export.
 *
 * Prevents CSV injection attacks by escaping special characters.
 *
 * @param input - Raw input
 * @returns Sanitized input safe for CSV
 */
export function sanitizeCsv(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  const sanitized = input

  // If input contains dangerous characters, wrap in quotes and escape quotes
  if (/^[=+\-@]/.test(sanitized) || /[,;\n"]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`
  }

  return sanitized
}

/**
 * Sanitize markdown content.
 *
 * Removes dangerous HTML from markdown while preserving safe formatting.
 *
 * @param markdown - Raw markdown
 * @returns Sanitized markdown
 */
export function sanitizeMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return ''
  }

  // Sanitize HTML in markdown (most markdown allows inline HTML)
  let sanitized = markdown

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove dangerous event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=/gi, ' on-removed=')

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, 'removed:')

  return sanitized
}

/**
 * Truncate text to maximum length with ellipsis.
 *
 * @param text - Input text
 * @param maxLength - Maximum length
 * @param options - Options
 * @returns Truncated text
 */
export function truncate(
  text: string,
  maxLength: number,
  options: { ellipsis?: string; breakWord?: boolean } = {}
): string {
  const { ellipsis = '...', breakWord = false } = options

  if (!text || text.length <= maxLength) {
    return text || ''
  }

  if (breakWord) {
    return text.slice(0, maxLength - ellipsis.length) + ellipsis
  }

  // Try to break at word boundary
  const truncated = text.slice(0, maxLength - ellipsis.length)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + ellipsis
  }

  return truncated + ellipsis
}

/**
 * Sanitize object keys for database storage.
 *
 * Ensures keys are valid identifiers and safe for use in database queries.
 *
 * @param key - Raw key
 * @returns Sanitized key
 */
export function sanitizeKey(key: string): string {
  if (!key || typeof key !== 'string') {
    return ''
  }

  // Remove all non-alphanumeric characters except underscore
  return key.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
}

/**
 * Sanitize text extracted from AI/OCR processing.
 *
 * This is specifically for text extracted from documents, cards, etc.
 * Returns null for empty/invalid input to distinguish from valid empty strings.
 *
 * @param text - Raw extracted text
 * @returns Sanitized text or null if input was empty/invalid
 */
export function sanitizeExtractedText(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') {
    return null
  }

  const sanitized = sanitizeText(text)

  // Return null if empty after sanitization
  return sanitized || null
}

/**
 * Sanitize array of brand names.
 *
 * Trims each brand name and filters out empty strings.
 * Returns null if the resulting array is empty.
 *
 * @param brands - Array of brand names
 * @returns Sanitized array or null if empty
 */
export function sanitizeBrandNames(brands: string[] | null): string[] | null {
  if (!brands || !Array.isArray(brands)) {
    return null
  }

  // Trim and filter empty strings
  const sanitized = brands
    .map(b => typeof b === 'string' ? b.trim() : '')
    .filter(b => b.length > 0)

  // Return null if no valid brands
  return sanitized.length > 0 ? sanitized : null
}
