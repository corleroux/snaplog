import { type ComponentType } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEventRole } from '@/features/auth'
import { LoadingErrorState, NotFoundErrorState } from '@/components/ui'

export interface EntityScreenConfig<T> {
  entityName: string
  listPath: (eventId: string, vendorId?: string) => string
  detailPath: (eventId: string, entityId: string) => string
  editPath: (eventId: string, entityId: string) => string
  ListScreen: ComponentType<{ eventId: string; vendorId?: string; onBack: () => void }>
  DetailScreen: ComponentType<{ entityId: string; eventId: string; onBack: () => void }>
  EditScreen: ComponentType<T & { onBack: () => void }>
  useDetailQuery: (id: string) => { data: T | undefined; isLoading: boolean; error: unknown }
  LoadingState: ComponentType<{ message?: string }>
}

export function createListRouteWrapper<T>(
  config: Pick<EntityScreenConfig<T>, 'entityName' | 'ListScreen' | 'LoadingState'>
) {
  return function ListRouteWrapper() {
    const { eventId = '' } = useParams()
    const navigate = useNavigate()

    return (
      <config.ListScreen
        eventId={eventId}
        onBack={() => navigate('/')}
      />
    )
  }
}

export function createDetailRouteWrapper<T>(
  config: Pick<EntityScreenConfig<T>, 'entityName' | 'DetailScreen' | 'LoadingState' | 'useDetailQuery' | 'detailPath'>
) {
  return function DetailRouteWrapper() {
    const { eventId = '', entityId = '' } = useParams()
    const navigate = useNavigate()

    return (
      <config.DetailScreen
        entityId={entityId}
        eventId={eventId}
        onBack={() => navigate(-1)}
      />
    )
  }
}

export function createEditRouteWrapper<T>(
  config: Pick<EntityScreenConfig<T>, 'entityName' | 'EditScreen' | 'LoadingState' | 'useDetailQuery' | 'editPath'>
) {
  return function EditRouteWrapper() {
    const { eventId = '', entityId = '' } = useParams()
    const navigate = useNavigate()
    const { data: entity, isLoading, error } = config.useDetailQuery(entityId)
    const { canEdit, isLoading: roleLoading } = useEventRole(eventId)

    if (!roleLoading && !canEdit) {
      const backPath = config.editPath(eventId, entityId)
      navigate(backPath, { replace: true })
      return null
    }

    if (isLoading) {
      return <config.LoadingState message={`Loading ${config.entityName}...`} />
    }

    if (error) {
      return (
        <LoadingErrorState
          message={error instanceof Error ? error.message : `Failed to load ${config.entityName}`}
          actionText="Back"
          onRetry={() => navigate(config.editPath(eventId, entityId))}
        />
      )
    }

    if (!entity) {
      return (
        <NotFoundErrorState
          message={`${config.entityName} not found`}
          actionText={`Back to ${config.entityName}s`}
          onRetry={() => navigate(config.editPath(eventId, entityId))}
        />
      )
    }

    return (
      <config.EditScreen
        {...(entity as T)}
        onBack={() => navigate(config.editPath(eventId, entityId) as any)}
      />
    )
  }
}
