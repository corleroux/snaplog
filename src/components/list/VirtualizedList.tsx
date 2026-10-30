/**
 * VirtualizedList Component
 *
 * Renders only visible items for large lists (1000+ items).
 * Maintains scroll position and provides smooth scrolling.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils/cn'

interface VirtualizedListProps<T> {
  /** Array of items to render */
  items: T[]
  /** Height of each item in pixels */
  itemHeight: number | ((item: T, index: number) => number)
  /** Height of the viewport in pixels */
  height: number
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode
  /** Optional key extractor */
  getKey?: (item: T, index: number) => string
  /** Optional className for the container */
  className?: string
  /** Callback when visible items change */
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void
  /** Overscan count - number of items to render outside viewport */
  overscan?: number
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  getKey,
  className,
  onVisibleRangeChange,
  overscan = 3,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDynamicHeight = typeof itemHeight === 'function'

  // Calculate item height
  const getItemHeight = useCallback((index: number) => {
    return typeof itemHeight === 'function'
      ? itemHeight(items[index], index)
      : itemHeight
  }, [items, itemHeight])

  // Calculate total height of all items
  const getTotalHeight = useCallback(() => {
    if (isDynamicHeight) {
      return items.reduce((total, _, index) => total + getItemHeight(index), 0)
    }
    return items.length * itemHeight
  }, [items, isDynamicHeight, itemHeight])

  const totalHeight = getTotalHeight()

  // Calculate visible range
  const getVisibleRange = useCallback(() => {
    let startIndex = 0
    let endIndex = 0
    let accumulatedHeight = 0

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const h = getItemHeight(i)
      if (accumulatedHeight + h > scrollTop) {
        startIndex = Math.max(0, i - overscan)
        break
      }
      accumulatedHeight += h
    }

    // Find end index
    accumulatedHeight = 0
    for (let i = 0; i < items.length; i++) {
      const h = getItemHeight(i)
      if (accumulatedHeight + h > scrollTop + height) {
        endIndex = Math.min(items.length - 1, i + overscan)
        break
      }
      accumulatedHeight += h
    }

    // If we didn't find an end index, show all remaining
    if (endIndex === 0 && accumulatedHeight <= scrollTop + height) {
      endIndex = items.length - 1
    }

    return { startIndex, endIndex }
  }, [items, scrollTop, height, getItemHeight, overscan])

  const { startIndex, endIndex } = getVisibleRange()

  // Notify parent of visible range change
  useEffect(() => {
    onVisibleRangeChange?.(startIndex, endIndex)
  }, [startIndex, endIndex, onVisibleRangeChange])

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // Get default key
  const getDefaultKey = useCallback((_item: T, index: number) => {
    return String(index)
  }, [])

  const keyExtractor = getKey || getDefaultKey

  // Calculate offset for an item
  const getItemOffset = useCallback((index: number) => {
    let offset = 0
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i)
    }
    return offset
  }, [getItemHeight])

  // Render visible items
  const visibleItems = []
  for (let i = startIndex; i <= endIndex; i++) {
    const item = items[i]
    if (item) {
      visibleItems.push(
        <div
          key={keyExtractor(item, i)}
          style={{
            position: 'absolute',
            top: getItemOffset(i),
            left: 0,
            right: 0,
            height: getItemHeight(i),
          }}
        >
          {renderItem(item, i)}
        </div>
      )
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems}
      </div>
    </div>
  )
}

/**
 * Hook to manage scroll position in a virtualized list
 */
export function useVirtualScrollPosition(options: {
  totalItems: number
  itemHeight: number | ((index: number) => number)
  containerHeight: number
}) {
  const { totalItems, itemHeight, containerHeight } = options
  const isDynamic = typeof itemHeight === 'function'

  const scrollToIndex = useCallback((index: number) => {
    let offset = 0
    if (isDynamic) {
      for (let i = 0; i < index; i++) {
        offset += (itemHeight as (i: number) => number)(i)
      }
    } else {
      offset = index * itemHeight
    }

    // Scroll into view with some padding
    const padding = containerHeight * 0.2
    window.scrollTo({
      top: offset - padding,
      behavior: 'smooth',
    })
  }, [totalItems, itemHeight, containerHeight, isDynamic])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const scrollToBottom = useCallback(() => {
    let totalHeight = 0
    if (isDynamic) {
      for (let i = 0; i < totalItems; i++) {
        totalHeight += (itemHeight as (i: number) => number)(i)
      }
    } else {
      totalHeight = totalItems * itemHeight
    }

    window.scrollTo({
      top: totalHeight,
      behavior: 'smooth',
    })
  }, [totalItems, itemHeight, isDynamic])

  return {
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
  }
}
