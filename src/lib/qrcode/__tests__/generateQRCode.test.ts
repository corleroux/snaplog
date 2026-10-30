/**
 * QR Code Generation Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock qrcode module
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(),
  },
}))

import QRCode from 'qrcode'
import { generateQRCode, downloadQRCode } from '@/lib/qrcode/generateQRCode'

describe('QR Code Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateQRCode', () => {
    it('should generate QR code data URL', async () => {
      vi.mocked(QRCode.toDataURL).mockResolvedValue('data:image/png;base64,mockdata' as never)

      const url = await generateQRCode('https://example.com')

      expect(url).toBe('data:image/png;base64,mockdata')
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          width: 256,
          margin: 2,
        })
      )
    })

    it('should generate QR code with custom options', async () => {
      vi.mocked(QRCode.toDataURL).mockResolvedValue('data:image/png;base64,mockdata' as never)

      const url = await generateQRCode('https://example.com', {
        width: 512,
        margin: 4,
        color: { dark: '#1a1a1a', light: '#f0f0f0' }
      })

      expect(url).toBe('data:image/png;base64,mockdata')
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          width: 512,
          margin: 4,
          color: {
            dark: '#1a1a1a',
            light: '#f0f0f0'
          }
        })
      )
    })

    it('should throw error on generation failure', async () => {
      vi.mocked(QRCode.toDataURL).mockRejectedValue(new Error('Generation failed') as never)

      await expect(generateQRCode('https://example.com')).rejects.toThrow('Failed to generate QR code')
    })
  })

  describe('downloadQRCode', () => {
    it('should download QR code with default filename', () => {
      const mockDataUrl = 'data:image/png;base64,mockdata'
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any)

      downloadQRCode(mockDataUrl)

      expect(mockLink.download).toBe('qrcode.png')
      expect(mockLink.href).toBe(mockDataUrl)
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should download QR code with custom filename', () => {
      const mockDataUrl = 'data:image/png;base64,mockdata'
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any)

      downloadQRCode(mockDataUrl, 'custom-qr')

      expect(mockLink.download).toBe('custom-qr.png')
    })
  })
})
