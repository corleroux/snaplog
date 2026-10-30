/**
 * Vendor Capture Flow State Types
 *
 * State management types for the vendor create flow with placeholder extraction.
 */

import type { VendorExtractionResult } from '@/types/vendor'
import type { CaptureSession } from '@/types/capture'
import type { Vendor } from '@/lib/supabase/types'

/**
 * Screens in the vendor capture flow
 */
export type VendorFlowScreen =
  | 'capture'      // Taking/selecting images
  | 'processing'   // AI extraction in progress
  | 'review'       // Review and edit extracted data
  | 'success'      // Successfully saved
  | 'error'        // Error occurred

/**
 * State for the vendor capture flow
 */
export interface VendorFlowState {
  /** Current screen in the flow */
  currentScreen: VendorFlowScreen

  /** Capture session with images */
  captureSession: CaptureSession | null

  /** Extraction result (after processing) */
  extractionResult: VendorExtractionResult | null

  /** Error message if any */
  error: string | null

  /** Whether a save operation is in progress */
  isSaving: boolean

  /** ID of the created vendor (after successful save) */
  createdVendorId: string | null

  /** Pending duplicate warning — set when a potential duplicate vendor is found */
  duplicateWarning: {
    companyName: string
    existingVendors: Vendor[]
  } | null
}

/**
 * Initial flow state
 */
export const INITIAL_VENDOR_FLOW_STATE: VendorFlowState = {
  currentScreen: 'capture',
  captureSession: null,
  extractionResult: null,
  error: null,
  isSaving: false,
  createdVendorId: null,
  duplicateWarning: null,
}

/**
 * Actions for the vendor flow
 */
export type VendorFlowAction =
  | { type: 'START_CAPTURE'; entityType: 'vendor' }
  | { type: 'SET_SESSION'; session: CaptureSession }
  | { type: 'START_PROCESSING' }
  | { type: 'PROCESSING_COMPLETE'; result: VendorExtractionResult }
  | { type: 'PROCESSING_FAILED'; error: string }
  | { type: 'START_SAVE' }
  | { type: 'SAVE_COMPLETE'; vendorId: string }
  | { type: 'SAVE_FAILED'; error: string }
  | { type: 'DUPLICATE_FOUND'; companyName: string; existingVendors: Vendor[] }
  | { type: 'DISMISS_DUPLICATE' }
  | { type: 'RESET' }
  | { type: 'GO_TO_SCREEN'; screen: VendorFlowScreen }

/**
 * Reducer for vendor flow state
 */
export function vendorFlowReducer(
  state: VendorFlowState,
  action: VendorFlowAction
): VendorFlowState {
  switch (action.type) {
    case 'START_CAPTURE':
      return {
        ...INITIAL_VENDOR_FLOW_STATE,
        currentScreen: 'capture',
      }

    case 'SET_SESSION':
      return {
        ...state,
        captureSession: action.session,
      }

    case 'START_PROCESSING':
      return {
        ...state,
        currentScreen: 'processing',
        error: null,
      }

    case 'PROCESSING_COMPLETE':
      return {
        ...state,
        currentScreen: 'review',
        extractionResult: action.result,
        error: null,
      }

    case 'PROCESSING_FAILED':
      return {
        ...state,
        currentScreen: 'error',
        error: action.error,
      }

    case 'START_SAVE':
      return {
        ...state,
        isSaving: true,
        error: null,
      }

    case 'SAVE_COMPLETE':
      return {
        ...state,
        currentScreen: 'success',
        isSaving: false,
        createdVendorId: action.vendorId,
      }

    case 'SAVE_FAILED':
      return {
        ...state,
        isSaving: false,
        error: action.error,
      }

    case 'DUPLICATE_FOUND':
      return {
        ...state,
        isSaving: false,
        duplicateWarning: {
          companyName: action.companyName,
          existingVendors: action.existingVendors,
        },
      }

    case 'DISMISS_DUPLICATE':
      return {
        ...state,
        duplicateWarning: null,
      }

    case 'RESET':
      return INITIAL_VENDOR_FLOW_STATE

    case 'GO_TO_SCREEN':
      return {
        ...state,
        currentScreen: action.screen,
      }

    default:
      return state
  }
}
