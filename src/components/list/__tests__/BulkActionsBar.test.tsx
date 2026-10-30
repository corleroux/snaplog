/**
 * BulkActionsBar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BulkActionsBar } from '../BulkActionsBar'

// Mock window.confirm
global.confirm = vi.fn(() => true)

describe('BulkActionsBar', () => {
  beforeEach(() => {
    vi.mocked(global.confirm).mockReturnValue(true)
  })

  it('should not render when no items selected', () => {
    const onAction = vi.fn()
    const onClearSelection = vi.fn()

    const { container } = render(
      <BulkActionsBar
        selectedCount={0}
        availableActions={['archive', 'export']}
        onAction={onAction}
        onClearSelection={onClearSelection}
      />
    )

    expect(container.firstChild).toBe(null)
  })

  it('should render selection count and actions', () => {
    const onAction = vi.fn()
    const onClearSelection = vi.fn()

    render(
      <BulkActionsBar
        selectedCount={3}
        availableActions={['archive', 'export', 'tag']}
        onAction={onAction}
        onClearSelection={onClearSelection}
      />
    )

    expect(screen.getByText('3 selected')).toBeInTheDocument()
    expect(screen.getByText('Clear')).toBeInTheDocument()
    expect(screen.getByText('Archive')).toBeInTheDocument()
    expect(screen.getByText('Export CSV')).toBeInTheDocument()
    expect(screen.getByText('Add Tags')).toBeInTheDocument()
  })

  it('should call onClearSelection when Clear clicked', () => {
    const onAction = vi.fn()
    const onClearSelection = vi.fn()

    render(
      <BulkActionsBar
        selectedCount={1}
        availableActions={['export']}
        onAction={onAction}
        onClearSelection={onClearSelection}
      />
    )

    fireEvent.click(screen.getByText('Clear'))
    expect(onClearSelection).toHaveBeenCalled()
  })

  it('should call onAction for export directly', () => {
    const onAction = vi.fn()
    const onClearSelection = vi.fn()

    render(
      <BulkActionsBar
        selectedCount={2}
        availableActions={['export']}
        onAction={onAction}
        onClearSelection={onClearSelection}
      />
    )

    fireEvent.click(screen.getByText('Export CSV'))
    expect(onAction).toHaveBeenCalledWith('export')
  })

  it('should show confirmation and call onAction for archive', () => {
    const onAction = vi.fn()
    const onClearSelection = vi.fn()

    render(
      <BulkActionsBar
        selectedCount={5}
        availableActions={['archive']}
        onAction={onAction}
        onClearSelection={onClearSelection}
      />
    )

    fireEvent.click(screen.getByText('Archive'))
    expect(global.confirm).toHaveBeenCalledWith('Archive 5 items?')
    expect(onAction).toHaveBeenCalledWith('archive')
  })

  it('should not call onAction when archive is cancelled', () => {
    vi.mocked(global.confirm).mockReturnValue(false)

    const onAction = vi.fn()
    const onClearSelection = vi.fn()

    render(
      <BulkActionsBar
        selectedCount={2}
        availableActions={['archive']}
        onAction={onAction}
        onClearSelection={onClearSelection}
      />
    )

    fireEvent.click(screen.getByText('Archive'))
    expect(onAction).not.toHaveBeenCalled()
  })

  it('should disable buttons when loading', () => {
    const onAction = vi.fn()
    const onClearSelection = vi.fn()

    render(
      <BulkActionsBar
        selectedCount={1}
        availableActions={['archive', 'export']}
        onAction={onAction}
        onClearSelection={onClearSelection}
        isLoading={true}
      />
    )

    expect(screen.getByText('Archive')).toBeDisabled()
    expect(screen.getByText('Export CSV')).toBeDisabled()
  })
})
