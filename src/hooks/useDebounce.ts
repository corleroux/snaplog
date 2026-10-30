/**
 * useDebounce Hook
 *
 * Debounces a value by delaying the update until after a specified delay
 * has passed since the last value change.
 */

import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set a timeout to update the debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cancel the timeout if value changes before delay elapses
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
