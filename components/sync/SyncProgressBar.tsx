'use client'

import { useSyncContext } from '@/contexts/sync-context'
import { cn } from '@/lib/utils'

export function SyncProgressBar() {
  const { state } = useSyncContext()

  // Only show when syncing
  if (state.status !== 'syncing') return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted overflow-hidden">
      <div
        className={cn(
          'h-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500',
          'transition-all duration-500 ease-out',
        )}
        style={{ width: `${state.progress}%` }}
      />
    </div>
  )
}
