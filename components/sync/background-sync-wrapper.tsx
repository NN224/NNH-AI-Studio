'use client'

import { useBackgroundSync } from '@/hooks/use-background-sync'

interface BackgroundSyncWrapperProps {
  /**
   * Enable background sync
   * @default true
   */
  enabled?: boolean

  /**
   * Sync interval in minutes
   * @default 30
   */
  intervalMinutes?: number

  /**
   * Show toast notifications
   * @default false
   */
  showNotifications?: boolean
}

/**
 * Wrapper component that enables background auto-sync
 * Add this to your dashboard layout to enable automatic data syncing
 *
 * @example
 * ```tsx
 * <DashboardLayout>
 *   <BackgroundSyncWrapper />
 *   {children}
 * </DashboardLayout>
 * ```
 */
export function BackgroundSyncWrapper({
  enabled = true,
  intervalMinutes = 30,
  showNotifications = false,
}: BackgroundSyncWrapperProps) {
  // Call hook unconditionally but configure based on enabled prop
  useBackgroundSync({
    intervalMinutes: enabled ? intervalMinutes : 999999, // Effectively disable if not enabled
    syncOnMount: enabled,
    showNotifications: enabled && showNotifications,
    syncOnlyWhenActive: true,
  })

  // This component doesn't render anything
  return null
}
