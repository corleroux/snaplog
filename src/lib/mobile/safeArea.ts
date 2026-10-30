/**
 * Safe area utilities for mobile-first layout
 *
 * Uses CSS environment variables where available (via Capacitor Safe Area plugin)
 * with sensible fallbacks for web/desktop environments
 */

// CSS environment variable constants for safe area insets
export const SAFE_AREA_TOP = 'env(safe-area-inset-top, 0px)'
export const SAFE_AREA_BOTTOM = 'env(safe-area-inset-bottom, 0px)'
export const SAFE_AREA_LEFT = 'env(safe-area-inset-left, 0px)'
export const SAFE_AREA_RIGHT = 'env(safe-area-inset-right, 0px)'

/**
 * Generates safe area padding object for use in inline styles or CSS-in-JS
 * @returns Object with padding values using CSS env() variables
 */
export function getSafeAreaPadding() {
  return {
    paddingTop: SAFE_AREA_TOP,
    paddingBottom: SAFE_AREA_BOTTOM,
    paddingLeft: SAFE_AREA_LEFT,
    paddingRight: SAFE_AREA_RIGHT,
  }
}

/**
 * Safe area inset values for use with Tailwind's arbitrary value syntax
 * Example: style={{ paddingTop: SAFE_INSETS.top }}
 */
export const SAFE_INSETS = {
  top: SAFE_AREA_TOP,
  bottom: SAFE_AREA_BOTTOM,
  left: SAFE_AREA_LEFT,
  right: SAFE_AREA_RIGHT,
} as const
