/**
 * Template Editor Component
 *
 * Editor for creating and customizing PDF templates.
 */

import { useState, useCallback, useRef } from 'react'
import { Upload, X, Eye, Save, Palette, Type, FileText, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { PdfTemplate, TemplateConfig } from './api/pdfTemplates'

interface TemplateEditorProps {
  /** Event ID */
  eventId: string
  /** Current template being edited */
  template: PdfTemplate | null
  /** Callback when template is saved */
  onSave: (template: { name: string; description: string | null; config: TemplateConfig; logoUrl?: string }) => Promise<void>
  /** Callback when logo is uploaded */
  onUploadLogo?: (file: File) => Promise<string>
  /** Optional additional className */
  className?: string
  /** View mode (editor or preview) */
  viewMode?: 'editor' | 'preview'
  /** Callback when view mode changes */
  onViewModeChange?: (mode: 'editor' | 'preview') => void
}

const FONT_FAMILIES = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' }
]

const PAGE_SIZES = [
  { value: 'letter', label: 'Letter (8.5" x 11")', width: 8.5, height: 11 },
  { value: 'a4', label: 'A4 (210mm x 297mm)', width: 8.27, height: 11.69 },
  { value: 'legal', label: 'Legal (8.5" x 14")', width: 8.5, height: 14 }
]

const PRESET_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Navy', value: '#000080' },
  { name: 'Dark Blue', value: '#00008b' },
  { name: 'Medium Blue', value: '#0000cd' },
  { name: 'Blue', value: '#0000ff' },
  { name: 'Dark Red', value: '#8b0000' },
  { name: 'Red', value: '#ff0000' },
  { name: 'Orange', value: '#ffa500' },
  { name: 'Green', value: '#008000' },
  { name: 'Teal', value: '#008080' },
  { name: 'Olive', value: '#808000' }
]

/**
 * Template Editor Component
 *
 * Provides UI for editing PDF template settings.
 */
export function TemplateEditor({
  eventId: _eventId,
  template,
  onSave,
  onUploadLogo,
  className,
  viewMode = 'editor',
  onViewModeChange
}: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [primaryColor, setPrimaryColor] = useState(template?.primaryColor || '#000000')
  const [secondaryColor, setSecondaryColor] = useState(template?.secondaryColor || '#666666')
  const [accentColor, setAccentColor] = useState(template?.accentColor || '#3b82f6')
  const [fontFamily, setFontFamily] = useState(template?.fontFamily || 'Helvetica')
  const [pageSize, setPageSize] = useState(template?.pageSize || 'letter')
  const [orientation, setOrientation] = useState(template?.orientation || 'portrait')
  const [showLogo, setShowLogo] = useState(template?.headerConfig?.showLogo ?? false)
  const [showTitle, setShowTitle] = useState(template?.headerConfig?.showTitle ?? true)
  const [showDate, setShowDate] = useState(template?.headerConfig?.showDate ?? true)
  const [showPageNumber, setShowPageNumber] = useState(template?.footerConfig?.showPageNumber ?? true)
  const [isSaving, setIsSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState(template?.logoUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const handleLogoUpload = useCallback(async (file: File) => {
    if (!onUploadLogo) return

    try {
      const url = await onUploadLogo(file)
      setLogoUrl(url)
      showToast({
        title: 'Logo uploaded',
        variant: 'success',
        duration: 3000
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload logo'
      showToast({
        title: 'Upload failed',
        description: message,
        variant: 'error',
        duration: 5000
      })
    }
  }, [onUploadLogo, showToast])

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleLogoUpload(file)
    }
  }, [handleLogoUpload])

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      showToast({
        title: 'Name required',
        description: 'Please enter a template name',
        variant: 'error',
        duration: 3000
      })
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        config: {
          primaryColor,
          secondaryColor,
          accentColor,
          fontFamily,
          pageSize,
          orientation,
          margins: { top: 72, right: 72, bottom: 72, left: 72 },
          headerConfig: {
            showLogo,
            showTitle,
            showDate,
            showPageNumber: false
          },
          footerConfig: {
            showLogo: false,
            showPageNumber
          }
        },
        logoUrl: logoUrl || undefined
      })

      showToast({
        title: 'Template saved',
        variant: 'success',
        duration: 3000
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save template'
      showToast({
        title: 'Save failed',
        description: message,
        variant: 'error',
        duration: 5000
      })
    } finally {
      setIsSaving(false)
    }
  }, [name, description, primaryColor, secondaryColor, accentColor, fontFamily, pageSize, orientation, showLogo, showTitle, showDate, showPageNumber, logoUrl, onSave, showToast])

  const selectedPageSize = PAGE_SIZES.find(s => s.value === pageSize)
  const isLandscape = orientation === 'landscape'
  const previewWidth = isLandscape ? selectedPageSize?.height || 11 : selectedPageSize?.width || 8.5
  const previewHeight = isLandscape ? selectedPageSize?.width || 8.5 : selectedPageSize?.height || 11

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Template Editor</h3>
          <p className="text-sm text-muted-foreground">
            {template ? 'Edit template' : 'Create new template'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange?.(viewMode === 'editor' ? 'preview' : 'editor')}
          >
            <Eye className="h-4 w-4 mr-2" />
            {viewMode === 'editor' ? 'Preview' : 'Edit'}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {viewMode === 'editor' ? (
        <>
          {/* Basic info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Basic Information
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Template Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Custom Template"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this template..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Logo
            </h4>

            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative">
                  <img src={logoUrl} alt="Logo" className="h-16 max-w-[200px] object-contain border border-border rounded" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-destructive text-destructive-foreground"
                    onClick={() => setLogoUrl(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFileSelect}
                  disabled={!onUploadLogo}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG up to 2MB. Recommended: 200x200px.
              </p>
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Colors
            </h4>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Primary</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Secondary</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Accent</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Preset colors */}
            <div>
              <label className="block text-sm font-medium mb-2">Quick Presets</label>
              <div className="flex flex-wrap gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setPrimaryColor(color.value)}
                    className={cn(
                      'w-8 h-8 rounded border border-border hover:scale-110 transition-transform',
                      primaryColor === color.value && 'ring-2 ring-primary ring-offset-2'
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Type className="h-4 w-4" />
              Typography
            </h4>

            <div>
              <label className="block text-sm font-medium mb-1">Font Family</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                {FONT_FAMILIES.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Page settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Page Settings
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Page Size</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as 'letter' | 'a4' | 'legal')}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Orientation</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={cn(
                      'flex-1 px-3 py-2 text-sm rounded-md border border-text-center transition-colors',
                      orientation === 'portrait'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    )}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={cn(
                      'flex-1 px-3 py-2 text-sm rounded-md border border-text-center transition-colors',
                      orientation === 'landscape'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    )}
                  >
                    Landscape
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Header/Footer options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Header Options</h4>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showLogo}
                  onChange={(e) => setShowLogo(e.target.checked)}
                  className="rounded"
                />
                Show Logo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showTitle}
                  onChange={(e) => setShowTitle(e.target.checked)}
                  className="rounded"
                />
                Show Title
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showDate}
                  onChange={(e) => setShowDate(e.target.checked)}
                  className="rounded"
                />
                Show Date
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Footer Options</h4>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showPageNumber}
                onChange={(e) => setShowPageNumber(e.target.checked)}
                className="rounded"
              />
              Show Page Numbers
            </label>
          </div>
        </>
      ) : (
        /* Preview */
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Preview</h4>
          <div className="flex justify-center p-8 bg-muted/30 rounded-lg">
            <div
              className="bg-white shadow-lg"
              style={{
                width: `${previewWidth}in`,
                height: `${previewHeight}in`,
                aspectRatio: `${previewWidth}/${previewHeight}`
              }}
            >
              {/* Header */}
              <div
                className="p-4 border-b flex items-center justify-between"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <div className="flex items-center gap-2">
                  {showLogo && logoUrl && (
                    <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
                  )}
                  {showTitle && (
                    <span style={{ fontFamily, color: primaryColor, fontWeight: 'bold' }}>
                      {name || 'Template Name'}
                    </span>
                  )}
                </div>
                {showDate && (
                  <span style={{ fontFamily, fontSize: '12px', color: secondaryColor }}>
                    {new Date().toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-4" style={{ fontFamily }}>
                <p style={{ color: secondaryColor, fontSize: '14px', marginBottom: '12px' }}>
                  Sample content using {fontFamily} font.
                </p>
                <p style={{ color: accentColor, fontSize: '14px', marginBottom: '12px' }}>
                  This is how your headings will look.
                </p>
                <p style={{ color: primaryColor, fontSize: '12px' }}>
                  This is body text in primary color.
                </p>
              </div>

              {/* Footer */}
              <div
                className="p-2 border-t flex justify-between items-center text-xs"
                style={{ color: secondaryColor }}
              >
                {logoUrl && (
                  <img src={logoUrl} alt="Logo" className="h-4 w-auto opacity-50" />
                )}
                {showPageNumber && (
                  <span style={{ fontFamily }}>
                    Page 1
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Preview is approximate. Actual PDF may vary slightly.
          </div>
        </div>
      )}

      {/* Note about PDF generation */}
      <div className="flex gap-2 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
        <p>
          Custom templates require PDF generation (T1.1) to be fully functional.
          Templates are saved and can be applied when generating PDF catalogues.
        </p>
      </div>
    </div>
  )
}
