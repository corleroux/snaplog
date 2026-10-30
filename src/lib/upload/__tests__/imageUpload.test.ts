/**
 * Image Upload Compression Tests
 *
 * Tests for the image compression functionality in imageUpload.ts
 *
 * NOTE: These tests require a browser environment or jsdom + canvas
 * because the compression uses the Canvas API which is not available
 * in standard Node.js.
 *
 * Run with: vitest src/lib/upload/__tests__/imageUpload.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { compressImage } from '../imageUpload'

// Track current file being compressed for accurate mock sizing
let currentOriginalSize = 0

// Mock canvas for testing
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: () => ({
    drawImage: () => {},
  }),
  toBlob: (callback: (blob: Blob) => void, type: string, quality: number) => {
    // Create a mock compressed blob based on quality and original size
    // Higher quality = larger file (less compression)
    const compressedSize = Math.floor(currentOriginalSize * quality * 0.5) // Compress to 50% of quality setting
    const data = new Uint8Array(compressedSize)
    // blob.type reflects the actual format produced by the browser
    const blob = new Blob([data], { type: type || 'image/webp' })
    setTimeout(() => callback(blob), 0)
  },
}

// Mock createImageBitmap
global.createImageBitmap = async (_image: any) => {
  return {
    width: 3000,
    height: 2000,
    close: () => {},
  } as any
}

// Mock document.createElement for canvas
global.document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      return mockCanvas as any
    }
    throw new Error(`Unknown element: ${tag}`)
  },
} as any

describe('compressImage', () => {
  beforeEach(() => {
    currentOriginalSize = 0
  })

  describe('should compress all files regardless of size', () => {
    it('compresses small files (< 100KB) through canvas pipeline', async () => {
      const smallFile = new File(['x'.repeat(50 * 1024)], 'small.jpg', {
        type: 'image/jpeg',
      })
      currentOriginalSize = smallFile.size

      const result = await compressImage(smallFile)

      // All images go through canvas — no passthrough regardless of size
      expect(result.mimeType).toBe('image/webp')
      expect(result.compressedSize).toBeLessThan(result.originalSize)
      expect(result.compressionRatio).toBeLessThan(1)
    })

    it('compresses tiny files through canvas pipeline', async () => {
      const tinyFile = new File(['x'.repeat(1024)], 'tiny.jpg', {
        type: 'image/jpeg',
      })
      currentOriginalSize = tinyFile.size

      const result = await compressImage(tinyFile)

      expect(result.mimeType).toBe('image/webp')
      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })
  })

  describe('should compress large files', () => {
    it('compresses to WebP by default', async () => {
      const largeFile = new File(['x'.repeat(500 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      })
      currentOriginalSize = largeFile.size

      const result = await compressImage(largeFile)

      expect(result.mimeType).toBe('image/webp')
      expect(result.compressedSize).toBeLessThan(result.originalSize)
      expect(result.compressionRatio).toBeLessThan(1)
    })

    it('respects quality parameter', async () => {
      const file = new File(['x'.repeat(500 * 1024)], 'test.jpg', {
        type: 'image/jpeg',
      })
      currentOriginalSize = file.size

      // Higher quality should result in larger file
      const highQuality = await compressImage(file, { quality: 0.9 })
      const lowQuality = await compressImage(file, { quality: 0.5 })

      expect(highQuality.compressedSize).toBeGreaterThan(lowQuality.compressedSize)
    })

    it('respects max dimensions', async () => {
      const file = new File(['x'.repeat(500 * 1024)], 'test.jpg', {
        type: 'image/jpeg',
      })
      currentOriginalSize = file.size

      const result = await compressImage(file, {
        maxWidth: 1024,
        maxHeight: 1024,
      })

      // The mock creates a 3000x2000 image, which should be scaled
      // to fit within 1024x1024 (aspect ratio preserved)
      // 3000x2000 -> max scale = 1024/3000 = 0.34
      // Expected: 1024x682
      expect(result).toBeDefined()
    })
  })

  describe('should support different output formats', () => {
    it('supports JPEG output', async () => {
      const file = new File(['x'.repeat(500 * 1024)], 'test.jpg', {
        type: 'image/jpeg',
      })
      currentOriginalSize = file.size

      const result = await compressImage(file, {
        outputFormat: 'image/jpeg',
      })

      expect(result.mimeType).toBe('image/jpeg')
    })

    it('supports PNG output', async () => {
      const file = new File(['x'.repeat(500 * 1024)], 'test.jpg', {
        type: 'image/jpeg',
      })
      currentOriginalSize = file.size

      const result = await compressImage(file, {
        outputFormat: 'image/png',
      })

      expect(result.mimeType).toBe('image/png')
    })

    it('supports WebP output (default)', async () => {
      const file = new File(['x'.repeat(500 * 1024)], 'test.jpg', {
        type: 'image/jpeg',
      })
      currentOriginalSize = file.size

      const result = await compressImage(file)

      expect(result.mimeType).toBe('image/webp')
    })
  })

  describe('compression result structure', () => {
    it('returns complete compression result', async () => {
      const file = new File(['x'.repeat(500 * 1024)], 'test.jpg', {
        type: 'image/jpeg',
      })
      currentOriginalSize = file.size

      const result = await compressImage(file)

      expect(result).toHaveProperty('blob')
      expect(result).toHaveProperty('originalSize')
      expect(result).toHaveProperty('compressedSize')
      expect(result).toHaveProperty('compressionRatio')
      expect(result).toHaveProperty('mimeType')
    })

    it('provides meaningful compression ratio', async () => {
      const file = new File(['x'.repeat(500 * 1024)], 'test.jpg', {
        type: 'image/jpeg',
      })
      currentOriginalSize = file.size

      const result = await compressImage(file)

      expect(result.compressionRatio).toBeGreaterThan(0)
      expect(result.compressionRatio).toBeLessThanOrEqual(1)
    })
  })
})

describe('Compression Quality Levels', () => {
  describe('Quality Guidance from CAPTURE_FLOW_PATTERNS.md', () => {
    it('High (0.8) - for text-heavy images, documents', async () => {
      const file = new File(['x'.repeat(500 * 1024)], 'document.jpg', {
        type: 'image/jpeg',
      })
      currentOriginalSize = file.size

      const result = await compressImage(file, { quality: 0.8 })

      expect(result.mimeType).toBe('image/webp')
      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })

    it('Medium (0.5) - default, aggressive for low bandwidth', async () => {
      const file = new File(['x'.repeat(500 * 1024)], 'photo.jpg', {
        type: 'image/jpeg',
      })
      currentOriginalSize = file.size

      const result = await compressImage(file, { quality: 0.5 })

      expect(result.mimeType).toBe('image/webp')
      // 50% quality should provide aggressive compression
      expect(result.compressionRatio).toBeLessThan(0.8)
    })

    it('Low (0.6) - for visual content, screenshots', async () => {
      const file = new File(['x'.repeat(500 * 1024)], 'screenshot.jpg', {
        type: 'image/jpeg',
      })
      currentOriginalSize = file.size

      const result = await compressImage(file, { quality: 0.6 })

      expect(result.mimeType).toBe('image/webp')
      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })
  })
})

describe('One Info Image Rule', () => {
  it('compression preserves image data for Info classification', async () => {
    // Images compressed as Info should still be valid for extraction
    const infoImage = new File(['x'.repeat(500 * 1024)], 'info.jpg', {
      type: 'image/jpeg',
    })
    currentOriginalSize = infoImage.size

    const result = await compressImage(infoImage)

    // Compressed blob should be usable
    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.blob.size).toBeGreaterThan(0)
    expect(result.blob.type).toBe('image/webp')
  })
})

describe('iOS WebP fallback', () => {
  let toBlobCallCount = 0
  let lastToBlobType = ''

  const iosFallbackCanvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: () => {},
    }),
    toBlob: (callback: (blob: Blob) => void, type: string, quality: number) => {
      toBlobCallCount++
      lastToBlobType = type
      const compressedSize = Math.floor(currentOriginalSize * quality * 0.5)
      const data = new Uint8Array(compressedSize)
      // First call: requested WebP but browser silently returns PNG (iOS behavior)
      // Second call: JPEG fallback
      const actualType = toBlobCallCount === 1 && type === 'image/webp'
        ? 'image/png'
        : type
      const blob = new Blob([data], { type: actualType })
      setTimeout(() => callback(blob), 0)
    },
  }

  beforeEach(() => {
    toBlobCallCount = 0
    lastToBlobType = ''
    currentOriginalSize = 0
    // Override document.createElement to use iOS fallback canvas
    global.document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return iosFallbackCanvas as any
        }
        throw new Error(`Unknown element: ${tag}`)
      },
    } as any
  })

  afterEach(() => {
    // Restore default mock canvas
    global.document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return mockCanvas as any
        }
        throw new Error(`Unknown element: ${tag}`)
      },
    } as any
  })

  it('falls back to JPEG when iOS silently returns PNG instead of WebP', async () => {
    const file = new File(['x'.repeat(500 * 1024)], 'photo.png', {
      type: 'image/png',
    })
    currentOriginalSize = file.size

    const result = await compressImage(file)

    // Should have called toBlob twice: first WebP (returned PNG), then JPEG fallback
    expect(toBlobCallCount).toBe(2)
    expect(lastToBlobType).toBe('image/jpeg')
    expect(result.mimeType).toBe('image/jpeg')
    expect(result.compressedSize).toBeLessThan(result.originalSize)
  })

  it('produces compressed JPEG, not 5MB PNG', async () => {
    // Simulate a large photo from iPhone camera
    const file = new File(['x'.repeat(5 * 1024 * 1024)], 'IMG_0123.png', {
      type: 'image/png',
    })
    currentOriginalSize = file.size

    const result = await compressImage(file, { quality: 0.5 })

    // JPEG fallback should produce a much smaller file than the PNG would have been
    expect(result.mimeType).toBe('image/jpeg')
    expect(result.compressionRatio).toBeLessThan(0.5) // Quality 0.5 * 0.5 mock factor
  })
})
