import { useParams, useNavigate } from 'react-router-dom'
import { CatalogueItemCaptureFlow, VideoCaptureScreen } from '@/features/catalogue'

/**
 * Schema-driven item capture route wrapper — no provider needed.
 */
export function CatalogueItemCaptureFlowFromRouteWithProvider() {
  const { eventId = '', vendorId = '' } = useParams()
  const navigate = useNavigate()

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
  const { eventId = '', vendorId = '' } = useParams()

  return <VideoCaptureScreen eventId={eventId} vendorId={vendorId} />
}
