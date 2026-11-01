import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { CatalogueItemCaptureFlow, VideoCaptureScreen } from '@/features/catalogue'

/**
 * G1 guard (FR-SCH-05b): never start a session or extraction on empty ids.
 * Missing event → events list; missing vendor → that event's vendor list.
 */
function useGuardedRouteIds(): { eventId: string; vendorId: string } | { redirectTo: string } {
  const { eventId = '', vendorId = '' } = useParams()
  if (!eventId) {return { redirectTo: '/events' }}
  if (!vendorId) {return { redirectTo: `/events/${eventId}/vendors` }}
  return { eventId, vendorId }
}

/**
 * Schema-driven item capture route wrapper — no provider needed.
 */
export function CatalogueItemCaptureFlowFromRouteWithProvider() {
  const ids = useGuardedRouteIds()
  const navigate = useNavigate()

  if ('redirectTo' in ids) {
    return <Navigate to={ids.redirectTo} replace />
  }
  const { eventId, vendorId } = ids

  return (
    <CatalogueItemCaptureFlow
      eventId={eventId}
      vendorId={vendorId}
      onSuccess={() => navigate(`/events/${eventId}/vendors/${vendorId}`)}
      onCancel={() => navigate(`/events/${eventId}/vendors/${vendorId}`)}
    />
  )
}

/**
 * Rack video capture route wrapper — no provider needed.
 */
export function VideoCaptureScreenFromRouteWithProvider() {
  const ids = useGuardedRouteIds()

  if ('redirectTo' in ids) {
    return <Navigate to={ids.redirectTo} replace />
  }

  return <VideoCaptureScreen eventId={ids.eventId} vendorId={ids.vendorId} />
}
