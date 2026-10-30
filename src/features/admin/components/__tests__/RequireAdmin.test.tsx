/**
 * RequireAdmin Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RequireAdmin } from '../RequireAdmin'
import { QueryProvider } from '@/app/QueryProvider'

const profileSelect = vi.fn()
const profileEq = vi.fn(() => ({ single: profileSelect }))
const profileFrom = vi.fn(() => ({ select: () => ({ eq: profileEq }) }))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
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

describe('RequireAdmin', () => {
  let supabase: any

  beforeEach(async () => {
    vi.clearAllMocks()
    profileSelect.mockReset()
    profileFrom.mockReset().mockReturnValue({ select: () => ({ eq: profileEq }) })

    const mod = await import('@/lib/supabase/client')
    supabase = mod.supabase
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
    } as never)
  })

  it('should render children when user is admin (via profiles.role)', async () => {
    

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    } as never)

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') return profileFrom() as never
      return { select: vi.fn() } as never
    })

    profileSelect.mockResolvedValue({ data: { role: 'admin' }, error: null })

    render(
      <MemoryRouter>
        <QueryProvider>
          <RequireAdmin>
            <div>Admin Content</div>
          </RequireAdmin>
        </QueryProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })
  })

  it('should render children when user is superadmin (via profiles.role)', async () => {
    

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    } as never)

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') return profileFrom() as never
      return { select: vi.fn() } as never
    })

    profileSelect.mockResolvedValue({ data: { role: 'superadmin' }, error: null })

    render(
      <MemoryRouter>
        <QueryProvider>
          <RequireAdmin>
            <div>Admin Content</div>
          </RequireAdmin>
        </QueryProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })
  })

  it('should show access denied when user role is not admin', async () => {
    

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    } as never)

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') return profileFrom() as never
      return { select: vi.fn() } as never
    })

    profileSelect.mockResolvedValue({ data: { role: 'user' }, error: null })

    render(
      <MemoryRouter>
        <QueryProvider>
          <RequireAdmin>
            <div>Admin Content</div>
          </RequireAdmin>
        </QueryProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
    })
  })

  it('should show access denied when user is not authenticated', async () => {
    

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
    } as never)

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never)

    render(
      <MemoryRouter>
        <QueryProvider>
          <RequireAdmin>
            <div>Admin Content</div>
          </RequireAdmin>
        </QueryProvider>
      </MemoryRouter>
    )

    // When not authenticated, the component redirects to login
    await waitFor(() => {
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
    })
  })
})
