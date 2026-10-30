/**
 * Auth Validation Schema Tests
 *
 * Tests Zod validation schemas for:
 * - loginSchema (email + password)
 * - signupSchema (email + password + confirmPassword + fullName)
 * - forgotPasswordSchema (email)
 * - resetPasswordSchema (password + confirmPassword)
 */

import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validation'

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email')
    }
  })

  it('rejects short password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('8 characters')
    }
  })

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('signupSchema', () => {
  const validSignup = {
    email: 'user@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    fullName: 'John Doe',
  }

  it('accepts valid signup data', () => {
    const result = signupSchema.safeParse(validSignup)
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      confirmPassword: 'different',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmError = result.error.issues.find(e => e.path.includes('confirmPassword'))
      expect(confirmError?.message).toBe('Passwords do not match')
    }
  })

  it('rejects empty name', () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      fullName: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find(e => e.path.includes('fullName'))
      expect(nameError?.message).toContain('name')
    }
  })

  it('rejects invalid email', () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      email: 'bad-email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password: 'short',
      confirmPassword: 'short',
    })
    expect(result.success).toBe(false)
  })
})

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    const result = forgotPasswordSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('accepts matching passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'newPassword123',
      confirmPassword: 'newPassword123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'newPassword123',
      confirmPassword: 'different',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmError = result.error.issues.find(e => e.path.includes('confirmPassword'))
      expect(confirmError?.message).toBe('Passwords do not match')
    }
  })

  it('rejects short password', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'short',
      confirmPassword: 'short',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('8 characters')
    }
  })
})
