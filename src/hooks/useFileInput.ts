/**
 * React hook for managing file input with a hidden file element
 *
 * Provides a programmatic way to trigger file picker dialogs
 * and handle file selection with object URL creation.
 *
 * This is useful for "upload" buttons that need to trigger
 * the native file picker from custom UI elements.
 */

import { useRef, useCallback, type RefObject } from 'react'

export interface SelectedFile {
  /** Object URL for preview (blob:...) */
  objectUrl: string
  /** The original File object */
  file: File
  /** File name */
  name: string
  /** File size in bytes */
  size: number
  /** MIME type */
  type: string
}

export interface UseFileInputOptions {
  /** Callback when a file is selected */
  onFileSelected: (file: SelectedFile) => void
  /** Accept attribute for file input (e.g., 'image/*', '.pdf') */
  accept?: string
  /** Whether to allow multiple files (not yet supported) */
  multiple?: boolean
}

export interface UseFileInputReturn {
  /** Programmatically trigger the file picker dialog */
  triggerFilePicker: () => void
  /** Ref to attach to the file input element */
  inputRef: RefObject<HTMLInputElement | null>
  /** Change handler to attach to the file input element */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** Accept attribute value */
  accept: string
  /** Multiple attribute value */
  multiple: boolean
}

/**
 * Hook for managing a hidden file input element
 *
 * @example
 * ```tsx
 * const { triggerFilePicker, inputRef, handleChange, accept, multiple } = useFileInput({
 *   onFileSelected: (file) => {
 *     console.log('Selected:', file.name, file.objectUrl)
 *   },
 *   accept: 'image/*'
 * })
 *
 * return (
 *   <div>
 *     <input
 *       ref={inputRef}
 *       type="file"
 *       accept={accept}
 *       multiple={multiple}
 *       onChange={handleChange}
 *       style={{ display: 'none' }}
 *     />
 *     <Button onClick={triggerFilePicker}>Choose File</Button>
 *   </div>
 * )
 * ```
 */
export function useFileInput({
  onFileSelected,
  accept = 'image/*',
  multiple = false,
}: UseFileInputOptions): UseFileInputReturn {
  const inputRef = useRef<HTMLInputElement>(null)

  const triggerFilePicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    onFileSelected({
      objectUrl,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Reset the input so the same file can be selected again if needed
    e.target.value = ''
  }, [onFileSelected])

  return {
    triggerFilePicker,
    inputRef,
    handleChange,
    accept,
    multiple,
  }
}
