import { useState, useCallback } from 'react'
import { X, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import posthog from 'posthog-js'

interface FeedbackOverlayProps {
  isOpen: boolean
  onClose: () => void
}

const MAX_CHARS = 5000

export function FeedbackOverlay({ isOpen, onClose }: FeedbackOverlayProps) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { showToast } = useToast()

  const handleSubmit = useCallback(async () => {
    if (!message.trim() || submitting) return

    setSubmitting(true)
    try {
      const pageUrl = window.location.href
      const sessionId = posthog.get_session_id?.() ?? null
      const userAgent = navigator.userAgent

      const { error } = await supabase.functions.invoke('submit-feedback', {
        body: {
          message: message.trim(),
          page_url: pageUrl,
          posthog_session_id: sessionId,
          user_agent: userAgent,
        },
      })

      if (error) {
        showToast({ title: 'Failed to send feedback', description: error.message, variant: 'error' })
        return
      }

      showToast({ title: 'Feedback sent!', description: 'Thank you for your input.', variant: 'success' })
      setMessage('')
      onClose()
    } catch (err) {
      showToast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }, [message, submitting, onClose, showToast])

  const charsLeft = MAX_CHARS - message.length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 pb-4 pt-5 safe-area-top">
        <h2 className="text-lg font-semibold text-foreground">Feedback</h2>
        <button
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Close feedback"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-5 gap-4">
        <p className="text-sm text-muted-foreground">
          Help us improve the app. Describe what you were doing, what went wrong, or what you would like to see changed.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
          placeholder="Type your feedback here..."
          className={cn(
            'flex-1 w-full min-h-[200px] rounded-lg border border-input bg-background px-4 py-3',
            'text-sm placeholder:text-muted-foreground/50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30',
            'resize-none'
          )}
          disabled={submitting}
          autoFocus
        />
        <div className="flex justify-end">
          <span className={cn(
            'text-xs',
            charsLeft < 100 ? 'text-red-500 font-medium' : 'text-muted-foreground'
          )}>
            {charsLeft} characters remaining
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-5 pb-6 pt-4 safe-area-bottom">
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || submitting}
          className={cn(
            'w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3',
            'text-sm font-medium text-white',
            'bg-orange-500 hover:bg-orange-600 active:bg-orange-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50',
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Feedback
            </>
          )}
        </button>
      </div>
    </div>
  )
}
