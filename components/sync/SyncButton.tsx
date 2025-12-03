'use client'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSyncContext } from '@/contexts/sync-context'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

export function SyncButton() {
  const { state, startSync } = useSyncContext()
  const [accountId, setAccountId] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)

  // Check for GMB account
  useEffect(() => {
    const checkAccount = async () => {
      const supabase = createClient()
      if (!supabase) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: account } = await supabase
        .from('gmb_accounts')
        .select('id, last_sync')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (account) {
        setAccountId(account.id)
        setLastSyncAt(account.last_sync)
      }
    }
    checkAccount()
  }, [])

  // Don't show if no GMB account
  if (!accountId) return null

  const statusColor = {
    idle: 'bg-green-500',
    syncing: 'bg-yellow-500 animate-pulse',
    completed: 'bg-green-500',
    error: 'bg-red-500',
  }[state.status]

  const formatLastSynced = () => {
    const syncTime = state.lastSyncAt || lastSyncAt
    if (!syncTime) return 'Never synced'

    const date = new Date(syncTime)
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  const handleSync = () => {
    if (accountId && state.status !== 'syncing') {
      startSync(accountId, false)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
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
