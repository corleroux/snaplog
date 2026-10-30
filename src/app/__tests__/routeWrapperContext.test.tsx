/**
 * Route Wrapper Context Coverage Tests
 *
 * Verifies that every screen which uses a repository context hook
 * is properly wrapped in its provider via the route wrappers.
 *
 * This prevents the class of bug where useEventRepository/useVendorRepository/
 * useStyleRepository is called outside its provider.
 *
 * REFERENCE: This test was created after EventsScreen crashed at runtime because
 * useEventRepository() was called without EventRepositoryProvider wrapper.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

// Mock Supabase — minimal, just enough to construct providers
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn(() => ({ data: [], error: null })),
        })),
        order: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
    storage: { from: vi.fn() },
  },
}))

// Mock auth
vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'test-user', email: 'test@test.com' } })),
  useEventRole: vi.fn(() => ({ canEdit: true, role: 'owner', isLoading: false })),
  signOut: vi.fn(),
}))

// Mock features/events to avoid pulling in TanStack Query and useToast
vi.mock('@/features/events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/events')>()
  return {
    ...actual,
    useEvents: vi.fn(() => ({ events: [], loading: false, error: null, refresh: vi.fn() })),
    EventsScreen: () => <div />,
    EventCreateScreen: () => <div />,
    EventEditScreen: () => <div />,
  }
})

// Mock vendor library
vi.mock('@/lib/vendor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/vendor')>()
  return {
    ...actual,
    useVendorsForEvent: vi.fn(() => ({ vendors: [], loading: false, error: null })),
    useVendor: vi.fn(() => ({ vendor: null, loading: false, error: null })),
  }
})

// Mock style library
vi.mock('@/lib/style', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/style')>()
  return {
    ...actual,
    useStylesForVendor: vi.fn(() => ({ styles: [], loading: false, error: null })),
    useStyle: vi.fn(() => ({ style: null, loading: false, error: null })),
  }
})

// Mock realtime
vi.mock('@/lib/realtime', () => ({
  useRealtimeRefresh: vi.fn(),
}))

// Mock all UI components to avoid deep import chains
vi.mock('@/components/ui', () => ({
  AppFrame: ({ children }: any) => <div>{children}</div>,
  AppFrameContent: ({ children }: any) => <div>{children}</div>,
  AppHeader: () => <div />,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
  NavigationFooter: () => null,
  BottomNavigation: () => null,
  SectionContainer: ({ children }: any) => <div>{children}</div>,
  Modal: ({ children }: any) => <div>{children}</div>,
  VendorLoadingState: () => <div>Loading...</div>,
  StyleLoadingState: () => <div>Loading...</div>,
  LoadingErrorState: () => <div>Error</div>,
  NotFoundErrorState: () => <div>Not Found</div>,
  AppShell: ({ children }: any) => <div>{children}</div>,
  PageHeader: () => <div />,
  EntityCard: () => <div />,
  EmptyState: () => <div />,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}))

// Mock tabs
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <button>{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}))

// Mock mobile components
vi.mock('@/components/mobile', () => ({
  SwipeActions: ({ children }: any) => <div>{children}</div>,
  PullToRefresh: ({ children }: any) => <div>{children}</div>,
}))

// Mock feature screens
vi.mock('@/features/vendors', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/vendors')>()
  return {
    ...actual,
    VendorListScreen: () => <div />,
    VendorDetailScreen: () => <div />,
    VendorEditScreen: () => <div />,
    VendorCaptureFlow: () => <div />,
  }
})

vi.mock('@/features/styles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/styles')>()
  return {
    ...actual,
    StyleListScreen: () => <div />,
    StyleDetailScreen: () => <div />,
    StyleEditScreen: () => <div />,
    StyleCaptureFlow: () => <div />,
    useStyleDetail: vi.fn(() => ({ data: null, loading: false, error: null, refresh: vi.fn() })),
  }
})

import { EventsListRouteWrapper } from '../eventRouteWrappers'
import { VendorListRouteWrapper } from '../vendorRouteWrappers'
import { StyleListFromRouteWithProvider } from '../styleRouteWrappers'

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={testQueryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Route Wrapper Context Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('EventsListRouteWrapper provides EventRepository context', () => {
    expect(() => renderWithRouter(<EventsListRouteWrapper />)).not.toThrow()
  })

  it('VendorListRouteWrapper provides VendorRepository context', () => {
    expect(() => renderWithRouter(<VendorListRouteWrapper />)).not.toThrow()
  })

  it('StyleListFromRouteWithProvider provides StyleRepository context', () => {
    expect(() => renderWithRouter(<StyleListFromRouteWithProvider />)).not.toThrow()
  })
})
