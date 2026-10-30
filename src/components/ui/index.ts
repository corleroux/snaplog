/**
 * UI Components - Design System Core
 *
 * Base reusable UI components following the design system
 */

// App Shell (Layer 1)
export { AppFrame, AppFrameContent } from './app-frame'
export { AppHeader } from './app-header'
export type { AppHeaderProps } from './app-header'
export { BottomActionBar } from './bottom-action-bar'
export type { BottomActionBarProps } from './bottom-action-bar'
export { NavigationFooter, useNavigationLinks } from './navigation-footer'
export type { NavigationFooterProps, NavLink } from './navigation-footer'

// Bottom Navigation (Section 10 - replaces context-aware NavigationFooter)
export { BottomNavigation } from '@/components/layout/BottomNavigation'

// Error Handling
export { ErrorBoundary } from './ErrorBoundary'

// Layout & Containers
export { SectionContainer } from './section-container'
export type { SectionContainerProps } from './section-container'

// Buttons
export { Button } from './button'
export type { ButtonProps } from './button'

// Inputs
export { Input } from './input'
export type { InputProps } from './input'

export { Textarea } from './textarea'
export type { TextareaProps } from './textarea'

export { Label } from './label'
export type { LabelProps } from './label'

// Cards
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card'

// Badges & Chips
export { Badge } from './badge'
export type { BadgeProps } from './badge'
export { ConfidenceBadge } from './ConfidenceBadge'
export type { ConfidenceBadgeProps } from './ConfidenceBadge'

// Overlays
export { Modal } from './modal'
export type { ModalProps } from './modal'

export { ImageLightbox } from './ImageLightbox'
export type { ImageLightboxProps } from './ImageLightbox'

// Feedback
export { Toast, ToastProvider, useToast } from './toast'
export type { ToastProps } from './toast'

// State Components
export { LoadingState, VendorLoadingState, StyleLoadingState, SearchLoadingState } from './LoadingState'
export type { LoadingStateProps } from './LoadingState'

export {
  ErrorState,
  NotFoundErrorState,
  NetworkErrorState,
  LoadingErrorState,
} from './ErrorState'
export type { ErrorStateProps } from './ErrorState'

export {
  EmptyState,
  VendorEmptyState,
  StyleEmptyState,
  SearchEmptyState,
} from './EmptyState'
export type { EmptyStateProps } from './EmptyState'
