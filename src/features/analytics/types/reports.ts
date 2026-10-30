/**
 * Saved Reports Types
 *
 * Types for custom analytics report configurations.
 */

/**
 * Available dimensions for grouping data
 */
export type ReportDimension =
  | 'vendor'
  | 'category'
  | 'season'
  | 'user'
  | 'date'
  | 'status'

/**
 * Available metrics to calculate
 */
export type ReportMetric =
  | 'count'
  | 'vendors_count'
  | 'styles_count'
  | 'images_count'
  | 'avg_confidence'
  | 'completion_percentage'

/**
 * Report configuration
 */
export interface ReportConfig {
  /** Dimensions to group by */
  dimensions: ReportDimension[]
  /** Metrics to calculate */
  metrics: ReportMetric[]
  /** Filters to apply */
  filters: ReportFilter[]
  /** Sort order */
  sort_by?: {
    field: string
    direction: 'asc' | 'desc'
  }
}

/**
 * Report filter
 */
export interface ReportFilter {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in'
  value: string | number | string[] | number[]
}

/**
 * Saved report database record
 */
export interface SavedReport {
  id: string
  name: string
  description: string | null
  user_id: string
  event_id: string | null
  config: ReportConfig
  report_type: string
  schedule_interval: string | null
  schedule_recipient: string | null
  last_scheduled_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Report generation result
 */
export interface GeneratedReport {
  columns: string[]
  rows: Record<string, string | number>[][]
  summary: {
    total_rows: number
    generated_at: string
  }
}
