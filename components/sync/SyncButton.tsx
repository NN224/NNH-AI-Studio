'use client'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'
import { useSyncStatus } from './SyncProvider'

export function SyncButton() {
  const { state, startSync, isConnected } = useSyncStatus()

  if (!isConnected) return null

  const statusColor = {
    idle: 'bg-green-500',
    syncing: 'bg-yellow-500 animate-pulse',
    success: 'bg-green-500',
    error: 'bg-red-500',
  }[state.status]

  const formatLastSynced = () => {
    if (!state.lastSynced) return 'Never synced'

    const diff = Date.now() - state.lastSynced.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return state.lastSynced.toLocaleDateString()
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={startSync}
          disabled={state.status === 'syncing'}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', state.status === 'syncing' && 'animate-spin')} />
          <span className="hidden sm:inline">
            {state.status === 'syncing' ? 'Syncing...' : 'Sync'}
          </span>
          <span className={cn('h-2 w-2 rounded-full', statusColor)} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{state.status === 'syncing' ? state.message : formatLastSynced()}</p>
      </TooltipContent>
    </Tooltip>
  )
}
