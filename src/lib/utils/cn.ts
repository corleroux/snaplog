/**
 * BLAST RADIUS: ~71 importing files across the entire codebase.
 * Any rename, signature change, or removal will touch all consumers.
 * Refactor at your own risk — consider deprecation-warning + codemod.
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
