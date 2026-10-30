/**
 * Signup and Password Reset Flow Tests
 *
 * Tests the auth API functions not covered by authFlow.test.tsx:
 * - signUp success and failure
 * - resetPassword success and failure
 * - updatePassword success and failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSignUp = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockUpdateUser = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: (...args: any[]) => mockSignUp(...args),
      resetPasswordForEmail: (...args: any[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: any[]) => mockUpdateUser(...args),
    },
    from: vi.fn(),
  },
}))

import { signUp, resetPassword, updatePassword } from '../api/auth'

describe('signUp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('succeeds with valid data', async () => {
    const mockData = { user: { id: 'user-1', email: 'test@example.com' }, session: null }
    mockSignUp.mockResolvedValue({ data: mockData, error: null })

    const result = await signUp({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      fullName: 'Test User',
    })

    expect(result).toEqual(mockData)
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: { data: { full_name: 'Test User' } },
    })
  })

  it('throws on duplicate email', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    })

    await expect(
      signUp({ email: 'existing@example.com', password: 'password123', confirmPassword: 'password123', fullName: 'Test' })
    ).rejects.toThrow('User already registered')
  })

  it('throws on weak password', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Password is too weak' },
    })

    await expect(
      signUp({ email: 'test@example.com', password: 'short', confirmPassword: 'short', fullName: 'Test' })
    ).rejects.toThrow('Password is too weak')
  })
})

describe('resetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('succeeds with valid email', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null })

    await expect(resetPassword('test@example.com')).resolves.toBeUndefined()

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/reset-password'),
      })
    )
  })

  it('throws on invalid email', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      error: { message: 'Email not found' },
    })

    await expect(resetPassword('nonexistent@example.com')).rejects.toThrow('Email not found')
  })

  it('throws on network error', async () => {
    mockResetPasswordForEmail.mockRejectedValue(new Error('Network error'))

    await expect(resetPassword('test@example.com')).rejects.toThrow('Network error')
  })
})

describe('updatePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('succeeds with valid password', async () => {
    mockUpdateUser.mockResolvedValue({ error: null })

    await expect(updatePassword('newSecurePassword123')).resolves.toBeUndefined()

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newSecurePassword123' })
  })

  it('throws on weak password', async () => {
    mockUpdateUser.mockResolvedValue({
      error: { message: 'Password is too weak' },
    })

    await expect(updatePassword('short')).rejects.toThrow('Password is too weak')
  })

  it('throws when session expired', async () => {
    mockUpdateUser.mockResolvedValue({
      error: { message: 'Session expired' },
    })

    await expect(updatePassword('newPassword123')).rejects.toThrow('Session expired')
  })
})
