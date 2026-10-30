/**
 * Style Repository - Persistence Seam
 *
 * This repository provides the app-facing Style domain contract
 * while mapping to the existing fabric_* persistence structures.
 *
 * APP-FACING DOMAIN -> PERSISTENCE MAPPING:
 * - StyleRecord -> fabric_styles table
 * - StyleImageRecord -> fabric_images table
 * - StyleVariant -> fabric_variants table
 * - InventoryRecord -> inventory_records table
 * - PriceHistory -> price_history table
 */

import { supabase } from '@/lib/supabase/client'
import type { PostgrestError } from '@supabase/supabase-js'
import type { FabricStyle } from '@/lib/supabase/types'
import type { Database } from '@/database.types'
import type { StyleImageRecord } from '@/types/style'
import { writeAuditLog } from '@/lib/audit/auditLogger'

type FabricStyleUpdate = Database['public']['Tables']['fabric_styles']['Update']
import {
  type StyleCreateInput,
  type StyleUpdateInput,
  type FabricStyleRow,
  type FabricImageRow,
  fabricStyleRowToStyleRecord,
} from './styleMappers'

/**
 * Repository contract interface
 */
export interface StyleRepository {
  // Read operations
  getStyle(id: string): Promise<import('@/types/style').StyleRecord | null>
  getStylesByVendor(vendorId: string): Promise<import('@/types/style').StyleRecord[]>
  getStylesByVendorPaginated(vendorId: string, options?: { cursor?: string; limit?: number }): Promise<{ styles: import('@/types/style').StyleRecord[]; nextCursor: string | null }>
  getStylesByEvent(eventId: string): Promise<import('@/types/style').StyleRecord[]>

  // Write operations
  createStyle(input: StyleCreateInput): Promise<import('@/types/style').StyleRecord>
  updateStyle(id: string, updates: StyleUpdateInput): Promise<import('@/types/style').StyleRecord>
  deleteStyle(id: string): Promise<void>

  // Image operations
  addStyleImage(styleId: string, image: StyleImageRecord): Promise<void>
  removeStyleImage(styleId: string, imageId: string): Promise<void>
  setPrimaryImage(styleId: string, imageId: string): Promise<void>
}

// Re-export mapper types and functions for backward compatibility
export type { StyleCreateInput, StyleUpdateInput, FabricStyleRow, FabricImageRow } from './styleMappers'
export { fabricStyleRowToStyleRecord, fabricImageToStyleImage, styleRecordToFabricStyleRow } from './styleMappers'

/**
 * Supabase-backed style repository
 */
export class SupabaseStyleRepository implements StyleRepository {
  async getStyle(id: string): Promise<import('@/types/style').StyleRecord | null> {
    const { data: style, error } = await supabase
      .from('fabric_styles')
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
    if (style.deleted_at) {
      return null
    }

    // Fetch images for this style
    const { data: images } = await supabase
      .from('fabric_images')
      .select('*')
      .eq('style_id', id)
      .order('display_order', { ascending: true })

    return fabricStyleRowToStyleRecord(style as FabricStyleRow, (images as FabricImageRow[]) || [])
  }

  /**
   * Shared helper to fetch styles with common logic for images and prices
   */
  private async fetchStyles(
    stylesPromise: PromiseLike<{ data: FabricStyleRow[] | null; error: PostgrestError | null }>
  ): Promise<import('@/types/style').StyleRecord[]> {
    const { data: styles, error } = await stylesPromise

    if (error) {
      throw error
    }

    const styleIds = styles?.map(s => s.id) || []

    // Fetch images and latest prices in parallel
    const [{ data: images }, { data: priceRows }] = await Promise.all([
      supabase
        .from('fabric_images')
        .select('*')
        .in('style_id', styleIds)
        .order('display_order', { ascending: true }),
      supabase
        .from('price_history')
        .select('style_id, price, currency, price_unit')
        .in('style_id', styleIds)
        .order('created_at', { ascending: false }),
    ])

    // Group images by style
    const imagesByStyle = new Map<string, FabricImageRow[]>()
    ;(images as FabricImageRow[])?.forEach(img => {
      if (img.style_id) {
        const current = imagesByStyle.get(img.style_id) || []
        imagesByStyle.set(img.style_id, [...current, img])
      }
    })

    // Latest price per style (first match = most recent, due to DESC order)
    const latestPriceByStyle = new Map<string, { price: number; currency: string; priceUnit: string }>()
    priceRows?.forEach(row => {
      if (row.style_id && !latestPriceByStyle.has(row.style_id)) {
        latestPriceByStyle.set(row.style_id, {
          price: row.price,
          currency: row.currency,
          priceUnit: row.price_unit,
        })
      }
    })

    return styles?.map(s =>
      fabricStyleRowToStyleRecord(s as FabricStyleRow, imagesByStyle.get(s.id), latestPriceByStyle.get(s.id) ?? null)
    ) || []
  }

  async getStylesByVendor(vendorId: string): Promise<import('@/types/style').StyleRecord[]> {
    return this.fetchStyles(
      supabase
        .from('fabric_styles')
        .select('*')
        .eq('vendor_id', vendorId)
        .is('deleted_at', null) // Filter out soft-deleted records
        .order('created_at', { ascending: false })
    )
  }

  async getStylesByVendorPaginated(vendorId: string, options?: { cursor?: string; limit?: number }): Promise<{ styles: import('@/types/style').StyleRecord[]; nextCursor: string | null }> {
    const limit = options?.limit ?? 20

    let query = supabase
      .from('fabric_styles')
      .select('*')
      .eq('vendor_id', vendorId)
      .is('deleted_at', null) // Filter out soft-deleted records
      .order('created_at', { ascending: false })
      .limit(limit + 1) // Fetch one extra to detect if there's a next page

    if (options?.cursor) {
      query = query.lt('created_at', options.cursor)
    }

    const { data: styles, error } = await query

    if (error) {
      throw error
    }

    // Determine if there's a next page
    const hasNextPage = (styles?.length ?? 0) > limit
    const pageStyles = hasNextPage ? styles!.slice(0, limit) : styles!

    // Fetch images for page styles
    const styleIds = pageStyles?.map(s => s.id) || []
    const { data: images } = await supabase
      .from('fabric_images')
      .select('*')
      .in('style_id', styleIds)
      .order('display_order', { ascending: true })

    // Group images by style
    const imagesByStyle = new Map<string, FabricImageRow[]>()
    ;(images as FabricImageRow[])?.forEach(img => {
      if (img.style_id) {
        const current = imagesByStyle.get(img.style_id) || []
        imagesByStyle.set(img.style_id, [...current, img])
      }
    })

    const mapped = pageStyles?.map(s =>
      fabricStyleRowToStyleRecord(s as FabricStyleRow, imagesByStyle.get(s.id))
    ) || []

    const nextCursor = hasNextPage && mapped.length > 0
      ? mapped[mapped.length - 1].createdAt
      : null

    return { styles: mapped, nextCursor }
  }

  async getStylesByEvent(eventId: string): Promise<import('@/types/style').StyleRecord[]> {
    return this.fetchStyles(
      supabase
        .from('fabric_styles')
        .select('*')
        .eq('event_id', eventId)
        .is('deleted_at', null) // Filter out soft-deleted records
        .order('created_at', { ascending: false })
    )
  }

  async createStyle(input: StyleCreateInput): Promise<import('@/types/style').StyleRecord> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get vendor's event_id
    const { data: vendor } = await supabase
      .from('vendors')
      .select('event_id')
      .eq('id', input.vendorId)
      .single()

    if (!vendor) {
      throw new Error('Vendor not found')
    }

    // Insert style
    const styleRow: Partial<FabricStyle> = {
      event_id: vendor.event_id,
      vendor_id: input.vendorId,
      item_code: (() => {
        if (!input.sku || input.sku.trim() === '') {
          throw new Error('item_code is required to create a fabric style. The scan review should prompt the user to provide it.')
        }
        return input.sku.trim()
      })(),
      name: input.styleName || null,
      composition: input.composition || null,
      supplier_ref: input.supplierRef || null,
      source_info_image_id: input.sourceInfoImageId || null,
      extracted_at: input.extractionMeta?.extractedAt || null,
      extraction_status: input.extractionMeta ? 'complete' : null,
      extraction_warnings: input.extractionMeta?.warnings || [],
      extraction_confidence: null,
      source: input.extractionMeta ? 'ai' : 'manual',
      status: 'active',
      created_by: user.id,
      updated_by: null,
    }

    const { data: style, error: styleError } = await supabase
      .from('fabric_styles')
      .insert(styleRow)
      .select()
      .single()

    if (styleError) {
      throw styleError
    }

    // Insert images with display order
    if (input.images.length > 0) {
      const imageRows = input.images.map((img, index) => ({
        style_id: style.id,
        vendor_id: input.vendorId,
        event_id: vendor.event_id,
        storage_path: img.uri, // In real implementation, this would be the storage path after upload
        public_url: img.uri,
        image_role: 'gallery' as const,
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
        .from('fabric_images')
        .insert(imageRows)

      if (imagesError) {
        throw imagesError
      }
    }

    // Audit the creation
    writeAuditLog({ entityType: 'fabric_style', entityId: style.id, action: 'create' })

    // Return the created style
    const createdStyle = await this.getStyle(style.id)
    if (!createdStyle) {
      throw new Error('Failed to retrieve created style')
    }
    return createdStyle
  }

  async updateStyle(id: string, updates: StyleUpdateInput): Promise<import('@/types/style').StyleRecord> {
    // Build update object
    const updateData: Partial<FabricStyleUpdate> = {}

    if (updates.styleName !== undefined) updateData.name = updates.styleName || null
    if (updates.composition !== undefined) updateData.composition = updates.composition || null
    if (updates.sku !== undefined && updates.sku) updateData.item_code = updates.sku
    if (updates.supplierRef !== undefined) updateData.supplier_ref = updates.supplierRef || null

    const { error } = await supabase
      .from('fabric_styles')
      .update(updateData)
      .eq('id', id)

    if (error) {
      throw error
    }

    const updatedStyle = await this.getStyle(id)
    if (!updatedStyle) {
      throw new Error('Failed to retrieve updated style')
    }
    return updatedStyle
  }

  async deleteStyle(id: string): Promise<void> {
    // Soft delete by updating status
    const { error } = await supabase
      .from('fabric_styles')
      .update({ 
        status: 'archived',
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw error
    }
  }

  async addStyleImage(styleId: string, image: StyleImageRecord): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get style's vendor and event
    const { data: style } = await supabase
      .from('fabric_styles')
      .select('vendor_id, event_id')
      .eq('id', styleId)
      .single()

    if (!style) {
      throw new Error('Style not found')
    }

    // Get current max display order
    const { data: existingImages } = await supabase
      .from('fabric_images')
      .select('display_order')
      .eq('style_id', styleId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = (existingImages?.[0]?.display_order ?? -1) + 1

    const { error } = await supabase
      .from('fabric_images')
      .insert({
        style_id: styleId,
        vendor_id: style.vendor_id,
        event_id: style.event_id,
        storage_path: image.uri,
        public_url: image.uri,
        image_role: 'gallery',
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

  async removeStyleImage(styleId: string, imageId: string): Promise<void> {
    const { error } = await supabase
      .from('fabric_images')
      .delete()
      .eq('id', imageId)
      .eq('style_id', styleId)

    if (error) {
      throw error
    }
  }

  async setPrimaryImage(styleId: string, imageId: string): Promise<void> {
    // First, unset all primary images for this style
    await supabase
      .from('fabric_images')
      .update({ is_primary: false })
      .eq('style_id', styleId)

    // Then set the new primary
    const { error } = await supabase
      .from('fabric_images')
      .update({ is_primary: true })
      .eq('id', imageId)
      .eq('style_id', styleId)

    if (error) {
      throw error
    }
  }
}

/**
 * Factory function to create a Supabase repository instance
 */
export function createSupabaseStyleRepository(): StyleRepository {
  return new SupabaseStyleRepository()
}

/**
 * Singleton instance for use in the app
 */
export const styleRepository = createSupabaseStyleRepository()
