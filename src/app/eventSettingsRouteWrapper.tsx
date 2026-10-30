import { useNavigate, useParams } from 'react-router-dom'
import { EventSettingsScreen } from '@/features/events'

export function EventSettingsRouteWrapper() {
  const { eventId = '' } = useParams()
  const navigate = useNavigate()

  return (
    <EventSettingsScreen
      eventId={eventId}
      onBack={() => navigate(-1)}
    />
  )
}
