import { Routes, Route, BrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { RequireAuth, LoginScreen, SignupScreen, ForgotPasswordScreen, ResetPasswordScreen } from '@/features/auth'
import { ToastProvider } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { QueryProvider } from './QueryProvider'
import { UploadQueueIndicator } from '@/components/capture/UploadQueueIndicator'
import { LoadingState } from '@/components/ui/LoadingState'
import { GlobalOverlayProvider, GlobalOverlays } from '@/components/layout'
import {
  VendorListRouteWrapper,
  VendorCaptureFlowFromRouteWithProvider,
  VendorDetailFromRouteWithProvider,
  VendorEditScreenFromRouteWithProvider,
} from './vendorRouteWrappers'
import {
  StyleListFromRouteWithProvider,
  StyleCaptureFlowFromRouteWithProvider,
  StyleDetailFromRouteWithProvider,
  StyleEditScreenFromRouteWithProvider,
  VariantEditScreenFromRouteWithProvider,
} from './styleRouteWrappers'
import { SettingsRouteWrapper } from './settingsRouteWrapper'
import { ApprovalsInboxRouteWrapper } from './approvalsRouteWrapper'
import { EventSettingsRouteWrapper } from './eventSettingsRouteWrapper'

// Lazy load events feature - primary entry point, defer loading
const EventsListRouteWrapper = lazy(() =>
  import('./eventRouteWrappers').then(m => ({ default: m.EventsListRouteWrapper }))
)
const EventCreateRouteWrapper = lazy(() =>
  import('./eventRouteWrappers').then(m => ({ default: m.EventCreateRouteWrapper }))
)
const EventEditRouteWrapper = lazy(() =>
  import('./eventRouteWrappers').then(m => ({ default: m.EventEditRouteWrapper }))
)

// Lazy load admin components (less frequently accessed)
// Named exports require wrapping for React.lazy
const RequireAdmin = lazy(() =>
  import('@/features/admin/components').then(m => ({ default: m.RequireAdmin }))
)
const AdminLayout = lazy(() =>
  import('@/features/admin/components').then(m => ({ default: m.AdminLayout }))
)
const AdminDashboardScreen = lazy(() =>
  import('@/features/admin/screens').then(m => ({ default: m.AdminDashboardScreen }))
)
const UserListScreen = lazy(() =>
  import('@/features/admin/screens').then(m => ({ default: m.UserListScreen }))
)
const EventListScreen = lazy(() =>
  import('@/features/admin/screens').then(m => ({ default: m.EventListScreen }))
)
const AuditLogScreen = lazy(() =>
  import('@/features/admin/screens').then(m => ({ default: m.AuditLogScreen }))
)
const SystemHealthScreen = lazy(() =>
  import('@/features/admin/screens').then(m => ({ default: m.SystemHealthScreen }))
)
const TaskKanbanScreen = lazy(() =>
  import('@/features/admin/screens').then(m => ({ default: m.TaskKanbanScreen }))
)
const ReportsPortalScreen = lazy(() =>
  import('@/features/admin/screens').then(m => ({ default: m.ReportsPortalScreen }))
)
const TaskReportsScreen = lazy(() =>
  import('@/features/admin/screens').then(m => ({ default: m.TaskReportsScreen }))
)

// Lazy load public sharing components
const PublicCatalogueView = lazy(() =>
  import('@/features/sharing').then(m => ({ default: m.PublicCatalogueView }))
)

// Lazy load analytics components
const EventDashboard = lazy(() =>
  import('@/features/analytics').then(m => ({ default: m.EventDashboard }))
)
const CaptureProgressMetrics = lazy(() =>
  import('@/features/analytics').then(m => ({ default: m.CaptureProgressMetrics }))
)
const ExtractionQualityReport = lazy(() =>
  import('@/features/analytics').then(m => ({ default: m.ExtractionQualityReport }))
)
const VendorAttendanceList = lazy(() =>
  import('@/features/analytics').then(m => ({ default: m.VendorAttendanceList }))
)
const ReportBuilder = lazy(() =>
  import('@/features/analytics').then(m => ({ default: m.ReportBuilder }))
)

// Loading fallback for lazy loaded components
function RouteLoader({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingState />}>
      {children}
    </Suspense>
  )
}

function App() {
  return (
    <ToastProvider>
      <GlobalOverlayProvider>
        <BrowserRouter>
          <QueryProvider>
            <UploadQueueIndicator />
            <GlobalOverlays />
            <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignupScreen />} />
            <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
            <Route path="/reset-password" element={<ResetPasswordScreen />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="events">
                    <RouteLoader>
                      <EventsListRouteWrapper />
                    </RouteLoader>
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            {/* Event Create Route */}
            <Route
              path="/events/new"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="event-create">
                    <RouteLoader>
                      <EventCreateRouteWrapper />
                    </RouteLoader>
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            {/* Event Edit Route */}
            <Route
              path="/events/:eventId/edit"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="event-edit">
                    <RouteLoader>
                      <EventEditRouteWrapper />
                    </RouteLoader>
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            {/* Event Analytics Routes */}
            <Route
              path="/events/:eventId/analytics"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="event-analytics">
                    <RouteLoader>
                      <EventDashboard />
                    </RouteLoader>
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            <Route
              path="/events/:eventId/analytics/capture-progress"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="analytics-capture-progress">
                    <RouteLoader>
                      <CaptureProgressMetrics />
                    </RouteLoader>
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            <Route
              path="/events/:eventId/analytics/extraction-quality"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="analytics-extraction-quality">
                    <RouteLoader>
                      <ExtractionQualityReport />
                    </RouteLoader>
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            <Route
              path="/events/:eventId/analytics/vendor-attendance"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="analytics-vendor-attendance">
                    <RouteLoader>
                      <VendorAttendanceList />
                    </RouteLoader>
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            <Route
              path="/events/:eventId/analytics/reports"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="analytics-reports">
                    <RouteLoader>
                      <ReportBuilder />
                    </RouteLoader>
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            {/* Vendor routes - NEW CANONICAL UI */}
            <Route
              path="/events/:eventId/vendors"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="vendor-list">
                    <VendorListRouteWrapper />
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            <Route
              path="/events/:eventId/vendors/new/capture"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="vendor-capture">
                    <VendorCaptureFlowFromRouteWithProvider />
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            <Route
              path="/events/:eventId/vendors/:vendorId"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="vendor-detail">
                    <VendorDetailFromRouteWithProvider />
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            <Route
              path="/events/:eventId/vendors/:vendorId/edit"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="vendor-edit">
                    <VendorEditScreenFromRouteWithProvider />
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            {/* Style routes - NEW CANONICAL UI */}
            <Route
              path="/events/:eventId/vendors/:vendorId/styles"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="style-list">
                    <StyleListFromRouteWithProvider />
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            <Route
              path="/events/:eventId/vendors/:vendorId/styles/new/capture"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="style-capture">
                    <StyleCaptureFlowFromRouteWithProvider />
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            <Route
              path="/events/:eventId/vendors/:vendorId/styles/:styleId"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="style-detail">
                    <StyleDetailFromRouteWithProvider />
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            <Route
              path="/events/:eventId/vendors/:vendorId/styles/:styleId/edit"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="style-edit">
                    <StyleEditScreenFromRouteWithProvider />
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            <Route
              path="/events/:eventId/vendors/:vendorId/styles/:styleId/variants/:variantId/edit"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="variant-edit">
                    <VariantEditScreenFromRouteWithProvider />
                  </ErrorBoundary>
                </RequireAuth>
              }
            />

            {/* Public sharing route - no auth required */}
            <Route
              path="/share/:token"
              element={
                <RouteLoader>
                  <ErrorBoundary feature="public-share">
                    <PublicCatalogueView />
                  </ErrorBoundary>
                </RouteLoader>
              }
            />

            {/* Admin routes - lazy loaded */}
            <Route
              path="/admin"
              element={
                <RouteLoader>
                  <RequireAdmin>
                    <AdminLayout />
                  </RequireAdmin>
                </RouteLoader>
              }
            >
              <Route index element={<RouteLoader><AdminDashboardScreen /></RouteLoader>} />
              <Route path="users" element={<RouteLoader><UserListScreen /></RouteLoader>} />
              <Route path="events" element={<RouteLoader><EventListScreen /></RouteLoader>} />
              <Route path="audit" element={<RouteLoader><AuditLogScreen /></RouteLoader>} />
              <Route path="health" element={<RouteLoader><SystemHealthScreen /></RouteLoader>} />
              <Route path="tasks" element={<RouteLoader><TaskKanbanScreen /></RouteLoader>} />
              <Route path="reports" element={<RouteLoader><ReportsPortalScreen /></RouteLoader>} />
              <Route path="reports/tasks" element={<RouteLoader><TaskReportsScreen /></RouteLoader>} />
            </Route>

            {/* Settings route */}
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <ErrorBoundary feature="settings">
                    <SettingsRouteWrapper />
                  </ErrorBoundary>
                </RequireAuth>
              }
            />
            
      {/* Approvals Inbox route */}
      <Route
        path="/events/:eventId/approvals"
        element={
          <RequireAuth>
            <ErrorBoundary feature="approvals-inbox">
              <ApprovalsInboxRouteWrapper />
            </ErrorBoundary>
          </RequireAuth>
        }
      />

      {/* Event Settings route */}
      <Route
        path="/events/:eventId/settings"
        element={
          <RequireAuth>
            <ErrorBoundary feature="event-settings">
              <EventSettingsRouteWrapper />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
          </Routes>
        </QueryProvider>
      </BrowserRouter>
    </GlobalOverlayProvider>
    </ToastProvider>
  )
}

export { App }
