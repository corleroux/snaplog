/**
 * TaskColumn
 *
 * Droppable column for the kanban board.
 */

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils/cn'
import { TaskCard } from './TaskCard'
import type { Task, TaskState } from '@/types/task'
import { TASK_STATE_LABELS } from '@/types/task'
import type { BoardColumn } from './TaskBoard'

const STATE_HEADER_COLOURS: Record<BoardColumn, string> = {
  todo: 'bg-slate-300 dark:bg-slate-600',
  planned: 'bg-orange-400 dark:bg-orange-600',
  in_progress: 'bg-blue-400 dark:bg-blue-600',
  blocked: 'bg-red-400 dark:bg-red-600',
  done: 'bg-green-400 dark:bg-green-600',
  cancelled: 'bg-gray-300 dark:bg-gray-600',
}

const STATE_COUNT_COLOURS: Record<BoardColumn, string> = {
  todo: 'bg-slate-400 text-slate-900 dark:bg-slate-500 dark:text-slate-100',
  planned: 'bg-orange-500 text-white dark:bg-orange-600 dark:text-orange-100',
  in_progress: 'bg-blue-500 text-white dark:bg-blue-600 dark:text-blue-100',
  blocked: 'bg-red-500 text-white dark:bg-red-600 dark:text-red-100',
  done: 'bg-green-500 text-white dark:bg-green-600 dark:text-green-100',
  cancelled: 'bg-gray-400 text-gray-900 dark:bg-gray-500 dark:text-gray-100',
}

const COLUMN_LABELS: Record<BoardColumn, string> = {
  ...TASK_STATE_LABELS,
  planned: 'Planned',
}

interface TaskColumnProps {
  column: BoardColumn
  state: TaskState
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function TaskColumn({ column, state, tasks, onTaskClick, collapsed, onToggleCollapse }: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column}`,
    data: { state },
  })

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] flex-shrink-0 max-h-[calc(100vh-220px)]">
      {/* Column header */}
      <div
        className={cn(
          'rounded-t-lg px-3 py-2 flex items-center justify-between cursor-pointer',
          STATE_HEADER_COLOURS[column]
        )}
        onClick={onToggleCollapse}
      >
        <h3 className="text-sm font-semibold">{COLUMN_LABELS[column]}</h3>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATE_COUNT_COLOURS[column])}>
          {tasks.length}
        </span>
      </div>

      {/* Collapsed state — minimal droppable area */}
      {collapsed ? (
        <div
          ref={setNodeRef}
          className={cn(
            'rounded-b-lg border border-t-0 p-2 min-h-[40px]',
            'bg-muted/30'
          )}
        />
      ) : (
        /* Droppable area */
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 rounded-b-lg border border-t-0 p-2 space-y-2 overflow-y-auto min-h-[200px] transition-colors',
            'bg-muted/30',
            isOver && 'bg-primary/5 border-primary/30'
          )}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
          ))}

          {tasks.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No tasks
            </p>
          )}
        </div>
      )}
    </div>
  )
}
