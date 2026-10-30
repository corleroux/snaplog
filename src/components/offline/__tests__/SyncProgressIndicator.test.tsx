/**
 * SyncProgressIndicator Component Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SyncProgressIndicator, SyncStatusBadge } from '../SyncProgressIndicator'

// Mock data for tests
const mockQueue = {
  getAll: vi.fn(),
}

const mockEngine = {
  isActive: vi.fn(() => false),
  getCurrentItemId: vi.fn(() => null),
  processQueued: vi.fn(),
  retryFailed: vi.fn(),
}

// Mock sync engine and queue
vi.mock('@/lib/offline/syncEngine', () => ({
  getSyncEngine: vi.fn(() => mockEngine),
}))

vi.mock('@/lib/offline/uploadQueue', () => ({
  getUploadQueue: vi.fn(() => mockQueue),
}))

describe('SyncProgressIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueue.getAll.mockResolvedValue([])
    mockEngine.isActive.mockReturnValue(false)
    mockEngine.getCurrentItemId.mockReturnValue(null)
  })

  it('should not render when no items and not active', async () => {
    const { container } = render(<SyncProgressIndicator />)

    await waitFor(() => {
      expect(container.firstChild).toBe(null)
    })
  })

  it('should render progress bar when items exist', async () => {
    mockQueue.getAll.mockResolvedValue([
      { id: '1', status: 'synced' },
      { id: '2', status: 'queued' },
    ])

    render(<SyncProgressIndicator />)

    await waitFor(() => {
      expect(screen.getByText(/Sync Status/i)).toBeInTheDocument()
    })
  })

  it('should show sync status breakdown', async () => {
    mockQueue.getAll.mockResolvedValue([
      { id: '1', status: 'synced' },
      { id: '2', status: 'synced' },
      { id: '3', status: 'queued' },
      { id: '4', status: 'failed' },
    ])

    render(<SyncProgressIndicator detailed />)

    // Wait for the card title to appear first
    await waitFor(
      () => {
        expect(screen.getByText(/Sync Status/i)).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Then check for the breakdown
    await waitFor(
      () => {
        expect(screen.getByText('2 synced')).toBeInTheDocument()
        expect(screen.getByText('1 pending')).toBeInTheDocument()
        expect(screen.getByText('1 failed')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it('should show sync button when queued items exist', async () => {
    mockQueue.getAll.mockResolvedValue([
      { id: '1', status: 'queued' },
      { id: '2', status: 'queued' },
    ])

    render(<SyncProgressIndicator />)

    await waitFor(() => {
      expect(screen.getByText(/Sync 2 items/)).toBeInTheDocument()
    })
  })

  it('should show retry button when failed items exist', async () => {
    mockQueue.getAll.mockResolvedValue([
      { id: '1', status: 'failed' },
    ])

    render(<SyncProgressIndicator />)

    await waitFor(() => {
      expect(screen.getByText(/Retry 1 failed/)).toBeInTheDocument()
    })
  })

  it('should call processQueued when sync button clicked', async () => {
    mockQueue.getAll.mockResolvedValue([
      { id: '1', status: 'queued' },
    ])

    render(<SyncProgressIndicator />)

    await waitFor(() => {
      const button = screen.getByText(/Sync 1 item/)
      button.click()
    })

    expect(mockEngine.processQueued).toHaveBeenCalled()
  })

  it('should call retryFailed when retry button clicked', async () => {
    mockQueue.getAll.mockResolvedValue([
      { id: '1', status: 'failed' },
    ])

    render(<SyncProgressIndicator />)

    await waitFor(() => {
      const button = screen.getByText(/Retry 1 failed/)
      button.click()
    })

    expect(mockEngine.retryFailed).toHaveBeenCalled()
  })
})

describe('SyncStatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueue.getAll.mockResolvedValue([])
    mockEngine.isActive.mockReturnValue(false)
  })

  it('should not render when no pending items', async () => {
    const { container } = render(<SyncStatusBadge />)

    await waitFor(() => {
      expect(container.firstChild).toBe(null)
    })
  })

  it('should show pending count when items exist', async () => {
    mockQueue.getAll.mockResolvedValue([
      { id: '1', status: 'queued' },
      { id: '2', status: 'queued' },
      { id: '3', status: 'queued' },
    ])

    render(<SyncStatusBadge />)

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('pending')).toBeInTheDocument()
    })
  })

  it('should show syncing state when active', async () => {
    mockEngine.isActive.mockReturnValue(true)
    mockQueue.getAll.mockResolvedValue([
      { id: '1', status: 'queued' },
    ])

    render(<SyncStatusBadge />)

    await waitFor(() => {
      expect(screen.getByText(/Syncing/i)).toBeInTheDocument()
    })
  })
})
