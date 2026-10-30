import { supabase } from '@/lib/supabase/client'

export interface VendorPriceEntry {
  id: string
  price: number
  currency: string
  price_unit: string
  eventId: string
  eventName: string | null
  createdAt: string
  styleId: string | null
}

export async function getVendorPriceHistory(vendorId: string): Promise<VendorPriceEntry[]> {
  const { data, error } = await supabase
    .from('price_history')
    .select('id, price, currency, price_unit, event_id, created_at, style_id, events(name)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((item: any) => ({
    id: item.id,
    price: item.price,
    currency: item.currency,
    price_unit: item.price_unit,
    eventId: item.event_id,
    eventName: item.events?.name ?? null,
    createdAt: item.created_at,
    styleId: item.style_id,
  }))
}
