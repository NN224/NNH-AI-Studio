"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Link2, 
  Unlink, 
  RefreshCw, 
  Key, 
  Clock, 
  AlertTriangle,
  Loader2,
  CheckCircle,
  Shield,
  Download
} from "lucide-react"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { disconnectGMBAccount, type DisconnectOption } from "@/server/actions/gmb-account"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { useGmbStatus } from "@/hooks/use-gmb-status"
import { SyncProgressModal } from "@/components/sync/sync-progress-modal"
import { useSyncProgress } from "@/hooks/use-sync-progress"

const useNewSync = process.env.NEXT_PUBLIC_USE_NEW_SYNC === "true"

interface GMBConnectionManagerProps {
  /** UI density - compact for dashboard widgets, full for settings page */
  variant?: 'compact' | 'full'
  /** Show last sync information */
  showLastSync?: boolean
  /** Additional CSS classes */
  className?: string
  /** Callback invoked after a successful action */
  onSuccess?: () => void
}

interface GMBAccount {
  id: string
  account_name: string
  email?: string
  is_active: boolean
  last_sync?: string
  settings?: any
}

/**
 * Centralized component for managing the Google My Business connection.
 * Provides all buttons and actions related to GMB in one place.
 */
export function GMBConnectionManager({
  variant = 'compact',
  showLastSync = true,
  className,
  onSuccess
}: GMBConnectionManagerProps) {
  const router = useRouter()
  const isMounted = useRef(true)
  const syncEndpoint = useNewSync ? "/api/gmb/sync-v2" : "/api/gmb/sync"
  const { 
    loading,
    connected: gmbConnected,
    activeAccount,
    lastSync: lastSyncTime,
    syncSchedule,
    refresh: refreshGmbStatus
  } = useGmbStatus()
  
  // Action states
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  // Dialog states
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [disconnectOption, setDisconnectOption] = useState<DisconnectOption>('keep')

  // Progress & SSE state
  const sseRef = useRef<EventSource | null>(null)
  const [progressOpen, setProgressOpen] = useState(false)
  const [phases, setPhases] = useState<Array<{phase:string,status:string,last_counts?:any,last_error?:string|null,last_started_at?:string|null,last_ended_at?:string|null,avg_duration_ms?:number|null}>>([])
  const [estimateMs, setEstimateMs] = useState<number>(0)
  const [showRealtimeProgress, setShowRealtimeProgress] = useState(false)

  // Database counts
  const [dbCounts, setDbCounts] = useState<{locations: number, reviews: number, questions: number, media: number} | null>(null)

  const {
    progress: realtimeProgress,
    startTracking: startSyncProgress,
    stopTracking: stopSyncProgress,
    elapsedMs: realtimeElapsedMs,
    etaMs: realtimeEtaMs,
    isConnected: realtimeConnected,
    usingPolling: realtimeUsingPolling,
  } = useSyncProgress()

  // Map legacy window events to hook refresh (temporary until SSE/BroadcastChannel)
  useEffect(() => {
    isMounted.current = true
    const handleConnectionEvent = () => { if (isMounted.current) refreshGmbStatus() }
    window.addEventListener('gmb-disconnected', handleConnectionEvent)
    window.addEventListener('gmb-reconnected', handleConnectionEvent)
    window.addEventListener('gmb-sync-complete', handleConnectionEvent)
    return () => {
      isMounted.current = false
      try { 
        sseRef.current?.close() 
      } catch (e) {
        // SSE already closed, ignore
      }
      window.removeEventListener('gmb-disconnected', handleConnectionEvent)
      window.removeEventListener('gmb-reconnected', handleConnectionEvent)
      window.removeEventListener('gmb-sync-complete', handleConnectionEvent)
    }
  }, [refreshGmbStatus])

  // Close SSE when user hides panel
  useEffect(() => {
    if (!progressOpen) {
      try { 
        sseRef.current?.close() 
      } catch (e) {
        // SSE already closed, ignore
      }
    }
  }, [progressOpen])

  useEffect(() => {
    if (!useNewSync) return
    if (!showRealtimeProgress) return
    if (!realtimeProgress) return
    if (realtimeProgress.status === "completed" || realtimeProgress.status === "error") {
      const timeout = setTimeout(() => {
        setShowRealtimeProgress(false)
        stopSyncProgress()
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [realtimeProgress, showRealtimeProgress, stopSyncProgress, useNewSync])

  // Fetch actual database counts
  useEffect(() => {
    if (!gmbConnected || !activeAccount) return
    
    const fetchDbCounts = async () => {
      try {
        const response = await fetch('/api/gmb/stats')
        if (response.ok) {
          const data = await response.json()
          setDbCounts({
            locations: data.locations || 0,
            reviews: data.reviews || 0,
            questions: data.questions || 0,
            media: data.media || 0
          })
        }
      } catch (error) {
        console.error('[GMB] Failed to fetch database counts:', error)
      }
    }
    
    fetchDbCounts()
    
    // Refresh counts after sync
    const handleSyncComplete = () => {
      fetchDbCounts()
    }
    
    window.addEventListener('gmb-sync-complete', handleSyncComplete)
    return () => {
      window.removeEventListener('gmb-sync-complete', handleSyncComplete)
    }
  }, [gmbConnected, activeAccount])

  // Start OAuth connection flow
  const handleConnect = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    setConnecting(true)
    console.log('[GMB Connect] Starting connection process')
    
    try {
      const response = await fetch('/api/gmb/create-auth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || data.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('[GMB Connect] Auth URL received')

      const authUrl = data.authUrl || data.url
      if (!authUrl || typeof authUrl !== 'string') {
        throw new Error('Invalid authorization URL')
      }

      // Redirect to Google OAuth
      console.log('[GMB Connect] Redirecting to Google OAuth')
      window.location.href = authUrl
      
      // Note: setConnecting(false) is not needed because we're redirecting
    } catch (error: any) {
      console.error('[GMB Connect] Error:', error)
      toast.error('Connection failed', {
        description: error.message || 'Unable to generate the authorization link. Please try again.'
      })
      setConnecting(false)
    }
  }

  // Sync account data

  const computePercent = (items: typeof phases) => {
    if (!items || items.length === 0) return 0
    const weights = items.length
    let score = 0
    for (const p of items) {
      if (p.status === 'completed' || p.status === 'skipped') score += 1
      else if (p.status === 'started') score += 0.5
    }
    return Math.round((score / weights) * 100)
  }

  const startProgressStream = async (accountId: string) => {
    // snapshot أولي
    try {
      const res = await fetch(`/api/gmb/sync/status?accountId=${accountId}`)
      if (res.ok) {
        const json = await res.json()
        setPhases(json.phases || [])
        setEstimateMs(json.estimate_remaining_ms || 0)
      }
    } catch (e) {
      // Status fetch failed, SSE will still work
    }

    // افتح SSE
    try {
      const es = new EventSource(`/api/gmb/sync/events?accountId=${accountId}`)
      sseRef.current = es
      es.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data)
          if (payload?.type === 'summary') {
            setPhases(payload.phases || [])
          } else if (payload?.type === 'done') {
            es.close()
          }
        } catch (e) {
          // JSON parse error, skip this message
        }
      }
      es.onerror = () => {
        try { 
          es.close() 
        } catch (e) {
          // Already closed
        }
      }
    } catch (e) {
      // SSE not supported or failed
    }
  }

  const handleSync = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    
    if (!activeAccount) {
      toast.error('No active account', {
        description: 'Connect a Google My Business account first.'
      })
      return
    }

    setSyncing(true)
    if (useNewSync) {
      startSyncProgress({ accountId: activeAccount.id })
      setShowRealtimeProgress(true)
    } else {
      setProgressOpen(true)
      setPhases([])
      setEstimateMs(0)
      startProgressStream(activeAccount.id)
    }

    console.log('[GMB Sync] Starting sync for account:', activeAccount.id)
    
    try {
      const response = await fetch(syncEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accountId: activeAccount.id, 
          syncType: 'full' 
        })
      })

      const data = await response.json()
      console.log('[GMB Sync] Response:', data)

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Sync failed')
      }

      // Check if sync was successful
      if (data.success || data.ok) {
        toast.success('Sync complete', {
          description: data.counts ? 
            `Updated ${data.counts.locations || 0} new locations and ${data.counts.reviews || 0} reviews` :
            'Data updated successfully'
        })
        
        await refreshGmbStatus()
        onSuccess?.()
        router.refresh()
        
        // Dispatch event for other components
        window.dispatchEvent(new Event('gmb-sync-complete'))
      } else {
        throw new Error('Unexpected sync response')
      }
    } catch (error: any) {
      console.error('[GMB Sync] Error:', error)
      toast.error('Sync error', {
        description: error.message || 'Please try again.'
      })
    } finally {
      setSyncing(false)
      if (!useNewSync) {
        // أغلق الـ SSE بعد مهلة قصيرة لإتاحة آخر تحديث
        setTimeout(() => { 
          try { 
            sseRef.current?.close() 
          } catch (err) {
            // Already closed
          }
        }, 1500)
      }
    }
  }

  // Disconnect the active account
  const handleDisconnect = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    
    if (!activeAccount) {
      toast.error('No connected account', {
        description: 'Nothing to disconnect.'
      })
      return
    }

    setDisconnecting(true)
    setIsExporting(disconnectOption === 'export')
    console.log('[GMB Disconnect] Starting disconnect with option:', disconnectOption)

    try {
      const result = await disconnectGMBAccount(activeAccount.id, disconnectOption)
      console.log('[GMB Disconnect] Result:', result)

      if (result.success) {
        // Download exported data if available
        if (result.exportData) {
          try {
            const blob = new Blob([JSON.stringify(result.exportData, null, 2)], { 
              type: 'application/json' 
            })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `gmb-data-export-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
          } catch (exportError) {
            console.error('[GMB Disconnect] Export error:', exportError)
          }
        }

        // Check if component is still mounted before updating state
        if (!isMounted.current) return

        // Show specific toast based on disconnect option
        if (disconnectOption === 'keep') {
          toast.success('Google My Business disconnected', {
            description: 'Your data remains available locally.'
          })
        } else if (disconnectOption === 'export') {
          toast.success('Google My Business disconnected', {
            description: 'Data exported successfully.'
          })
        } else if (disconnectOption === 'delete') {
          toast.success('Google My Business disconnected', {
            description: 'All data was deleted.'
          })
        }
        
        setShowDisconnectDialog(false)
        setDisconnectOption('keep') // Reset to default
        
        await refreshGmbStatus()
        onSuccess?.()
        router.refresh()
        
        // Dispatch event for dashboard to hide sync button
        window.dispatchEvent(new Event('gmb-disconnected'))
      } else {
        throw new Error(result.error || 'Disconnect failed')
      }
    } catch (error: any) {
      console.error('[GMB Disconnect] Error:', error)
      if (isMounted.current) {
        toast.error('Disconnect error', {
          description: error.message || 'Please try again.',
        })
      }
    } finally {
      if (isMounted.current) {
        setDisconnecting(false)
        setIsExporting(false)
      }
    }
  }

  const handleCloseRealtimeModal = () => {
    setShowRealtimeProgress(false)
    stopSyncProgress()
  }

  const handleCancelSyncRequest = () => {
    toast.info('طلب الإلغاء قيد التطوير وسيتم دعمه لاحقاً.', {
      description: 'أغلق النافذة إذا رغبت بمتابعة العمل ريثما تنتهي المزامنة.'
    })
  }

  const progressModal = useNewSync ? (
    <SyncProgressModal
      open={showRealtimeProgress}
      onClose={handleCloseRealtimeModal}
      onCancel={handleCancelSyncRequest}
      progress={realtimeProgress}
      elapsedMs={realtimeElapsedMs}
      etaMs={realtimeEtaMs}
      isConnected={realtimeConnected}
      usingFallback={realtimeUsingPolling}
    />
  ) : null

  // Calculate human-readable last sync time
  const getTimeAgo = () => {
    if (!lastSyncTime) return "Not synced yet"
    try {
      return formatDistanceToNow(lastSyncTime, { addSuffix: true })
    } catch {
      return "Recently"
    }
  }

  // Loading state
  if (loading) {
    return (
      <Card className={cn("border-primary/30", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  // ============ Compact View (Dashboard) ============
  if (variant === 'compact') {
    return (
      <>
      <Card className={cn("bg-card border-primary/30", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            {/* Connection status */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                gmbConnected ? "bg-primary/20" : "bg-muted/20"
              )}>
                {gmbConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  {gmbConnected ? 'Connected to GMB' : 'Not connected'}
                </p>
                <div className="flex items-center gap-2">
                  {gmbConnected ? (
                    <>
                      <p className="text-sm font-semibold text-foreground truncate">
                        {showLastSync && lastSyncTime ? (
                          syncing ? "Syncing..." : getTimeAgo()
                        ) : (
                          activeAccount?.account_name || 'Active account'
                        )}
                      </p>
                      {syncSchedule !== 'manual' && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          • {syncSchedule}
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-muted-foreground">
                      Connect your account to get started
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <AnimatePresence mode="wait">
                {gmbConnected ? (
                  <motion.div
                    key="connected-buttons"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSync}
                      disabled={syncing || disconnecting}
                      className="whitespace-nowrap"
                      title="Sync your Google My Business data"
                    >
                      <RefreshCw className={cn(
                        "h-4 w-4 mr-2",
                        syncing && "animate-spin"
                      )} />
                      {syncing ? "Syncing..." : "Sync"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDisconnectDialog(true)}
                      disabled={syncing || disconnecting}
                      className="whitespace-nowrap bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30"
                      title="Disconnect from Google My Business"
                    >
                      <Unlink className={cn(
                        "h-4 w-4 mr-2",
                        disconnecting && "animate-spin"
                      )} />
                      {disconnecting ? "Disconnecting..." : "Disconnect"}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="connect-button"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      size="sm"
                      onClick={handleConnect}
                      disabled={connecting}
                      className="gradient-orange whitespace-nowrap"
                      title="Connect to Google My Business"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Link2 className="h-4 w-4 mr-2" />
                          Connect Google My Business
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        {/* Progress (compact) */}
        {!useNewSync && progressOpen && gmbConnected && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sync</span>
              <span className="text-xs text-muted-foreground">{computePercent(phases)}%</span>
            </div>
            <Progress value={computePercent(phases)} />
            <div className="grid grid-cols-2 gap-2">
              {phases.map(p => (
                <div key={p.phase} className="rounded-md border border-primary/20 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs capitalize truncate">{p.phase}</span>
                    {p.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-500" />}
                    {p.status === 'started' && <Clock className="h-3 w-3 animate-spin text-primary" />}
                    {p.status === 'error' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </CardContent>
        
        {/* Disconnect Dialog */}
        <DisconnectDialog
          open={showDisconnectDialog}
          onOpenChange={setShowDisconnectDialog}
          disconnectOption={disconnectOption}
          setDisconnectOption={setDisconnectOption}
          disconnecting={disconnecting}
          isExporting={isExporting}
          onConfirm={handleDisconnect}
        />
      </Card>
      {progressModal}
      </>
    )
  }

  // ============ Full View (Settings) ============
  return (
    <>
    <Card className={cn("border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Google My Business Connection
            </CardTitle>
            <CardDescription className="mt-1">
              {gmbConnected
                ? 'Your account is connected. You can sync, re-authenticate, or disconnect at any time.'
                : 'Connect your Google My Business account to sync locations, reviews, and analytics.'}
            </CardDescription>
          </div>
          <Badge 
            variant={gmbConnected ? 'default' : 'secondary'}
            className={cn(
              "text-xs px-3 py-1",
              gmbConnected 
                ? "bg-green-500/20 text-green-500 border-green-500/30"
                : "bg-orange-500/20 text-orange-500 border-orange-500/30"
            )}
          >
            {loading ? (
              <>
                <Clock className="h-3 w-3 mr-1 animate-spin" /> Checking...
              </>
            ) : gmbConnected ? (
              <>
                <Link2 className="h-3 w-3 mr-1" /> Connected
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" /> Not connected
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* Active account information */}
        {gmbConnected && activeAccount && (
          <div className="mb-4 p-4 bg-secondary/40 rounded-lg border border-primary/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {activeAccount.account_name}
                </p>
                {activeAccount.email && (
                  <p className="text-xs text-muted-foreground">{activeAccount.email}</p>
                )}
              </div>
              {showLastSync && lastSyncTime && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Last synced</p>
                  <p className="text-xs font-medium text-foreground">{getTimeAgo()}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <AnimatePresence mode="wait">
            {gmbConnected ? (
              <motion.div
                key="connected-buttons-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col sm:flex-row gap-3 w-full"
              >
                <Button 
                  onClick={handleSync}
                  disabled={syncing || disconnecting}
                  className="sm:w-auto w-full"
                  variant="outline"
                  title="Sync your Google My Business data"
                >
                  {syncing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" /> Syncing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" /> Sync full
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleConnect}
                  disabled={connecting || syncing || disconnecting}
                  className="sm:w-auto w-full"
                  variant="outline"
                  title="Re-authenticate with Google My Business"
                >
                  <Key className="h-4 w-4 mr-2" /> Re-authenticate
                </Button>
                <Button 
                  onClick={() => setShowDisconnectDialog(true)}
                  disabled={syncing || disconnecting}
                  className="sm:w-auto w-full"
                  variant="destructive"
                  title="Disconnect from Google My Business"
                >
                  <Unlink className="h-4 w-4 mr-2" /> Disconnect
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="connect-button-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <Button 
                  className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent text-white"
                  onClick={handleConnect}
                  disabled={connecting}
                  title="Connect to Google My Business"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-2" /> Connect Google My Business
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress Panel */}
        {!useNewSync && progressOpen && gmbConnected && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Sync Progress</p>
              <span className="text-xs text-muted-foreground">{computePercent(phases)}%</span>
            </div>
            <Progress value={computePercent(phases)} />
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {phases.map(p => (
                <div key={p.phase} className={cn("rounded-md border p-2 text-xs", p.status === 'error' ? 'border-red-500/40 bg-red-500/10' : p.status === 'completed' ? 'border-green-500/40 bg-green-500/10' : 'border-primary/30 bg-primary/5')}> 
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold capitalize">{p.phase}</span>
                    {p.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-500" />}
                    {p.status === 'started' && <Clock className="h-3 w-3 animate-spin text-primary" />}
                    {p.status === 'error' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                    {p.status === 'skipped' && <RefreshCw className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <p className="text-muted-foreground truncate">{p.status}</p>
                  {p.last_counts && Object.keys(p.last_counts).length > 0 && (
                    <p className="mt-1">
                      {Object.entries(p.last_counts).map(([k,v]) => `${k}:${v}`).join(' ')}
                    </p>
                  )}
                  {dbCounts && p.phase === 'locations' && (
                    <p className="mt-1 text-xs text-green-400">
                      Total in DB: {dbCounts.locations}
                    </p>
                  )}
                  {dbCounts && p.phase === 'reviews' && (
                    <p className="mt-1 text-xs text-green-400">
                      Total in DB: {dbCounts.reviews}
                    </p>
                  )}
                  {dbCounts && p.phase === 'questions' && (
                    <p className="mt-1 text-xs text-green-400">
                      Total in DB: {dbCounts.questions}
                    </p>
                  )}
                  {dbCounts && p.phase === 'media' && (
                    <p className="mt-1 text-xs text-green-400">
                      Total in DB: {dbCounts.media}
                    </p>
                  )}
                  {p.last_error && (
                    <p className="mt-1 text-red-500">{p.last_error}</p>
                  )}
                </div>
              ))}
            </div>
            {estimateMs > 0 && (
              <p className="text-xs text-muted-foreground">Estimated remaining ~ {Math.round(estimateMs/1000)}s</p>
            )}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setProgressOpen(false)}>Hide</Button>
              {!syncing && (
                <Button size="sm" variant="outline" onClick={() => { setPhases([]); setProgressOpen(false); }}>Clear</Button>
              )}
            </div>
          </div>
        )}

        {!gmbConnected && (
          <p className="text-xs text-muted-foreground mt-3">
            Google will request the required permissions during the next step.
          </p>
        )}
      </CardContent>

      {/* Disconnect Dialog */}
      <DisconnectDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
        disconnectOption={disconnectOption}
        setDisconnectOption={setDisconnectOption}
        disconnecting={disconnecting}
        isExporting={isExporting}
        onConfirm={handleDisconnect}
      />
    </Card>
    {progressModal}
    </>
  )
}

// ============ Disconnect Dialog Component ============
interface DisconnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  disconnectOption: DisconnectOption
  setDisconnectOption: (option: DisconnectOption) => void
  disconnecting: boolean
  isExporting: boolean
  onConfirm: () => void
}

function DisconnectDialog({
  open,
  onOpenChange,
  disconnectOption,
  setDisconnectOption,
  disconnecting,
  isExporting,
  onConfirm
}: DisconnectDialogProps) {
  // Get dynamic button label based on selected option
  const getButtonLabel = () => {
    if (isExporting) {
      return {
        icon: <Download className="h-4 w-4 mr-2 animate-bounce" />,
        text: "Exporting..."
      }
    }
    if (disconnecting) {
      return {
        icon: <Clock className="h-4 w-4 mr-2 animate-spin" />,
        text: "Disconnecting..."
      }
    }
    
    switch (disconnectOption) {
      case 'keep':
        return {
          icon: <Unlink className="h-4 w-4 mr-2" />,
          text: "Disconnect (keep data)"
        }
      case 'export':
        return {
          icon: <Download className="h-4 w-4 mr-2" />,
          text: "Disconnect (export data)"
        }
      case 'delete':
        return {
          icon: <AlertTriangle className="h-4 w-4 mr-2" />,
          text: "Disconnect and delete all data"
        }
      default:
        return {
          icon: <Unlink className="h-4 w-4 mr-2" />,
          text: "Disconnect"
        }
    }
  }

  // Get subtext based on selected option
  const getSubtext = () => {
    switch (disconnectOption) {
      case 'keep':
        return "Your data will remain stored locally."
      case 'export':
        return "Your data will be exported as JSON."
      case 'delete':
        return "All data will be permanently deleted."
      default:
        return ""
    }
  }

  const buttonLabel = getButtonLabel()
  const subtext = getSubtext()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800 max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-zinc-100">
            <Unlink className="h-5 w-5 text-orange-500" />
            Disconnect Google My Business?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            Choose what happens to your data after disconnecting:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <RadioGroup 
            value={disconnectOption} 
            onValueChange={(value: string) => setDisconnectOption(value as DisconnectOption)}
          >
            <div className="space-y-3">
              {/* Keep Option */}
              <div className="flex items-start space-x-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 hover:bg-zinc-800 transition-colors">
                <RadioGroupItem value="keep" id="keep" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="keep" className="text-sm font-medium text-zinc-200 cursor-pointer">
                    Keep historical data (recommended)
                  </Label>
                  <p className="text-xs text-zinc-500">
                    Anonymize and archive your data for historical analysis. Personal info is removed while stats stay intact.
                  </p>
                </div>
                <Shield className="h-5 w-5 text-green-500 flex-shrink-0" />
              </div>

              {/* Export Option */}
              <div className="flex items-start space-x-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 hover:bg-zinc-800 transition-colors">
                <RadioGroupItem value="export" id="export" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="export" className="text-sm font-medium text-zinc-200 cursor-pointer">
                    Export data then archive
                  </Label>
                  <p className="text-xs text-zinc-500">
                    Download all data as JSON, then anonymize and archive it for a complete backup.
                  </p>
                </div>
                <Download className="h-5 w-5 text-blue-500 flex-shrink-0" />
              </div>

              {/* Delete Option */}
              <div className="flex items-start space-x-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4 hover:bg-red-500/10 transition-colors">
                <RadioGroupItem value="delete" id="delete" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="delete" className="text-sm font-medium text-red-400 cursor-pointer">
                    Delete all data immediately
                  </Label>
                  <p className="text-xs text-red-300/70">
                    Permanently remove all locations, reviews, questions, and posts. This action cannot be undone.
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
              </div>
            </div>
          </RadioGroup>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            disabled={disconnecting || isExporting}
            className="border-zinc-700"
          >
            Cancel
          </AlertDialogCancel>
          <div className="flex flex-col items-end gap-1">
            <AlertDialogAction
              onClick={onConfirm}
              disabled={disconnecting || isExporting}
              className={cn(
                "w-full sm:w-auto",
                disconnectOption === 'delete' 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-orange-600 hover:bg-orange-700"
              )}
            >
              {buttonLabel.icon}
              {buttonLabel.text}
            </AlertDialogAction>
            {subtext && !disconnecting && !isExporting && (
              <p className="text-xs text-zinc-500 italic text-right px-2">
                {subtext}
              </p>
            )}
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

