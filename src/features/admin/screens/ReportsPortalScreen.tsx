/**
 * ReportsPortalScreen
 *
 * Dashboard of available reports. Users drill into specific reports from here.
 */

import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { AdminPageHeader } from '../components/AdminLayout'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface ReportCard {
  title: string
  description: string
  icon: React.ElementType
  href: string
  color: string
}

const REPORTS: ReportCard[] = [
  {
    title: 'Task Management',
    description: 'Task velocity, blocked items, and completion metrics.',
    icon: ClipboardList,
    href: '/admin/reports/tasks',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
]

export function ReportsPortalScreen() {
  return (
    <div>
      <AdminPageHeader
        title="Reports"
        subtitle="Project health and performance metrics"
      />

      <div className="p-6">
        {REPORTS.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No reports available.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORTS.map((report) => {
              const Icon = report.icon
              return (
                <Link key={report.href} to={report.href}>
                  <Card className="h-full transition-colors hover:bg-accent cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${report.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                      </div>
                      <CardDescription>{report.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportsPortalScreen
