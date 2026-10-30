import posthog from 'posthog-js'

export { posthog }

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  //const host = import.meta.env.VITE_POSTHOG_HOST

  if (!key) {
    console.warn('[PostHog] VITE_POSTHOG_KEY is not set. Analytics and error tracking disabled.')
    return
  }

  posthog.init(key, {
    api_host: 'https://us.i.posthog.com',
    ui_host: 'https://us.posthog.com',
    // Error tracking — captures uncaught exceptions automatically
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: true,
    },
    // Session recording for debugging production issues
    session_recording: {
      maskAllInputs: true,
    },
    // Do not trace non-actionable noise
    before_send(event) {
      if (!event) return null
      const msg = event.properties?.['$exception_message'] ?? ''
      if (msg.includes('ResizeObserver loop')) {
        return null
      }
      return event
    },
    loaded(ph) {
      if (import.meta.env.DEV) {
        ph.opt_out_capturing()
      }
    },
  })
}

/**
 * Set business context as PostHog super properties.
 * These are attached to every subsequent event until overwritten.
 * Call at flow entry points (vendor list, style list, capture session).
 */
export function setBusinessContext(context: {
  eventId?: string
  vendorId?: string
  styleId?: string
  scanSessionId?: string
}): void {
  const props: Record<string, string | undefined> = {}
  if (context.eventId !== undefined) props['event_id'] = context.eventId
  if (context.vendorId !== undefined) props['vendor_id'] = context.vendorId
  if (context.styleId !== undefined) props['style_id'] = context.styleId
  if (context.scanSessionId !== undefined) props['scan_session_id'] = context.scanSessionId
  posthog.register(props)
}