/**
 * Mention Input Component
 *
 * Textarea with @mention support for tagging users.
 * Shows autocomplete popup when typing @.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

export interface MentionUser {
  id: string
  email: string
  fullName?: string
}

export interface MentionInputProps {
  /** Current value of the input */
  value: string
  /** Callback when value changes */
  onChange: (value: string, mentionedUsers: MentionUser[]) => void
  /** Available users to mention */
  availableUsers: MentionUser[]
  /** Placeholder text */
  placeholder?: string
  /** Minimum rows */
  rows?: number
  /** Optional additional className */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

interface MentionMatch {
  start: number
  end: number
  query: string
}

/**
 * Extract @mention query from text at cursor position
 */
function findMentionQuery(text: string, cursorPos: number): MentionMatch | null {
  // Find the @ symbol before cursor
  let atPos = -1
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (text[i] === '@') {
      atPos = i
      break
    }
    // Stop if we hit whitespace
    if (/\s/.test(text[i])) {
      break
    }
  }

  if (atPos === -1) return null

  // Check if @ is preceded by whitespace or start of line
  if (atPos > 0 && !/\s/.test(text[atPos - 1])) {
    return null
  }

  const query = text.slice(atPos + 1, cursorPos)
  return { start: atPos, end: cursorPos, query }
}

/**
 * Mention Input Component
 *
 * Textarea with @mention autocomplete support.
 */
export function MentionInput({
  value,
  onChange,
  availableUsers,
  placeholder = 'Type @ to mention someone...',
  rows = 3,
  className,
  disabled = false
}: MentionInputProps) {
  const [cursorPosition, setCursorPosition] = useState(0)
  const [mentionMatch, setMentionMatch] = useState<MentionMatch | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionedUsers, setMentionedUsers] = useState<Map<string, MentionUser>>(new Map())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Filter users based on mention query
  const filteredUsers = mentionMatch
    ? availableUsers.filter(user => {
        const name = user.fullName?.toLowerCase() || ''
        const email = user.email.toLowerCase()
        const query = mentionMatch.query.toLowerCase()
        return name.includes(query) || email.includes(query)
      })
    : []

  // Handle cursor position change
  const handleCursorChange = useCallback(() => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart)
    }
  }, [])

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue, Array.from(mentionedUsers.values()))
    handleCursorChange()
  }, [onChange, mentionedUsers, handleCursorChange])

  // Handle keyboard navigation in popup
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionMatch || filteredUsers.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => (i + 1) % filteredUsers.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => (i - 1 + filteredUsers.length) % filteredUsers.length)
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        insertMention(filteredUsers[selectedIndex])
        break
      case 'Escape':
        e.preventDefault()
        setMentionMatch(null)
        break
    }
  }, [mentionMatch, filteredUsers, selectedIndex])

  // Insert selected mention
  const insertMention = useCallback((user: MentionUser) => {
    if (!mentionMatch || !textareaRef.current) return

    const before = value.slice(0, mentionMatch.start)
    const after = value.slice(mentionMatch.end)
    const mentionText = `@${user.fullName || user.email.split('@')[0]} `
    const newValue = before + mentionText + after

    setMentionedUsers(prev => new Map(prev).set(user.id, user))
    onChange(newValue, Array.from(new Map(mentionedUsers).set(user.id, user).values()))
    setMentionMatch(null)
    setSelectedIndex(0)

    // Set cursor after mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionMatch.start + mentionText.length
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        textareaRef.current.focus()
      }
    }, 0)
  }, [mentionMatch, value, mentionedUsers, onChange])

  // Check for mention trigger on cursor change
  useEffect(() => {
    const match = findMentionQuery(value, cursorPosition)
    setMentionMatch(match)
    setSelectedIndex(0)
  }, [value, cursorPosition])

  // Get mentioned users from value
  useEffect(() => {
    const mentions = new Map<string, MentionUser>()
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g
    let match

    while ((match = mentionRegex.exec(value)) !== null) {
      const mentionText = match[1]
      const user = availableUsers.find(u =>
        (u.fullName && u.fullName === mentionText) ||
        u.email.split('@')[0] === mentionText
      )
      if (user) {
        mentions.set(user.id, user)
      }
    }

    setMentionedUsers(mentions)
  }, [value, availableUsers])

  // Click outside to close popup
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setMentionMatch(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get popup position
  const getPopupPosition = useCallback(() => {
    if (!textareaRef.current || !mentionMatch) return {}

    const textBefore = value.slice(0, mentionMatch.start)
    const lines = textBefore.split('\n')

    // Approximate position (may need adjustment based on font)
    const lineHeight = 24 // approximate line height in pixels
    const charWidth = 8 // approximate character width

    return {
      top: `${lines.length * lineHeight + 10}px`,
      left: `${Math.min(lines[lines.length - 1].length * charWidth, 300)}px`
    }
  }, [value, mentionMatch])

  const popupPosition = getPopupPosition()

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={handleCursorChange}
        onKeyUp={handleCursorChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cn('resize-none', className)}
      />

      {/* Mention autocomplete popup */}
      {mentionMatch && filteredUsers.length > 0 && (
        <div
          ref={popupRef}
          className={cn(
            'absolute z-50 w-64 bg-popover border border-border rounded-md shadow-lg',
            'max-h-60 overflow-y-auto'
          )}
          style={popupPosition}
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className={cn(
                'w-full text-left px-3 py-2 flex items-center gap-2',
                'hover:bg-muted transition-colors',
                index === selectedIndex && 'bg-muted'
              )}
            >
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                {(user.fullName || user.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.fullName || user.email.split('@')[0]}
                </p>
                {user.fullName && (
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Mentioned users display */}
      {mentionedUsers.size > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {Array.from(mentionedUsers.values()).map(user => (
            <Badge key={user.id} variant="secondary" className="text-xs">
              @{user.fullName || user.email.split('@')[0]}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
