/**
 * Event Members Repository Tests
 *
 * Tests the event members operations:
 * - getEventMembers
 * - searchUsersByEmail
 * - addMemberToEvent (with duplicate prevention)
 * - removeMemberFromEvent (with last-owner protection)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getEventMembers,
  searchUsersByEmail,
  addMemberToEvent,
  removeMemberFromEvent,
} from '../eventMembersRepository'

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn(() => ({ data: { session: null }, error: null })),
      refreshSession: vi.fn(() => ({ data: { session: null }, error: null })),
    },
  },
}))

import { supabase } from '@/lib/supabase/client'
const mockFrom = vi.mocked(supabase.from)
const mockRpc = vi.mocked(supabase.rpc)

/**
 * Creates a Supabase query chain mock.
 *
 * The chain models: .select().eq().order() → resolves
 *                    .select().eq().maybeSingle() → resolves
 *                    .select().eq().ilike().limit() → resolves
 *                    .insert() → resolves
 *                    .delete().eq().eq() → resolves
 */
function createQueryChain(resolvedValue: any) {
  const chain: any = {}

  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.ilike = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockResolvedValue(resolvedValue)
  chain.order = vi.fn().mockResolvedValue(resolvedValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)

  // Make the chain thenable so `await chain` resolves to resolvedValue
  // (needed for queries that don't use .single() / .maybeSingle())
  chain.then = (resolve: any, reject: any) => {
    Promise.resolve(resolvedValue).then(resolve, reject)
  }

  return chain
}

describe('getEventMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return members with profile data', async () => {
    const mockMembers = [
      {
        id: 'mem-1',
        event_id: 'evt-1',
        user_id: 'user-1',
        role: 'owner',
        created_at: '2025-01-01T00:00:00Z',
        profiles: {
          id: 'user-1',
          full_name: 'Alice',
          avatar_url: null,
          company_name: 'ACME',
          email: 'alice@example.com',
        },
      },
      {
        id: 'mem-2',
        event_id: 'evt-1',
        user_id: 'user-2',
        role: 'editor',
        created_at: '2025-01-02T00:00:00Z',
        profiles: {
          id: 'user-2',
          full_name: 'Bob',
          avatar_url: null,
          company_name: null,
          email: 'bob@example.com',
        },
      },
    ]

    const chain = createQueryChain({ data: mockMembers, error: null })
    mockFrom.mockReturnValue(chain as any)

    const result = await getEventMembers('evt-1')

    expect(result).toHaveLength(2)
    expect(result[0].userId).toBe('user-1')
    expect(result[0].role).toBe('owner')
    expect(result[0].profile?.fullName).toBe('Alice')
    expect(result[1].userId).toBe('user-2')
    expect(result[1].role).toBe('editor')
  })

  it('should return empty array when no members', async () => {
    const chain = createQueryChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain as any)

    const result = await getEventMembers('evt-1')
    expect(result).toEqual([])
  })

  it('should throw on database error', async () => {
    const chain = createQueryChain({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue(chain as any)

    await expect(getEventMembers('evt-1')).rejects.toEqual(
      expect.objectContaining({ message: 'DB error' })
    )
  })
})

describe('searchUsersByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return matching profiles', async () => {
    const mockProfiles = [
      { id: 'user-1', full_name: 'Alice', email: 'alice@test.com' },
    ]
    mockRpc.mockResolvedValue({ data: mockProfiles, error: null } as any)

    const result = await searchUsersByEmail('alice')
    expect(result).toHaveLength(1)
    expect(result[0].email).toBe('alice@test.com')
    expect(mockRpc).toHaveBeenCalledWith('search_profiles_by_email', {
      query: 'alice',
      result_limit: 10,
    })
  })

  it('should return empty array for query under 2 characters', async () => {
    const result = await searchUsersByEmail('a')
    expect(result).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('should return empty array for empty query', async () => {
    const result = await searchUsersByEmail('')
    expect(result).toEqual([])
  })

  it('should return empty array for whitespace-only query', async () => {
    const result = await searchUsersByEmail('   ')
    expect(result).toEqual([])
  })
})

describe('addMemberToEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should add a member when user exists and is not already a member', async () => {
    // Call 1: find user by email via RPC
    mockRpc.mockResolvedValueOnce({
      data: [{ id: 'user-2' }],
      error: null,
    } as any)
    // Call 2: check existing membership (event_members table) → resolved by .maybeSingle()
    const checkChain = createQueryChain({
      data: null,
      error: null,
    })
    // Call 3: insert member (event_members table) → resolved by .insert()
    const insertChain = createQueryChain({ error: null })

    mockFrom
      .mockReturnValueOnce(checkChain as any)
      .mockReturnValueOnce(insertChain as any)

    await addMemberToEvent({
      eventId: 'evt-1',
      email: 'bob@example.com',
      role: 'editor',
    })

    expect(mockRpc).toHaveBeenCalledWith('search_profiles_by_email', {
      query: 'bob@example.com',
      result_limit: 1,
    })
    expect(mockFrom).toHaveBeenCalledWith('event_members')
  })

  it('should throw if user not found', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null } as any)

    await expect(
      addMemberToEvent({
        eventId: 'evt-1',
        email: 'nobody@example.com',
        role: 'editor',
      })
    ).rejects.toThrow('User not found')
  })

  it('should throw if user is already a member', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ id: 'user-2' }],
      error: null,
    } as any)
    const checkChain = createQueryChain({
      data: { id: 'mem-1' },
      error: null,
    })

    mockFrom.mockReturnValueOnce(checkChain as any)

    await expect(
      addMemberToEvent({
        eventId: 'evt-1',
        email: 'bob@example.com',
        role: 'editor',
      })
    ).rejects.toThrow('already a member')
  })
})

describe('removeMemberFromEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should remove a non-owner member', async () => {
    // Call 1: get owners (select + eq → resolved by .select chain with maybeSingle pattern)
    // The code does: .from('event_members').select('id').eq('event_id', x).eq('role', 'owner')
    // This resolves as a regular select (not .single()), so we need .order/.limit style resolution
    // Actually looking at the code, it doesn't use .single() for the owners query — just selects.
    // Supabase resolves select without .single() as an array.

    // We need the chain to resolve at different terminal points for different queries.
    // The simplest approach: each call to mockFrom returns a fresh chain.

    // Call 1: owners query → .select('id').eq().eq() → resolves as array
    const ownersChain = createQueryChain({
      data: [{ id: 'mem-1' }],
      error: null,
    })
    // Call 2: member to remove → .select('role').eq().eq().maybeSingle() → resolves as single
    const memberChain = createQueryChain({
      data: { role: 'editor' },
      error: null,
    })
    // Call 3: delete → .delete().eq().eq() → resolves
    const deleteChain = createQueryChain({ error: null })

    mockFrom
      .mockReturnValueOnce(ownersChain as any)
      .mockReturnValueOnce(memberChain as any)
      .mockReturnValueOnce(deleteChain as any)

    await expect(
      removeMemberFromEvent('evt-1', 'user-2')
    ).resolves.toBeUndefined()
  })

  it('should allow removing an owner when other owners exist', async () => {
    const ownersChain = createQueryChain({
      data: [{ id: 'mem-1' }, { id: 'mem-2' }],
      error: null,
    })
    const memberChain = createQueryChain({
      data: { role: 'owner' },
      error: null,
    })
    const deleteChain = createQueryChain({ error: null })

    mockFrom
      .mockReturnValueOnce(ownersChain as any)
      .mockReturnValueOnce(memberChain as any)
      .mockReturnValueOnce(deleteChain as any)

    await expect(
      removeMemberFromEvent('evt-1', 'user-1')
    ).resolves.toBeUndefined()
  })

  it('should throw when trying to remove the last owner', async () => {
    const ownersChain = createQueryChain({
      data: [{ id: 'mem-1' }],
      error: null,
    })
    const memberChain = createQueryChain({
      data: { role: 'owner' },
      error: null,
    })

    mockFrom
      .mockReturnValueOnce(ownersChain as any)
      .mockReturnValueOnce(memberChain as any)

    await expect(
      removeMemberFromEvent('evt-1', 'user-1')
    ).rejects.toThrow('Cannot remove the last owner')
  })

  it('should throw on owner check error', async () => {
    const chain = createQueryChain({
      data: null,
      error: { message: 'DB error' },
    })
    mockFrom.mockReturnValue(chain as any)

    await expect(
      removeMemberFromEvent('evt-1', 'user-1')
    ).rejects.toEqual(expect.objectContaining({ message: 'DB error' }))
  })
})
