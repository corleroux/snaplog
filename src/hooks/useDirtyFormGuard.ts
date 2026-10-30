/**
 * useDirtyFormGuard Hook
 *
 * Provides dirty-state protection for edit forms.
 * Warns users before they navigate away with unsaved changes.
 *
 * DESIGN PRINCIPLES:
 * - Manual-only edit flows
 * - No AI or re-extraction behavior
 * - Clear confirmation before data loss
 * - Non-intrusive when no changes exist
 *
 * FEATURES:
 * - Detects whether form data differs from initial values
 * - Intercepts navigation attempts when dirty
 * - Shows confirmation dialog before losing unsaved changes
 * - Allows immediate exit when no changes exist
 * - Configurable comparison function
 *
 * @example
 * ```tsx
 * const { isDirty, handleNavigateAway, confirmNavigation, cancelNavigation } =
 *   useDirtyFormGuard({
 *     initialData: product,
 *     currentData: formData,
 *     isEqual: (a, b) => a.name === b.name,
 *     onConfirm: () => navigate(-1),
 *   })
 * ```
 */

import { useState, useCallback, useMemo } from 'react'

export interface DirtyFormGuardOptions<T> {
  /** Initial data to compare against */
  initialData: T
  /** Current form data */
  currentData: T
  /**
   * Custom comparison function.
   * Return true if data is equal (not dirty).
   * Defaults to shallow equality check.
   */
  isEqual?: (initial: T, current: T) => boolean
  /**
   * Called when user confirms navigation away.
   * This should perform the actual navigation.
   */
  onConfirm: () => void
  /**
   * Optional custom confirmation message.
   * Defaults to a generic unsaved changes message.
   */
  message?: string
  /**
   * Optional custom title for the confirmation dialog.
   * Defaults to "Unsaved changes".
   */
  title?: string
}

export interface DirtyFormGuardReturn {
  /** Whether the form has unsaved changes */
  isDirty: boolean
  /** Whether the confirmation dialog is currently shown */
  isShowingConfirmation: boolean
  /**
   * Call this when user attempts to navigate away.
   * If dirty, will show confirmation dialog.
   * If not dirty, will call onConfirm immediately.
   */
  handleNavigateAway: () => void
  /** Call this to confirm navigation and close dialog */
  confirmNavigation: () => void
  /** Call this to cancel navigation and close dialog */
  cancelNavigation: () => void
  /** Confirmation dialog title */
  dialogTitle: string
  /** Confirmation dialog message */
  dialogMessage: string
}

/**
 * Default shallow comparison function.
 * Compares primitive values and does a shallow check on objects/arrays.
 */
function defaultIsEqual<T>(a: T, b: T): boolean {
  if (a === b) return true

  // Handle null/undefined
  if (a == null || b == null) return a === b

  // Handle arrays (shallow comparison)
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => item === b[index])
  }

  // Handle objects (shallow comparison of own properties)
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object)
    const keysB = Object.keys(b as object)

    if (keysA.length !== keysB.length) return false

    return keysA.every((key) => {
      const valA = (a as Record<string, unknown>)[key]
      const valB = (b as Record<string, unknown>)[key]
      return valA === valB
    })
  }

  return false
}

/**
 * Hook for dirty-form protection in edit screens.
 *
 * This hook provides a consistent pattern for protecting users from
 * accidentally losing unsaved changes when navigating away from edit forms.
 *
 * It intentionally does NOT:
 * - Trigger any AI extraction
 * - Perform any backend operations
 * - Auto-save or persist data
 * - Modify the form data
 *
 * It ONLY:
 * - Detects dirty state
 * - Shows confirmation dialog
 * - Allows or blocks navigation based on user choice
 */
export function useDirtyFormGuard<T>(options: DirtyFormGuardOptions<T>): DirtyFormGuardReturn {
  const {
    initialData,
    currentData,
    isEqual = defaultIsEqual,
    onConfirm,
    message = 'You have unsaved changes. If you leave, your changes will be lost.',
    title = 'Unsaved changes',
  } = options

  const [isShowingConfirmation, setIsShowingConfirmation] = useState(false)

  // Check if form is dirty using the provided comparison function
  const isDirty = useMemo(() => {
    return !isEqual(initialData, currentData)
  }, [initialData, currentData, isEqual])

  /**
   * Handle navigation attempt.
   * If dirty, show confirmation dialog.
   * If not dirty, proceed immediately.
   */
  const handleNavigateAway = useCallback(() => {
    if (isDirty) {
      setIsShowingConfirmation(true)
    } else {
      onConfirm()
    }
  }, [isDirty, onConfirm])

  /**
   * User confirmed they want to discard changes.
   * Proceed with navigation.
   */
  const confirmNavigation = useCallback(() => {
    setIsShowingConfirmation(false)
    onConfirm()
  }, [onConfirm])

  /**
   * User cancelled - stay on the edit screen.
   */
  const cancelNavigation = useCallback(() => {
    setIsShowingConfirmation(false)
  }, [])

  return {
    isDirty,
    isShowingConfirmation,
    handleNavigateAway,
    confirmNavigation,
    cancelNavigation,
    dialogTitle: title,
    dialogMessage: message,
  }
}

/**
 * Convenience hook for React Hook Form integration.
 * Works with react-hook-form's formState.isDirty but adds confirmation dialog.
 *
 * @example
 * ```tsx
 * const { isDirty, handleNavigateAway, confirmNavigation, cancelNavigation,
 *         isShowingConfirmation, dialogTitle, dialogMessage } =
 *   useDirtyFormGuardRHF({
 *     isDirty: formState.isDirty,
 *     onConfirm: () => navigate(-1),
 *   })
 * ```
 */
export interface DirtyFormGuardRHFOptions {
  /** Whether the form is dirty (from react-hook-form formState) */
  isDirty: boolean
  /** Called when user confirms navigation away */
  onConfirm: () => void
  /** Optional custom confirmation message */
  message?: string
  /** Optional custom title */
  title?: string
}

export interface DirtyFormGuardRHFReturn {
  /** Whether the form is dirty (passed through) */
  isDirty: boolean
  /** Whether the confirmation dialog is currently shown */
  isShowingConfirmation: boolean
  /** Call this when user attempts to navigate away */
  handleNavigateAway: () => void
  /** Call this to confirm navigation and close dialog */
  confirmNavigation: () => void
  /** Call this to cancel navigation and close dialog */
  cancelNavigation: () => void
  /** Confirmation dialog title */
  dialogTitle: string
  /** Confirmation dialog message */
  dialogMessage: string
}

export function useDirtyFormGuardRHF(options: DirtyFormGuardRHFOptions): DirtyFormGuardRHFReturn {
  const { isDirty, onConfirm, message, title } = options
  const [isShowingConfirmation, setIsShowingConfirmation] = useState(false)

  const handleNavigateAway = useCallback(() => {
    if (isDirty) {
      setIsShowingConfirmation(true)
    } else {
      onConfirm()
    }
  }, [isDirty, onConfirm])

  const confirmNavigation = useCallback(() => {
    setIsShowingConfirmation(false)
    onConfirm()
  }, [onConfirm])

  const cancelNavigation = useCallback(() => {
    setIsShowingConfirmation(false)
  }, [])

  return {
    isDirty,
    isShowingConfirmation,
    handleNavigateAway,
    confirmNavigation,
    cancelNavigation,
    dialogTitle: title || 'Unsaved changes',
    dialogMessage: message || 'You have unsaved changes. If you leave, your changes will be lost.',
  }
}
