/**
 * PDF Catalogue Generator
 *
 * Generates professional PDF catalogues from captured vendor and style data.
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Vendor } from '@/types/vendor'
import type { VendorImage } from '@/types/vendor'

/**
 * Data structure for catalogue generation
 */
export interface CatalogueData {
  eventName: string
  eventDate?: string
  eventLocation?: string
  vendors: Array<{
    vendor: Vendor
    images: VendorImage[]
    styles?: Array<{
      name: string
      sku: string
      composition: string
      price: string
      color?: string
    }>
  }>
}

/**
 * Options for PDF generation
 */
export interface CatalogueOptions {
  includeImages?: boolean
  includeStyles?: boolean
  includePrices?: boolean
  pageSize?: 'a4' | 'letter'
  orientation?: 'portrait' | 'landscape'
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<CatalogueOptions> = {
  includeImages: true,
  includeStyles: true,
  includePrices: true,
  pageSize: 'a4',
  orientation: 'portrait',
}

/**
 * Generate a PDF catalogue for an event
 */
export async function generateEventCatalogue(
  data: CatalogueData,
  options: CatalogueOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Initialize PDF
  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: opts.pageSize,
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - 2 * margin

  let yPosition = margin

  // Helper to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage()
      yPosition = margin
    }
  }

  // ========== COVER PAGE ==========
  doc.setFillColor(30, 41, 59) // Dark blue-gray
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('Snaplog', pageWidth / 2, pageHeight / 3, { align: 'center' })

  // Event name
  doc.setFontSize(20)
  doc.text(data.eventName, pageWidth / 2, pageHeight / 3 + 15, { align: 'center' })

  // Date and location
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  const metaLines: string[] = []
  if (data.eventDate) metaLines.push(data.eventDate)
  if (data.eventLocation) metaLines.push(data.eventLocation)
  if (metaLines.length > 0) {
    doc.text(metaLines.join(' • '), pageWidth / 2, pageHeight / 3 + 30, { align: 'center' })
  }

  // Generation date
  doc.setFontSize(10)
  doc.text(
    `Generated on ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  )

  // ========== CONTENT PAGES ==========
  doc.addPage()
  yPosition = margin

  // Table of Contents
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Contents', margin, yPosition)
  yPosition += 12

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')

  // Vendor list for TOC
  const tocData = data.vendors.map((v, i) => [i + 1, v.vendor.company_name, v.vendor.booth_number || 'N/A'])

  autoTable(doc, {
    startY: yPosition,
    head: [['#', 'Vendor', 'Booth']],
    body: tocData,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    margin: { top: 0, left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: contentWidth - 45 },
      2: { cellWidth: 30 },
    },
  })

  yPosition = (doc as any).lastAutoTable.finalY + 15

  // ========== VENDOR PAGES ==========
  for (let i = 0; i < data.vendors.length; i++) {
    const { vendor, images, styles } = data.vendors[i]

    // New page for each vendor
    doc.addPage()
    yPosition = margin

    // Vendor header
    checkPageBreak(40)

    doc.setTextColor(30, 41, 59)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(`${i + 1}. ${vendor.company_name}`, margin, yPosition)
    yPosition += 10

    // Vendor details
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)

    const details: string[] = []
    if (vendor.booth_number) details.push(`Booth: ${vendor.booth_number}`)
    if (vendor.contact_person) details.push(`Contact: ${vendor.contact_person}`)
    if (vendor.email) details.push(`Email: ${vendor.email}`)
    if (vendor.phone) details.push(`Phone: ${vendor.phone}`)
    if (vendor.website_url) details.push(`Web: ${vendor.website_url}`)
    if (vendor.country_of_origin) details.push(`Origin: ${vendor.country_of_origin}`)

    details.forEach((detail) => {
      doc.text(detail, margin, yPosition)
      yPosition += 6
    })

    if (vendor.brand_names && vendor.brand_names.length > 0) {
      yPosition += 4
      doc.text(`Brands: ${vendor.brand_names.join(', ')}`, margin, yPosition)
      yPosition += 6
    }

    if (vendor.notes) {
      yPosition += 4
      doc.setFont('helvetica', 'italic')
      doc.text(`Notes: ${vendor.notes}`, margin, yPosition)
      yPosition += 6
      doc.setFont('helvetica', 'normal')
    }

    // Images
    if (opts.includeImages && images.length > 0) {
      checkPageBreak(50)

      yPosition += 10
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Images', margin, yPosition)
      yPosition += 8
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)

      // Add up to 3 images per row
      const imagesPerPage = 6
      const imageSize = 50
      const gap = 10

      for (let imgIdx = 0; imgIdx < Math.min(images.length, imagesPerPage); imgIdx++) {
        const row = Math.floor(imgIdx / 3)
        const col = imgIdx % 3

        if (row > 0 && col === 0) {
          yPosition += imageSize + gap
        }

        checkPageBreak(imageSize + gap)

        const x = margin + col * (imageSize + gap)
        const imgY = yPosition

        try {
          // Add image (placeholder - in real implementation, fetch and embed)
          doc.setDrawColor(200, 200, 200)
          doc.setFillColor(250, 250, 250)
          doc.rect(x, imgY, imageSize, imageSize, 'FD')

          // Image caption
          const img = images[imgIdx]
          if (img.caption) {
            doc.setFontSize(9)
            const caption = img.caption.length > 25 ? img.caption.substring(0, 25) + '...' : img.caption
            doc.text(caption, x + imageSize / 2, imgY + imageSize + 5, { align: 'center' })
          }
        } catch (err) {
          // Image loading failed - show placeholder
          doc.setDrawColor(200, 200, 200)
          doc.setFillColor(250, 250, 250)
          doc.rect(x, imgY, imageSize, imageSize, 'FD')
          doc.setTextColor(150, 150, 150)
          doc.setFontSize(10)
          doc.text('Image not available', x + imageSize / 2, imgY + imageSize / 2, { align: 'center' })
          doc.setTextColor(60, 60, 60)
        }
      }

      yPosition += imageSize + gap + 10

      // More images indicator
      if (images.length > imagesPerPage) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(10)
        doc.text(`... and ${images.length - imagesPerPage} more images`, margin, yPosition)
        yPosition += 8
        doc.setFont('helvetica', 'normal')
      }
    }

    // Styles table
    if (opts.includeStyles && styles && styles.length > 0) {
      checkPageBreak(40)

      yPosition += 10
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Styles', margin, yPosition)
      yPosition += 8

      // Prepare table data
      const tableData = styles.map((style) => {
        const row: string[] = []
        row.push(style.sku || 'N/A')
        row.push(style.name)
        row.push(style.composition || 'N/A')
        if (style.color) row.push(style.color)
        if (opts.includePrices) row.push(style.price || 'N/A')
        return row
      })

      // Table headers
      const headers: string[] = ['SKU', 'Name', 'Composition']
      if (opts.includeStyles) headers.push('Color')
      if (opts.includePrices) headers.push('Price')

      autoTable(doc, {
        startY: yPosition,
        head: [headers],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        margin: { top: 0, left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 50 },
          2: { cellWidth: 50 },
        },
      })

      yPosition = (doc as any).lastAutoTable.finalY + 10
    }
  }

  // ========== FOOTER ==========
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Page ${i} of ${totalPages} • ${data.eventName}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  // Generate blob
  const pdfBlob = doc.output('blob')
  return pdfBlob as Blob
}

/**
 * Download the generated PDF
 */
export function downloadCatalogue(blob: Blob, filename: string = 'catalogue.pdf'): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
