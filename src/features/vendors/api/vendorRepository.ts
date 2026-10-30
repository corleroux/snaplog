/**
 * Vendor Repository - Persistence Seam
 *
 * This repository provides the app-facing Vendor domain contract
 * while mapping to the existing vendors persistence structure.
 *
 * APP-FACING DOMAIN → PERSISTENCE MAPPING:
 * - VendorRecord → vendors table
 * - VendorImageRecord → vendor_images table
 */

import { supabase } from '@/lib/supabase/client'
import type { VendorImage } from '@/lib/supabase/types'
import type { VendorRecord, VendorImageRecord } from '@/types/vendor'
import {
  vendorRowToVendorRecord,
  vendorCreateInputToVendorRow,
  VENDOR_APP_TO_DB_KEYS,
  type VendorCreateInput,
  type VendorUpdateInput,
} from './vendorMappers'
import { toSnakeCase } from '@/utils/caseMapping'
import { writeAuditLog } from '@/lib/audit/auditLogger'
import { deleteCaptureImage } from '@/lib/upload/imageUpload'

/**
 * Re-export types for backward compatibility
 */
export type { VendorCreateInput, VendorUpdateInput } from './vendorMappers'

/**
 * Repository contract interface
 */
export interface VendorRepository {
  // Read operations
  getByEvent(eventId: string): Promise<VendorRecord[]>
  getByEventPaginated(eventId: string, options?: { cursor?: string; limit?: number }): Promise<{ vendors: VendorRecord[]; nextCursor: string | null }>
  getById(id: string): Promise<VendorRecord | null>

  // Write operations
  createFromReviewedCapture(input: VendorCreateInput): Promise<VendorRecord>
  update(id: string, input: VendorUpdateInput, expectedVersion: number): Promise<VendorRecord>
  archive(id: string): Promise<void>
  reorderVendors(orderedIds: string[]): Promise<void>

  // Image operations
  addImage(vendorId: string, image: VendorImageRecord): Promise<void>
  removeImage(vendorId: string, imageId: string): Promise<void>
  setPrimaryImage(vendorId: string, imageId: string): Promise<void>
}

/**
 * Supabase-backed repository implementation
 */
export class SupabaseVendorRepository implements VendorRepository {
  async getByEvent(eventId: string): Promise<VendorRecord[]> {
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('event_id', eventId)
      .is('deleted_at', null) // Filter out soft-deleted records
      .order('sort_order', { ascending: true })

    if (error) {
      throw error
    }

    const vendorIds = vendors?.map(v => v.id) || []

    // Fetch images and style counts in parallel
    const [{ data: images }, { data: styleRows }] = await Promise.all([
      supabase
        .from('vendor_images')
        .select('*')
        .in('vendor_id', vendorIds)
        .is('deleted_at', null)
        .order('display_order', { ascending: true }),
      supabase
        .from('fabric_styles')
        .select('vendor_id')
        .in('vendor_id', vendorIds)
        .is('deleted_at', null),
    ])

    // Group images by vendor
    const imagesByVendor = new Map<string, VendorImage[]>()
    images?.forEach(img => {
      const current = imagesByVendor.get(img.vendor_id) || []
      imagesByVendor.set(img.vendor_id, [...current, img])
    })

    // Count styles per vendor
    const styleCountByVendor = new Map<string, number>()
    styleRows?.forEach(row => {
      styleCountByVendor.set(row.vendor_id, (styleCountByVendor.get(row.vendor_id) ?? 0) + 1)
    })

    return vendors?.map(v =>
      vendorRowToVendorRecord(v, imagesByVendor.get(v.id), styleCountByVendor.get(v.id) ?? 0)
    ) || []
  }

  async getByEventPaginated(eventId: string, options?: { cursor?: string; limit?: number }): Promise<{ vendors: VendorRecord[]; nextCursor: string | null }> {
    const limit = options?.limit ?? 20

    let query = supabase
      .from('vendors')
      .select('*')
      .eq('event_id', eventId)
      .is('deleted_at', null) // Filter out soft-deleted records
      .order('company_name', { ascending: false })
      .limit(limit + 1) // Fetch one extra to detect if there's a next page

    if (options?.cursor) {
      query = query.lt('company_name', options.cursor)
    }

    const { data: vendors, error } = await query

    if (error) {
      throw error
    }

    // Determine if there's a next page
    const hasNextPage = (vendors?.length ?? 0) > limit
    const pageVendors = hasNextPage ? vendors!.slice(0, limit) : vendors!

    // Fetch images for page vendors
    const vendorIds = pageVendors?.map(v => v.id) || []
    const { data: images } = await supabase
      .from('vendor_images')
      .select('*')
      .in('vendor_id', vendorIds)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    // Group images by vendor
    const imagesByVendor = new Map<string, VendorImage[]>()
    images?.forEach(img => {
      const current = imagesByVendor.get(img.vendor_id) || []
      imagesByVendor.set(img.vendor_id, [...current, img])
    })

    const mapped = pageVendors?.map(v =>
      vendorRowToVendorRecord(v, imagesByVendor.get(v.id))
    ) || []

    const nextCursor = hasNextPage && mapped.length > 0
      ? mapped[mapped.length - 1].companyName
      : null

    return { vendors: mapped, nextCursor }
  }

  async getById(id: string): Promise<VendorRecord | null> {
    const { data: vendor, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null) // Filter out soft-deleted records
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw error
    }

    // Check if record was soft-deleted (double check in case RLS bypasses the filter)
    if (vendor.deleted_at) {
      return null
    }

    // Fetch images for this vendor (active only — exclude soft-deleted)
    const { data: images } = await supabase
      .from('vendor_images')
      .select('*')
      .eq('vendor_id', id)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    return vendorRowToVendorRecord(vendor, images || [])
  }

  async createFromReviewedCapture(input: VendorCreateInput): Promise<VendorRecord> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Insert vendor
    const vendorRow = vendorCreateInputToVendorRow(input, user.id)
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .insert(vendorRow)
      .select()
      .single()

    if (vendorError) {
      throw vendorError
    }

    // Insert images with display order
    if (input.images.length > 0) {
      const imageRows = input.images.map((img, index) => ({
        vendor_id: vendor.id,
        event_id: input.eventId,
        storage_path: img.uri, // In real implementation, this would be the storage path after upload
        public_url: img.uri,
        image_type: 'gallery' as const,
        is_primary: index === 0,
        display_order: index,
        caption: img.caption || null,
        was_source_info_image: img.id === input.sourceInfoImageId,
        width: null,
        height: null,
        file_size_bytes: null,
        mime_type: null,
        created_by: user.id,
      }))

      const { error: imagesError } = await supabase
        .from('vendor_images')
        .insert(imageRows)

      if (imagesError) {
        throw imagesError
      }
    }

    // Update source_info_image_id if provided
    if (input.sourceInfoImageId) {
      await supabase
        .from('vendors')
        .update({ source_info_image_id: input.sourceInfoImageId })
        .eq('id', vendor.id)
    }

    // Return the created vendor
    const createdVendor = await this.getById(vendor.id)
    if (!createdVendor) {
      throw new Error('Failed to retrieve created vendor')
    }

    writeAuditLog({ entityType: 'vendor', entityId: createdVendor.id, action: 'create' })
    return createdVendor
  }

  async update(id: string, input: VendorUpdateInput, expectedVersion: number): Promise<VendorRecord> {
    // Fetch current images before the update for image comparison
    const { data: currentImages } = await supabase
      .from('vendor_images')
      .select('id')
      .eq('vendor_id', id)
      .is('deleted_at', null)

    // Build update object using centralized case mapping
    const updateData: Record<string, unknown> = {}

    // Rename fields that differ beyond case conversion, then bulk-convert to snake_case
    const renamed: Record<string, unknown> = { ...input }
    for (const [appKey, dbKey] of Object.entries(VENDOR_APP_TO_DB_KEYS)) {
      if (appKey in renamed) {
        renamed[dbKey] = renamed[appKey]
        delete renamed[appKey]
      }
    }
    const snakeInput = toSnakeCase(renamed) as Record<string, unknown>

    // Map each defined field with null-coalescing for optional string fields
    if (snakeInput.company_name !== undefined) updateData.company_name = snakeInput.company_name
    if (snakeInput.booth_number !== undefined) updateData.booth_number = snakeInput.booth_number || null
    if (snakeInput.contact_person !== undefined) updateData.contact_person = snakeInput.contact_person || null
    if (snakeInput.email !== undefined) updateData.email = snakeInput.email || null
    if (snakeInput.phone !== undefined) updateData.phone = snakeInput.phone || null
    if (snakeInput.website_url !== undefined) updateData.website_url = snakeInput.website_url || null
    if (snakeInput.address !== undefined) updateData.address = snakeInput.address || null
    if (snakeInput.country_of_origin !== undefined) updateData.country_of_origin = snakeInput.country_of_origin || null
    if (input.brandNames !== undefined) {
      updateData.brand_names = input.brandNames
        ? input.brandNames.split(',').map(s => s.trim()).filter(Boolean)
        : []
    }
    if (snakeInput.notes !== undefined) updateData.notes = snakeInput.notes || null

    // Optimistic concurrency: increment version and match expected version
    updateData.version = expectedVersion + 1

    const { error } = await supabase
      .from('vendors')
      .update(updateData)
      .eq('id', id)
      .eq('version', expectedVersion)

    if (error) {
      throw error
    }

    // Sync images if input.images was provided
    if (input.images !== undefined) {
      const currentImageIds = new Set((currentImages || []).map(i => i.id))
      const incomingImageIds = new Set(input.images.map(i => i.id))

      // Soft-delete images removed from the set
      for (const img of currentImages || []) {
        if (!incomingImageIds.has(img.id)) {
          await this.removeImage(id, img.id)
        }
      }

      // Add images that don't exist yet
      for (const img of input.images) {
        if (!currentImageIds.has(img.id)) {
          await this.addImage(id, img)
        }
      }
    }

    const updatedVendor = await this.getById(id)
    if (!updatedVendor) {
      throw new Error(
        `CONFLICT: This vendor (${id}) was modified by another user. Please refresh and try again.`
      )
    }

    writeAuditLog({ entityType: 'vendor', entityId: id, action: 'update' })
    return updatedVendor
  }

  async archive(id: string): Promise<void> {
    const { error } = await supabase
      .from('vendors')
      .update({
        status: 'archived',
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    writeAuditLog({ entityType: 'vendor', entityId: id, action: 'archive' })
  }

  async reorderVendors(orderedIds: string[]): Promise<void> {
    const updates = orderedIds.map((id, index) =>
      supabase.from('vendors').update({ sort_order: index }).eq('id', id)
    )
    const results = await Promise.all(updates)
    if (results.some(r => r.error)) {
      throw results.find(r => r.error)!.error
    }
  }

  async addImage(vendorId: string, image: VendorImageRecord): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Resolve the vendor's event_id — required by RLS on vendor_images
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('event_id')
      .eq('id', vendorId)
      .single()

    if (vendorError || !vendor) {
      throw new Error(`Cannot resolve event_id for vendor ${vendorId}`)
    }

    // Get current max display order
    const { data: existingImages } = await supabase
      .from('vendor_images')
      .select('display_order')
      .eq('vendor_id', vendorId)
      .is('deleted_at', null)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = (existingImages?.[0]?.display_order ?? -1) + 1

    const { error } = await supabase
      .from('vendor_images')
      .insert({
        vendor_id: vendorId,
        event_id: vendor.event_id,
        storage_path: image.storagePath || image.uri,
        public_url: image.uri,
        image_type: 'gallery',
        is_primary: false,
        display_order: nextOrder,
        caption: image.caption || null,
        was_source_info_image: false,
        width: null,
        height: null,
        file_size_bytes: null,
        mime_type: null,
        created_by: user.id,
      })

    if (error) {
      throw error
    }
  }

  async removeImage(vendorId: string, imageId: string): Promise<void> {
    const { data: image } = await supabase
      .from('vendor_images')
      .select('storage_path')
      .eq('id', imageId)
      .eq('vendor_id', vendorId)
      .single()

    if (image?.storage_path) {
      await deleteCaptureImage(image.storage_path)
    }

    const { error } = await supabase
      .from('vendor_images')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', imageId)
      .eq('vendor_id', vendorId)

    if (error) {
      throw error
    }
  }

  async setPrimaryImage(vendorId: string, imageId: string): Promise<void> {
    // First, unset all primary images for this vendor
    await supabase
      .from('vendor_images')
      .update({ is_primary: false })
      .eq('vendor_id', vendorId)

    // Then set the new primary
    const { error } = await supabase
      .from('vendor_images')
      .update({ is_primary: true })
      .eq('id', imageId)
      .eq('vendor_id', vendorId)

    if (error) {
      throw error
    }
  }
}

/**
 * Factory function to create a repository instance
 */
export function createVendorRepository(): VendorRepository {
  return new SupabaseVendorRepository()
}

/**
 * Singleton instance for use in the app
 */
export const vendorRepository = createVendorRepository()
