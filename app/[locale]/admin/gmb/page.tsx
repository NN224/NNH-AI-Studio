'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Globe,
  MapPin,
  RefreshCw,
  Settings,
  Unlink,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface GMBAccount {
  id: string
  user_id: string
  account_id: string
  account_name: string
  email: string
  is_active: boolean
  last_sync: string
  created_at: string
  token_expires_at: string
}

interface GMBLocation {
  id: string
  gmb_account_id: string
  location_id: string
  name: string
  address: string
  phone: string
  website: string
  category: string
  status: string
  created_at: string
  updated_at: string
}

interface GMBStats {
  total_accounts: number
  active_accounts: number
  total_locations: number
  total_reviews: number
  total_questions: number
  pending_reviews: number
  pending_questions: number
  last_sync: string
}

export default function GMBManagementPage() {
  const [accounts, setAccounts] = useState<GMBAccount[]>([])
  const [locations, setLocations] = useState<GMBLocation[]>([])
  const [stats, setStats] = useState<GMBStats>({
    total_accounts: 0,
    active_accounts: 0,
    total_locations: 0,
    total_reviews: 0,
    total_questions: 0,
    pending_reviews: 0,
    pending_questions: 0,
    last_sync: '',
  })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [_selectedAccount, _setSelectedAccount] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchGMBData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchGMBData = async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      // Fetch GMB accounts
      const { data: accountsData } = await supabase
        .from('gmb_accounts')
        .select('*')
        .order('created_at', { ascending: false })

      if (accountsData) {
        setAccounts(accountsData)

        // Fetch locations for all accounts
        const { data: locationsData } = await supabase
          .from('gmb_locations')
          .select('*')
          .order('name')

        if (locationsData) {
          setLocations(locationsData)
        }

        // Fetch stats
        const [reviewsCount, questionsCount] = await Promise.all([
          supabase.from('gmb_reviews').select('count'),
          supabase.from('gmb_questions').select('count'),
        ])

        const pendingReviews = await supabase
          .from('gmb_reviews')
          .select('count')
          .is('reply_text', null)

        const pendingQuestions = await supabase
          .from('gmb_questions')
          .select('count')
          .eq('answer_status', 'pending')

        setStats({
          total_accounts: accountsData.length,
          active_accounts: accountsData.filter((a) => a.is_active).length,
          total_locations: locationsData?.length || 0,
          total_reviews: reviewsCount.data?.[0]?.count || 0,
          total_questions: questionsCount.data?.[0]?.count || 0,
          pending_reviews: pendingReviews.data?.[0]?.count || 0,
          pending_questions: pendingQuestions.data?.[0]?.count || 0,
          last_sync: accountsData[0]?.last_sync || '',
        })
      }
    } catch {
      // Error fetching GMB data
    } finally {
      setLoading(false)
    }
  }

  const syncAccount = async (accountId: string) => {
    setSyncing(accountId)

    try {
      const response = await fetch('/api/gmb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })

      if (response.ok) {
        await fetchGMBData()
      }
    } catch {
      // Sync error
    } finally {
      setSyncing(null)
    }
  }

  const disconnectAccount = async (accountId: string) => {
    if (!supabase) return
    if (!confirm('Are you sure you want to disconnect this GMB account?')) return

    try {
      await supabase.from('gmb_accounts').update({ is_active: false }).eq('id', accountId)

      await fetchGMBData()
    } catch {
      // Disconnect error
    }
  }

  const getAccountLocations = (accountId: string) => {
    return locations.filter((l) => l.gmb_account_id === accountId)
  }

  const getTokenStatus = (expiresAt: string) => {
    const expires = new Date(expiresAt)
    const now = new Date()
    const hoursLeft = (expires.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursLeft < 0) return { status: 'expired', color: 'destructive' }
    if (hoursLeft < 24) return { status: 'expiring', color: 'warning' }
    return { status: 'valid', color: 'default' }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">GMB Management</h1>
          <p className="text-muted-foreground">Manage Google My Business accounts and locations</p>
        </div>
        <Button onClick={fetchGMBData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_accounts}</div>
            <p className="text-xs text-muted-foreground">{stats.active_accounts} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_locations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_reviews}</div>
            <p className="text-xs text-muted-foreground">{stats.pending_reviews} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_questions}</div>
            <p className="text-xs text-muted-foreground">{stats.pending_questions} pending</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Last Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {stats.last_sync ? format(new Date(stats.last_sync), 'MMM dd, HH:mm') : 'Never'}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sync Health</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={85} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">85% success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>GMB Accounts</CardTitle>
          <CardDescription>All connected Google My Business accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No GMB accounts connected yet.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => {
                const accountLocations = getAccountLocations(account.id)
                const tokenStatus = getTokenStatus(account.token_expires_at)

                return (
                  <Card key={account.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <Globe className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{account.account_name}</h3>
                            <p className="text-sm text-muted-foreground">{account.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={account.is_active ? 'default' : 'secondary'}>
                            {account.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge
                            variant={
                              tokenStatus.color as
                                | 'default'
                                | 'secondary'
                                | 'destructive'
                                | 'outline'
                            }
                          >
                            Token {tokenStatus.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Locations</p>
                          <p className="font-semibold">{accountLocations.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Account ID</p>
                          <p className="font-mono text-xs">{account.account_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Connected</p>
                          <p className="text-sm">
                            {format(new Date(account.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Last Sync</p>
                          <p className="text-sm">
                            {account.last_sync
                              ? format(new Date(account.last_sync), 'MMM dd, HH:mm')
                              : 'Never'}
                          </p>
                        </div>
                      </div>

                      {/* Locations */}
                      {accountLocations.length > 0 && (
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-semibold mb-2">Locations</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {accountLocations.map((location) => (
                              <div
                                key={location.id}
                                className="flex items-center gap-2 p-2 bg-muted rounded"
                              >
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{location.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {location.address}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => syncAccount(account.id)}
                          disabled={syncing === account.id}
                          size="sm"
                        >
                          {syncing === account.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Sync Now
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export Data
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => disconnectAccount(account.id)}
                        >
                          <Unlink className="h-4 w-4 mr-2" />
                          Disconnect
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Queue</CardTitle>
          <CardDescription>Pending and recent sync operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Reviews Sync</p>
                  <p className="text-xs text-muted-foreground">Account: Main Business</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">Running</Badge>
                <span className="text-xs text-muted-foreground">2 min ago</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Questions Sync</p>
                  <p className="text-xs text-muted-foreground">Account: Secondary Location</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Completed</Badge>
                <span className="text-xs text-muted-foreground">15 min ago</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Metrics Update</p>
                  <p className="text-xs text-muted-foreground">All accounts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Scheduled</Badge>
                <span className="text-xs text-muted-foreground">In 45 min</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
