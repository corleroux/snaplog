/**
 * Admin Layout
 *
 * Layout component for admin pages with sidebar navigation.
 */

import { Link, useLocation, Outlet } from 'react-router-dom'
import { LayoutDashboard, Users, Calendar, FileText, Activity, Settings, LogOut, ChevronRight, ClipboardList, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  badge?: number
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { label: 'Users', icon: Users, href: '/admin/users' },
  { label: 'Events', icon: Calendar, href: '/admin/events' },
  { label: 'Tasks', icon: ClipboardList, href: '/admin/tasks' },
  { label: 'Reports', icon: BarChart3, href: '/admin/reports' },
  { label: 'Audit Log', icon: FileText, href: '/admin/audit' },
  { label: 'System Health', icon: Activity, href: '/admin/health' },
  { label: 'Settings', icon: Settings, href: '/admin/settings' },
]

export function AdminLayout() {
  const location = useLocation()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between border-b border-border px-4 py-3 safe-area-top">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span>Snaplog Admin</span>
        </Link>
      </div>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-border min-h-screen safe-area-top">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              <span>Admin</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-h-screen">
          {/* Mobile header with back button */}
          <div className="lg:hidden flex items-center gap-2 border-b border-border px-4 py-3">
            <Link to="/" className="text-muted-foreground">
              <ChevronRight className="h-5 w-5" />
            </Link>
            <span className="font-semibold">Admin</span>
          </div>

          {/* Page content */}
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/**
 * Admin page header component
 */
interface AdminPageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function AdminPageHeader({ title, subtitle, action }: AdminPageHeaderProps) {
  return (
    <div className="border-b border-border px-6 py-4 safe-area-top">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {action && <div className="mt-2 sm:mt-0">{action}</div>}
      </div>
    </div>
  )
}
