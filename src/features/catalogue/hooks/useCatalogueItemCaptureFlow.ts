/**
 * Schema-driven catalogue item capture flow hook (FR-SCH-05 + FR-EXT-06).
 *
 * Capture → extract → review → commit for any catalogue type defined in the
 * registry. Reviewer edits are stored separately from the extraction result,
 * so a re-extraction can never overwrite the reviewed document.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { useCaptureSession } from '@/hooks/useCaptureSession'
import { uploadCaptureImage } from '@/lib/upload/imageUpload'
import { createScanSession } from '@/lib/scanSession/scanSessionService'
import { createLogger } from '@/lib/logger'
import {
  getCatalogueType,
  isMissingValue,
  mergeReviewedEdits,
  type CatalogueTypeDefinition,
} from '../api/catalogueRegistry'
import { extractCatalogueItem } from '../api/extractCatalogueItem'
import { commitCatalogueItem } from '../api/commitCatalogueItem'

const logger = createLogger('CatalogueItemCaptureFlow')

export type CatalogueFlowScreen = 'picker' | 'capture' | 'processing' | 'review' | 'success' | 'error'

export interface CatalogueItemFlowState {
  screen: CatalogueFlowScreen
  definition: CatalogueTypeDefinition | null
  /** Raw extraction payload (schema output root, e.g. { item: {...} }). */
  extractionPayload: Record<string, unknown> | null
  /** Reviewer edits by schema path — always win over extraction values. */
  userEdits: Record<string, unknown>
  confidences: Record<string, number> | undefined
  extractedAt: string | null
  scanSessionId: string | null
  createdItemId: string | null
  isSaving: boolean
  error: string | null
  /** Extraction warnings shown on the review screen (EXT-06). */
  warnings: string[]
  /** Required-field validation errors by schema path — save is blocked. */
  validationErrors: Record<string, string>
}

const INITIAL_STATE: CatalogueItemFlowState = {
  screen: 'picker',
  definition: null,
  extractionPayload: null,
  userEdits: {},
  confidences: undefined,
  extractedAt: null,
  scanSessionId: null,
  createdItemId: null,
  isSaving: false,
  error: null,
  warnings: [],
  validationErrors: {},
}

function isLocalFileUri(uri: string): boolean {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('capacitor://') ||
    uri.startsWith('content://') ||
    uri.startsWith('blob:')
  )
}

export function useCatalogueItemCaptureFlow(options: {
  eventId: string
  vendorId: string
  onSuccess?: (itemId: string) => void
  onCancel?: () => void
}) {
  const { eventId, vendorId, onSuccess, onCancel } = options
  const captureSession = useCaptureSession()
  const captureSessionRef = useRef(captureSession)
  captureSessionRef.current = captureSession
  const definitionRef = useRef<CatalogueTypeDefinition | null>(null)

  const [state, setState] = useState<CatalogueItemFlowState>(INITIAL_STATE)

  /** Merged reviewed document: extraction values with user edits applied. */
  const reviewedValues = useMemo<Record<string, unknown> | null>(() => {
    if (!state.extractionPayload) {return null}
    return mergeReviewedEdits(state.extractionPayload, state.userEdits)
  }, [state.extractionPayload, state.userEdits])

  const selectGarmentType = useCallback(async (slug: string) => {
    try {
      const definition = await getCatalogueType(slug)
      definitionRef.current = definition
      setState((prev) => ({ ...prev, definition, screen: 'capture', error: null }))
      captureSessionRef.current.startSession('catalogue_item')
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load catalogue type',
        screen: 'error',
      }))
    }
  }, [])

  const proceedToProcessing = useCallback(async () => {
    const session = captureSessionRef.current.session
    if (!session) {
      setState((prev) => ({ ...prev, error: 'No capture session', screen: 'error' }))
      return
    }

    const validation = captureSessionRef.current.validate()
    if (!validation.valid) {
      setState((prev) => ({ ...prev, error: validation.errors.join(', '), screen: 'error' }))
      return
    }

    const infoImage = captureSessionRef.current.getInfoImage()
    if (!infoImage) {
      setState((prev) => ({ ...prev, error: 'No Info image selected for extraction', screen: 'error' }))
      return
    }

    const activeDefinition = definitionRef.current
    if (!activeDefinition) {
      setState((prev) => ({ ...prev, error: 'No catalogue type selected', screen: 'error' }))
      return
    }

    setState((prev) => ({ ...prev, screen: 'processing', error: null }))

    try {
      // Upload images.
      const imageUploads = await Promise.all(
        session.images.map(async (image) => {
          if (image.storagePath && !isLocalFileUri(image.uri)) {
            return { image, storagePath: image.storagePath, mimeType: image.mimeType }
          }
          if (!isLocalFileUri(image.uri)) {
            return { image }
          }
          const uploadResult = await uploadCaptureImage(image.uri, { eventId, vendorId })
          return {
            image,
            storagePath: uploadResult.storagePath,
            signedUrl: uploadResult.signedUrl,
            publicUrl: uploadResult.publicUrl,
            mimeType: uploadResult.mimeType,
          }
        })
      )

      const updatedSession = { ...session }
      for (const upload of imageUploads) {
        if (upload.storagePath) {
          const index = updatedSession.images.findIndex((img) => img.id === upload.image.id)
          if (index !== -1) {
            updatedSession.images[index] = {
              ...updatedSession.images[index],
              uri: upload.signedUrl || updatedSession.images[index].uri,
              storagePath: upload.storagePath,
              publicUrl: upload.publicUrl || updatedSession.images[index].publicUrl,
              mimeType: upload.mimeType || updatedSession.images[index].mimeType,
            }
          }
        }
      }

      const updatedInfoImage = updatedSession.images.find((img) => img.id === infoImage.id)
      if (!updatedInfoImage || !updatedInfoImage.storagePath) {
        throw new Error('Info image was not correctly uploaded')
      }

      // Read the selected definition (set at picker time). The scan type
      // comes from the registry — the first scan_types key is the default
      // capture for that catalogue type. No per-category code.
      const slug = activeDefinition.slug
      const scanType = Object.keys(activeDefinition.schema.scan_types ?? {})[0] ?? 'garment_flat'

      const scanSessionId = await createScanSession({
        eventId,
        vendorId,
        scanType,
        sourceImagePath: updatedInfoImage.storagePath,
        sourceImageUrl: updatedInfoImage.publicUrl || updatedInfoImage.uri,
      })

      const extraction = await extractCatalogueItem({
        scanSessionId,
        eventId,
        vendorId,
        storagePath: updatedInfoImage.storagePath,
        mimeType: updatedInfoImage.mimeType || 'image/webp',
        scanType,
        catalogueType: slug,
      })

      const confidences = extraction.confidence_scores
      const warnings = buildExtractionWarnings(
        extraction.item as Record<string, unknown>,
        activeDefinition,
        confidences
      )

      setState((prev) => ({
        ...prev,
        screen: 'review',
        // A fresh extraction resets reviewer edits for the new payload —
        // edits always belong to the payload they were made against.
        userEdits: {},
        extractionPayload: extraction.item as Record<string, unknown>,
        confidences,
        warnings,
        validationErrors: validateRequiredFields(
          extraction.item as Record<string, unknown>,
          activeDefinition
        ),
        extractedAt: new Date().toISOString(),
        scanSessionId,
        error: null,
      }))
    } catch (err) {
      logger.error('Catalogue item extraction failed', { error: String(err) })
      setState((prev) => ({
        ...prev,
        screen: 'error',
        error: err instanceof Error ? err.message : 'Extraction failed',
      }))
    }
  }, [eventId, vendorId])

  const handleFieldChange = useCallback((path: string, value: unknown) => {
    setState((prev) => {
      const userEdits = { ...prev.userEdits, [path]: value }
      // Re-validate required fields as the reviewer types.
      const merged = prev.extractionPayload
        ? mergeReviewedEdits(prev.extractionPayload, userEdits)
        : null
      return {
        ...prev,
        userEdits,
        validationErrors:
          merged && prev.definition ? validateRequiredFields(merged, prev.definition) : prev.validationErrors,
      }
    })
  }, [])

  const saveItem = useCallback(async () => {
    if (!reviewedValues || !state.scanSessionId) {return}
    setState((prev) => ({ ...prev, isSaving: true, error: null }))

    try {
      const root = state.definition?.schema.output_root ?? 'item'
      const item = (reviewedValues[root] ?? reviewedValues) as Record<string, unknown>
      // Colourway rows live under the schema array field; pass them through.
      const arrayField = state.definition?.schema.fields.find((f) => f.type === 'array')
      const colourways = arrayField
        ? (readNested(reviewedValues, arrayField.path) as Array<Record<string, unknown>> | undefined)
        : undefined

      const result = await commitCatalogueItem({
        scanSessionId: state.scanSessionId,
        eventId,
        vendorId,
        reviewedDocument: { item, colourways: colourways ?? null },
      })

      setState((prev) => ({ ...prev, screen: 'success', createdItemId: result.item_id, isSaving: false }))
      onSuccess?.(result.item_id)
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: err instanceof Error ? err.message : 'Save failed',
      }))
    }
  }, [reviewedValues, state.scanSessionId, state.definition, eventId, vendorId, onSuccess])

  const goBack = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: prev.screen === 'review' ? 'capture' : prev.screen === 'capture' ? 'picker' : prev.screen,
      error: null,
    }))
  }, [])

  const retryProcessing = useCallback(() => {
    setState((prev) => ({ ...prev, screen: 'capture', error: null }))
  }, [])

  const cancelFlow = useCallback(() => {
    setState(INITIAL_STATE)
    onCancel?.()
  }, [onCancel])

  return {
    state,
    reviewedValues,
    captureSession,
    selectGarmentType,
    proceedToProcessing,
    handleFieldChange,
    saveItem,
    goBack,
    retryProcessing,
    cancelFlow,
    canProceed: (captureSession.session?.images.length ?? 0) > 0,
  }
}

function readNested(payload: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.')
  let current: unknown = payload
  for (const segment of segments) {
    if (current === null || current === undefined) {return undefined}
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (!Number.isInteger(index)) {return undefined}
      current = current[index]
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }
  return current
}

/**
 * Build EXT-06 warnings: missing required fields + low-confidence fields.
 * Pure — unit-tested alongside the registry helpers.
 */
export function buildExtractionWarnings(
  payload: Record<string, unknown>,
  definition: CatalogueTypeDefinition,
  confidences?: Record<string, number>
): string[] {
  const warnings: string[] = []
  for (const field of definition.schema.fields) {
    if (field.required && isMissing(field.path)) {
      warnings.push(`${field.label} is required but was not extracted — confirm or fill it.`)
    }
    const score = confidences?.[field.path]
    if (score !== undefined && score < 0.5) {
      warnings.push(`Low extraction confidence (${Math.round(score * 100)}%) for ${field.label} — verify against the photo.`)
    }
  }
  return warnings

  function isMissing(path: string): boolean {
    return isMissingValue(readNested(payload, path))
  }
}

/**
 * Required-field validation errors by schema path. Save is blocked while
 * any required field is missing.
 */
export function validateRequiredFields(
  payload: Record<string, unknown>,
  definition: CatalogueTypeDefinition
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of definition.schema.fields) {
    if (field.required && isMissingValue(readNested(payload, field.path))) {
      errors[field.path] = `${field.label} is required`
    }
  }
  return errors
}
