/**
 * QR Code Generator
 *
 * Generates QR codes for sharing links.
 */

import QRCode from 'qrcode'

/**
 * Generate a QR code as a data URL
 *
 * @param url - The URL to encode in the QR code
 * @param options - Optional QR code generation options
 * @returns Promise resolving to a data URL string
 */
export async function generateQRCode(
  url: string,
  options: {
    width?: number
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
  } = {}
): Promise<string> {
  const {
    width = 256,
    margin = 2,
    color = {
      dark: '#000000',
      light: '#FFFFFF'
    }
  } = options

  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width,
      margin,
      color: {
        dark: color.dark || '#000000',
        light: color.light || '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })

    return dataUrl
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Download a QR code as an image file
 *
 * @param dataUrl - The data URL of the QR code
 * @param filename - The filename for the download (without extension)
 */
export function downloadQRCode(dataUrl: string, filename: string = 'qrcode'): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `${filename}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
