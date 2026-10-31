/**
 * Schema-driven review form (FR-SCH-05 + FR-EXT-06).
 *
 * Renders editable fields from a catalogue type definition:
 * - string → text input, number → numeric input
 * - allowed_values → select
 * - group → nested section, array-of-group → repeatable variant rows
 * - scalar arrays (e.g. brand_names) → comma-separated input
 *
 * Missing values stay flagged ("not extracted — confirm or fill"), never
 * guessed. Per-field confidence scores render when the provider supplies
 * them. Edits are reported by schema path; the parent owns the reviewed
 * document so re-extraction can never overwrite it.
 */

import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SectionContainer } from '@/components/ui/section-container'
import {
  isMissingValue,
  type SchemaField,
} from '../api/catalogueRegistry'

export interface SchemaReviewFormProps {
  fields: SchemaField[]
  values: Record<string, unknown>
  confidences?: Record<string, number>
  onFieldChange: (path: string, value: unknown) => void
  validationErrors?: Record<string, string>
  /** Path prefix for nested fields (items of a group/array). */
  parentPath?: string
  className?: string
}

function fullPath(parentPath: string | undefined, field: SchemaField): string {
  // Top-level schema paths already include the output root (e.g. item.name).
  if (!parentPath) {return field.path}
  return `${parentPath}.${field.path}`
}

function ConfidenceBadge({ score }: { score: number | undefined }) {
  if (score === undefined || score === null) {return null}
  const pct = Math.round(score * 100)
  const tone = score >= 0.8 ? 'text-emerald-600 dark:text-emerald-400' : score >= 0.5
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'
  return (
    <span className={cn('text-[11px] font-medium tabular-nums', tone)} title={`Confidence ${pct}%`}>
      {pct}%
    </span>
  )
}

function MissingFlag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-3 w-3" />
      {label} not extracted — confirm or fill
    </span>
  )
}

function FieldWrapper({
  field,
  path,
  missing,
  children,
}: {
  field: SchemaField
  path: string
  missing: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5" data-field-path={path}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={path} className="text-sm">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      </div>
      {children}
      {field.hint && <p className="text-[11px] text-muted-foreground">{field.hint}</p>}
      {missing && <MissingFlag label={field.label} />}
    </div>
  )
}

export function SchemaReviewForm({
  fields,
  values,
  confidences,
  onFieldChange,
  validationErrors = {},
  parentPath,
  className,
}: SchemaReviewFormProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {fields.map((field) => {
        const path = fullPath(parentPath, field)
        const raw = readPath(values, path)
        const missing = isMissingValue(raw)
        const error = validationErrors[path]

        // Nested group (e.g. price inside a variant).
        if (field.type === 'group' && field.fields) {
          return (
            <SectionContainer key={path} title={field.label} background="muted">
              <SchemaReviewForm
                fields={field.fields}
                values={values}
                confidences={confidences}
                onFieldChange={onFieldChange}
                validationErrors={validationErrors}
                parentPath={path}
              />
            </SectionContainer>
          )
        }

        // Array of groups (e.g. colourways / variants).
        if (field.type === 'array' && field.items && typeof field.items === 'object' && field.items.type === 'group') {
          const rows = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : []
          const group = field.items as { type: 'group'; fields: SchemaField[] }
          return (
            <SectionContainer key={path} title={field.label} background="muted">
              {rows.length === 0 && <MissingFlag label={field.label} />}
              <div className="space-y-4">
                {rows.map((_row, index) => (
                  <div key={index} className="rounded-lg border border-border p-3 space-y-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      {field.label} {index + 1}
                    </p>
                    <SchemaReviewForm
                      fields={group.fields}
                      values={values}
                      confidences={confidences}
                      onFieldChange={onFieldChange}
                      validationErrors={validationErrors}
                      parentPath={`${path}.${index}`}
                    />
                  </div>
                ))}
              </div>
            </SectionContainer>
          )
        }

        // Scalar array (e.g. brand_names) → comma-separated input.
        if (field.type === 'array') {
          const text = Array.isArray(raw) ? (raw as unknown[]).join(', ') : ''
          return (
            <FieldWrapper key={path} field={field} path={path} missing={missing}>
              <div className="flex items-center gap-2">
                <Input
                  id={path}
                  value={text}
                  aria-label={field.label}
                  onChange={(e) =>
                    onFieldChange(
                      path,
                      e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  className={cn(missing && 'border-amber-500/50')}
                />
                <ConfidenceBadge score={confidences?.[path]} />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </FieldWrapper>
          )
        }

        // Enum → select.
        if (field.allowed_values && field.allowed_values.length > 0) {
          return (
            <FieldWrapper key={path} field={field} path={path} missing={missing}>
              <div className="flex items-center gap-2">
                <select
                  id={path}
                  aria-label={field.label}
                  value={typeof raw === 'string' || typeof raw === 'number' ? String(raw) : ''}
                  onChange={(e) => onFieldChange(path, e.target.value === '' ? null : e.target.value)}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    missing && 'border-amber-500/50'
                  )}
                >
                  <option value="">Select {field.label.toLowerCase()}…</option>
                  {field.allowed_values.map((option) => (
                    <option key={String(option)} value={String(option)}>
                      {String(option)}
                    </option>
                  ))}
                </select>
                <ConfidenceBadge score={confidences?.[path]} />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </FieldWrapper>
          )
        }

        // Number → numeric input.
        if (field.type === 'number') {
          return (
            <FieldWrapper key={path} field={field} path={path} missing={missing}>
              <div className="flex items-center gap-2">
                <Input
                  id={path}
                  type="number"
                  inputMode="decimal"
                  aria-label={field.label}
                  value={typeof raw === 'number' ? raw : ''}
                  onChange={(e) =>
                    onFieldChange(path, e.target.value === '' ? null : Number(e.target.value))
                  }
                  className={cn(missing && 'border-amber-500/50')}
                />
                <ConfidenceBadge score={confidences?.[path]} />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </FieldWrapper>
          )
        }

        // Default: string input (object metadata renders as JSON text).
        const textValue =
          typeof raw === 'string'
            ? raw
            : raw !== null && raw !== undefined && typeof raw === 'object'
              ? JSON.stringify(raw)
              : ''
        return (
          <FieldWrapper key={path} field={field} path={path} missing={missing}>
            <div className="flex items-center gap-2">
              <Input
                id={path}
                value={textValue}
                aria-label={field.label}
                onChange={(e) => onFieldChange(path, e.target.value === '' ? null : e.target.value)}
                className={cn(missing && 'border-amber-500/50')}
              />
              <ConfidenceBadge score={confidences?.[path]} />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </FieldWrapper>
        )
      })}
    </div>
  )
}

/** Read a dotted path out of the form values (supports array indices). */
function readPath(values: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.')
  let current: unknown = values
  for (const segment of segments) {
    if (current === null || current === undefined) {return undefined}
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (!Number.isInteger(index)) {return undefined}
      current = current[index]
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }
  return current
}

export function SchemaReviewBadge() {
  return (
    <Badge variant="accent" className="gap-1 bg-orange-500 text-white text-xs">
      Schema-driven review
    </Badge>
  )
}
