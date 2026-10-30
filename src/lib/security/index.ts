/**
 * Security Module
 *
 * Input sanitization utilities for XSS, SQL injection, and path traversal
 * prevention. All user-facing input should be sanitized before display,
 * storage, or use in file paths.
 *
 * Usage: import { sanitizeText, sanitizeUrl } from '@/lib/security'
 */

export * from './sanitize'
