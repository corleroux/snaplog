/**
 * Task Management API
 *
 * Functions for managing tasks in the admin panel.
 * Supabase is the primary data store.
 */

import { supabase } from '@/lib/supabase/client'
import type { Task, TaskState, TaskHistory, TaskNote, TaskNoteType, TaskStats } from '@/types/task'

/**
 * Fetch all tasks with optional filters
 */
export async function getTasks(filters?: {
  state?: TaskState
  priority?: string
  classification?: string
}): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })

  if (filters?.state) {
    query = query.eq('state', filters.state)
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority)
  }
  if (filters?.classification) {
    query = query.eq('classification', filters.classification)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`)
  }

  return (data as Task[]) ?? []
}

/**
 * Get task by ID
 */
export async function getTaskById(taskId: number): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (error || !data) {
    return null
  }

  return data as Task
}

/**
 * Update task state and record the change in task_history
 */
export async function updateTaskState(
  taskId: number,
  newState: TaskState,
  agentId?: string
): Promise<void> {
  // Fetch current state for the history record
  const current = await getTaskById(taskId)
  const oldState = current?.state ?? null

  // Update the task
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ state: newState })
    .eq('id', taskId)

  if (updateError) {
    throw new Error(`Failed to update task state: ${updateError.message}`)
  }

  // Record in history
  const { error: historyError } = await supabase
    .from('task_history')
    .insert({
      task_id: taskId,
      old_state: oldState,
      new_state: newState,
      agent_id: agentId ?? null,
    })

  if (historyError) {
    throw new Error(`Failed to record task history: ${historyError.message}`)
  }
}

/**
 * Get aggregate task statistics for the reporting dashboard
 */
export async function getTaskStats(): Promise<TaskStats> {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('state, priority, classification, actual_start_date, actual_end_date')

  if (error) {
    throw new Error(`Failed to fetch task stats: ${error.message}`)
  }

  const rows = (tasks ?? []) as Pick<
    Task,
    'state' | 'priority' | 'classification' | 'actual_start_date' | 'actual_end_date'
  >[]

  const by_state: Record<TaskState, number> = {
    todo: 0,
    in_progress: 0,
    blocked: 0,
    done: 0,
    cancelled: 0,
  }
  const by_priority: Record<string, number> = { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 }
  const by_classification: Record<string, number> = {
    defect: 0,
    enhancement: 0,
    new_feature: 0,
    alignment_issue: 0,
    feature: 0,
    bug: 0,
    debt: 0,
    test: 0,
    infra: 0,
    security: 0,
    observability: 0,
    reporting: 0,
    chore: 0,
  }

  let cycleDaysSum = 0
  let cycleDaysCount = 0
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  for (const t of rows) {
    by_state[t.state as TaskState] = (by_state[t.state as TaskState] ?? 0) + 1
    by_priority[t.priority] = (by_priority[t.priority] ?? 0) + 1
    by_classification[t.classification] = (by_classification[t.classification] ?? 0) + 1

    if (t.actual_start_date && t.actual_end_date) {
      const start = new Date(t.actual_start_date)
      const end = new Date(t.actual_end_date)
      const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      if (days >= 0) {
        cycleDaysSum += days
        cycleDaysCount++
      }
    }
  }

  const total = rows.length
  const readyTasks = ((await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('plan_status', 'ready')
  ).count) ?? 0

  const recentCompletions = ((await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('state', 'done')
    .gte('actual_end_date', sevenDaysAgo.toISOString())
  ).count) ?? 0

  return {
    total,
    by_state: by_state as Record<TaskState, number>,
    by_priority: by_priority as Record<Task['priority'], number>,
    by_classification: by_classification as Record<Task['classification'], number>,
    blocked_count: by_state.blocked ?? 0,
    plan_coverage_pct: total > 0 ? Math.round((readyTasks / total) * 100) : 0,
    avg_cycle_days: cycleDaysCount > 0 ? Math.round((cycleDaysSum / cycleDaysCount) * 10) / 10 : null,
    recent_completions: recentCompletions,
  }
}

/**
 * Get state change history for a task
 */
export async function getTaskHistory(taskId: number): Promise<TaskHistory[]> {
  const { data, error } = await supabase
    .from('task_history')
    .select('*')
    .eq('task_id', taskId)
    .order('changed_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch task history: ${error.message}`)
  }

  return (data as TaskHistory[]) ?? []
}

/**
 * Get notes for a task
 */
export async function getTaskNotes(taskId: number): Promise<TaskNote[]> {
  const { data, error } = await supabase
    .from('task_notes')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch task notes: ${error.message}`)
  }

  return (data as TaskNote[]) ?? []
}

/** Scalar fields that can be edited inline from the task detail modal. */
export type TaskEditableFields = Pick<
  Task,
  | 'short_desc'
  | 'detailed_desc'
  | 'priority'
  | 'classification'
  | 'blocked_reason'
  | 'estimated_end_date'
>

/**
 * Update editable scalar fields on a task.
 */
export async function updateTask(
  taskId: number,
  patch: Partial<TaskEditableFields>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`)
  }

  return data as Task
}

/**
 * Add a note to a task.
 */
export async function addTaskNote(
  taskId: number,
  body: string,
  noteType: TaskNoteType = 'general',
  author: string | null = null
): Promise<TaskNote> {
  const { data, error } = await supabase
    .from('task_notes')
    .insert({
      task_id: taskId,
      body,
      note_type: noteType,
      author,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add task note: ${error.message}`)
  }

  return data as TaskNote
}
