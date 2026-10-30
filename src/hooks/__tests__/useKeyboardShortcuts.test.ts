/**
 * useKeyboardShortcuts Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKeyboardShortcuts, COMMON_SHORTCUTS } from '../useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should trigger action when shortcut key is pressed', () => {
    const action = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          {
            key: 'n',
            description: 'New item',
            action,
          },
        ],
      })
    )

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'n' })
      window.dispatchEvent(event)
    })

    expect(action).toHaveBeenCalled()
  })

  it('should trigger action with Ctrl key when specified', () => {
    const action = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          {
            key: 's',
            ctrlKey: true,
            description: 'Save',
            action,
          },
        ],
      })
    )

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true })
      window.dispatchEvent(event)
    })

    expect(action).toHaveBeenCalled()
  })

  it('should not trigger action when Ctrl key is missing', () => {
    const action = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          {
            key: 's',
            ctrlKey: true,
            description: 'Save',
            action,
          },
        ],
      })
    )

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: false })
      window.dispatchEvent(event)
    })

    expect(action).not.toHaveBeenCalled()
  })

  it('should not trigger when disabled', () => {
    const action = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        enabled: false,
        shortcuts: [
          {
            key: 'n',
            description: 'New',
            action,
          },
        ],
      })
    )

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'n' })
      window.dispatchEvent(event)
    })

    expect(action).not.toHaveBeenCalled()
  })

  it('should prevent default when specified', () => {
    const action = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          {
            key: 'n',
            description: 'New',
            action,
            preventDefault: true,
          },
        ],
      })
    )

    let prevented = false
    const event = new KeyboardEvent('keydown', { key: 'n' })
    event.preventDefault = () => { prevented = true }

    act(() => {
      window.dispatchEvent(event)
    })

    expect(prevented).toBe(true)
  })

  it('should trigger action for Shift key combination', () => {
    const action = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          {
            key: 'g',
            shiftKey: true,
            description: 'Go to first',
            action,
          },
        ],
      })
    )

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'g', shiftKey: true })
      window.dispatchEvent(event)
    })

    expect(action).toHaveBeenCalled()
  })

  it('should ignore shortcuts in input fields', () => {
    const action = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          {
            key: 'n',
            description: 'New',
            action,
          },
        ],
      })
    )

    // Create an input element and focus it
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'n' })
      input.dispatchEvent(event)
    })

    expect(action).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('should allow Escape key in input fields', () => {
    const action = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          {
            key: 'Escape',
            description: 'Close',
            action,
          },
        ],
      })
    )

    // Create an input element and focus it
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    act(() => {
      // Dispatch on window since that's where the listener is attached
      // The target will be the input element
      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      Object.defineProperty(event, 'target', { value: input, enumerable: true })
      window.dispatchEvent(event)
    })

    expect(action).toHaveBeenCalled()

    document.body.removeChild(input)
  })
})

describe('COMMON_SHORTCUTS', () => {
  it('should have all required shortcuts defined', () => {
    expect(COMMON_SHORTCUTS.NAVIGATE_UP).toBeDefined()
    expect(COMMON_SHORTCUTS.SEARCH).toBeDefined()
    expect(COMMON_SHORTCUTS.HELP).toBeDefined()
    expect(COMMON_SHORTCUTS.ESCAPE).toBeDefined()
  })
})
