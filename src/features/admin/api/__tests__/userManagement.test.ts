/**
 * User Management API Tests
 *
 * getUsers/getUserById/getUserStats now call the get-admin-users edge function
 * via invokeEdgeFunction. Tests mock that helper and verify the data mapping.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockInvokeEdgeFunction, mockSupabase } = vi.hoisted(() => ({
  mockInvokeEdgeFunction: vi.fn(),
  mockSupabase: {
    from: vi.fn(),
    auth: { admin: { updateUserById: vi.fn() } },
  },
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabase,
  invokeEdgeFunction: mockInvokeEdgeFunction,
}))

import { getUsers, getUserById, getUserStats } from '../../api/userManagement'

const makeUser = (overrides: object = {}) => ({
  id: 'user-1',
  email: 'admin@example.com',
  created_at: '2025-01-01T00:00:00Z',
  last_sign_in_at: '2026-04-01T10:00:00Z',
  raw_user_meta_data: { role: 'admin', full_name: 'Admin User' },
  ...overrides,
})

describe('getUsers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns users from edge function response', async () => {
    const mockUsers = [makeUser(), makeUser({ id: 'user-2', email: 'viewer@example.com', raw_user_meta_data: { role: 'viewer' } })]
    mockInvokeEdgeFunction.mockResolvedValue({ data: { users: mockUsers }, error: null })

    const users = await getUsers()

    expect(users).toHaveLength(2)
    expect(users[0].email).toBe('admin@example.com')
    expect(mockInvokeEdgeFunction).toHaveBeenCalledWith('get-admin-users')
  })

  it('returns empty array when edge function returns no users', async () => {
    mockInvokeEdgeFunction.mockResolvedValue({ data: { users: [] }, error: null })
    const users = await getUsers()
    expect(users).toEqual([])
  })

  it('throws when edge function returns an error', async () => {
    mockInvokeEdgeFunction.mockResolvedValue({ data: null, error: new Error('Forbidden') })
    await expect(getUsers()).rejects.toThrow('Failed to fetch users: Forbidden')
  })
})

describe('getUserById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the matching user', async () => {
    const users = [makeUser({ id: 'user-1' }), makeUser({ id: 'user-2' })]
    mockInvokeEdgeFunction.mockResolvedValue({ data: { users }, error: null })

    const user = await getUserById('user-1')
    expect(user?.id).toBe('user-1')
  })

  it('returns null when user is not found', async () => {
    mockInvokeEdgeFunction.mockResolvedValue({ data: { users: [] }, error: null })
    const user = await getUserById('nonexistent')
    expect(user).toBeNull()
  })
})

describe('getUserStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('computes correct totals and role breakdown', async () => {
    const thisMonth = new Date()
    thisMonth.setDate(2) // second of this month — within the month
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const users = [
      makeUser({ id: 'u1', last_sign_in_at: thisMonth.toISOString(), raw_user_meta_data: { role: 'admin' } }),
      makeUser({ id: 'u2', last_sign_in_at: thisMonth.toISOString(), raw_user_meta_data: { role: 'editor' } }),
      makeUser({ id: 'u3', last_sign_in_at: lastMonth.toISOString(), raw_user_meta_data: { role: 'viewer' } }),
      makeUser({ id: 'u4', last_sign_in_at: null, raw_user_meta_data: { role: 'viewer' } }),
    ]
    mockInvokeEdgeFunction.mockResolvedValue({ data: { users }, error: null })

    const stats = await getUserStats()

    expect(stats.total).toBe(4)
    expect(stats.activeThisMonth).toBe(2)
    expect(stats.byRole).toEqual({ admin: 1, editor: 1, viewer: 2 })
  })
})
