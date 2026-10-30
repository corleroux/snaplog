/**
 * Style PDF Generator
 *
 * Generates PDF spec sheets for individual fabric styles.
 */

import jsPDF from 'jspdf'
import type { StyleImageRecord } from '@/types/style'

/**
 * Style data for PDF generation
 */
export interface StylePdfData {
  vendorName: string
  name: string
  itemCode: string
  composition: string
  category?: string
  construction?: string
  finish?: string
  pattern?: string
  primaryColor?: string
  widthCm?: string
  widthIn?: string
  weightGsm?: string
  weightOzSy?: string
  season?: string
  notes?: string
  images: StyleImageRecord[]
  variants?: Array<{
    name: string
    colorName: string
    colorCode: string
    price: string
    currency: string
    unit: string
  }>
}

/**
 * Generate a PDF spec sheet for a single style
 */
export async function generateStylePdf(
  data: StylePdfData,
  options: { includeImages?: boolean; includeVariants?: boolean } = {}
): Promise<Blob> {
  const opts = { includeImages: true, includeVariants: true, ...options }

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
  doc.text('Fabric Specification', margin, 20)

  doc.setFontSize(12)
  doc.text(data.vendorName, margin, 28)

  doc.setFontSize(14)
  doc.text(data.name, margin, 35)

  // ========== CONTENT ==========
  doc.setTextColor(60, 60, 60)
  yPosition = 55

  // Basic Information
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Basic Information', margin, yPosition)
  yPosition += 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  const basicFields: Array<{ label: string; value: string }> = [
    { label: 'Item Code', value: data.itemCode },
    { label: 'Composition', value: data.composition },
  ]

  if (data.category) basicFields.push({ label: 'Category', value: data.category })
  if (data.construction) basicFields.push({ label: 'Construction', value: data.construction })
  if (data.finish) basicFields.push({ label: 'Finish', value: data.finish })
  if (data.pattern) basicFields.push({ label: 'Pattern', value: data.pattern })
  if (data.primaryColor) basicFields.push({ label: 'Primary Color', value: data.primaryColor })

  basicFields.forEach((field) => {
    doc.setTextColor(100, 100, 100)
    doc.text(`${field.label}:`, margin, yPosition)
    doc.setTextColor(30, 41, 59)
    doc.text(field.value, margin + 40, yPosition)
    yPosition += 7
  })

  // Dimensions and Weight
  yPosition += 5
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Dimensions & Weight', margin, yPosition)
  yPosition += 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')

  if (data.widthCm || data.widthIn) {
    const widthText = data.widthCm && data.widthIn
      ? `${data.widthCm} cm (${data.widthIn} in)`
      : data.widthCm || data.widthIn || ''
    doc.setTextColor(100, 100, 100)
    doc.text('Width:', margin, yPosition)
    doc.setTextColor(30, 41, 59)
    doc.text(widthText, margin + 40, yPosition)
    yPosition += 7
  }

  if (data.weightGsm || data.weightOzSy) {
    const weightText = data.weightGsm && data.weightOzSy
      ? `${data.weightGsm} g/m² (${data.weightOzSy} oz/yd²)`
      : data.weightGsm || data.weightOzSy || ''
    doc.setTextColor(100, 100, 100)
    doc.text('Weight:', margin, yPosition)
    doc.setTextColor(30, 41, 59)
    doc.text(weightText, margin + 40, yPosition)
    yPosition += 7
  }

  if (data.season) {
    doc.setTextColor(100, 100, 100)
    doc.text('Season:', margin, yPosition)
    doc.setTextColor(30, 41, 59)
    doc.text(data.season, margin + 40, yPosition)
    yPosition += 7
  }

  // Notes
  if (data.notes) {
    yPosition += 5
    doc.setTextColor(100, 100, 100)
    doc.text('Notes:', margin, yPosition)
    yPosition += 7

    doc.setTextColor(30, 41, 59)
    const notesLines = doc.splitTextToSize(data.notes, contentWidth - 40)
    doc.text(notesLines, margin + 40, yPosition - 7)
    yPosition += notesLines.length * 7 + 5
  }

  // Images
  if (opts.includeImages && data.images.length > 0) {
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

    for (let i = 0; i < Math.min(data.images.length, imagesPerPage); i++) {
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

      const img = data.images[i]
      if (img.caption) {
        doc.setFontSize(9)
        doc.setTextColor(60, 60, 60)
        const caption = img.caption.length > 25 ? img.caption.substring(0, 25) + '...' : img.caption
        doc.text(caption, x + imageSize / 2, yPosition + imageSize + 5, { align: 'center' })
      }
    }

    if (data.images.length > imagesPerPage) {
      yPosition += imageSize + gap + 5
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(10)
      doc.setTextColor(150, 150, 150)
      doc.text(`... and ${data.images.length - imagesPerPage} more images`, margin, yPosition)
      yPosition += 10
    }
  }

  // Variants table
  if (opts.includeVariants && data.variants && data.variants.length > 0) {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage()
      yPosition = margin
    }

    yPosition += 10
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Variants', margin, yPosition)
    yPosition += 10

    // Table data
    const tableData = data.variants.map((variant) => [
      variant.name || 'N/A',
      variant.colorName || 'N/A',
      variant.colorCode || 'N/A',
      `${variant.price} ${variant.currency}/${variant.unit}`,
    ])

    // @ts-ignore - autoTable types
    doc.autoTable({
      startY: yPosition,
      head: [['Variant', 'Color', 'Code', 'Price']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
      margin: { top: 0, left: margin, right: margin },
      styles: { fontSize: 10, cellPadding: 3 },
    })
  }

  // ========== FOOTER ==========
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `${data.vendorName} - ${data.name} (${data.itemCode}) • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  return doc.output('blob') as Blob
}

/**
 * Download the generated style PDF
 */
export function downloadStylePdf(data: StylePdfData, blob: Blob): void {
  const filename = `${data.vendorName.replace(/[^a-z0-9]/gi, '_')}_${data.itemCode}_spec.pdf`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
