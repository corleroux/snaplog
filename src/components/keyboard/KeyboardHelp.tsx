/**
 * KeyboardHelp Component
 *
 * Modal showing all available keyboard shortcuts.
 */

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface ShortcutGroup {
  title: string
  shortcuts: {
    key: string
    description: string
    ctrl?: boolean
    meta?: boolean
    shift?: boolean
  }[]
}

const DEFAULT_SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'j', description: 'Navigate down' },
      { key: 'k', description: 'Navigate up' },
      { key: 'h', description: 'Navigate left' },
      { key: 'l', description: 'Navigate right' },
      { key: 'g', shift: true, description: 'Go to first' },
      { key: 'G', description: 'Go to last' },
      { key: 'Enter', description: 'Open / select' },
    ],
  },
  {
    title: 'Quick Actions',
    shortcuts: [
      { key: 'n', description: 'Create new item' },
      { key: '/', ctrl: true, meta: true, description: 'Search' },
      { key: 'e', description: 'Edit selected' },
      { key: 'd', description: 'Delete selected' },
      { key: 'a', description: 'Archive selected' },
      { key: 'x', description: 'Export' },
    ],
  },
  {
    title: 'System',
    shortcuts: [
      { key: '?', description: 'Show this help' },
      { key: 'Escape', description: 'Close / cancel' },
      { key: 's', ctrl: true, meta: true, description: 'Save' },
    ],
  },
]

interface KeyboardHelpProps {
  /** Custom shortcut groups to display */
  shortcuts?: ShortcutGroup[]
  /** Whether the help modal is open */
  isOpen?: boolean
  /** Callback when close is requested */
  onClose?: () => void
}

export function KeyboardHelp({
  shortcuts = DEFAULT_SHORTCUTS,
  isOpen = true,
  onClose,
}: KeyboardHelpProps) {
  if (!isOpen) return null

  const formatKey = (shortcut: { key: string; ctrl?: boolean; meta?: boolean; shift?: boolean }) => {
    const parts: string[] = []
    if (shortcut.ctrl) parts.push('Ctrl')
    if (shortcut.meta) parts.push('⌘')
    if (shortcut.shift) parts.push('Shift')
    parts.push(shortcut.key === ' ' ? 'Space' : shortcut.key)
    return parts.join(' + ')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Keyboard Shortcuts</CardTitle>
              <CardDescription>
                Navigate and perform actions faster with keyboard shortcuts
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {shortcuts.map((group) => (
              <div key={group.title}>
                <h3 className="font-semibold text-sm mb-3">{group.title}</h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key + shortcut.ctrl + shortcut.meta + shortcut.shift}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {shortcut.description}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {formatKey(shortcut)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded">?</kbd> anytime to open this help
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Trigger button for keyboard help
 */
export function KeyboardHelpButton({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="text-muted-foreground"
    >
      <kbd className="mr-1 px-1.5 py-0.5 bg-muted rounded text-xs">?</kbd>
      Shortcuts
    </Button>
  )
}
