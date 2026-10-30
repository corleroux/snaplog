/**
 * Price Display Utilities
 *
 * Frontend-only display conversions for pricing.
 * Yard → meter conversion for display purposes only.
 * No database changes involved.
 */

/** Yards to meters conversion factor (1 yard = 0.9144 meters) */
const YARDS_TO_METERS = 0.9144

export type PriceUnit = 'yard' | 'meter' | 'kg'

export interface PriceDisplayResult {
  /** The converted (or original) price value */
  displayPrice: number
  /** The display unit after conversion */
  displayUnit: string
}

/**
 * Convert a price for display purposes.
 *
 * - If unit is "yard": divides by 0.9144 to get per-meter price
 * - If unit is "meter" or "kg": returns as-is
 *
 * @param price - The numeric price value
 * @param unit - The price unit ("yard", "meter", or "kg")
 * @returns Converted price and display unit
 */
export function convertPriceForDisplay(price: number, unit: string | null | undefined): PriceDisplayResult {
  if (unit === 'yard') {
    return {
      displayPrice: price / YARDS_TO_METERS,
      displayUnit: 'meter',
    }
  }

  return {
    displayPrice: price,
    displayUnit: unit || 'meter',
  }
}
