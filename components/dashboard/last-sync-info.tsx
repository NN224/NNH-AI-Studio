"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface LastSyncInfoProps {
  lastSyncTime: Date | null
  isSyncing?: boolean
  onSync?: () => void
  syncSchedule?: string
}

export function LastSyncInfo({ 
  lastSyncTime, 
  isSyncing = false, 
  onSync,
  syncSchedule = 'manual'
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
    
    if (hoursSinceSync < 1) return "text-green-500"
    if (hoursSinceSync < 24) return "text-yellow-500"
    return "text-orange-500"
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
          
          {onSync && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSync}
              disabled={isSyncing}
              className="flex-shrink-0"
            >
              <RefreshCw className={cn(
                "h-4 w-4 mr-2",
                isSyncing && "animate-spin"
              )} />
              {isSyncing ? "Syncing" : "Sync Now"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

