/**
 * TaskBoard
 *
 * Main kanban board with drag-and-drop between columns.
 */

import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Input } from '@/components/ui/input'
import { TaskColumn } from './TaskColumn'
import { useToast } from '@/components/ui/toast'
import { updateTaskState } from '../api/taskManagement'
import type { Task, TaskState } from '@/types/task'
import { Search } from 'lucide-react'

export type BoardColumn = TaskState | 'planned'

const COLUMN_ORDER: BoardColumn[] = [
  'todo',
  'planned',
  'in_progress',
  'blocked',
  'done',
  'cancelled',
]

interface TaskBoardProps {
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
  onTaskClick?: (task: Task) => void
}

export function TaskBoard({ tasks, onTasksChange, onTaskClick }: TaskBoardProps) {
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [classificationFilter, setClassificationFilter] = useState<string>('')
  const [collapsed, setCollapsed] = useState<Record<BoardColumn, boolean>>({
    todo: false,
    planned: false,
    in_progress: false,
    blocked: false,
    done: false,
    cancelled: true,
  })

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  })
  const sensors = useSensors(mouseSensor, touchSensor)

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search) {
        const q = search.toLowerCase()
        const matchesSearch =
          (t.roadmap_id?.toLowerCase().includes(q) ?? false) ||
          t.short_desc.toLowerCase().includes(q) ||
          String(t.id).includes(q)
        if (!matchesSearch) return false
      }
      if (priorityFilter && t.priority !== priorityFilter) return false
      if (classificationFilter && t.classification !== classificationFilter) return false
      return true
    })
  }, [tasks, search, priorityFilter, classificationFilter])

  const tasksByState = useMemo(() => {
    const grouped: Record<BoardColumn, Task[]> = {
      todo: [],
      planned: [],
      in_progress: [],
      blocked: [],
      done: [],
      cancelled: [],
    }
    for (const t of filteredTasks) {
      if (
        t.state === 'todo' &&
        t.plan_status === 'ready' &&
        t.dependencies_met === 1
      ) {
        grouped.planned.push(t)
      } else {
        grouped[t.state]?.push(t)
      }
    }
    return grouped
  }, [filteredTasks])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      const taskId = Number(String(active.id).replace('task-', ''))
      const targetColumn = String(over.id).replace('column-', '') as BoardColumn

      // Planned is a derived column — dropping a card into it does not change
      // state (planning happens via task-plan, not by dragging). No-op.
      if (targetColumn === 'planned') return

      if (!COLUMN_ORDER.includes(targetColumn)) return
      const targetState = targetColumn as TaskState

      const task = tasks.find((t) => t.id === taskId)
      if (!task || task.state === targetState) return

      // Optimistic update
      const updated = tasks.map((t) =>
        t.id === taskId ? { ...t, state: targetState } : t
      )
      onTasksChange(updated)

      try {
        await updateTaskState(taskId, targetState)
        showToast({
          title: 'Task updated',
          description: `Moved to ${targetState.replace('_', ' ')}`,
          variant: 'success',
        })
      } catch {
        // Revert on error
        onTasksChange(tasks)
        showToast({
          title: 'Failed to update task',
          description: 'The change could not be saved.',
          variant: 'error',
        })
      }
    },
    [tasks, onTasksChange, showToast]
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All priorities</option>
          <option value="P0">P0</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
          <option value="P4">P4</option>
        </select>
        <select
          value={classificationFilter}
          onChange={(e) => setClassificationFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <optgroup label="Primary">
            <option value="defect">Defect</option>
            <option value="enhancement">Enhancement</option>
            <option value="new_feature">New Feature</option>
            <option value="alignment_issue">Alignment Issue</option>
          </optgroup>
          <optgroup label="Legacy">
            <option value="feature">Feature</option>
            <option value="bug">Bug</option>
            <option value="debt">Debt</option>
            <option value="test">Test</option>
            <option value="infra">Infra</option>
            <option value="security">Security</option>
            <option value="observability">Observability</option>
            <option value="reporting">Reporting</option>
            <option value="chore">Chore</option>
          </optgroup>
        </select>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMN_ORDER.map((column) => (
            <TaskColumn
              key={column}
              column={column}
              state={column === 'planned' ? 'todo' : column}
              tasks={tasksByState[column]}
              onTaskClick={onTaskClick}
              collapsed={collapsed[column]}
              onToggleCollapse={() => setCollapsed((prev) => ({ ...prev, [column]: !prev[column] }))}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}
