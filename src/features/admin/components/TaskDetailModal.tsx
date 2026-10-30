/**
 * TaskDetailModal
 *
 * Single-instance modal for viewing and inline-editing a task from the kanban
 * board. Shows full task details, a state-change control, editable scalar
 * fields, a history timeline, and a notes list with an add-note form.
 */

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils/cn'
import { Markdown } from './Markdown'
import {
  getTaskHistory,
  getTaskNotes,
  updateTaskState,
  updateTask,
  addTaskNote,
} from '../api/taskManagement'
import type {
  Task,
  TaskNote,
  TaskHistory,
  TaskNoteType,
  TaskState,
  TaskPriority,
  TaskClassification,
} from '@/types/task'
import { PRIORITY_COLOURS, TASK_STATE_LABELS } from '@/types/task'

const NOTE_TYPES: TaskNoteType[] = [
  'general',
  'discovery',
  'blocker',
  'decision',
  'review_comment',
]

const CLASSIFICATIONS: TaskClassification[] = [
  'defect',
  'enhancement',
  'new_feature',
  'alignment_issue',
]

const PRIORITIES: TaskPriority[] = ['P0', 'P1', 'P2', 'P3', 'P4']

const STATES: TaskState[] = ['todo', 'in_progress', 'blocked', 'done', 'cancelled']

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface TaskDetailModalProps {
  taskId: number | null
  currentUserId: string | undefined
  tasks: Task[]
  onClose: () => void
  onTasksChange: (tasks: Task[]) => void
}

export function TaskDetailModal({
  taskId,
  currentUserId,
  tasks,
  onClose,
  onTasksChange,
}: TaskDetailModalProps) {
  const { showToast } = useToast()
  const isOpen = taskId != null
  const task = tasks.find((t) => t.id === taskId) ?? null

  const [history, setHistory] = useState<TaskHistory[]>([])
  const [notes, setNotes] = useState<TaskNote[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)

  const [newState, setNewState] = useState<TaskState | ''>('')
  const [priority, setPriority] = useState<TaskPriority | ''>('')
  const [classification, setClassification] = useState<TaskClassification | ''>('')
  const [blockedReason, setBlockedReason] = useState('')
  const [estimatedEnd, setEstimatedEnd] = useState('')
  const [noteType, setNoteType] = useState<TaskNoteType>('general')
  const [noteBody, setNoteBody] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async (id: number) => {
    setLoadingData(true)
    setDataError(null)
    try {
      const [historyRes, notesRes] = await Promise.all([
        getTaskHistory(id),
        getTaskNotes(id),
      ])
      setHistory(historyRes)
      setNotes(notesRes)
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Failed to load task data')
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (taskId == null) return
    setNewState(task?.state ?? '')
    setPriority(task?.priority ?? '')
    setClassification(task?.classification ?? '')
    setBlockedReason(task?.blocked_reason ?? '')
    setEstimatedEnd(task?.estimated_end_date?.slice(0, 10) ?? '')
    setNoteBody('')
    setNoteType('general')
    void loadData(taskId)
  }, [taskId, task, loadData])

  const handlePatch = useCallback(
    (updated: Task) => {
      onTasksChange(tasks.map((t) => (t.id === updated.id ? updated : t)))
    },
    [tasks, onTasksChange]
  )

  const handleStateSave = useCallback(async () => {
    if (!task || !newState || newState === task.state) return
    setSaving(true)
    try {
      await updateTaskState(task.id, newState, currentUserId)
      const updated: Task = { ...task, state: newState }
      handlePatch(updated)
      showToast({
        title: 'Task updated',
        description: `State set to ${TASK_STATE_LABELS[newState]}`,
        variant: 'success',
      })
    } catch (err) {
      showToast({
        title: 'Failed to update state',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }, [task, newState, currentUserId, handlePatch, showToast])

  const handleDetailsSave = useCallback(async () => {
    if (!task) return
    setSaving(true)
    try {
      const patch: Record<string, unknown> = {}
      if (priority && priority !== task.priority) patch.priority = priority
      if (classification && classification !== task.classification)
        patch.classification = classification
      if (blockedReason !== (task.blocked_reason ?? ''))
        patch.blocked_reason = blockedReason || null
      if (
        estimatedEnd !== (task.estimated_end_date?.slice(0, 10) ?? '')
      )
        patch.estimated_end_date = estimatedEnd || null
      if (Object.keys(patch).length === 0) return
      const updated = await updateTask(task.id, patch)
      handlePatch(updated)
      showToast({
        title: 'Task updated',
        description: 'Details saved',
        variant: 'success',
      })
    } catch (err) {
      showToast({
        title: 'Failed to save details',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }, [task, priority, classification, blockedReason, estimatedEnd, handlePatch, showToast])

  const handleAddNote = useCallback(async () => {
    if (!task || !noteBody.trim()) return
    setSaving(true)
    try {
      await addTaskNote(task.id, noteBody.trim(), noteType, currentUserId ?? null)
      setNoteBody('')
      const refreshed = await getTaskNotes(task.id)
      setNotes(refreshed)
      showToast({
        title: 'Note added',
        description: 'Your note was saved',
        variant: 'success',
      })
    } catch (err) {
      showToast({
        title: 'Failed to add note',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }, [task, noteBody, noteType, currentUserId, showToast])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? `#${task.id}${task.roadmap_id ? ` · ${task.roadmap_id}` : ''}` : 'Task'}
      size="xl"
    >
      {!task ? (
        <p className="text-sm text-muted-foreground">Task not found.</p>
      ) : (
        <div className="space-y-6">
          {/* Header badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn(PRIORITY_COLOURS[task.priority])}>
              {task.priority}
            </Badge>
            <Badge variant="secondary">{TASK_STATE_LABELS[task.state]}</Badge>
            <Badge variant="secondary">{task.classification.replace('_', ' ')}</Badge>
            {task.plan_status === 'ready' && (
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Plan ready" />
            )}
          </div>

          {/* Overview */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Overview</h3>
            <p className="text-base font-medium">{task.short_desc}</p>
{task.detailed_desc && (
              <Markdown className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.detailed_desc}
              </Markdown>
            )}
            {task.state === 'blocked' && task.blocked_reason && (
              <div className="rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-300">
                <span className="font-medium">Blocked: </span>
                <Markdown>{task.blocked_reason}</Markdown>
              </div>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDateTime(task.created_at)}</dd>
              <dt className="text-muted-foreground">Est. end</dt>
              <dd>{formatDate(task.estimated_end_date)}</dd>
              <dt className="text-muted-foreground">Started</dt>
              <dd>{formatDate(task.actual_start_date)}</dd>
              <dt className="text-muted-foreground">Ended</dt>
              <dd>{formatDate(task.actual_end_date)}</dd>
              <dt className="text-muted-foreground">Plan status</dt>
              <dd>{task.plan_status}</dd>
              <dt className="text-muted-foreground">Plan risk</dt>
              <dd>{task.plan_risk ?? '—'}</dd>
              <dt className="text-muted-foreground">Est. minutes</dt>
              <dd>{task.plan_est_minutes ?? '—'}</dd>
            </dl>
{task.plan_notes && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                <span className="font-medium">Plan notes: </span>
                <Markdown>{task.plan_notes}</Markdown>
              </div>
            )}
          </section>

          {/* State change */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Change state</h3>
            <div className="flex items-center gap-2">
              <select
                value={newState}
                onChange={(e) => setNewState(e.target.value as TaskState)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATE_LABELS[s]}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="accent"
                size="sm"
                radius="pill"
                disabled={saving || !newState || newState === task.state}
                onClick={handleStateSave}
              >
                Save
              </Button>
            </div>
          </section>

          {/* Editable scalars */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Edit details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Priority</span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Classification</span>
                <select
                  value={classification}
                  onChange={(e) =>
                    setClassification(e.target.value as TaskClassification)
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CLASSIFICATIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-muted-foreground">Blocked reason</span>
                <input
                  type="text"
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Estimated end date</span>
                <input
                  type="date"
                  value={estimatedEnd}
                  onChange={(e) => setEstimatedEnd(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              radius="pill"
              disabled={saving}
              onClick={handleDetailsSave}
            >
              Save details
            </Button>
          </section>

          {/* History timeline */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">History</h3>
            {loadingData ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : dataError ? (
              <p className="text-sm text-destructive">{dataError}</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <ul className="space-y-2 border-l border-border pl-4">
                {history.map((h) => (
                  <li key={h.id} className="text-sm">
                    <span className="font-medium">
                      {h.old_state ?? '—'} → {h.new_state}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {formatDateTime(h.changed_at)}
                      {h.agent_id ? ` · ${h.agent_id}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Notes */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Notes</h3>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" size="sm">
                        {n.note_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(n.created_at)}
                        {n.author ? ` · ${n.author}` : ''}
                      </span>
                    </div>
                    <Markdown className="whitespace-pre-wrap">{n.body}</Markdown>
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as TaskNoteType)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {NOTE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={3}
                placeholder="Add a note…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  radius="pill"
                  disabled={saving || !noteBody.trim()}
                  onClick={handleAddNote}
                >
                  Add note
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </Modal>
  )
}
