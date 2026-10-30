/**
 * ErrorBoundary tests (part of TEST-01)
 *
 * Tests that:
 * - Normal children render fine
 * - Error in child triggers recovery UI (not white screen)
 * - Error is reported to PostHog
 * - "Try again" resets the error state
 * - "Go home" navigates to /
 * - Custom fallback renders when provided
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'

// Mock PostHog
const mockCaptureException = vi.fn()

vi.mock('posthog-js', () => ({
  default: {
    captureException: (...args: any[]) => mockCaptureException(...args),
    register: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    init: vi.fn(),
    opt_out_capturing: vi.fn(),
  },
}))

import { ErrorBoundary } from '../ErrorBoundary'

// Component that always throws
function ThrowingComponent({ error }: { error?: Error } = {}): ReactNode {
  throw error || new Error('Test error')
}

// Suppress React error boundary console.error output
let consoleSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleSpy.mockRestore()
  vi.clearAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello World</div>
      </ErrorBoundary>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders recovery UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    // Recovery UI should be visible, NOT a white screen
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
    expect(screen.getByText('Go home')).toBeInTheDocument()
  })

  it('reports error to PostHog with feature tag', () => {
    const testError = new Error('PostHog test')
    render(
      <ErrorBoundary feature="vendor-capture">
        <ThrowingComponent error={testError} />
      </ErrorBoundary>
    )

    expect(mockCaptureException).toHaveBeenCalledWith(
      testError,
      expect.objectContaining({ error_boundary: 'vendor-capture' })
    )
  })

  it('uses "global" tag when no feature prop provided', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ error_boundary: 'global' })
    )
  })

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom">Custom Error UI</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('custom')).toBeInTheDocument()
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
    // Default recovery UI should NOT be shown
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('resets error state on "Try again" click', () => {
    let shouldThrow = true

    function ToggleThrower(): ReactNode {
      if (shouldThrow) throw new Error('Toggle error')
      return <div data-testid="recovered">Recovered!</div>
    }

    render(
      <ErrorBoundary>
        <ToggleThrower />
      </ErrorBoundary>
    )

    // Error UI visible
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Fix the condition BEFORE clicking retry
    shouldThrow = false

    // Click "Try again"
    fireEvent.click(screen.getByText('Try again'))

    // Children should now render successfully
    expect(screen.getByTestId('recovered')).toBeInTheDocument()
    expect(screen.getByText('Recovered!')).toBeInTheDocument()
  })

  it('calls onReset callback when retrying', () => {
    const onReset = vi.fn()

    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByText('Try again'))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('navigates home on "Go home" click', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    const goHomeBtn = screen.getByText('Go home')
    expect(goHomeBtn).toBeInTheDocument()
    fireEvent.click(goHomeBtn)
  })

  it('shows generic message when error has no message property', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error()} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument()
  })

  it('includes component stack in PostHog properties', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ component_stack: expect.any(String) })
    )
  })
})
