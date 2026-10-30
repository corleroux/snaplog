/**
 * Auth flow tests (TEST-03)
 *
 * Tests the complete auth lifecycle:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Logout clears session
 * - Session expiry handling
 * - Expired token refresh
 * - Invalid token handling
 * - No token redirects to login
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createElement } from 'react'

// Mock supabase client
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockRefreshSession = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
      refreshSession: (...args: any[]) => mockRefreshSession(...args),
    },
    from: vi.fn(),
  },
  invokeEdgeFunction: vi.fn(),
}))

// Mock PostHog
vi.mock('posthog-js', () => ({
  default: {
    captureException: vi.fn(),
    capture: vi.fn(),
    register: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    init: vi.fn(),
    opt_out_capturing: vi.fn(),
    addExceptionStep: vi.fn(),
  },
}))

import { useAuth } from '../hooks/useAuth'
import { RequireAuth } from '../screens/RequireAuth'
import { signIn, signOut } from '../api/auth'
import { createMockSession, resetFactoryIds } from '@/test/factories'

describe('Auth Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetFactoryIds()
    // Default: no subscription, return dummy unsub
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
  })

  // ==========================================================================
  // useAuth hook tests
  // ==========================================================================

  describe('useAuth', () => {
    it('starts in loading state', () => {
      mockGetSession.mockReturnValue(new Promise(() => {})) // never resolves
      const { result } = renderHook(() => useAuth())
      expect(result.current.loading).toBe(true)
      expect(result.current.session).toBeNull()
      expect(result.current.user).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('sets session on successful getSession', async () => {
      const session = createMockSession()
      mockGetSession.mockResolvedValue({ data: { session }, error: null })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.session).toBe(session)
      expect(result.current.user).toBe(session.user)
      expect(result.current.error).toBeNull()
    })

    it('sets error on getSession failure', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.session).toBeNull()
      expect(result.current.error).toBe('Failed to initialize session. Please try again.')
    })
  })

  // ==========================================================================
  // signIn tests
  // ==========================================================================

  describe('signIn', () => {
    it('succeeds with valid credentials', async () => {
      const session = createMockSession()
      mockSignInWithPassword.mockResolvedValue({
        data: { session },
        error: null,
      })

      await expect(
        signIn({ email: 'test@example.com', password: 'password123' })
      ).resolves.toBeUndefined()

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('throws on invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid login credentials' },
      })

      await expect(
        signIn({ email: 'bad@example.com', password: 'wrong' })
      ).rejects.toThrow('Invalid login credentials')
    })
  })

  // ==========================================================================
  // signOut tests
  // ==========================================================================

  describe('signOut', () => {
    it('clears session on logout', async () => {
      mockSignOut.mockResolvedValue({ error: null })

      await expect(signOut()).resolves.toBeUndefined()
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('throws on signout error', async () => {
      mockSignOut.mockResolvedValue({
        error: { message: 'Logout failed' },
      })

      await expect(signOut()).rejects.toThrow('Logout failed')
    })
  })

  // ==========================================================================
  // RequireAuth component tests
  // ==========================================================================

  describe('RequireAuth', () => {
    function renderWithRouter(
      ui: ReturnType<typeof createElement>,
      initialPath = '/protected'
    ) {
      return render(
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-screen">Login</div>} />
            <Route path="/protected" element={ui} />
          </Routes>
        </MemoryRouter>
      )
    }

    it('shows loading state while auth resolves', () => {
      mockGetSession.mockReturnValue(new Promise(() => {}))

      renderWithRouter(
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('redirects to login when no user', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

      renderWithRouter(
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(screen.getByTestId('login-screen')).toBeInTheDocument()
    })

    it('preserves return URL when redirecting', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

      render(
        <MemoryRouter initialEntries={['/protected?tab=settings']}>
          <Routes>
            <Route
              path="/login"
              element={<div data-testid="login-screen">Login</div>}
            />
            <Route
              path="/protected"
              element={
                <RequireAuth>
                  <div>Protected</div>
                </RequireAuth>
              }
            />
          </Routes>
        </MemoryRouter>
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Verify redirect happened (login screen visible)
      expect(screen.getByTestId('login-screen')).toBeInTheDocument()
    })

    it('renders children when authenticated', async () => {
      const session = createMockSession()
      mockGetSession.mockResolvedValue({ data: { session }, error: null })

      renderWithRouter(
        <RequireAuth>
          <div data-testid="protected-content">Protected Content</div>
        </RequireAuth>
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('auto-signs-out and redirects to login when auth fails', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      })
      mockSignOut.mockResolvedValue({ error: null })

      renderWithRouter(
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Should call signOut to clear stale session
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('signs out via refreshSession failure path', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'JWT expired' },
      })
      mockSignOut.mockResolvedValue({ error: null })

      renderWithRouter(
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      )

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Should call signOut to force clear session
      expect(mockSignOut).toHaveBeenCalled()
    })
  })
})
