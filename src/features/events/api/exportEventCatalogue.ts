/**
 * Export Event Catalogue API
 *
 * Generates a PDF catalogue for an event with all its vendors and styles.
 */

import { supabase } from '@/lib/supabase/client'
import { generateEventCatalogue as generatePdf, downloadCatalogue, type CatalogueData, type CatalogueOptions } from '@/lib/pdf/catalogueGenerator'
import { exportVendorsToExcel, exportStylesToExcel } from '@/lib/export/excelExport'
import type { VendorRecord } from '@/types/vendor'
import type { StyleRecord } from '@/types/style'

/**
 * Export an event as a PDF catalogue
 */
export async function exportEventCatalogue(
  eventId: string,
  options: CatalogueOptions = {}
): Promise<void> {
  // Fetch event details
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('name, starts_on, city, country')
    .eq('id', eventId)
    .single()

  if (eventError) {
    throw new Error(`Failed to fetch event: ${eventError.message}`)
  }

  // Fetch all vendors for this event
  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'active') // Only include active vendors
    .order('company_name')

  if (vendorsError) {
    throw new Error(`Failed to fetch vendors: ${vendorsError.message}`)
  }

  // Fetch images for each vendor
  const vendorIds = vendors.map((v) => v.id)
  const { data: vendorImages, error: imagesError } = await supabase
    .from('vendor_images')
    .select('*')
    .in('vendor_id', vendorIds)
    .order('display_order', { ascending: true })

  if (imagesError) {
    throw new Error(`Failed to fetch vendor images: ${imagesError.message}`)
  }

  // Group images by vendor
  const imagesByVendor = new Map<string, typeof vendorImages>()
  vendorImages.forEach((img) => {
    if (!imagesByVendor.has(img.vendor_id)) {
      imagesByVendor.set(img.vendor_id, [])
    }
    imagesByVendor.get(img.vendor_id)!.push(img)
  })

  // Fetch styles for each vendor (if includeStyles is true)
  let stylesByVendor: Map<string, any[]> = new Map()

  if (options.includeStyles !== false) {
    const { data: styles, error: stylesError } = await supabase
      .from('fabric_styles')
      .select('*, fabric_variants(*)')
      .in('vendor_id', vendorIds)
      .eq('status', 'active')
      .order('name')

    if (stylesError) {
      throw new Error(`Failed to fetch styles: ${stylesError.message}`)
    }

    // Group styles by vendor
    styles.forEach((style: any) => {
      if (!stylesByVendor.has(style.vendor_id)) {
        stylesByVendor.set(style.vendor_id, [])
      }

      // Extract relevant style data for PDF
      stylesByVendor.get(style.vendor_id)!.push({
        name: style.name,
        sku: style.item_code,
        composition: style.composition || '',
        color: style.primary_color || undefined,
        price: style.fabric_variants && style.fabric_variants[0]
          ? `${style.fabric_variants[0].price_per_unit || 'N/A'} ${style.fabric_variants[0].currency || ''}`
          : 'N/A',
      })
    })
  }

  // Build catalogue data
  const catalogueData: CatalogueData = {
    eventName: event.name,
    eventDate: event.starts_on ? new Date(event.starts_on).toLocaleDateString() : undefined,
    eventLocation: event.city && event.country
      ? `${event.city}, ${event.country}`
      : event.city || event.country || undefined,
    vendors: vendors.map((vendor) => ({
      vendor,
      images: imagesByVendor.get(vendor.id) || [],
      styles: stylesByVendor.get(vendor.id) || [],
    })),
  }

  // Generate PDF
  const pdfBlob = await generatePdf(catalogueData, options)

  // Download
  const filename = `${event.name.replace(/[^a-z0-9]/gi, '_')}_catalogue.pdf`
  downloadCatalogue(pdfBlob, filename)
}

/**
 * Get a preview of the catalogue data (for UI display before generation)
 */
export async function getCataloguePreview(eventId: string): Promise<{
  vendorCount: number
  styleCount: number
  imageCount: number
  vendors: Array<{ id: string; name: string; styleCount: number }>
}> {
  // Count vendors
  const { count: vendorCount, error: vendorsError } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'active')

  if (vendorsError) {
    throw new Error(`Failed to count vendors: ${vendorsError.message}`)
  }

  // Count styles
  const { count: styleCount, error: stylesError } = await supabase
    .from('fabric_styles')
    .select('*', { count: 'exact', head: true })
    .in('vendor_id', (
      await supabase.from('vendors').select('id').eq('event_id', eventId).eq('status', 'active')
    ).data?.map((v) => v.id) || [])

  if (stylesError) {
    throw new Error(`Failed to count styles: ${stylesError.message}`)
  }

  // Count images
  const { count: imageCount, error: imagesError } = await supabase
    .from('vendor_images')
    .select('*', { count: 'exact', head: true })
    .in('vendor_id', (
      await supabase.from('vendors').select('id').eq('event_id', eventId).eq('status', 'active')
    ).data?.map((v) => v.id) || [])

  if (imagesError) {
    throw new Error(`Failed to count images: ${imagesError.message}`)
  }

  // Get vendor list with style counts
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, company_name')
    .eq('event_id', eventId)
    .eq('status', 'active')
    .order('company_name')

  const vendorList = await Promise.all(
    (vendors || []).map(async (vendor) => {
      const { count } = await supabase
        .from('fabric_styles')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id)
        .eq('status', 'active')

      return {
        id: vendor.id,
        name: vendor.company_name,
        styleCount: count || 0,
      }
    })
  )

  return {
    vendorCount: vendorCount || 0,
    styleCount: styleCount || 0,
    imageCount: imageCount || 0,
    vendors: vendorList,
  }
}

/**
 * Export an entire event to Excel (vendors and styles)
 *
 * Exports all vendors and styles for an event to separate CSV files.
 */
export async function exportEventToExcel(
  eventId: string,
  eventName: string
): Promise<void> {
  // Fetch event details for filename
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('name')
    .eq('id', eventId)
    .single()

  if (eventError) {
    throw new Error(`Failed to fetch event: ${eventError.message}`)
  }

  const safeEventName = (event?.name || eventName || 'event').replace(/[^a-z0-9]/gi, '_')
  const timestamp = new Date().toISOString().slice(0, 10)

  // Fetch all vendors for this event
  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('*')
    .eq('event_id', eventId)
    .order('company_name')

  if (vendorsError) {
    throw new Error(`Failed to fetch vendors: ${vendorsError.message}`)
  }

  // Fetch all styles for vendors in this event
  const vendorIds = (vendors || []).map((v) => v.id)

  let styles: StyleRecord[] = []
  if (vendorIds.length > 0) {
    const { data: stylesData, error: stylesError } = await supabase
      .from('fabric_styles')
      .select('*, vendors!inner(company_name)')
      .in('vendor_id', vendorIds)
      .order('name')

    if (stylesError) {
      throw new Error(`Failed to fetch styles: ${stylesError.message}`)
    }

    // Map to StyleRecord format with vendorName
    styles = (stylesData || []).map((style: any) => ({
      ...style,
      vendorName: style.vendors?.company_name || '',
    })) as StyleRecord[]
  }

  // Export vendors
  if (vendors && vendors.length > 0) {
    exportVendorsToExcel(vendors as VendorRecord[], {
      fileName: `${safeEventName}_vendors_${timestamp}`,
    })
  }

  // Export styles (with delay to avoid browser blocking multiple downloads)
  if (styles.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    exportStylesToExcel(styles, {
      fileName: `${safeEventName}_styles_${timestamp}`,
    })
  }

  // If no data at all, throw an error
  if ((!vendors || vendors.length === 0) && styles.length === 0) {
    throw new Error('No vendors or styles found for this event')
  }
}
