import { Component, type ErrorInfo, type ReactNode } from 'react'
import { posthog } from '@/lib/posthog'
import { ApplicationError } from '@/lib/errors'
import { AlertTriangle } from 'lucide-react'
import { AppFrame } from './app-frame'
import { AppFrameContent } from './app-frame'
import { Button } from './button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  feature?: string
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const fingerprint = error instanceof ApplicationError
      ? `app:${error.feature}:${error.message}`
      : `boundary:${this.props.feature || 'global'}:${error.name}`

    posthog.captureException(error, {
      $exception_fingerprint: fingerprint,
      error_boundary: this.props.feature || 'global',
      component_stack: errorInfo.componentStack,
    })
  }

  handleReset = (): void => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = (): void => {
    // Hard navigation is intentional for error recovery — the app may be in
    // an unknown state, so a full reset (losing cached queries and auth
    // context) is safer than a soft SPA navigation.
    window.location.href = '/'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <AppFrame>
          <AppFrameContent>
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-semibold">Something went wrong</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                An unexpected error occurred. Our team has been notified.
              </p>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={this.handleGoHome}>
                  Go home
                </Button>
                <Button onClick={this.handleReset}>
                  Try again
                </Button>
              </div>
            </div>
          </AppFrameContent>
        </AppFrame>
      )
    }

    return this.props.children
  }
}
