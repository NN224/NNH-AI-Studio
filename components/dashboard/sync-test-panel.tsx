"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { 
  RefreshCw, 
  Loader2, 
  CheckCircle,
  XCircle,
  Clock,
  Database,
  TrendingUp,
  AlertTriangle,
  Zap,
  Calendar,
  Activity
} from "lucide-react"
import { toast } from "sonner"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface SyncPhase {
  phase: string
  status: 'pending' | 'started' | 'completed' | 'error' | 'skipped'
  startTime?: Date
  endTime?: Date
  duration?: number
  counts?: Record<string, number>
  error?: string
}

interface SyncTest {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  result?: any
  error?: string
}

export function SyncTestPanel() {
  const isConfigured = isSupabaseConfigured
  const supabase = isConfigured ? createClient() : null
  const sseRef = useRef<EventSource | null>(null)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [syncProgress, setSyncProgress] = useState(0)
  const [syncPhases, setSyncPhases] = useState<SyncPhase[]>([])
  const [syncTests, setSyncTests] = useState<SyncTest[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [syncSchedule, setSyncSchedule] = useState('manual')

  // Initialize account
  useEffect(() => {
    if (!supabase) return

    const getAccount = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: accounts } = await supabase
        .from('gmb_accounts')
        .select('id, last_sync, settings')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)

      if (accounts && accounts.length > 0) {
        const account = accounts[0]
        setAccountId(account.id)
        
        if (account.last_sync) {
          setLastSyncTime(new Date(account.last_sync))
        }
        
        if (account.settings) {
          setSyncSchedule(account.settings.syncSchedule || 'manual')
          setAutoSyncEnabled(account.settings.syncSchedule !== 'manual')
        }
      }
    }

    getAccount()
  }, [supabase])

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (sseRef.current) {
        sseRef.current.close()
      }
    }
  }, [])

  const startProgressStream = async (accountId: string) => {
    // Close existing connection
    if (sseRef.current) {
      sseRef.current.close()
    }

    try {
      const eventSource = new EventSource(`/api/gmb/sync/events?accountId=${accountId}`)
      sseRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'summary') {
            const phases = data.phases || []
            setSyncPhases(phases.map((p: any) => ({
              phase: p.phase,
              status: p.status,
              counts: p.last_counts,
              error: p.last_error
            })))
            
            // Calculate progress
            const completed = phases.filter((p: any) => 
              p.status === 'completed' || p.status === 'skipped'
            ).length
            const total = phases.length
            setSyncProgress(total > 0 ? Math.round((completed / total) * 100) : 0)
          } else if (data.type === 'done') {
            eventSource.close()
            setSyncing(false)
          }
        } catch (error) {
          console.error('SSE parse error:', error)
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        setSyncing(false)
      }
    } catch (error) {
      console.error('SSE connection error:', error)
      setSyncing(false)
    }
  }

  const runSyncTests = async () => {
    if (!isConfigured || !supabase) {
      toast.error('Supabase configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to run sync tests.')
      return
    }

    if (!accountId) {
      toast.error('No active GMB account found')
      return
    }

    setTesting(true)
    setSyncTests([
      {
        id: 'manual-sync',
        name: 'Manual Sync Test',
        description: 'Test manual sync functionality',
        status: 'pending'
      },
      {
        id: 'progress-tracking',
        name: 'Progress Tracking',
        description: 'Verify real-time progress updates',
        status: 'pending'
      },
      {
        id: 'error-handling',
        name: 'Error Handling',
        description: 'Test sync error recovery',
        status: 'pending'
      },
      {
        id: 'auto-sync',
        name: 'Auto-Sync Configuration',
        description: 'Verify auto-sync scheduling',
        status: 'pending'
      }
    ])

    try {
      // Test 1: Manual Sync
      updateTestStatus('manual-sync', 'running')
      setSyncing(true)
      setSyncPhases([])
      setSyncProgress(0)
      
      startProgressStream(accountId)
      
      const syncResponse = await fetch('/api/gmb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId,
          syncType: 'test' 
        })
      })

      const syncData = await syncResponse.json()
      
      if (syncResponse.ok && syncData.success) {
        updateTestStatus('manual-sync', 'passed', {
          counts: syncData.counts,
          duration: syncData.duration
        })
      } else {
        updateTestStatus('manual-sync', 'failed', null, syncData.error)
      }

      // Test 2: Progress Tracking
      updateTestStatus('progress-tracking', 'running')
      
      // Check if we received progress updates
      if (syncPhases.length > 0) {
        updateTestStatus('progress-tracking', 'passed', {
          phasesTracked: syncPhases.length,
          progressUpdates: true
        })
      } else {
        updateTestStatus('progress-tracking', 'failed', null, 'No progress updates received')
      }

      // Test 3: Error Handling
      updateTestStatus('error-handling', 'running')
      
      // Simulate an error by trying to sync non-existent account
      const errorResponse = await fetch('/api/gmb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId: 'invalid-account-id',
          syncType: 'test' 
        })
      })

      if (!errorResponse.ok) {
        updateTestStatus('error-handling', 'passed', {
          errorHandled: true,
          statusCode: errorResponse.status
        })
      } else {
        updateTestStatus('error-handling', 'failed', null, 'Error not properly handled')
      }

      // Test 4: Auto-Sync Configuration
      updateTestStatus('auto-sync', 'running')
      
      // Check current sync settings
      const { data: account } = await supabase
        .from('gmb_accounts')
        .select('settings')
        .eq('id', accountId)
        .single()

      if (account && account.settings) {
        updateTestStatus('auto-sync', 'passed', {
          schedule: account.settings.syncSchedule || 'manual',
          configured: true
        })
      } else {
        updateTestStatus('auto-sync', 'failed', null, 'Settings not found')
      }

      // Update last sync time
      setLastSyncTime(new Date())
      
      toast.success('Sync tests completed')

    } catch (error: any) {
      toast.error('Sync test failed', {
        description: error.message
      })
      
      // Mark remaining tests as failed
      setSyncTests(prev => prev.map(test => 
        test.status === 'pending' || test.status === 'running' 
          ? { ...test, status: 'failed', error: error.message }
          : test
      ))
    } finally {
      setTesting(false)
      setSyncing(false)
      
      if (sseRef.current) {
        sseRef.current.close()
      }
    }
  }

  const updateTestStatus = (
    testId: string, 
    status: SyncTest['status'], 
    result?: any, 
    error?: string
  ) => {
    setSyncTests(prev => prev.map(test => 
      test.id === testId 
        ? { ...test, status, result, error }
        : test
    ))
  }

  const getPhaseIcon = (phase: string) => {
    const icons: Record<string, any> = {
      'accounts': Database,
      'locations': Database,
      'reviews': Database,
      'questions': Database,
      'posts': Database,
      'metrics': TrendingUp,
      'keywords': TrendingUp,
      'media': Database
    }
    
    const Icon = icons[phase] || Database
    return <Icon className="h-4 w-4" />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'started':
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'skipped':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  if (!isConfigured) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Sync Functionality Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-500/30">
            <AlertDescription>
              Supabase environment variables are not configured. Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable sync tests.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Sync Functionality Test
            </CardTitle>
            <CardDescription className="mt-1">
              Test sync operations and progress tracking
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastSyncTime && (
              <Badge variant="secondary" className="text-xs">
                Last sync: {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
              </Badge>
            )}
            <Button
              onClick={runSyncTests}
              disabled={testing || syncing || !accountId}
              size="sm"
              className="gap-2"
            >
              {testing || syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {syncing ? 'Syncing...' : 'Testing...'}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Run Tests
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!accountId && (
          <Alert className="border-yellow-500/30 mb-4">
            <AlertDescription>
              No active GMB account found. Please connect an account first.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="tests" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="progress">
              Progress
              {syncPhases.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {syncProgress}%
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
          </TabsList>

          <TabsContent value="tests" className="space-y-4">
            {syncTests.length === 0 ? (
              <div className="text-center py-8">
                <RefreshCw className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Click "Run Tests" to start sync validation
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {syncTests.map((test) => (
                  <Card key={test.id} className="border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(test.status)}
                        <div className="flex-1">
                          <h4 className="font-medium">{test.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {test.description}
                          </p>
                          {test.result && (
                            <div className="mt-2 p-2 bg-secondary/50 rounded text-xs">
                              <pre>{JSON.stringify(test.result, null, 2)}</pre>
                            </div>
                          )}
                          {test.error && (
                            <Alert className="mt-2 border-red-500/30">
                              <AlertDescription className="text-xs">
                                {test.error}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            {syncing && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Sync Progress</span>
                    <span className="text-sm text-muted-foreground">{syncProgress}%</span>
                  </div>
                  <Progress value={syncProgress} className="h-2" />
                </div>

                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {syncPhases.map((phase, index) => (
                      <div 
                        key={index}
                        className={cn(
                          "flex items-center justify-between p-3 rounded border",
                          phase.status === 'completed' && "bg-green-500/10 border-green-500/30",
                          phase.status === 'error' && "bg-red-500/10 border-red-500/30",
                          phase.status === 'started' && "bg-primary/10 border-primary/30",
                          phase.status === 'pending' && "bg-muted/10 border-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {getPhaseIcon(phase.phase)}
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {phase.phase}
                            </p>
                            {phase.counts && Object.keys(phase.counts).length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {Object.entries(phase.counts)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        {getStatusIcon(phase.status)}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {!syncing && syncPhases.length === 0 && (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No sync in progress
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Sync Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Auto-sync enabled</Label>
                  <Badge variant={autoSyncEnabled ? "default" : "secondary"}>
                    {autoSyncEnabled ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Sync schedule</Label>
                  <Badge variant="outline" className="text-xs">
                    {syncSchedule}
                  </Badge>
                </div>
                {lastSyncTime && (
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Last sync</Label>
                    <span className="text-xs text-muted-foreground">
                      {lastSyncTime.toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {autoSyncEnabled && (
              <Alert className="border-green-500/30">
                <Zap className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  Auto-sync is enabled. Your data will be synchronized according to the schedule: {syncSchedule}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
