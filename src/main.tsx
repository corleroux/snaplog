import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './app/App'
import { initPostHog } from './lib/posthog'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

// Initialize PostHog before rendering
initPostHog()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary feature="global">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
