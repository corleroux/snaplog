/**
 * TaskCard
 *
 * Draggable card for the kanban board.
 */

import { useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import type { Task } from '@/types/task'
import { PRIORITY_COLOURS } from '@/types/task'
import { AlertTriangle } from 'lucide-react'

const TAP_MOVE_THRESHOLD = 8

interface TaskCardProps {
  task: Task
  onTaskClick?: (task: Task) => void
}

export function TaskCard({ task, onTaskClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task },
  })

  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: e.clientX, y: e.clientY }
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const start = pointerStart.current
    pointerStart.current = null
    if (!onTaskClick || !start) return
    const dx = Math.abs(start.x - e.clientX)
    const dy = Math.abs(start.y - e.clientY)
    if (dx < TAP_MOVE_THRESHOLD && dy < TAP_MOVE_THRESHOLD) {
      onTaskClick(task)
    }
  }

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  const plannedReady = task.plan_status === 'ready'
  const blockedByDeps = plannedReady && task.dependencies_met === 0
  const unplanned = !plannedReady

  const plannedStatusClass = unplanned
    ? 'bg-amber-200 dark:bg-amber-700/50 border-amber-400 dark:border-amber-500'
    : blockedByDeps
      ? 'bg-slate-300 dark:bg-slate-600/50 border-slate-400 dark:border-slate-500'
      : 'bg-card border-border'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={cn(
        'rounded-lg border p-3 shadow-sm cursor-grab active:cursor-grabbing transition-shadow',
        'hover:shadow-md',
        isDragging && 'opacity-50 shadow-lg z-50',
        plannedStatusClass,
        task.state === 'blocked' && 'border-red-300 dark:border-red-700'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-xs font-mono text-muted-foreground truncate">
          {task.roadmap_id ?? `#${task.id}`}
        </span>
        <Badge variant="outline" size="sm" className={cn(PRIORITY_COLOURS[task.priority])}>
          {task.priority}
        </Badge>
      </div>

      <p className="text-sm font-medium line-clamp-2 mb-2">{task.short_desc}</p>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="secondary" size="sm">
          {task.classification.replace('_', ' ')}
        </Badge>

        {task.state === 'blocked' && task.blocked_reason && (
          <span className="inline-flex items-center gap-0.5 text-xs text-red-600 dark:text-red-400" title={task.blocked_reason}>
            <AlertTriangle className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{task.blocked_reason}</span>
          </span>
        )}
      </div>
    </div>
  )
}
