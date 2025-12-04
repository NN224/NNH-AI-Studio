'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SyncState {
  status: 'idle' | 'syncing' | 'success' | 'error'
  lastSynced: Date | null
  isConnected: boolean
  message?: string
  progress?: number
}

export default function SyncDiagnosticsPage() {
  const [state, setState] = useState<SyncState>({
    status: 'idle',
    lastSynced: null,
    isConnected: false,
  })

  useEffect(() => {
    const checkStatus = async () => {
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

      setState({
        status: 'idle',
        lastSynced: account?.last_sync ? new Date(account.last_sync) : null,
        isConnected: !!account,
      })
    }

    checkStatus()
  }, [])

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold">Sync Diagnostics</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {state.isConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span>{state.isConnected ? 'Connected' : 'Not Connected'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {state.status === 'syncing' ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-yellow-500" />
                ) : state.status === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : state.status === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="capitalize">{state.status}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Synced</CardTitle>
            </CardHeader>
            <CardContent>
              <span>{state.lastSynced ? state.lastSynced.toLocaleString() : 'Never'}</span>
            </CardContent>
          </Card>
        </div>

        {state.message && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{state.message}</p>
              {state.status === 'syncing' && (
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
