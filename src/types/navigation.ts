/**
 * Navigation types for the app shell bottom navigation
 */

export interface NavItem {
  id: string
  label: string
  icon: string // Lucide icon name
  path: string
  badge?: number
}

/**
 * Primary navigation items for the bottom nav
 * Note: Navigation is visual only in this phase — routes will be connected by subsequent implementation
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
  { id: 'vendors', label: 'Vendors', icon: 'Building2', path: '/vendors' },
  { id: 'styles', label: 'Styles', icon: 'Package', path: '/styles' },
  { id: 'capture', label: 'Capture', icon: 'Camera', path: '/capture' },
  { id: 'settings', label: 'Settings', icon: 'Settings', path: '/settings' },
]
