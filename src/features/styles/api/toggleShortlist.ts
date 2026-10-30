import { supabase } from '@/lib/supabase/client'

export async function toggleShortlist(styleId: string, isShortlisted: boolean): Promise<void> {
  const { error } = await supabase
    .from('fabric_styles')
    .update({ is_shortlisted: isShortlisted })
    .eq('id', styleId)

  if (error) {
    throw error
  }
}
