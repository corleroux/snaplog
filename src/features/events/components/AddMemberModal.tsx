/**
 * Add Member Modal
 *
 * Modal for adding existing users to an event by searching their email address.
 *
 * Features:
 * - Email search input (min 2 chars) — calls search_profiles_by_email RPC
 * - Filters out existing members
 * - Add to event button
 * - Loading and error states
 *
 * Security: uses the search_profiles_by_email RPC (SECURITY DEFINER, max 10
 * results) rather than a direct SELECT on profiles, which would expose all
 * registered user emails to any authenticated user.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { UserPlus, Loader2, Search } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addMemberToEvent } from '../api/eventMembersRepository'
import type { Profile } from '@/lib/supabase/types'
import { supabase } from '@/lib/supabase/client'

export interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  onMemberAdded: () => void
  existingMemberIds?: Set<string>
}

type AddState = 'idle' | 'adding'

export function AddMemberModal({
  isOpen,
  onClose,
  eventId,
  onMemberAdded,
  existingMemberIds = new Set(),
}: AddMemberModalProps) {
  const [addState, setAddState] = useState<AddState>('idle')
  const [emailQuery, setEmailQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmailQuery('')
      setSearchResults([])
      setSelectedUser(null)
      setError(null)
      setAddState('idle')
    }
  }, [isOpen])

  const searchByEmail = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('search_profiles_by_email', {
        query,
        result_limit: 10,
      })

      if (rpcError) throw rpcError

      setSearchResults((data as Profile[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleQueryChange = (value: string) => {
    setEmailQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchByEmail(value), 300)
  }

  const handleAddMember = useCallback(async (user: Profile) => {
    setSelectedUser(user)
    setAddState('adding')
    setError(null)

    try {
      await addMemberToEvent({
        eventId,
        email: user.email || '',
        role: 'editor',
      })

      onMemberAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
      setAddState('idle')
    }
  }, [eventId, onMemberAdded, onClose])

  // Filter out existing members from results
  const availableResults = searchResults.filter(p => !existingMemberIds.has(p.id))
  const hasSearched = emailQuery.trim().length >= 2
  const hasResults = availableResults.length > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Event Member"
      description="Search by email address to find and add a user"
      size="md"
    >
      <div className="space-y-4">
        {/* Email search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="email"
            placeholder="Search by email address..."
            value={emailQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Searching spinner */}
        {searching && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Search results */}
        {!searching && hasResults && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.full_name || 'Unknown Name'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email || user.company_name || 'No email'}
                  </p>
                </div>

                {/* Add button */}
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  onClick={() => handleAddMember(user)}
                  disabled={addState === 'adding'}
                  radius="pill"
                >
                  {addState === 'adding' && selectedUser?.id === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* No results after searching */}
        {!searching && hasSearched && !hasResults && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No users found for &ldquo;{emailQuery}&rdquo;
          </p>
        )}

        {/* Prompt to start searching */}
        {!searching && !hasSearched && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Type at least 2 characters to search
          </p>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={addState === 'adding'}
          className="flex-1"
          radius="pill"
        >
          Cancel
        </Button>
      </div>
    </Modal>
  )
}
