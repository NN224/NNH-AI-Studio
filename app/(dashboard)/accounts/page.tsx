'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, RefreshCw, Trash2, Building2, MapPin, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface GmbAccount {
  id: string
  user_id: string
  account_name: string
  email?: string
  account_id?: string
  is_active?: boolean
  status?: string
  last_sync?: string
  created_at: string
  total_locations?: number
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<GmbAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: accountsData, error } = await supabase
        .from('gmb_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch location counts
      const accountsWithLocations = await Promise.all(
        (accountsData || []).map(async (account) => {
          const { count } = await supabase
            .from('gmb_locations')
            .select('*', { count: 'exact', head: true })
            .eq('gmb_account_id', account.id)

          return {
            ...account,
            total_locations: count || 0,
            status: account.is_active === false ? 'disconnected' : (account.status || 'active')
          }
        })
      )

      setAccounts(accountsWithLocations)
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch accounts',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleConnect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: 'Error',
          description: 'Please sign in first',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-auth-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )

      if (!response.ok) throw new Error('Failed to create auth URL')

      const data = await response.json()
      const authUrl = data.authUrl || data.url
      if (authUrl) {
        window.location.href = authUrl
      }
    } catch (error) {
      console.error('Error connecting:', error)
      toast({
        title: 'Error',
        description: 'Failed to connect Google account',
        variant: 'destructive'
      })
    }
  }

  const handleSync = async (accountId: string) => {
    setSyncing(accountId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gmb-sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ accountId, syncType: 'full' })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Sync failed')
      }

      const data = await response.json()
      toast({
        title: 'Success',
        description: `Synced ${data.counts?.locations || 0} locations, ${data.counts?.reviews || 0} reviews, ${data.counts?.media || 0} media`
      })

      await fetchAccounts()
    } catch (error: any) {
      console.error('Sync error:', error)
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync account',
        variant: 'destructive'
      })
    } finally {
      setSyncing(null)
    }
  }

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return

    setDeleting(accountId)
    try {
      const { error } = await supabase
        .from('gmb_accounts')
        .update({ is_active: false })
        .eq('id', accountId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Account disconnected successfully'
      })

      await fetchAccounts()
    } catch (error) {
      console.error('Disconnect error:', error)
      toast({
        title: 'Error',
        description: 'Failed to disconnect account',
        variant: 'destructive'
      })
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Manage your connected Google My Business accounts
          </p>
        </div>
        <Button onClick={handleConnect}>
          <Plus className="w-4 h-4 mr-2" />
          Connect Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Accounts Connected</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Connect your Google My Business account to start managing your locations
            </p>
            <Button onClick={handleConnect}>
              <Plus className="w-4 h-4 mr-2" />
              Connect First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle>{account.account_name}</CardTitle>
                      <CardDescription>{account.email}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                    {account.status === 'active' ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Locations</p>
                    </div>
                    <p className="text-2xl font-bold">{account.total_locations || 0}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Last Sync</p>
                    </div>
                    <p className="text-sm font-medium">{formatDate(account.last_sync)}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleSync(account.id)}
                    disabled={syncing === account.id || account.status !== 'active'}
                    className="flex-1"
                    variant="outline"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing === account.id ? 'animate-spin' : ''}`} />
                    {syncing === account.id ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button
                    onClick={() => handleDisconnect(account.id)}
                    disabled={deleting === account.id}
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleting === account.id ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
