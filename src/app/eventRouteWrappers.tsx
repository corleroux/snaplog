import { useParams, useNavigate } from 'react-router-dom'
import { EventRepositoryProvider, EventCreateScreen, EventEditScreen, EventsScreen } from '@/features/events'

/**
 * Events list route wrapper
 */
export function EventsListRouteWrapper() {
  return (
    <EventRepositoryProvider>
      <EventsScreen />
    </EventRepositoryProvider>
  )
}

/**
 * Event create route wrapper
 */
export function EventCreateRouteWrapper() {
  const navigate = useNavigate()
  return (
    <EventRepositoryProvider>
      <EventCreateScreen
        onSuccess={(_eventId) => navigate('/')}
        onCancel={() => navigate('/')}
      />
    </EventRepositoryProvider>
  )
}

/**
 * Event edit route wrapper
 */
export function EventEditRouteWrapper() {
  const { eventId = '' } = useParams()
  const navigate = useNavigate()
  return (
    <EventRepositoryProvider>
      <EventEditScreen
        eventId={eventId}
        onBack={() => navigate('/')}
      />
    </EventRepositoryProvider>
  )
}
