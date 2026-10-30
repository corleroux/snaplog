/**
 * Search API
 *
 * Functions for global search across vendors, styles, and events.
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('search')

export interface SearchResult {
  type: 'vendor' | 'style' | 'event'
  id: string
  name: string
  snippet: string
  rank: number
  context_event_id: string | null
  context_vendor_id: string | null
}

export interface RecentSearch {
  id: string
  query: string
  result_type: string | null
  created_at: string
}

/**
 * Perform a global search across vendors, styles, and events.
 *
 * @param query - The search query string
 * @param types - Array of types to search ('vendors', 'styles', 'events')
 * @param eventId - Optional event ID to filter results
 * @returns Promise resolving to search results
 */
export async function globalSearch(
  query: string,
  types: Array<'vendors' | 'styles' | 'events'> = ['vendors', 'styles', 'events'],
  eventId?: string
): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc('global_search', {
    search_query: query,
    search_types: types,
    event_id: eventId || null,
  })

  if (error) {
    throw new Error(`Search failed: ${error.message}`)
  }

  return data as SearchResult[]
}

/**
 * Save a search to the user's search history.
 *
 * @param query - The search query to save
 * @param resultType - Optional type of results found
 * @returns Promise resolving when saved
 */
export async function saveSearchHistory(
  query: string,
  resultType?: string
): Promise<void> {
  const { error } = await supabase.from('search_history').insert({
    query,
    result_type: resultType || null,
  })

  if (error) {
    // Silently fail - search history is non-critical
    log.warn('Failed to save search history', { error: error.message })
  }
}

/**
 * Get recent searches for the current user.
 *
 * @param limit - Maximum number of searches to return
 * @returns Promise resolving to recent searches
 */
export async function getRecentSearches(limit = 10): Promise<RecentSearch[]> {
  const { data, error } = await supabase
    .from('search_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return []
  }

  return (data as RecentSearch[]) || []
}

/**
 * Clear search history for a specific query or all history.
 *
 * @param queryId - Optional ID of specific search to delete. If omitted, clears all.
 * @returns Promise resolving when cleared
 */
export async function clearSearchHistory(queryId?: string): Promise<void> {
  if (queryId) {
    const { error } = await supabase
      .from('search_history')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', queryId)

    if (error) {
      throw new Error(`Failed to clear search: ${error.message}`)
    }
  } else {
    const { error } = await supabase
      .from('search_history')
      .update({ deleted_at: new Date().toISOString() })
      .is('deleted_at', null)

    if (error) {
      throw new Error(`Failed to clear search history: ${error.message}`)
    }
  }
}
