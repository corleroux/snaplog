/**
 * Saved Filters API
 *
 * Functions for managing saved filter configurations.
 */

import { supabase } from '@/lib/supabase/client'
import type {
  SavedFilter,
  SaveFilterInput,
  UpdateFilterInput,
  FilterEntityType,
} from '../types'

/**
 * Save a new filter configuration.
 */
export async function saveFilter(
  filter: SaveFilterInput
): Promise<SavedFilter> {
  const { data, error } = await supabase
    .from('saved_filters')
    .insert({
      name: filter.name,
      description: filter.description || null,
      entity_type: filter.entity_type,
      filter_config: filter.filter_config,
      is_shared: filter.is_shared || false,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save filter: ${error.message}`)
  }

  return data as SavedFilter
}

/**
 * Get all saved filters for a specific entity type.
 */
export async function getSavedFilters(
  entityType: FilterEntityType,
  includeShared = true
): Promise<SavedFilter[]> {
  let query = supabase
    .from('saved_filters')
    .select('*')
    .eq('entity_type', entityType)
    .is('deleted_at', null)

  if (!includeShared) {
    query = query.eq('is_shared', false) as any
  }

  const { data, error } = await query.order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch saved filters: ${error.message}`)
  }

  return (data as SavedFilter[]) || []
}

/**
 * Get a single filter by ID.
 */
export async function getFilterById(filterId: string): Promise<SavedFilter | null> {
  const { data, error } = await supabase
    .from('saved_filters')
    .select('*')
    .eq('id', filterId)
    .is('deleted_at', null)
    .single()

  if (error) {
    return null
  }

  return data as SavedFilter
}

/**
 * Update an existing filter.
 */
export async function updateFilter(
  filterId: string,
  updates: UpdateFilterInput
): Promise<SavedFilter> {
  const { data, error } = await supabase
    .from('saved_filters')
    .update(updates)
    .eq('id', filterId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update filter: ${error.message}`)
  }

  return data as SavedFilter
}

/**
 * Delete a filter (soft delete).
 */
export async function deleteFilter(filterId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_filters')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', filterId)

  if (error) {
    throw new Error(`Failed to delete filter: ${error.message}`)
  }
}

/**
 * Reorder filters (update sort_order).
 */
export async function reorderFilters(
  filterIds: string[]
): Promise<void> {
  const updates = filterIds.map((id, index) => ({
    id,
    sort_order: index,
  }))

  // Use Promise.all for parallel updates
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from('saved_filters').update({ sort_order }).eq('id', id)
    )
  )
}
