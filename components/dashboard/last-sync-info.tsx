"use client"

import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface LastSyncInfoProps {
  lastSyncTime: Date | null
  isSyncing?: boolean
  onSync?: () => void
  syncSchedule?: string
  onDisconnect?: () => void
  isDisconnecting?: boolean
  className?: string
}

export function LastSyncInfo({ 
  lastSyncTime, 
  isSyncing = false, 
  onSync,
  syncSchedule = 'manual',
  onDisconnect,
  isDisconnecting = false,
  className
}: LastSyncInfoProps) {
  const getTimeAgo = () => {
    if (!lastSyncTime) return "Never synced"
    
    try {
      const distance = formatDistanceToNow(lastSyncTime, { addSuffix: true })
      return distance
    } catch {
      return "Recently"
    }
  }

  const getSyncStatusColor = () => {
    if (!lastSyncTime) return "text-muted-foreground"
    
    const hoursSinceSync = lastSyncTime 
      ? (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60)
      : Infinity
    
    if (hoursSinceSync < 1) return "text-success"
    if (hoursSinceSync < 24) return "text-warning"
    return "text-warning"
  }

  const getSyncStatusIcon = () => {
    if (!lastSyncTime) return AlertCircle
    if (isSyncing) return RefreshCw
    
    const hoursSinceSync = lastSyncTime 
      ? (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60)
      : Infinity
    
    if (hoursSinceSync < 1) return CheckCircle2
    return Clock
  }

  const StatusIcon = getSyncStatusIcon()

  return (
    <Card className="bg-card border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
              !lastSyncTime ? "bg-muted/20" : "bg-primary/20"
            )}>
              <StatusIcon className={cn(
                "h-5 w-5",
                !lastSyncTime ? "text-muted-foreground" : getSyncStatusColor(),
                isSyncing && "animate-spin"
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">
                Last Sync
              </p>
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-sm font-semibold truncate",
                  !lastSyncTime ? "text-muted-foreground" : "text-foreground"
                )}>
                  {isSyncing ? "Syncing..." : getTimeAgo()}
                </p>
                {syncSchedule !== 'manual' && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    • Auto: {syncSchedule}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 flex-shrink-0">
            {onSync && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSync}
                disabled={isSyncing || isDisconnecting}
                className="flex-shrink-0 whitespace-nowrap"
              >
                <RefreshCw className={cn(
                  "h-4 w-4 mr-2",
                  isSyncing && "animate-spin"
                )} />
                {isSyncing ? "Syncing" : "Sync Now"}
              </Button>
            )}
            {onDisconnect && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDisconnect}
                disabled={isSyncing || isDisconnecting}
                className="flex-shrink-0 whitespace-nowrap bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30"
              >
                <Unlink className={cn(
                  "h-4 w-4 mr-2",
                  isDisconnecting && "animate-spin"
                )} />
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

