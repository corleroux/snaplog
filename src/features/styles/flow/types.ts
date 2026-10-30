/**
 * Style Capture Flow State Types
 *
 * State management types for the style create flow with placeholder extraction.
 */

import type { StyleExtractionResult } from '@/types/style'
import type { CaptureSession } from '@/types/capture'

/**
 * Screens in the style capture flow
 */
export type StyleFlowScreen =
  | 'capture'      // Taking/selecting images
  | 'processing'   // AI extraction in progress
  | 'review'       // Review and edit extracted data
  | 'success'      // Successfully saved
  | 'error'        // Error occurred

/**
 * State for the style capture flow
 */
export interface StyleFlowState {
  /** Current screen in the flow */
  currentScreen: StyleFlowScreen

  /** Capture session with images */
  captureSession: CaptureSession | null

  /** Extraction result (after processing) */
  extractionResult: StyleExtractionResult | null

  /** Error message if any */
  error: string | null

  /** Whether a save operation is in progress */
  isSaving: boolean

  /** ID of the created style (after successful save) */
  createdStyleId: string | null

  /** Duplicate info if found during save */
  duplicateInfo: {
    itemCode: string
    existingStyle: any
  } | null
}

/**
 * Initial flow state
 */
export const INITIAL_STYLE_FLOW_STATE: StyleFlowState = {
  currentScreen: 'capture',
  captureSession: null,
  extractionResult: null,
  error: null,
  isSaving: false,
  createdStyleId: null,
  duplicateInfo: null,
}

/**
 * Actions for the style flow
 */
export type StyleFlowAction =
  | { type: 'START_CAPTURE'; entityType: 'style' }
  | { type: 'SET_SESSION'; session: CaptureSession }
  | { type: 'START_PROCESSING' }
  | { type: 'PROCESSING_COMPLETE'; result: StyleExtractionResult }
  | { type: 'PROCESSING_FAILED'; error: string }
  | { type: 'START_SAVE' }
  | { type: 'SAVE_COMPLETE'; styleId: string }
  | { type: 'SAVE_FAILED'; error: string }
  | { type: 'DUPLICATE_FOUND'; itemCode: string; existingStyle: any }
  | { type: 'CONFIRM_DUPLICATE' }
  | { type: 'RESET' }
  | { type: 'GO_TO_SCREEN'; screen: StyleFlowScreen }

/**
 * Reducer for style flow state
 */
export function styleFlowReducer(
  state: StyleFlowState,
  action: StyleFlowAction
): StyleFlowState {
  switch (action.type) {
    case 'START_CAPTURE':
      return {
        ...INITIAL_STYLE_FLOW_STATE,
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
        duplicateInfo: null,
      }

    case 'DUPLICATE_FOUND':
      return {
        ...state,
        isSaving: false,
        duplicateInfo: {
          itemCode: action.itemCode,
          existingStyle: action.existingStyle,
        },
      }

    case 'CONFIRM_DUPLICATE':
      return {
        ...state,
        duplicateInfo: null,
      }

    case 'SAVE_COMPLETE':
      return {
        ...state,
        currentScreen: 'success',
        isSaving: false,
        createdStyleId: action.styleId,
      }

    case 'SAVE_FAILED':
      return {
        ...state,
        isSaving: false,
        error: action.error,
      }

    case 'RESET':
      return INITIAL_STYLE_FLOW_STATE

    case 'GO_TO_SCREEN':
      return {
        ...state,
        currentScreen: action.screen,
      }

    default:
      return state
  }
}
