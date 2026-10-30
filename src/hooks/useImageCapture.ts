/**
 * Platform-aware image capture hook
 *
 * Always delegates to useFileInput (file picker).
 * Capacitor camera integration is disabled until properly implemented.
 *
 * Both paths produce a URI that works through the existing image pipeline.
 */

import { useCallback } from 'react'
// DISABLED: Capacitor camera causing issues on mobile — reintroduce properly later
// import { Capacitor } from '@capacitor/core'
// import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { useFileInput, type SelectedFile } from './useFileInput'

export interface CapturedImage {
  /** blob: URL (web) or webPath (native) */
  uri: string
  /** File name or generated name */
  name: string
  /** File size in bytes (web only) */
  size?: number
  /** MIME type (web only) */
  type?: string
}

export interface UseImageCaptureOptions {
  /** Callback when an image is captured/selected */
  onImageCaptured: (image: CapturedImage) => void
  /** Called when the user denies camera permission */
  onPermissionDenied?: () => void
}

export interface UseImageCaptureReturn {
  /** Trigger image capture — opens file picker */
  captureImage: () => Promise<void>
  /** True while camera is open / capture in progress */
  isCapturing: boolean
  /** Ref for hidden file input */
  inputRef: React.RefObject<HTMLInputElement | null>
  /** Change handler for hidden file input */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** Accept attribute for file input */
  accept: string
  /** Multiple attribute for file input */
  multiple: boolean
}

export function useImageCapture({
  onImageCaptured,
  // onPermissionDenied, // DISABLED: needed when Capacitor camera is re-enabled
}: UseImageCaptureOptions): UseImageCaptureReturn {
  const handleFileSelected = useCallback(
    (file: SelectedFile) => {
      onImageCaptured({
        uri: file.objectUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      })
    },
    [onImageCaptured],
  )

  const fileInput = useFileInput({
    onFileSelected: handleFileSelected,
    accept: 'image/*',
  })

  const captureImage = useCallback(async () => {
    // Always use file input — Capacitor camera disabled
    fileInput.triggerFilePicker()

    // DISABLED: Native camera path — reintroduce properly later
    // if (!Capacitor.isNativePlatform()) {
    //   fileInput.triggerFilePicker()
    //   return
    // }
    //
    // setIsCapturing(true)
    // try {
    //   const photo = await Camera.getPhoto({
    //     quality: 90,
    //     resultType: CameraResultType.Uri,
    //     source: CameraSource.Prompt,
    //   })
    //
    //   const format = photo.format ?? 'jpeg'
    //   const uri = photo.webPath ?? ''
    //   if (!uri) return
    //
    //   onImageCaptured({
    //     uri,
    //     name: `capture_${Date.now()}.${format}`,
    //   })
    // } catch (error: unknown) {
    //   if (error instanceof Error && error.message === 'User cancelled photos app') {
    //     return
    //   }
    //   if (
    //     error instanceof Error &&
    //     (error.message.toLowerCase().includes('permission') ||
    //       error.message.toLowerCase().includes('denied'))
    //   ) {
    //     onPermissionDenied?.()
    //     return
    //   }
    //   throw error
    // } finally {
    //   setIsCapturing(false)
    // }
  }, [fileInput])

  return {
    captureImage,
    isCapturing: false,
    inputRef: fileInput.inputRef,
    handleChange: fileInput.handleChange,
    accept: fileInput.accept,
    multiple: fileInput.multiple,
  }
}

// DISABLED: Native camera implementation — reintroduce properly later
// Re-enable imports above and uncomment the native branch in captureImage.
// Key issues to address:
// - iOS returns PNG from CameraResultType.Uri (no WebP support)
// - Image compression pipeline must run before upload
// - Permission handling needs testing on both iOS and Android

