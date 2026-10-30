/**
 * Notification Preferences Component
 *
 * UI for users to manage their notification settings.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, Bell, Loader2 } from 'lucide-react'
import {
  getNotificationPreferences,
  updateNotificationPreference,
  EVENT_TYPE_INFO,
  type NotificationPreference,
  type NotificationEventType,
} from '@/lib/notifications/preferences'

export function NotificationPreferences() {
  const queryClient = useQueryClient()

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getNotificationPreferences,
  })

  const updateMutation = useMutation({
    mutationFn: ({ eventType, updates }: { eventType: NotificationEventType; updates: { enabled?: boolean; channel_email?: boolean; channel_in_app?: boolean } }) =>
      updateNotificationPreference(eventType, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })

  const handleToggle = (
    preference: NotificationPreference,
    field: 'enabled' | 'channel_email' | 'channel_in_app'
  ) => {
    updateMutation.mutate({
      eventType: preference.event_type,
      updates: { [field]: !preference[field] },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Group preferences by category
  const eventPreferences = preferences?.filter((p) => p.event_type.startsWith('vendor_') || p.event_type.startsWith('style_')) || []
  const systemPreferences = preferences?.filter((p) => !p.event_type.startsWith('vendor_') && !p.event_type.startsWith('style_')) || []

  return (
    <div className="space-y-6">
      {/* Event Notifications */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Event Notifications</h3>
        <div className="space-y-4">
          {eventPreferences.map((preference) => (
            <PreferenceRow
              key={preference.id}
              preference={preference}
              onToggle={handleToggle}
              disabled={updateMutation.isPending}
            />
          ))}
        </div>
      </div>

      {/* System Notifications */}
      <div>
        <h3 className="text-lg font-semibold mb-4">System Notifications</h3>
        <div className="space-y-4">
          {systemPreferences.map((preference) => (
            <PreferenceRow
              key={preference.id}
              preference={preference}
              onToggle={handleToggle}
              disabled={updateMutation.isPending}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Preference Row Component
 */
interface PreferenceRowProps {
  preference: NotificationPreference
  onToggle: (preference: NotificationPreference, field: 'enabled' | 'channel_email' | 'channel_in_app') => void
  disabled: boolean
}

function PreferenceRow({ preference, onToggle, disabled }: PreferenceRowProps) {
  const info = EVENT_TYPE_INFO[preference.event_type]

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{info.label}</h4>
          {!preference.enabled && (
            <span className="text-xs text-muted-foreground">(Disabled)</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
      </div>

      <div className="flex items-center gap-6">
        {/* In-App Toggle */}
        <ToggleSwitch
          label="In-App"
          icon={<Bell className="h-4 w-4" />}
          checked={preference.enabled && preference.channel_in_app}
          disabled={disabled || !preference.enabled}
          onChange={() => onToggle(preference, 'channel_in_app')}
        />

        {/* Email Toggle */}
        <ToggleSwitch
          label="Email"
          icon={<Mail className="h-4 w-4" />}
          checked={preference.enabled && preference.channel_email}
          disabled={disabled || !preference.enabled}
          onChange={() => onToggle(preference, 'channel_email')}
        />

        {/* Master Toggle */}
        <ToggleSwitch
          label="Enabled"
          checked={preference.enabled}
          disabled={disabled}
          onChange={() => onToggle(preference, 'enabled')}
        />
      </div>
    </div>
  )
}

/**
 * Toggle Switch Component
 */
interface ToggleSwitchProps {
  label: string
  icon?: React.ReactNode
  checked: boolean
  disabled: boolean
  onChange: () => void
}

function ToggleSwitch({ label, icon, checked, disabled, onChange }: ToggleSwitchProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-input'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
    </div>
  )
}
