/**
 * TaskKanbanScreen
 *
 * Desktop-focused kanban board for task management.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { AdminPageHeader } from '../components/AdminLayout'
import { TaskBoard } from '../components/TaskBoard'
import { TaskDetailModal } from '../components/TaskDetailModal'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { getTasks } from '../api/taskManagement'
import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils/cn'
import type { Task } from '@/types/task'

function StatCard({ title, value, icon: Icon, color }: {
  title: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
    </div>
  )
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-3 w-3 rounded-full', swatch)} />
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

export function TaskKanbanScreen() {
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const { user } = useAuth()

  const { data: fetchedTasks, isLoading } = useQuery({
    queryKey: ['admin-tasks'],
    queryFn: () => getTasks(),
  })

  const tasks = localTasks ?? fetchedTasks ?? []

  const stats = {
    total: tasks.length,
    inProgress: tasks.filter((t) => t.state === 'in_progress').length,
    blocked: tasks.filter((t) => t.state === 'blocked').length,
    done: tasks.filter((t) => t.state === 'done').length,
  }

  return (
    <div>
      <AdminPageHeader
        title="Task Board"
        subtitle="Drag tasks between columns to update status"
      />

      <div className="p-6">
        {isLoading ? (
          <LoadingState message="Loading tasks..." />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-12 w-12" />}
            title="No tasks yet"
            description="Tasks created via CLI skills will appear here."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard title="Total" value={stats.total} icon={ClipboardList} color="bg-primary/10 text-primary" />
              <StatCard title="In Progress" value={stats.inProgress} icon={TrendingUp} color="bg-blue-100 text-blue-700" />
              <StatCard title="Blocked" value={stats.blocked} icon={AlertTriangle} color="bg-red-100 text-red-700" />
              <StatCard title="Done" value={stats.done} icon={CheckCircle} color="bg-green-100 text-green-700" />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-xs">
              <span className="font-medium text-muted-foreground">Legend:</span>
              <LegendItem swatch="bg-slate-300 dark:bg-slate-600" label="To Do" />
              <LegendItem swatch="bg-orange-400 dark:bg-orange-600" label="Planned" />
              <LegendItem swatch="bg-blue-400 dark:bg-blue-600" label="In Progress" />
              <LegendItem swatch="bg-red-400 dark:bg-red-600" label="Blocked" />
              <LegendItem swatch="bg-green-400 dark:bg-green-600" label="Done" />
              <LegendItem swatch="bg-gray-300 dark:bg-gray-600" label="Cancelled" />
            </div>
            <TaskBoard
              tasks={tasks}
              onTasksChange={setLocalTasks}
              onTaskClick={(t) => setSelectedTaskId(t.id)}
            />
            <TaskDetailModal
              taskId={selectedTaskId}
              currentUserId={user?.id}
              tasks={tasks}
              onClose={() => setSelectedTaskId(null)}
              onTasksChange={setLocalTasks}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default TaskKanbanScreen
