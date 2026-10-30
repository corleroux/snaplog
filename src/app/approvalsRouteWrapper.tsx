import { useNavigate } from 'react-router-dom'
import { ApprovalsInboxScreen } from '@/features/approvals'

/**
 * Approvals Inbox Route Wrapper
 */
export function ApprovalsInboxRouteWrapper() {
  const navigate = useNavigate()

  return (
    <ApprovalsInboxScreen
      onBack={() => navigate('/')}
    />
  )
}