import { supabase } from '@/lib/supabase/client'
import type { FabricStyleDetail, FabricImage } from '@/lib/supabase/types'
import { storagePathToPublicUrl, isSignedUrl } from '@/lib/upload/storageUrls'

/**
 * Fetch complete fabric style detail including variants, inventory, prices, and images.
 *
 * Joins related data:
 * - fabric_variants: color, wash, finish variations
 * - inventory_records: stock snapshots per variant
 * - price_history: commercial terms (style-level or variant-level)
 * - fabric_images: thumbnails and gallery images
 *
 * RLS is handled by Supabase policies in the database.
 *
 * @param styleId - The fabric style ID
 * @returns Complete style detail with all related data
 */
export async function getStyleDetail(styleId: string): Promise<FabricStyleDetail | null> {
  // Fetch style
  const { data: style, error: styleError } = await supabase
    .from('fabric_styles')
    .select('*')
    .eq('id', styleId)
    .single()

  if (styleError) {
    if (styleError.code === 'PGRST116') {
      // Not found
      return null
    }
    throw styleError
  }

  // Fetch variants
  const { data: variants = [], error: variantsError } = await supabase
    .from('fabric_variants')
    .select('*')
    .eq('style_id', styleId)
    .order('created_at', { ascending: true })

  if (variantsError) throw variantsError

  // Fetch inventory records
  const { data: inventory = [], error: inventoryError } = await supabase
    .from('inventory_records')
    .select('*')
    .eq('style_id', styleId)
    .order('captured_at', { ascending: false })

  if (inventoryError) throw inventoryError

  // Fetch price history (both style-level and variant-level)
  const { data: prices = [], error: pricesError } = await supabase
    .from('price_history')
    .select('*')
    .eq('style_id', styleId)
    .order('created_at', { ascending: false })

  if (pricesError) throw pricesError

  // Fetch images (both style-level and variant-level)
  const { data: images = [], error: imagesError } = await supabase
    .from('fabric_images')
    .select('*')
    .eq('style_id', styleId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })

  if (imagesError) throw imagesError

  return {
    style,
    variants: variants ?? [],
    inventory: inventory ?? [],
    prices: prices ?? [],
    images: resolveImageUrls(images ?? []),
  }
}

/**
 * Fix stale signed URLs in image rows.
 *
 * Existing rows may have expired signed URLs (containing token=) in public_url.
 * Replace them with permanent public URLs generated from storage_path.
 */
function resolveImageUrls(images: FabricImage[]): FabricImage[] {
  return images.map((img) => {
    if (img.public_url && !isSignedUrl(img.public_url)) {
      return img
    }
    return { ...img, public_url: storagePathToPublicUrl(img.storage_path) }
  })
}
