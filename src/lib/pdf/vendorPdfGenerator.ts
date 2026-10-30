/**
 * Individual Item PDF Generator
 *
 * Generates PDF spec sheets for individual vendors or styles.
 */

import jsPDF from 'jspdf'
import type { Vendor } from '@/types/vendor'
import type { VendorImage } from '@/types/vendor'

/**
 * Generate a PDF spec sheet for a single vendor
 */
export async function generateVendorPdf(
  vendor: Vendor,
  images: VendorImage[] = [],
  options: { includeImages?: boolean } = {}
): Promise<Blob> {
  const opts = { includeImages: true, ...options }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - 2 * margin

  let yPosition = margin

  // ========== HEADER ==========
  doc.setFillColor(30, 41, 59)
  doc.rect(0, 0, pageWidth, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Vendor Specification', margin, 20)

  doc.setFontSize(14)
  doc.text(vendor.company_name, margin, 30)

  // ========== CONTENT ==========
  doc.setTextColor(60, 60, 60)
  yPosition = 55

  // Contact Information
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Contact Information', margin, yPosition)
  yPosition += 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  const contactFields: Array<{ label: string; value: string | null | undefined }> = [
    { label: 'Booth Number', value: vendor.booth_number },
    { label: 'Contact Person', value: vendor.contact_person },
    { label: 'Email', value: vendor.email },
    { label: 'Phone', value: vendor.phone },
    { label: 'WhatsApp', value: vendor.whatsapp },
    { label: 'Website', value: vendor.website_url },
    { label: 'Address', value: vendor.address },
    { label: 'Country of Origin', value: vendor.country_of_origin },
  ]

  contactFields.forEach((field) => {
    if (field.value) {
      doc.setTextColor(100, 100, 100)
      doc.text(`${field.label}:`, margin, yPosition)
      doc.setTextColor(30, 41, 59)
      doc.text(field.value, margin + 50, yPosition)
      yPosition += 7
    }
  })

  // Brands
  if (vendor.brand_names && vendor.brand_names.length > 0) {
    yPosition += 5
    doc.setTextColor(100, 100, 100)
    doc.text('Brands:', margin, yPosition)
    doc.setTextColor(30, 41, 59)
    doc.text(vendor.brand_names.join(', '), margin + 50, yPosition)
    yPosition += 7
  }

  // Notes
  if (vendor.notes) {
    yPosition += 5
    doc.setTextColor(100, 100, 100)
    doc.text('Notes:', margin, yPosition)
    yPosition += 7

    doc.setTextColor(30, 41, 59)
    const notesLines = doc.splitTextToSize(vendor.notes, contentWidth - 50)
    doc.text(notesLines, margin + 50, yPosition - 7)
    yPosition += notesLines.length * 7 + 5
  }

  // Images
  if (opts.includeImages && images.length > 0) {
    // Check if we need a new page
    if (yPosition > pageHeight - 80) {
      doc.addPage()
      yPosition = margin
    }

    yPosition += 10
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Images', margin, yPosition)
    yPosition += 10

    const imagesPerPage = 6
    const imageSize = 50
    const gap = 10

    for (let i = 0; i < Math.min(images.length, imagesPerPage); i++) {
      const row = Math.floor(i / 3)
      const col = i % 3

      if (row > 0 && col === 0) {
        yPosition += imageSize + gap
      }

      const x = margin + col * (imageSize + gap)

      // Placeholder for image
      doc.setDrawColor(200, 200, 200)
      doc.setFillColor(250, 250, 250)
      doc.rect(x, yPosition, imageSize, imageSize, 'FD')

      const img = images[i]
      if (img.caption) {
        doc.setFontSize(9)
        doc.setTextColor(60, 60, 60)
        const caption = img.caption.length > 25 ? img.caption.substring(0, 25) + '...' : img.caption
        doc.text(caption, x + imageSize / 2, yPosition + imageSize + 5, { align: 'center' })
      }
    }

    if (images.length > imagesPerPage) {
      yPosition += imageSize + gap + 5
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(10)
      doc.setTextColor(150, 150, 150)
      doc.text(`... and ${images.length - imagesPerPage} more images`, margin, yPosition)
    }
  }

  // ========== FOOTER ==========
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Vendor: ${vendor.company_name} • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  return doc.output('blob') as Blob
}

/**
 * Download the generated vendor PDF
 */
export function downloadVendorPdf(vendor: Vendor, blob: Blob): void {
  const filename = `${vendor.company_name.replace(/[^a-z0-9]/gi, '_')}_spec.pdf`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
