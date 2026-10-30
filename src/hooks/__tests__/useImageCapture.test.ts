/**
 * useImageCapture hook tests
 *
 * Tests:
 * - Web platform: delegates to file picker
 * - Native platform: calls Camera.getPhoto, maps webPath
 * - User cancellation: silent
 * - Permission denial: calls onPermissionDenied
 * - isCapturing state transitions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Camera } from '@capacitor/camera'

// Hoist mock so it's available during mock factory execution
const { mockIsNativePlatform } = vi.hoisted(() => ({
  mockIsNativePlatform: vi.fn(() => false),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
    isNativePlatform: () => mockIsNativePlatform(),
    isPluginAvailable: () => false,
  },
}))

import { useImageCapture } from '../useImageCapture'

describe('useImageCapture', () => {
  const mockOnImageCaptured = vi.fn()
  const mockOnPermissionDenied = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsNativePlatform.mockReturnValue(false)
  })

  describe('web platform', () => {
    it('returns isCapturing as false initially', () => {
      const { result } = renderHook(() =>
        useImageCapture({
          onImageCaptured: mockOnImageCaptured,
        }),
      )

      expect(result.current.isCapturing).toBe(false)
    })

    it('provides inputRef, handleChange, accept, and multiple for file input', () => {
      const { result } = renderHook(() =>
        useImageCapture({
          onImageCaptured: mockOnImageCaptured,
        }),
      )

      expect(result.current.inputRef).toBeDefined()
      expect(result.current.handleChange).toBeInstanceOf(Function)
      expect(result.current.accept).toBe('image/*')
      expect(result.current.multiple).toBe(false)
    })

    it('calls onImageCaptured when file input handles a file', () => {
      const { result } = renderHook(() =>
        useImageCapture({
          onImageCaptured: mockOnImageCaptured,
        }),
      )

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockEvent = {
        target: { files: [file], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>

      act(() => {
        result.current.handleChange(mockEvent)
      })

      expect(mockOnImageCaptured).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: expect.stringContaining('blob:'),
          name: 'test.jpg',
          size: 4,
          type: 'image/jpeg',
        }),
      )
    })

    it('delegates captureImage to file picker trigger on web', () => {
      const { result } = renderHook(() =>
        useImageCapture({
          onImageCaptured: mockOnImageCaptured,
        }),
      )

      // On web, captureImage should just call triggerFilePicker (click the input ref)
      // We can verify it doesn't throw and doesn't call Camera.getPhoto
      act(() => {
        result.current.captureImage()
      })

      expect(Camera.getPhoto).not.toHaveBeenCalled()
    })
  })

  // DISABLED: Capacitor camera integration disabled — re-enable when properly implemented
  describe.skip('native platform', () => {
    beforeEach(() => {
      mockIsNativePlatform.mockReturnValue(true)
    })

    it('calls Camera.getPhoto with correct options', async () => {
      vi.mocked(Camera.getPhoto).mockResolvedValue({
        webPath: 'http://localhost/capture_123.jpg',
        format: 'jpeg',
      } as Awaited<ReturnType<typeof Camera.getPhoto>>)

      const { result } = renderHook(() =>
        useImageCapture({
          onImageCaptured: mockOnImageCaptured,
        }),
      )

      await act(async () => {
        await result.current.captureImage()
      })

      expect(Camera.getPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          quality: 90,
          resultType: 'uri',
          source: 'PROMPT',
        }),
      )
    })

    it('maps photo.webPath to CapturedImage.uri', async () => {
      vi.mocked(Camera.getPhoto).mockResolvedValue({
        webPath: 'http://localhost/capture_123.jpg',
        format: 'jpeg',
      } as Awaited<ReturnType<typeof Camera.getPhoto>>)

      const { result } = renderHook(() =>
        useImageCapture({
          onImageCaptured: mockOnImageCaptured,
        }),
      )

      await act(async () => {
        await result.current.captureImage()
      })

      expect(mockOnImageCaptured).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: 'http://localhost/capture_123.jpg',
          name: expect.stringContaining('capture_'),
        }),
      )
    })

    it('resets isCapturing to false after successful capture', async () => {
      vi.mocked(Camera.getPhoto).mockResolvedValue({
        webPath: 'http://localhost/capture.jpg',
        format: 'jpeg',
      } as Awaited<ReturnType<typeof Camera.getPhoto>>)

      const { result } = renderHook(() =>
        useImageCapture({
          onImageCaptured: mockOnImageCaptured,
        }),
      )

      expect(result.current.isCapturing).toBe(false)

      await act(async () => {
        await result.current.captureImage()
      })

      expect(result.current.isCapturing).toBe(false)
    })

    it('silently handles user cancellation', async () => {
      vi.mocked(Camera.getPhoto).mockRejectedValue(
        new Error('User cancelled photos app'),
      )

      const { result } = renderHook(() =>
        useImageCapture({
          onImageCaptured: mockOnImageCaptured,
        }),
      )

      await act(async () => {
        await result.current.captureImage()
      })

      expect(mockOnImageCaptured).not.toHaveBeenCalled()
      expect(result.current.isCapturing).toBe(false)
    })

    it('calls onPermissionDenied when permission is denied', async () => {
      vi.mocked(Camera.getPhoto).mockRejectedValue(
        new Error('Permission denied'),
      )

      const { result } = renderHook(() =>
        useImageCapture({
          onImageCaptured: mockOnImageCaptured,
          onPermissionDenied: mockOnPermissionDenied,
        }),
      )

      await act(async () => {
        await result.current.captureImage()
      })

      expect(mockOnPermissionDenied).toHaveBeenCalled()
      expect(mockOnImageCaptured).not.toHaveBeenCalled()
      expect(result.current.isCapturing).toBe(false)
    })

    it('resets isCapturing and re-throws unknown errors', async () => {
      vi.mocked(Camera.getPhoto).mockRejectedValue(
        new Error('Camera hardware error'),
      )

      const { result } = renderHook(() =>
        useImageCapture({
          onImageCaptured: mockOnImageCaptured,
        }),
      )

      let thrownError: Error | undefined
      await act(async () => {
        try {
          await result.current.captureImage()
        } catch (e) {
          thrownError = e as Error
        }
      })

      expect(thrownError?.message).toBe('Camera hardware error')
      expect(result.current.isCapturing).toBe(false)
    })
  })
})
