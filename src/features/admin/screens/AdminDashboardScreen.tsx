/**
 * Admin Dashboard Screen
 *
 * Main dashboard for the admin panel.
 */

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, Calendar, FileText, Activity, AlertTriangle } from 'lucide-react'
import { AdminPageHeader } from '../components/AdminLayout'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  icon: React.ElementType
  href: string
  trend?: 'up' | 'down' | 'neutral'
}

function StatCard({ title, value, change, icon: Icon, href, trend = 'neutral' }: StatCardProps) {
  return (
    <Link to={href} className="block">
      <div className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold mt-2">{value}</p>
            {change && (
              <p className={cn(
                'text-xs mt-1',
                trend === 'up' && 'text-green-600',
                trend === 'down' && 'text-red-600',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                {change}
              </p>
            )}
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
    </Link>
  )
}

interface QuickActionProps {
  title: string
  description: string
  href: string
  icon: React.ElementType
}

function QuickAction({ title, description, href, icon: Icon }: QuickActionProps) {
  return (
    <Link to={href} className="block">
      <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card transition-colors hover:bg-accent">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </Link>
  )
}

export function AdminDashboardScreen() {
  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Fetch user count via profiles table (auth.users is not accessible from the JS client)
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Fetch event count
      const { count: eventCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })

      // Fetch vendor count
      const { count: vendorCount } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })

      // Fetch style count
      const { count: styleCount } = await supabase
        .from('fabric_styles')
        .select('*', { count: 'exact', head: true })

      // Fetch recent audit log entries (errors only)
      const { data: recentErrors } = await supabase
        .from('audit_log')
        .select('*')
        .ilike('action', '%ERROR%')
        .order('created_at', { ascending: false })
        .limit(5)

      return {
        userCount: userCount || 0,
        eventCount: eventCount || 0,
        vendorCount: vendorCount || 0,
        styleCount: styleCount || 0,
        recentErrors: recentErrors || [],
      }
    },
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        subtitle="Overview of Snaplog"
      />

      {/* Stats Grid */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats.userCount}
            icon={Users}
            href="/admin/users"
          />
          <StatCard
            title="Active Events"
            value={stats.eventCount}
            icon={Calendar}
            href="/admin/events"
          />
          <StatCard
            title="Vendors"
            value={stats.vendorCount}
            icon={Activity}
            href="/events"
          />
          <StatCard
            title="Fabric Styles"
            value={stats.styleCount}
            icon={FileText}
            href="/events"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            title="Create Event"
            description="Create a new trade fair event"
            href="/events/new"
            icon={Calendar}
          />
          <QuickAction
            title="Manage Users"
            description="Invite users and manage roles"
            href="/admin/users"
            icon={Users}
          />
          <QuickAction
            title="View Audit Log"
            description="Review system activity and changes"
            href="/admin/audit"
            icon={Activity}
          />
        </div>
      </div>

      {/* Recent Alerts */}
      {stats && stats.recentErrors.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Alerts</h2>
          <div className="rounded-lg border border-border bg-card">
            {stats.recentErrors.map((error: any) => (
              <div
                key={error.id}
                className="flex items-start gap-3 p-4 border-b border-border last:border-0"
              >
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{error.action}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(error.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
