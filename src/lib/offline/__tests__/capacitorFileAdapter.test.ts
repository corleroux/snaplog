/**
 * Capacitor File Adapter Tests
 *
 * Tests for URI to File conversion on both native and web platforms.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { uriToFile, isNativePlatform } from '../capacitorFileAdapter'

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}))

// Mock Capacitor Filesystem
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    readFile: vi.fn(),
  },
  Directory: {
    Documents: 'documents',
    ExternalStorage: 'externalStorage',
  },
  Encoding: {
    UTF8: 'utf8',
  },
}))

describe('isNativePlatform', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return true when Capacitor reports native platform', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    expect(isNativePlatform()).toBe(true)
  })

  it('should return false when Capacitor reports web platform', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    expect(isNativePlatform()).toBe(false)
  })
})

describe('uriToFile - Native Platform', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
  })

  it('should convert file:// URI to File using Filesystem API', async () => {
    const mockData = btoa('fake image data')
    vi.mocked(Filesystem.readFile).mockResolvedValue({
      data: mockData,
    })

    const result = await uriToFile('file:///path/to/image.jpg', 'image.jpg', 'image/jpeg')

    expect(result.file).toBeInstanceOf(File)
    expect(result.file.name).toBe('image.jpg')
    expect(result.mimeType).toBe('image/jpeg')
    expect(Filesystem.readFile).toHaveBeenCalled()
  })

  it('should handle content:// URIs', async () => {
    const mockData = btoa('fake content data')
    vi.mocked(Filesystem.readFile).mockResolvedValue({
      data: mockData,
    })

    const result = await uriToFile('content://media/image.jpg', 'image.jpg', 'image/jpeg')

    expect(result.file).toBeInstanceOf(File)
    expect(Filesystem.readFile).toHaveBeenCalledWith({
      path: 'content://media/image.jpg',
      directory: Directory.ExternalStorage,
    })
  })

  it('should throw error when Filesystem read fails', async () => {
    vi.mocked(Filesystem.readFile).mockRejectedValue(new Error('File not found'))

    await expect(
      uriToFile('file:///nonexistent.jpg', 'image.jpg', 'image/jpeg')
    ).rejects.toThrow('Failed to read file from native URI')
  })
})

describe('uriToFile - Web Platform', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
  })

  it('should fetch blob: URIs and convert to File', async () => {
    const mockBlob = new Blob(['test data'], { type: 'image/jpeg' })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    }) as any

    const result = await uriToFile('blob:test-uri', 'image.jpg', 'image/jpeg')

    expect(result.file).toBeInstanceOf(File)
    expect(result.file.name).toBe('image.jpg')
    expect(global.fetch).toHaveBeenCalledWith('blob:test-uri')
  })

  it('should throw error when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    }) as any

    await expect(
      uriToFile('blob:invalid-uri', 'image.jpg', 'image/jpeg')
    ).rejects.toThrow('Failed to fetch file from URI')
  })

  it('should throw error when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    await expect(
      uriToFile('blob:test-uri', 'image.jpg', 'image/jpeg')
    ).rejects.toThrow('Failed to fetch file from URI')
  })
})
