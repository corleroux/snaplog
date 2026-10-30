/**
 * Centralized Supabase mock chain builder for tests.
 *
 * Usage:
 *   import { createMockSupabaseChain } from '@/test/supabaseMocks'
 *
 *   const chain = createMockSupabaseChain({ data: mockEvent, error: null })
 *   vi.mocked(supabase.from).mockReturnValue(chain as any)
 */

import { vi } from 'vitest'

export function createMockSupabaseChain(resolvedValue: any) {
  const chain: any = {}

  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.neq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.is = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)

  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)

  chain.then = (resolve: any) => {
    Promise.resolve(resolvedValue).then(resolve)
  }

  return chain
}

/**
 * Standard Supabase client mock factory for vi.mock().
 *
 *   vi.mock('@/lib/supabase/client', mockSupabaseClient)
 */
export function mockSupabaseClient() {
  return {
    supabase: {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(() => ({ data: { session: null }, error: null })),
        refreshSession: vi.fn(() => ({ data: { session: null }, error: null })),
      },
    },
  }
}
