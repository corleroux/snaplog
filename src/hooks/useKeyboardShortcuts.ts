/**
 * Keyboard Shortcuts Hook
 *
 * Provides global keyboard shortcuts for navigation and quick actions.
 */

import { useEffect, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  description: string
  action: () => void
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
  scope?: string // For isolating shortcuts in different contexts
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  scope = 'global',
}: UseKeyboardShortcutsOptions) {
  const activeShortcuts = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field - skip shortcuts there
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Still allow Escape key
        if (e.key !== 'Escape') {
          return
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = shortcut.ctrlKey === undefined || e.ctrlKey === shortcut.ctrlKey
        const metaMatch = shortcut.metaKey === undefined || e.metaKey === shortcut.metaKey
        const shiftMatch = shortcut.shiftKey === undefined || e.shiftKey === shortcut.shiftKey

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
          // Prevent duplicate triggers
          const shortcutId = `${scope}-${shortcut.key}`
          if (activeShortcuts.current.has(shortcutId)) return

          if (shortcut.preventDefault !== false) {
            e.preventDefault()
          }

          activeShortcuts.current.add(shortcutId)
          shortcut.action()

          // Clear after a short delay to prevent repeat triggers
          setTimeout(() => {
            activeShortcuts.current.delete(shortcutId)
          }, 100)
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled, scope])
}

/**
 * Predefined keyboard shortcuts for common actions
 */
export const COMMON_SHORTCUTS = {
  // Navigation
  NAVIGATE_UP: { key: 'k', description: 'Navigate up' },
  NAVIGATE_DOWN: { key: 'j', description: 'Navigate down' },
  NAVIGATE_LEFT: { key: 'h', description: 'Navigate left' },
  NAVIGATE_RIGHT: { key: 'l', description: 'Navigate right' },
  NAVIGATE_FIRST: { key: 'g', shiftKey: true, description: 'Go to first' },
  NAVIGATE_LAST: { key: 'G', description: 'Go to last' },

  // Quick actions
  NEW_ITEM: { key: 'n', description: 'Create new item' },
  SEARCH: { key: '/', description: 'Search', ctrlKey: true, metaKey: true },
  HELP: { key: '?', description: 'Show keyboard shortcuts' },

  // Actions
  SAVE: { key: 's', ctrlKey: true, metaKey: true, description: 'Save' },
  EDIT: { key: 'e', description: 'Edit selected item' },
  DELETE: { key: 'd', description: 'Delete selected item' },
  ARCHIVE: { key: 'a', description: 'Archive selected item' },
  EXPORT: { key: 'x', description: 'Export' },

  // View
  TOGGLE_SIDEBAR: { key: 'b', description: 'Toggle sidebar' },
  TOGGLE_THEME: { key: 't', description: 'Toggle theme' },

  // System
  ESCAPE: { key: 'Escape', description: 'Close modal / clear selection' },
  ENTER: { key: 'Enter', description: 'Confirm / select' },
}
