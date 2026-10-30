/**
 * TaskReportsScreen
 *
 * Mobile-responsive task metrics dashboard.
 */

import { useQuery } from '@tanstack/react-query'
import { ClipboardList, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { AdminPageHeader } from '../components/AdminLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/ui/LoadingState'
import { getTaskStats, getTasks } from '../api/taskManagement'
import { TASK_STATE_LABELS, PRIORITY_COLOURS } from '@/types/task'

function StatCard({ title, value, icon: Icon, color }: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function TaskReportsScreen() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-task-stats'],
    queryFn: getTaskStats,
  })

  const { data: blockedTasks } = useQuery({
    queryKey: ['admin-tasks-blocked'],
    queryFn: () => getTasks({ state: 'blocked' }),
  })

  const { data: recentTasks } = useQuery({
    queryKey: ['admin-tasks-recent'],
    queryFn: () => getTasks({ state: 'done' }),
  })

  if (statsLoading) {
    return (
      <div>
        <AdminPageHeader title="Task Reports" subtitle="Task velocity and project health" />
        <div className="p-6"><LoadingState message="Loading report data..." /></div>
      </div>
    )
  }

  if (!stats) return null

  const recentDone = (recentTasks ?? [])
    .filter((t) => t.actual_end_date)
    .sort((a, b) => (b.actual_end_date ?? '').localeCompare(a.actual_end_date ?? ''))
    .slice(0, 10)

  return (
    <div>
      <AdminPageHeader title="Task Reports" subtitle="Task velocity and project health" />

      <div className="p-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total" value={stats.total} icon={ClipboardList} color="bg-primary/10 text-primary" />
          <StatCard title="In Progress" value={stats.by_state.in_progress} icon={TrendingUp} color="bg-blue-100 text-blue-700" />
          <StatCard title="Blocked" value={stats.blocked_count} icon={AlertTriangle} color="bg-red-100 text-red-700" />
          <StatCard title="Done" value={stats.by_state.done} icon={CheckCircle} color="bg-green-100 text-green-700" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tasks by State */}
          <Section title="Tasks by State">
            <div className="space-y-2">
              {(Object.entries(stats.by_state) as [string, number][]).map(([state, count]) => (
                <div key={state} className="flex items-center justify-between">
                  <span className="text-sm">{TASK_STATE_LABELS[state as keyof typeof TASK_STATE_LABELS] ?? state}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Tasks by Priority */}
          <Section title="Tasks by Priority">
            <div className="space-y-2">
              {(Object.entries(stats.by_priority) as [string, number][]).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between">
                  <Badge variant="outline" size="sm" className={PRIORITY_COLOURS[priority as keyof typeof PRIORITY_COLOURS]}>
                    {priority}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Plan Coverage */}
          <Section title="Plan Coverage">
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold">{stats.plan_coverage_pct}%</span>
                <span className="text-sm text-muted-foreground">of tasks have a plan</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${stats.plan_coverage_pct}%` }}
                />
              </div>
            </div>
          </Section>

          {/* Cycle Time */}
          <Section title="Average Cycle Time">
            <div className="space-y-1">
              <span className="text-3xl font-semibold">
                {stats.avg_cycle_days !== null ? `${stats.avg_cycle_days}` : '—'}
              </span>
              <span className="text-sm text-muted-foreground">
                {stats.avg_cycle_days !== null ? 'days from start to done' : 'No completed tasks with dates'}
              </span>
            </div>
          </Section>
        </div>

        {/* Blocked Tasks */}
        {(blockedTasks ?? []).length > 0 && (
          <Section title={`Blocked Tasks (${blockedTasks!.length})`}>
            <div className="space-y-2">
              {blockedTasks!.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-2 rounded-md bg-red-50 dark:bg-red-950/20">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{task.roadmap_id ?? `#${task.id}`}: {task.short_desc}</p>
                    {task.blocked_reason && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{task.blocked_reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Recent Completions */}
        {recentDone.length > 0 && (
          <Section title={`Recent Completions (${stats.recent_completions} in last 7 days)`}>
            <div className="space-y-2">
              {recentDone.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 rounded-md">
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{task.roadmap_id ?? `#${task.id}`}</span>
                    <span className="text-sm text-muted-foreground ml-2 truncate">{task.short_desc}</span>
                  </div>
                  {task.actual_end_date && (
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {new Date(task.actual_end_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

export default TaskReportsScreen
