/**
 * Custom PDF Templates API Functions
 *
 * Functions for managing custom PDF templates.
 */

import { supabase } from '@/lib/supabase/client'

export interface PdfTemplate {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  pageSize: 'letter' | 'a4' | 'legal'
  orientation: 'portrait' | 'landscape'
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  headerConfig: {
    showLogo: boolean
    showTitle: boolean
    showDate: boolean
    showPageNumber: boolean
    customText?: string
  } | null
  footerConfig: {
    showLogo: boolean
    showPageNumber: boolean
    customText?: string
  } | null
  createdBy: string
  createdByName: string | null
  createdAt: string
  updatedAt: string
  isDefault: boolean
}

export interface TemplateConfig {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  pageSize: 'letter' | 'a4' | 'legal'
  orientation: 'portrait' | 'landscape'
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  headerConfig: {
    showLogo: boolean
    showTitle: boolean
    showDate: boolean
    showPageNumber: boolean
    customText?: string
  }
  footerConfig: {
    showLogo: boolean
    showPageNumber: boolean
    customText?: string
  }
}

const DEFAULT_TEMPLATE: Omit<PdfTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'createdByName'> = {
  name: 'Default Template',
  description: 'Standard PDF export template',
  logoUrl: null,
  primaryColor: '#000000',
  secondaryColor: '#666666',
  accentColor: '#3b82f6',
  fontFamily: 'Helvetica',
  pageSize: 'letter',
  orientation: 'portrait',
  margins: { top: 72, right: 72, bottom: 72, left: 72 },
  headerConfig: {
    showLogo: false,
    showTitle: true,
    showDate: true,
    showPageNumber: false
  },
  footerConfig: {
    showLogo: false,
    showPageNumber: true
  },
  isDefault: true
}

/**
 * Get PDF templates for an event
 */
export async function getPdfTemplates(eventId: string): Promise<PdfTemplate[]> {
  const { data, error } = await supabase
    .from('pdf_templates')
    .select('*')
    .eq('event_id', eventId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    // If table doesn't exist or no templates, return default
    if (error.code === '42P01') { // undefined_table
      return [{ ...DEFAULT_TEMPLATE, id: 'default', createdBy: 'system', createdByName: 'System', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
    }
    throw error
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    logoUrl: item.logo_url,
    primaryColor: item.primary_color,
    secondaryColor: item.secondary_color,
    accentColor: item.accent_color,
    fontFamily: item.font_family,
    pageSize: item.page_size,
    orientation: item.orientation,
    margins: item.margins,
    headerConfig: item.header_config,
    footerConfig: item.footer_config,
    createdBy: item.created_by,
    createdByName: null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    isDefault: item.is_default || false
  }))
}

/**
 * Get a PDF template by ID
 */
export async function getPdfTemplate(templateId: string): Promise<PdfTemplate | null> {
  const { data, error } = await supabase
    .from('pdf_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    logoUrl: data.logo_url,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    accentColor: data.accent_color,
    fontFamily: data.font_family,
    pageSize: data.page_size,
    orientation: data.orientation,
    margins: data.margins,
    headerConfig: data.header_config,
    footerConfig: data.footer_config,
    createdBy: data.created_by,
    createdByName: null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isDefault: data.is_default || false
  }
}

/**
 * Create a PDF template
 */
export async function createPdfTemplate(
  eventId: string,
  name: string,
  description: string | null,
  config: TemplateConfig,
  logoUrl?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('pdf_templates')
    .insert({
      event_id: eventId,
      name,
      description,
      logo_url: logoUrl || null,
      primary_color: config.primaryColor,
      secondary_color: config.secondaryColor,
      accent_color: config.accentColor,
      font_family: config.fontFamily,
      page_size: config.pageSize,
      orientation: config.orientation,
      margins: config.margins,
      header_config: config.headerConfig,
      footer_config: config.footerConfig
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/**
 * Update a PDF template
 */
export async function updatePdfTemplate(
  templateId: string,
  updates: Partial<{
    name: string
    description: string
    logoUrl: string
    config: TemplateConfig
  }>
): Promise<void> {
  const updateData: Record<string, unknown> = {}

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl
  if (updates.config !== undefined) {
    updateData.primary_color = updates.config.primaryColor
    updateData.secondary_color = updates.config.secondaryColor
    updateData.accent_color = updates.config.accentColor
    updateData.font_family = updates.config.fontFamily
    updateData.page_size = updates.config.pageSize
    updateData.orientation = updates.config.orientation
    updateData.margins = updates.config.margins
    updateData.header_config = updates.config.headerConfig
    updateData.footer_config = updates.config.footerConfig
  }

  const { error } = await supabase
    .from('pdf_templates')
    .update(updateData)
    .eq('id', templateId)

  if (error) throw error
}

/**
 * Delete a PDF template
 */
export async function deletePdfTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('pdf_templates')
    .delete()
    .eq('id', templateId)

  if (error) throw error
}

/**
 * Set default template for an event
 */
export async function setDefaultTemplate(eventId: string, templateId: string): Promise<void> {
  // First, unset all default flags
  await supabase
    .from('pdf_templates')
    .update({ is_default: false })
    .eq('event_id', eventId)

  // Then set the new default
  const { error } = await supabase
    .from('pdf_templates')
    .update({ is_default: true })
    .eq('id', templateId)

  if (error) throw error
}

/**
 * Upload template logo
 */
export async function uploadTemplateLogo(
  eventId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

  const { error } = await supabase.storage
    .from('template-logos')
    .upload(fileName, file)

  if (error) throw error

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('template-logos')
    .getPublicUrl(fileName)

  return publicUrl
}
