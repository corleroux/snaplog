/**
 * Settings Screen Component
 *
 * Allows users to update their profile (name, avatar) and notification preferences.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Bell, Camera, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { SectionContainer } from '@/components/ui/section-container'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { NotificationPreferences } from '@/features/notifications'
import { getProfile, updateProfile, uploadAvatar } from '../api/profile'
import { updatePassword } from '@/features/auth/api/auth'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { Profile } from '@/lib/supabase/types'

interface ProfileFormState {
  fullName: string
  avatarUrl: string | null
}

const getUpdateValue = (formValue: string | null, profileValue: string | null): string | undefined => {
  return formValue || profileValue || undefined
}

export function SettingsScreen() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    fullName: '',
    avatarUrl: null,
  })
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(user!.id),
    enabled: !!user,
  })

  const updateProfileMutation = useMutation({
    mutationFn: (updates: { full_name?: string | null; avatar_url?: string | null }) =>
      updateProfile(user!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(user!.id, file),
    onSuccess: (avatarUrl) => {
      queryClient.setQueryData(['profile'], (old: Profile) =>
        old ? { ...old, avatar_url: avatarUrl } : old
      )
      setProfileForm((prev) => ({ ...prev, avatarUrl }))
    },
  })

  const updatePasswordMutation = useMutation({
    mutationFn: (newPassword: string) => updatePassword(newPassword),
    onSuccess: () => {
      setPasswordForm({ newPassword: '', confirmPassword: '' })
      setPasswordError(null)
    },
    onError: (err: Error) => {
      setPasswordError(err.message)
    },
  })

  if (isLoading) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    )
  }

  if (error || !profile) {
    return (
      <AppShell>
        <PageHeader title="Settings" onBack={() => navigate(-1)} />
        <ErrorState
          title="Failed to load profile"
          message={error instanceof Error ? error.message : 'Unknown error'}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['profile'] })}
        />
        <BottomNavigation />
      </AppShell>
    )
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadAvatarMutation.mutate(file)
    }
  }

  const handleProfileSave = () => {
    updateProfileMutation.mutate({
      full_name: getUpdateValue(profileForm.fullName, profile.full_name),
      avatar_url: getUpdateValue(profileForm.avatarUrl, profile.avatar_url),
    })
  }

  const handlePasswordSave = () => {
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    updatePasswordMutation.mutate(passwordForm.newPassword)
  }

  const displayAvatarUrl = profileForm.avatarUrl ?? profile.avatar_url
  const displayFullName = profileForm.fullName || profile.full_name || ''

  return (
    <AppShell>
      <PageHeader title="Settings" onBack={() => navigate(-1)} />

      <main className="flex-1 overflow-y-auto px-4 pt-3">
        <div className="space-y-6">
          <SectionContainer
            title="Profile"
            icon={<User className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-muted border-2 border-border">
                    {displayAvatarUrl ? (
                      <img
                        src={displayAvatarUrl}
                        alt={displayFullName || 'Avatar'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-accent hover:bg-accent/90 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Camera className="h-4 w-4 text-accent-foreground" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAvatarChange}
                      disabled={uploadAvatarMutation.isPending}
                    />
                  </label>
                </div>
                <div>
                  <p className="font-medium">{displayFullName || 'Your name'}</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>

              <Input
                label="Full Name"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder={profile.full_name || 'Enter your name'}
              />

              <Button
                variant="accent"
                onClick={handleProfileSave}
                disabled={updateProfileMutation.isPending}
                loading={updateProfileMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {profileSaved ? 'Saved!' : 'Save Profile'}
              </Button>
            </div>
          </SectionContainer>

          <SectionContainer
            title="Change Password"
            icon={<User className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <Input
                label="New Password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
                helperText="Minimum 8 characters"
              />

              <Input
                label="Confirm Password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                errorText={passwordError ?? undefined}
              />

              <Button
                variant="accent"
                onClick={handlePasswordSave}
                disabled={updatePasswordMutation.isPending || !passwordForm.newPassword}
                loading={updatePasswordMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </div>
          </SectionContainer>

          <SectionContainer
            title="Notification Preferences"
            icon={<Bell className="h-5 w-5" />}
          >
            <NotificationPreferences />
          </SectionContainer>
        </div>
      </main>

      <BottomNavigation />
    </AppShell>
  )
}