'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FeaturesTab, BusinessInfoTab } from './TabComponents'
import { ProfileCompletenessCard } from './ProfileCompletenessCard'
import { useDashboardSnapshot } from '@/hooks/use-dashboard-cache'
import type { BusinessProfilePayload } from '@/types/features'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Unlock, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TabDefinition {
  readonly id: TabKey
  readonly name: string
  readonly icon: string
}

type TabKey = 'info' | 'features'

const TABS: readonly TabDefinition[] = [
  { id: 'info', name: 'Basic Info', icon: '📝' },
  { id: 'features', name: 'Features', icon: '✨' },
]

function fingerprint(profile: BusinessProfilePayload | null): string {
  return profile ? JSON.stringify(profile) : ''
}

function cloneProfilePayload(payload: BusinessProfilePayload): BusinessProfilePayload {
  if (typeof structuredClone === 'function') {
    return structuredClone(payload)
  }
  return JSON.parse(JSON.stringify(payload)) as BusinessProfilePayload
}

export default function BusinessProfilePage() {
  const { data: snapshot, loading: snapshotLoading, error: snapshotError } = useDashboardSnapshot()

  const locations = useMemo(() => snapshot?.locationSummary?.locations ?? [], [snapshot?.locationSummary?.locations])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('info')
  const [profile, setProfile] = useState<BusinessProfilePayload | null>(null)
  const [initialProfile, setInitialProfile] = useState<BusinessProfilePayload | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [lockLoading, setLockLoading] = useState(false)

  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(locations[0].id)
    }
  }, [locations, selectedLocationId])

  useEffect(() => {
    if (!selectedLocationId) {
      setProfile(null)
      setInitialProfile(null)
      setProfileError(null)
      return
    }

    let isMounted = true

    const fetchProfile = async () => {
      try {
        setProfileLoading(true)
        setProfileError(null)

        const response = await fetch(`/api/features/profile/${selectedLocationId}`)
        if (!response.ok) {
          throw new Error(`Failed to load profile (${response.status})`)
        }

        const payload: BusinessProfilePayload = await response.json()
        if (!isMounted) return

        setProfile(payload)
        setInitialProfile(payload)
      } catch (error: unknown) {
        if (!isMounted) return
        const isError = error instanceof Error
        const message = isError ? error.message : 'Failed to load business profile'
        setProfileError(message)
        toast.error(message)
        setProfile(null)
        setInitialProfile(null)
      } finally {
        if (isMounted) {
          setProfileLoading(false)
        }
      }
    }

    fetchProfile()

    return () => {
      isMounted = false
    }
  }, [selectedLocationId])

  // Fetch lock status when location changes
  useEffect(() => {
    if (!selectedLocationId) {
      setIsLocked(false)
      return
    }
    
    let isMounted = true
    
    const loadLockStatus = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('gmb_locations')
          .select('metadata')
          .eq('id', selectedLocationId)
          .single()

        if (error) throw error

        if (!isMounted) return

        const metadata = (data?.metadata as Record<string, unknown>) || {}
        setIsLocked(metadata.profileLocked === true)
      } catch (error: unknown) {
        if (!isMounted) return
        const isError = error instanceof Error
        if (__DEV__) {
          console.error('[BusinessProfile] Error fetching lock status:', isError ? error.message : error)
        }
        setIsLocked(false)
      }
    }
    
    loadLockStatus()
    
    return () => {
      isMounted = false
    }
  }, [selectedLocationId])

  const hasChanges = useMemo(() => {
    if (!profile || !initialProfile) return false
    return fingerprint(profile) !== fingerprint(initialProfile)
  }, [profile, initialProfile])

  const handleProfileChange = (next: BusinessProfilePayload) => {
    if (isLocked) {
      toast.error('Profile is locked. Please unlock to make changes.')
      return
    }
    
    setProfile((prev) => {
      if (!prev) {
        return { ...next }
      }
      return { ...prev, ...next }
    })
  }

  const markDirty = () => {
    // no-op: change detection handled via fingerprint comparison
  }

  const handleSave = async () => {
    if (!selectedLocationId || !profile) {
      return
    }

    if (isLocked) {
      toast.error('Profile is locked. Please unlock to save changes.')
      return
    }

    try {
      setSaveLoading(true)
      const response = await fetch(`/api/features/profile/${selectedLocationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      })

      if (!response.ok) {
        throw new Error(`Failed to save profile (${response.status})`)
      }

      const payload: BusinessProfilePayload = await response.json()
      setProfile(payload)
      setInitialProfile(payload)
      toast.success('Profile updated successfully')
      window.dispatchEvent(new Event('dashboard:refresh'))
    } catch (error: unknown) {
      const isError = error instanceof Error
      const message = isError ? error.message : 'Failed to save profile changes'
      toast.error(message)
    } finally {
      setSaveLoading(false)
    }
  }

  const selectedLocationName = useMemo(() => {
    if (!selectedLocationId) return 'Select a location'
    return locations.find((location) => location.id === selectedLocationId)?.name ?? 'Select a location'
  }, [locations, selectedLocationId])

  const fetchLockStatus = async (locationId: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('gmb_locations')
        .select('metadata')
        .eq('id', locationId)
        .single()

      if (error) throw error

      const metadata = (data?.metadata as Record<string, unknown>) || {}
      setIsLocked(metadata.profileLocked === true)
    } catch (error: unknown) {
      const isError = error instanceof Error
      if (__DEV__) {
        console.error('[BusinessProfile] Error fetching lock status:', isError ? error.message : error)
      }
      setIsLocked(false)
    }
  }

  const handleToggleLock = async () => {
    if (!selectedLocationId) return

    try {
      setLockLoading(true)
      const supabase = createClient()
      
      // Get current metadata
      const { data: locationData, error: fetchError } = await supabase
        .from('gmb_locations')
        .select('metadata')
        .eq('id', selectedLocationId)
        .single()

      if (fetchError) throw fetchError

      const currentMetadata = (locationData?.metadata as Record<string, unknown>) || {}
      const newLockStatus = !isLocked

      // Update lock status in metadata
      const { error: updateError } = await supabase
        .from('gmb_locations')
        .update({
          metadata: {
            ...currentMetadata,
            profileLocked: newLockStatus,
          },
        })
        .eq('id', selectedLocationId)

      if (updateError) throw updateError

      setIsLocked(newLockStatus)
      toast.success(newLockStatus ? 'Profile locked successfully' : 'Profile unlocked successfully')
      
      // If locking, revert any unsaved changes
      if (newLockStatus && initialProfile) {
        setProfile(cloneProfilePayload(initialProfile))
        toast.info('Unsaved changes reverted')
      }
    } catch (error: unknown) {
      const isError = error instanceof Error
      const message = isError ? error.message : 'Failed to update lock status'
      toast.error(message)
      if (__DEV__) {
        console.error('[BusinessProfile] Error toggling lock:', error)
      }
    } finally {
      setLockLoading(false)
    }
  }

  const __DEV__ = process.env.NODE_ENV !== 'production'

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Business Profile</h1>
            <p className="text-zinc-400">Manage and optimize your Google Business Profile details and attributes in one place</p>
            {snapshotError && (
              <p className="mt-2 text-sm text-red-400">
                Failed to load dashboard data. Some information may be incomplete.
              </p>
            )}
          </div>

          <div className="flex gap-3 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => {
                if (isLocked) {
                  toast.error('Profile is locked. Please unlock to reset changes.')
                  return
                }
                if (initialProfile) {
                  setProfile(cloneProfilePayload(initialProfile))
                  toast.info('Unsaved changes reverted')
                }
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg font-medium transition text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={profileLoading || !initialProfile || !hasChanges || isLocked}
            >
              🔄 Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!profile || !hasChanges || saveLoading || isLocked}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                profile && hasChanges && !saveLoading && !isLocked
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {saveLoading ? '💾 Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          {snapshotLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <select
              className="w-full md:w-auto px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              value={selectedLocationId ?? ''}
              onChange={(event) => setSelectedLocationId(event.target.value || null)}
            >
              {locations.length === 0 && <option value="">No connected locations</option>}
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-zinc-500 mt-2">Currently editing: {selectedLocationName}</p>
        </div>

        {/* Profile Protection Card */}
        {selectedLocationId && (
          <Card className="bg-gradient-to-r from-orange-950/30 to-red-950/30 border-orange-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-400" />
                Profile Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-zinc-300 mb-2">
                    {isLocked 
                      ? 'Profile is currently locked. No changes can be made to the data.'
                      : 'Profile is unlocked. You can make changes freely.'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>🔒</span>
                    <span>
                      {isLocked 
                        ? 'Protects your profile from unwanted changes and accidental modifications'
                        : 'Lock your profile to protect it from unwanted changes'}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleToggleLock}
                  disabled={lockLoading}
                  className={`flex items-center gap-2 ${
                    isLocked
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  {lockLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : isLocked ? (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Unlock Profile</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Lock Profile</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {profileLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : profile ? (
          <ProfileCompletenessCard
            completeness={profile.profileCompleteness}
            breakdown={profile.profileCompletenessBreakdown}
          />
        ) : (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            <p className="font-medium">{profileError ?? 'Select a location to view profile details.'}</p>
          </div>
        )}

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex border-b border-zinc-800 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-orange-600 text-white border-b-2 border-orange-500'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <span className="text-xl" aria-hidden>
                  {tab.icon}
                </span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {profile && (
              <>
                {isLocked && (
                  <div className="mb-6 p-4 rounded-lg border border-orange-500/30 bg-orange-500/10 flex items-center gap-3">
                    <Lock className="w-5 h-5 text-orange-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-200">Profile is Locked</p>
                      <p className="text-xs text-orange-300/80 mt-1">
                        No changes can be made. Please unlock the profile from the "Profile Protection" section above.
                      </p>
                    </div>
                  </div>
                )}
                {activeTab === 'info' && (
                  <BusinessInfoTab profile={profile} onChange={handleProfileChange} onDirty={markDirty} disabled={isLocked} />
                )}
                {activeTab === 'features' && (
                  <FeaturesTab profile={profile} onChange={handleProfileChange} onDirty={markDirty} disabled={isLocked} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
