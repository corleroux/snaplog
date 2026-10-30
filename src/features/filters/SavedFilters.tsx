/**
 * SavedFilters Component
 *
 * Allows users to save, load, edit, and delete filter configurations.
 */

import { useState } from 'react'
import { useSavedFilters, useSaveFilter, useDeleteFilter } from './hooks/useSavedFilters'
import type { FilterConfig, FilterEntityType, SavedFilter } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface SavedFiltersProps {
  /** The type of entity being filtered */
  entityType: FilterEntityType
  /** The current filter configuration */
  currentFilter: FilterConfig
  /** Callback when a filter is selected */
  onLoadFilter: (filter: FilterConfig) => void
}

export function SavedFilters({
  entityType,
  currentFilter,
  onLoadFilter,
}: SavedFiltersProps) {
  const { data: savedFilters = [], isLoading } = useSavedFilters(entityType)
  const saveFilterMutation = useSaveFilter()
  const deleteFilterMutation = useDeleteFilter()

  const [isSaving, setIsSaving] = useState(false)
  const [filterName, setFilterName] = useState('')
  const [filterDescription, setFilterDescription] = useState('')

  const hasActiveFilters = Object.keys(currentFilter).length > 0

  const handleSaveFilter = async () => {
    if (!filterName.trim()) return

    await saveFilterMutation.mutateAsync({
      name: filterName,
      description: filterDescription,
      entity_type: entityType,
      filter_config: currentFilter,
    })

    setFilterName('')
    setFilterDescription('')
    setIsSaving(false)
  }

  const handleDeleteFilter = async (filterId: string) => {
    if (confirm('Are you sure you want to delete this filter?')) {
      await deleteFilterMutation.mutateAsync(filterId)
    }
  }

  const handleLoadFilter = (filter: SavedFilter) => {
    onLoadFilter(filter.filter_config)
  }

  const getFilterSummary = (filter: SavedFilter): string => {
    const parts: string[] = []
    const config = filter.filter_config

    if (config.category?.length) {
      parts.push(`Categories: ${config.category.length}`)
    }
    if (config.status?.length) {
      parts.push(`Status: ${config.status.length}`)
    }
    if (config.season?.length) {
      parts.push(`Seasons: ${config.season.length}`)
    }
    if (config.searchTerm) {
      parts.push('Search active')
    }
    if (config.priceRange) {
      parts.push('Price range')
    }
    if (config.confidence?.min) {
      parts.push('Min confidence')
    }

    return parts.length > 0 ? parts.join(' • ') : 'No filters'
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Loading saved filters...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Save Current Filter Button */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Saved Filters</span>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasActiveFilters}
          onClick={() => setIsSaving(true)}
        >
          Save Current
        </Button>
      </div>

      {/* Save Filter Form */}
      {isSaving && (
        <div className="rounded-lg border p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">
              Name
            </label>
            <Input
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="My Filter"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Description (optional)
            </label>
            <Input
              value={filterDescription}
              onChange={(e) => setFilterDescription(e.target.value)}
              placeholder="Description of this filter"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsSaving(false)
                setFilterName('')
                setFilterDescription('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveFilter}
              disabled={!filterName.trim() || saveFilterMutation.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Saved Filters List */}
      {savedFilters.length === 0 && !isSaving ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          No saved filters yet. Apply some filters and save them for quick access.
        </div>
      ) : (
        <div className="space-y-2">
          {savedFilters.map((filter) => (
            <div
              key={filter.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{filter.name}</span>
                  {filter.is_shared && (
                    <Badge variant="secondary" className="text-xs">
                      Shared
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {getFilterSummary(filter)}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLoadFilter(filter)}
                >
                  Load
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteFilter(filter.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
