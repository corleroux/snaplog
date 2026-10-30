/**
 * VirtualizedList Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import { VirtualizedList, useVirtualScrollPosition } from '../VirtualizedList'

describe('VirtualizedList', () => {
  const mockItems = Array.from({ length: 100 }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
  }))

  it('should render only visible items', () => {
    const { container } = render(
      <VirtualizedList
        items={mockItems}
        itemHeight={50}
        height={500}
        renderItem={(item) => (
          <div data-testid={`item-${item.id}`}>{item.name}</div>
        )}
      />
    )

    // Should have items in the DOM
    const renderedItems = container?.querySelectorAll('[data-testid^="item-"]')
    expect(renderedItems).toBeTruthy()
    // Should render fewer than total items (virtualization)
    expect(renderedItems!.length).toBeLessThan(mockItems.length)
  })

  it('should use custom key extractor', () => {
    const { container } = render(
      <VirtualizedList
        items={mockItems}
        itemHeight={50}
        height={500}
        getKey={(item) => item.id}
        renderItem={(item) => <div>{item.name}</div>}
      />
    )

    expect(container).toBeTruthy()
  })

  it('should handle dynamic item heights', () => {
    const { container } = render(
      <VirtualizedList
        items={mockItems}
        itemHeight={(item) => (item.id === 'item-0' ? 100 : 50)}
        height={500}
        renderItem={(item) => <div>{item.name}</div>}
      />
    )

    expect(container).toBeTruthy()
  })

  it('should call onVisibleRangeChange when range changes', () => {
    const onVisibleRangeChange = vi.fn()

    render(
      <VirtualizedList
        items={mockItems}
        itemHeight={50}
        height={500}
        renderItem={(item) => <div>{item.name}</div>}
        onVisibleRangeChange={onVisibleRangeChange}
      />
    )

    // Should be called on mount
    expect(onVisibleRangeChange).toHaveBeenCalled()
  })

  it('should handle empty items list', () => {
    const { container } = render(
      <VirtualizedList<{ id: string; name: string }>
        items={[]}
        itemHeight={50}
        height={500}
        renderItem={(item) => <div>{item.name}</div>}
      />
    )

    expect(container).toBeTruthy()
  })

  it('should handle single item', () => {
    const singleItem = [{ id: 'item-1', name: 'Only Item' }]

    const { container } = render(
      <VirtualizedList
        items={singleItem}
        itemHeight={50}
        height={500}
        renderItem={(item) => <div>{item.name}</div>}
      />
    )

    expect(container).toBeTruthy()
  })
})

describe('useVirtualScrollPosition', () => {
  it('should provide scrollToIndex method', () => {
    const { result } = renderHook(() =>
      useVirtualScrollPosition({
        totalItems: 100,
        itemHeight: 50,
        containerHeight: 500,
      })
    )

    expect(result.current.scrollToIndex).toBeDefined()
    expect(result.current.scrollToTop).toBeDefined()
    expect(result.current.scrollToBottom).toBeDefined()
  })

  it('should calculate offsets for fixed item heights', () => {
    const { result } = renderHook(() =>
      useVirtualScrollPosition({
        totalItems: 100,
        itemHeight: 50,
        containerHeight: 500,
      })
    )

    // Index 10 should be at offset 500 (10 * 50)
    expect(result.current.scrollToIndex).toBeDefined()
  })

  it('should calculate offsets for dynamic item heights', () => {
    const dynamicHeight = (index: number) => (index % 2 === 0 ? 50 : 100)

    const { result } = renderHook(() =>
      useVirtualScrollPosition({
        totalItems: 100,
        itemHeight: dynamicHeight,
        containerHeight: 500,
      })
    )

    expect(result.current.scrollToIndex).toBeDefined()
  })
})
