/**
 * OfflineIndicator Component Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { OfflineIndicator, OfflineStatusBadge } from '../OfflineIndicator'

// Mock queue
const mockQueue = {
  getAll: vi.fn(),
}

vi.mock('@/lib/offline/uploadQueue', () => ({
  getUploadQueue: vi.fn(() => mockQueue),
}))

vi.mock('@/lib/offline/syncEngine', () => ({
  getSyncEngine: vi.fn(() => ({
    isActive: vi.fn(() => false),
  })),
}))

describe('OfflineIndicator', () => {
  const originalNavigator = window.navigator

  beforeEach(() => {
    vi.clearAllMocks()
    mockQueue.getAll.mockResolvedValue([])
  })

  afterEach(() => {
    // Restore navigator
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
  })

  it('should not render when online with no pending items', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true,
    })

    const { container } = render(<OfflineIndicator />)

    await waitFor(() => {
      expect(container.firstChild).toBe(null)
    })
  })

  it('should render offline banner when offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: false,
    })

    render(<OfflineIndicator />)

    await waitFor(() => {
      expect(screen.getByText(/offline/i)).toBeInTheDocument()
    })
  })

  it('should show pending count when online with items', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true,
    })

    mockQueue.getAll.mockResolvedValue([
      { id: '1', status: 'queued' },
      { id: '2', status: 'queued' },
    ])

    render(<OfflineIndicator />)

    await waitFor(() => {
      expect(screen.getByText(/waiting to sync/i)).toBeInTheDocument()
    })
  })

  it('should position at top by default', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: false,
    })

    const { container } = render(<OfflineIndicator />)

    const indicator = container.querySelector('.fixed.top-0')
    expect(indicator).toBeTruthy()
  })

  it('should position at bottom when specified', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: false,
    })

    const { container } = render(<OfflineIndicator position="bottom" />)

    const indicator = container.querySelector('.fixed.bottom-0')
    expect(indicator).toBeTruthy()
  })
})

describe('OfflineStatusBadge', () => {
  const originalNavigator = window.navigator

  beforeEach(() => {
    vi.clearAllMocks()
    mockQueue.getAll.mockResolvedValue([])
  })

  afterEach(() => {
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
    })
  })

  it('should not render when online with no pending items', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true,
    })

    const { container } = render(<OfflineStatusBadge />)

    await waitFor(() => {
      expect(container.firstChild).toBe(null)
    })
  })

  it('should render offline badge when offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: false,
    })

    render(<OfflineStatusBadge />)

    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })
  })

  it('should show pending count when online with items', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true,
    })

    mockQueue.getAll.mockResolvedValue([
      { id: '1', status: 'queued' },
      { id: '2', status: 'queued' },
    ])

    render(<OfflineStatusBadge />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })
})
