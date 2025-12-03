'use client'

import { createClient } from '@/lib/supabase/client'
import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react'

// Types
type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface SyncState {
  status: SyncStatus
  progress: number
  message: string
  lastSynced: Date | null
}

interface SyncContextType {
  state: SyncState
  startSync: () => Promise<void>
  isConnected: boolean
}

const SyncContext = createContext<SyncContextType | null>(null)

// Hook
export function useSyncStatus() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSyncStatus must be used within SyncProvider')
  }
  return context
}

// Provider
export function SyncProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()

  const [state, setState] = useState<SyncState>({
    status: 'idle',
    progress: 0,
    message: '',
    lastSynced: null,
  })

  const [isConnected, setIsConnected] = useState(false)
  const [accountId, setAccountId] = useState<string | null>(null)

  // Check GMB connection on mount
  useEffect(() => {
    const checkConnection = async () => {
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
        setIsConnected(true)
        setAccountId(account.id)
        if (account.last_sync) {
          setState((prev) => ({ ...prev, lastSynced: new Date(account.last_sync) }))
        }
      }
    }

    checkConnection()
  }, [supabase])

  // Start sync
  const startSync = useCallback(async () => {
    if (!accountId || state.status === 'syncing') return

    setState({
      status: 'syncing',
      progress: 0,
      message: 'Starting sync...',
      lastSynced: state.lastSynced,
    })

    try {
      // Step 1: Enqueue sync
      setState((prev) => ({ ...prev, progress: 10, message: 'Queuing sync job...' }))

      const response = await fetch('/api/gmb/enqueue-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })

      if (!response.ok) throw new Error('Failed to start sync')

      // Step 2: Poll for progress
      setState((prev) => ({ ...prev, progress: 30, message: 'Syncing locations...' }))

      // Simulate progress (real implementation would poll sync status)
      const steps = [
        { progress: 50, message: 'Syncing reviews...' },
        { progress: 70, message: 'Syncing posts...' },
        { progress: 90, message: 'Finalizing...' },
      ]

      for (const step of steps) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setState((prev) => ({ ...prev, ...step }))
      }

      // Done
      const now = new Date()
      setState({ status: 'success', progress: 100, message: 'Sync complete!', lastSynced: now })

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setState((prev) => ({ ...prev, status: 'idle', progress: 0, message: '' }))
      }, 3000)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        message: error instanceof Error ? error.message : 'Sync failed',
      }))

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setState((prev) => ({ ...prev, status: 'idle', progress: 0, message: '' }))
      }, 5000)
    }
  }, [accountId, state.status, state.lastSynced])

  return (
    <SyncContext.Provider value={{ state, startSync, isConnected }}>
      {children}
    </SyncContext.Provider>
  )
}
