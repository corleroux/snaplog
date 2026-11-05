/**
 * Video Upload Validation Tests (FR-VID)
 *
 * Pure validation tests — no Supabase calls.
 */

import { describe, it, expect } from 'vitest'
import { validateVideoFile, MAX_VIDEO_SIZE_BYTES } from '../videoUpload'

function makeFile(type: string, size: number): File {
  return new File([new Uint8Array(size)], `test.${type === 'video/quicktime' ? 'mov' : 'mp4'}`, { type })
}

describe('validateVideoFile', () => {
  it('accepts mp4 files under the size cap', () => {
    expect(validateVideoFile(makeFile('video/mp4', 1024)).valid).toBe(true)
  })

  it('accepts quicktime (mov) files under the size cap', () => {
    expect(validateVideoFile(makeFile('video/quicktime', 1024)).valid).toBe(true)
  })

  it('rejects unsupported formats', () => {
    const result = validateVideoFile(makeFile('video/webm', 1024))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('MP4 or MOV')
  })

  it('rejects files over the size cap', () => {
    // Sparse: only metadata allocated, content is zero-filled on read.
    const file = new File([], 'big.mp4', { type: 'video/mp4' })
    Object.defineProperty(file, 'size', { value: MAX_VIDEO_SIZE_BYTES + 1 })
    const result = validateVideoFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('too large')
  })

  it('rejects empty files', () => {
    const result = validateVideoFile(makeFile('video/mp4', 0))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('empty')
  })
})
