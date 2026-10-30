/**
 * Global Search Component
 *
 * Mobile-first search dialog with keyboard shortcuts (Cmd+K / Ctrl+K)
 * for desktop users. Works across vendors, styles, and events with
 * recent searches and type-ahead results.
 *
 * Controlled by bottom nav Search button on mobile.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useGlobalSearch, useRecentSearches, useSaveSearchHistory, useClearSearchHistory } from './hooks/useSearch'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import type { SearchResult } from './api/search'

interface GlobalSearchProps {
  /** Optional event ID to scope search */
  eventId?: string
  /** Controlled open state */
  isOpen?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
}

export function GlobalSearch({ eventId, isOpen: controlledOpen, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate()
  const [internalOpen, setInternalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Support both controlled and uncontrolled modes
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = useCallback((open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open)
    } else {
      setInternalOpen(open)
    }
  }, [onOpenChange])

  // Queries and mutations
  const { data: results = [], isLoading } = useGlobalSearch(
    debouncedQuery,
    ['vendors', 'styles', 'events'],
    eventId,
    { enabled: isOpen }
  )

  const { data: recentSearches = [] } = useRecentSearches(
    10,
    { enabled: isOpen }
  )
  const saveSearchMutation = useSaveSearchHistory()
  const clearHistoryMutation = useClearSearchHistory()

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Global Cmd+K shortcut - lightweight, always available
  useEffect(() => {
    const handleCmdK = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(!isOpen)
      }
    }

    window.addEventListener('keydown', handleCmdK)
    return () => window.removeEventListener('keydown', handleCmdK)
  }, [isOpen, setIsOpen])

  // Search-specific keyboard shortcuts - only active when search is open
  // This significantly reduces main thread work during normal usage
  useEffect(() => {
    if (!isOpen) return

    const handleSearchKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false)
        setQuery('')
        return
      }

      // Arrow keys to navigate results
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault()
        handleResultClick(results[selectedIndex])
      }
    }

    window.addEventListener('keydown', handleSearchKeyDown)
    return () => window.removeEventListener('keydown', handleSearchKeyDown)
  }, [isOpen, results, selectedIndex, setIsOpen])

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      // Save to search history
      saveSearchMutation.mutate({
        query,
        resultType: result.type,
      })

      // Navigate based on type
      let path = ''
      switch (result.type) {
        case 'vendor': {
          const eid = result.context_event_id ?? eventId
          path = eid ? `/events/${eid}/vendors/${result.id}/styles` : '/events'
          break
        }
        case 'style': {
          const eid = result.context_event_id ?? eventId
          path =
            eid && result.context_vendor_id
              ? `/events/${eid}/vendors/${result.context_vendor_id}/styles/${result.id}`
              : eid
                ? `/events/${eid}/vendors`
                : '/events'
          break
        }
        case 'event':
          path = `/events/${result.id}/vendors`
          break
      }

      setIsOpen(false)
      setQuery('')
      navigate(path)
    },
    [query, eventId, navigate, saveSearchMutation]
  )

  const handleRecentSearchClick = useCallback(
    (recentQuery: string) => {
      setQuery(recentQuery)
      inputRef.current?.focus()
    },
    []
  )

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'vendor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'style':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'event':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setQuery('')
  }, [setIsOpen])

  // When closed, render nothing (controlled externally by bottom nav)
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/50 backdrop-blur-sm">
      {/* Backdrop - tap to close */}
      <div
        className="absolute inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />

      <Card className="relative w-full max-w-2xl mx-4 shadow-xl max-h-[75vh] flex flex-col">
        <div className="p-4 border-b">
          {/* Search Input with close button */}
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-muted-foreground flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              ref={inputRef}
              type="search"
              placeholder="Search vendors, styles, events..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 text-base h-11"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              className="flex-shrink-0 h-9 w-9"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && query.length >= 2 && (
            <div className="py-12 text-center text-muted-foreground">
              Searching...
            </div>
          )}

          {!isLoading && query.length >= 2 && results.length > 0 && (
            <div className="divide-y">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3.5 text-left',
                    'hover:bg-accent transition-colors active:bg-accent/80',
                    index === selectedIndex && 'bg-accent'
                  )}
                >
                  <Badge variant="outline" className={cn('text-xs', getTypeColor(result.type))}>
                    {result.type}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.name}</p>
                    {result.snippet && (
                      <p className="text-sm text-muted-foreground truncate">{result.snippet}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && query.length >= 2 && results.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <p>No results found for "{query}"</p>
            </div>
          )}

          {/* Recent Searches */}
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 py-2">
                <h3 className="text-sm font-medium text-muted-foreground">Recent Searches</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearHistoryMutation.mutate(undefined)}
                  className="text-xs"
                >
                  Clear
                </Button>
              </div>
              <div className="divide-y">
                {recentSearches.slice(0, 5).map((recent) => (
                  <button
                    key={recent.id}
                    onClick={() => handleRecentSearchClick(recent.query)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent active:bg-accent/80 transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-muted-foreground flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm">{recent.query}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {query.length < 2 && recentSearches.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="mb-1 font-medium">Search the catalogue</p>
              <p className="text-sm">
                Find vendors, styles, and events
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
