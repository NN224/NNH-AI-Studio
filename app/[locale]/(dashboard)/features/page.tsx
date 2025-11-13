'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FeaturesTab, BusinessInfoTab, CategoriesTab, LinksTab, MoreTab } from './TabComponents'
import { ProfileCompletenessCard } from './ProfileCompletenessCard'
import { useDashboardSnapshot } from '@/hooks/use-dashboard-cache'
import type { BusinessProfilePayload } from '@/types/features'
import { Skeleton } from '@/components/ui/skeleton'

interface TabDefinition {
  readonly id: TabKey
  readonly name: string
  readonly icon: string
}

type TabKey = 'features' | 'info' | 'categories' | 'links' | 'more'

const TABS: readonly TabDefinition[] = [
  { id: 'features', name: 'Features & Attributes', icon: '✨' },
  { id: 'info', name: 'Business Info', icon: '📝' },
  { id: 'categories', name: 'Categories', icon: '🏷️' },
  { id: 'links', name: 'Action Links', icon: '🔗' },
  { id: 'more', name: 'More Details', icon: '📋' },
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

  const locations = snapshot?.locationSummary?.locations ?? []
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('features')
  const [profile, setProfile] = useState<BusinessProfilePayload | null>(null)
  const [initialProfile, setInitialProfile] = useState<BusinessProfilePayload | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

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
      } catch (error: any) {
        if (!isMounted) return
        const message = error?.message ?? 'Failed to load business profile'
        setProfileError(message)
        toast.error(message)
        setProfile(null)
        setInitialProfile(null)
      } finally {
        if (!isMounted) return
        setProfileLoading(false)
      }
    }

    fetchProfile()

    return () => {
      isMounted = false
    }
  }, [selectedLocationId])

  const hasChanges = useMemo(() => {
    if (!profile || !initialProfile) return false
    return fingerprint(profile) !== fingerprint(initialProfile)
  }, [profile, initialProfile])

  const handleProfileChange = (next: BusinessProfilePayload) => {
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
    } catch (error: any) {
      const message = error?.message ?? 'Failed to save profile changes'
      toast.error(message)
    } finally {
      setSaveLoading(false)
    }
  }

  const selectedLocationName = useMemo(() => {
    if (!selectedLocationId) return 'Select a location'
    return locations.find((location) => location.id === selectedLocationId)?.name ?? 'Select a location'
  }, [locations, selectedLocationId])

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
                if (initialProfile) {
                  setProfile(cloneProfilePayload(initialProfile))
                  toast.info('Unsaved changes reverted')
                }
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg font-medium transition text-white"
              disabled={profileLoading || !initialProfile || !hasChanges}
            >
              🔄 Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!profile || !hasChanges || saveLoading}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                profile && hasChanges && !saveLoading
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
                {activeTab === 'features' && (
                  <FeaturesTab profile={profile} onChange={handleProfileChange} onDirty={markDirty} />
                )}
                {activeTab === 'info' && (
                  <BusinessInfoTab profile={profile} onChange={handleProfileChange} onDirty={markDirty} />
                )}
                {activeTab === 'categories' && (
                  <CategoriesTab profile={profile} onChange={handleProfileChange} onDirty={markDirty} />
                )}
                {activeTab === 'links' && (
                  <LinksTab profile={profile} onChange={handleProfileChange} onDirty={markDirty} />
                )}
                {activeTab === 'more' && (
                  <MoreTab profile={profile} onChange={handleProfileChange} onDirty={markDirty} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
