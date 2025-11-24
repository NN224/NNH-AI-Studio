'use client'

import { useEffect, useRef } from 'react'
import { useSync } from '@/contexts/SyncContext'
import { toast } from 'sonner'

interface BackgroundSyncOptions {
  /**
   * Sync interval in minutes
   * @default 30
   */
  intervalMinutes?: number

  /**
   * Whether to sync on mount if last sync is old
   * @default true
   */
  syncOnMount?: boolean

  /**
   * Show toast notifications for background syncs
   * @default false
   */
  showNotifications?: boolean

  /**
   * Only sync if user is active (last interaction < 5 minutes ago)
   * @default true
   */
  syncOnlyWhenActive?: boolean
}

/**
 * Hook for automatic background syncing
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   // Sync every 30 minutes (default)
 *   useBackgroundSync();
 *
 *   // Custom interval: sync every hour
 *   useBackgroundSync({ intervalMinutes: 60 });
 *
 *   // With notifications
 *   useBackgroundSync({
 *     intervalMinutes: 30,
 *     showNotifications: true
 *   });
 * }
 * ```
 */
export function useBackgroundSync(options: BackgroundSyncOptions = {}) {
  const {
    intervalMinutes = 30,
    syncOnMount = true,
    showNotifications = false,
    syncOnlyWhenActive = true,
  } = options

  const { status, triggerSync } = useSync()
  const lastInteractionRef = useRef<number>(Date.now())
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasSyncedOnMount = useRef(false)

  // Track user interactions
  useEffect(() => {
    if (!syncOnlyWhenActive) return

    const updateLastInteraction = () => {
      lastInteractionRef.current = Date.now()
    }

    // Listen to user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((event) => {
      window.addEventListener(event, updateLastInteraction, { passive: true })
    })

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateLastInteraction)
      })
    }
  }, [syncOnlyWhenActive])

  // Helper: Check if user is active (interacted in last 5 minutes)
  const isUserActive = () => {
    if (!syncOnlyWhenActive) return true
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    return lastInteractionRef.current > fiveMinutesAgo
  }

  // Helper: Check if sync is needed
  const shouldSync = () => {
    // Don't sync if already syncing
    if (status.isSyncing) return false

    // Don't sync if user is inactive
    if (!isUserActive()) return false

    // If never synced, sync now
    if (!status.lastSync) return true

    // Check if last sync was more than intervalMinutes ago
    const minutesSinceLastSync = (Date.now() - status.lastSync.getTime()) / 1000 / 60
    return minutesSinceLastSync >= intervalMinutes
  }

  // Helper: Perform background sync
  const performSync = async () => {
    if (!shouldSync()) return

    try {
      if (showNotifications) {
        toast.info('🔄 Updating data in background...', {
          duration: 2000,
        })
      }

      await triggerSync()

      if (showNotifications) {
        toast.success('✓ Data updated successfully', {
          duration: 2000,
        })
      }
    } catch (error) {
      console.error('[Background Sync] Failed:', error)

      if (showNotifications) {
        toast.error('Background sync failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
          duration: 3000,
        })
      }
    }
  }

  // Sync on mount if needed
  useEffect(() => {
    if (!syncOnMount || hasSyncedOnMount.current) return

    const checkAndSync = async () => {
      if (shouldSync()) {
        hasSyncedOnMount.current = true
        await performSync()
      }
    }

    // Delay initial sync by 5 seconds to avoid blocking UI
    const timeout = setTimeout(checkAndSync, 5000)
    return () => clearTimeout(timeout)
  }, [syncOnMount]) // eslint-disable-line react-hooks/exhaustive-deps

  // Set up periodic background sync
  useEffect(() => {
    // Clear any existing interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
    }

    // Set up new interval
    syncIntervalRef.current = setInterval(
      () => {
        performSync()
      },
      intervalMinutes * 60 * 1000,
    )

    // Cleanup on unmount
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [intervalMinutes]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pause sync when page is hidden, resume when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page hidden - pause interval
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current)
          syncIntervalRef.current = null
        }
      } else {
        // Page visible - resume interval and check if sync needed
        if (!syncIntervalRef.current) {
          syncIntervalRef.current = setInterval(
            () => {
              performSync()
            },
            intervalMinutes * 60 * 1000,
          )

          // Check if sync needed immediately
          if (shouldSync()) {
            performSync()
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [intervalMinutes]) // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Hook for aggressive background syncing (every 10 minutes)
 * Use with caution - may consume API quota quickly
 */
export function useAggressiveBackgroundSync() {
  return useBackgroundSync({
    intervalMinutes: 10,
    syncOnMount: true,
    showNotifications: false,
    syncOnlyWhenActive: true,
  })
}

/**
 * Hook for passive background syncing (every hour)
 * Good for low-traffic pages or when API quota is a concern
 */
export function usePassiveBackgroundSync() {
  return useBackgroundSync({
    intervalMinutes: 60,
    syncOnMount: false,
    showNotifications: false,
    syncOnlyWhenActive: true,
  })
}
