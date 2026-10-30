/**
 * Task Types
 *
 * Shared types for the task management system.
 * Mirrors the Supabase tasks table schema.
 */

export type TaskState = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled'

export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4'

export type TaskClassification =
  | 'defect'
  | 'enhancement'
  | 'new_feature'
  | 'alignment_issue'

export type TaskDeliveryMode = 'code' | 'manual'

export type TaskPlanStatus = 'none' | 'needs_replan' | 'ambiguous' | 'ready'

export type TaskNoteType =
  | 'general'
  | 'discovery'
  | 'blocker'
  | 'decision'
  | 'review_comment'

/** Full task record matching the Supabase tasks table. */
export interface Task {
  id: number
  parent_id: number | null

  short_desc: string
  detailed_desc: string
  classification: TaskClassification
  priority: TaskPriority

  state: TaskState
  blocked_reason: string | null
  dependencies_met: number

  created_at: string
  estimated_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  updated_at: string

  agent_id: string | null
  worktree_path: string | null
  worktree_status: string | null

  roadmap_id: string | null
  roadmap_tier: string | null
  roadmap_section: string | null

  metadata: Record<string, unknown> | null

  delivery_mode: TaskDeliveryMode
  plan_status: TaskPlanStatus
  ambiguity_level: string | null
  plan_notes: string | null
  planned_at: string | null
  plan_step_count: number | null
  plan_risk: string | null
  plan_est_minutes: number | null
}

/** Task dependency link. */
export interface TaskDependency {
  dependent_id: number
  dependency_id: number
}

/** State change audit record. */
export interface TaskHistory {
  id: number
  task_id: number
  old_state: string | null
  new_state: string
  agent_id: string | null
  changed_at: string
  notes: string | null
}

/** Typed note attached to a task. */
export interface TaskNote {
  id: number
  task_id: number
  note_type: TaskNoteType
  body: string
  author: string | null
  created_at: string
  resolved: number
  resolved_at: string | null
  resolved_by: string | null
}

/** Aggregate metrics for the reporting dashboard. */
export interface TaskStats {
  total: number
  by_state: Record<TaskState, number>
  by_priority: Record<TaskPriority, number>
  by_classification: Record<TaskClassification, number>
  blocked_count: number
  plan_coverage_pct: number
  avg_cycle_days: number | null
  recent_completions: number
}

/** Display-friendly state labels. */
export const TASK_STATE_LABELS: Record<TaskState, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
}

/** Priority colour classes (Tailwind). */
export const PRIORITY_COLOURS: Record<TaskPriority, string> = {
  P0: 'bg-red-100 text-red-800 border-red-200',
  P1: 'bg-orange-100 text-orange-800 border-orange-200',
  P2: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  P3: 'bg-blue-100 text-blue-800 border-blue-200',
  P4: 'bg-gray-100 text-gray-800 border-gray-200',
}
