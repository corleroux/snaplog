/**
 * KeyboardHelp Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KeyboardHelp, KeyboardHelpButton } from '../KeyboardHelp'

describe('KeyboardHelp', () => {
  it('should render shortcut groups', () => {
    const onClose = vi.fn()

    render(
      <KeyboardHelp
        isOpen={true}
        onClose={onClose}
      />
    )

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('should render individual shortcuts', () => {
    render(
      <KeyboardHelp isOpen={true} />
    )

    expect(screen.getByText('Navigate down')).toBeInTheDocument()
    expect(screen.getByText('Navigate up')).toBeInTheDocument()
    expect(screen.getByText('Create new item')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
  })

  it('should show key combinations correctly', () => {
    render(
      <KeyboardHelp isOpen={true} />
    )

    // Check for Ctrl key combination in search shortcut
    expect(screen.getByText('Search')).toBeInTheDocument()
    // The badge shows the key combination

    // Check for Shift key combination
    expect(screen.getByText('Go to first')).toBeInTheDocument()
  })

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn()

    render(
      <KeyboardHelp
        isOpen={true}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalled()
  })

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <KeyboardHelp isOpen={false} />
    )

    expect(container.firstChild).toBe(null)
  })

  it('should render custom shortcuts', () => {
    const customShortcuts = [
      {
        title: 'Custom',
        shortcuts: [
          { key: 'c', description: 'Custom action' },
        ],
      },
    ]

    render(
      <KeyboardHelp
        isOpen={true}
        shortcuts={customShortcuts}
      />
    )

    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByText('Custom action')).toBeInTheDocument()
  })
})

describe('KeyboardHelpButton', () => {
  it('should render button with keyboard indicator', () => {
    const onClick = vi.fn()

    render(
      <KeyboardHelpButton onClick={onClick} />
    )

    expect(screen.getByText('?')).toBeInTheDocument()
    expect(screen.getByText('Shortcuts')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const onClick = vi.fn()

    render(
      <KeyboardHelpButton onClick={onClick} />
    )

    fireEvent.click(screen.getByText('Shortcuts'))
    expect(onClick).toHaveBeenCalled()
  })
})
