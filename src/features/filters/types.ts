/**
 * Saved Filter Types
 */

export type FilterEntityType = 'vendors' | 'styles' | 'events'

export interface FilterConfig {
  // Vendor filters
  category?: string[]
  status?: string[]
  searchTerm?: string
  // Style filters
  season?: string[]
  priceRange?: { min?: number; max?: number }
  confidence?: { min?: number }
  // Event filters
  dateRange?: { start?: string; end?: string }
  // Any other filter criteria
  [key: string]: unknown
}

export interface SavedFilter {
  id: string
  user_id: string
  name: string
  description: string | null
  entity_type: FilterEntityType
  filter_config: FilterConfig
  is_shared: boolean
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SaveFilterInput {
  name: string
  description?: string
  entity_type: FilterEntityType
  filter_config: FilterConfig
  is_shared?: boolean
}

export interface UpdateFilterInput {
  name?: string
  description?: string
  filter_config?: FilterConfig
  is_shared?: boolean
  sort_order?: number
}
