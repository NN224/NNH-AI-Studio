'use client'

import { useSync } from '@/contexts/SyncContext'
import { Button } from '@/components/ui/button'
import { RefreshCw, Check, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useParams } from 'next/navigation'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

export function GlobalSyncButton() {
  const { status, triggerSync } = useSync()
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const isRTL = locale === 'ar'

  const handleSync = async () => {
    try {
      await triggerSync()
      toast.success(isRTL ? 'بدأ التزامن...' : 'Sync started...')
    } catch (error) {
      toast.error(
        isRTL
          ? `فشل التزامن: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
          : `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  const getTooltipContent = () => {
    if (status.isSyncing) {
      return isRTL ? `جاري التزامن... ${status.percentage}%` : `Syncing... ${status.percentage}%`
    }

    if (status.error) {
      return isRTL ? `خطأ: ${status.error}` : `Error: ${status.error}`
    }

    if (status.lastSync) {
      const timeAgo = formatDistanceToNow(status.lastSync, {
        addSuffix: true,
        locale: isRTL ? ar : undefined,
      })
      return isRTL ? `آخر تزامن: ${timeAgo}` : `Last sync: ${timeAgo}`
    }

    return isRTL ? 'انقر للمزامنة' : 'Click to sync'
  }

  const getStatusIcon = () => {
    if (status.isSyncing) {
      return null // Will use spinning RefreshCw
    }

    if (status.error) {
      return (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
      )
    }

    if (status.lastSync) {
      return <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
    }

    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={status.isSyncing}
            className="relative gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${status.isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">
              {status.isSyncing
                ? isRTL
                  ? 'جاري المزامنة...'
                  : 'Syncing...'
                : isRTL
                  ? 'مزامنة'
                  : 'Sync'}
            </span>

            {/* Status indicator dot */}
            {getStatusIcon()}
          </Button>
        </TooltipTrigger>

        <TooltipContent side="bottom" align="end">
          <div className="text-sm space-y-1">
            <p className="font-medium">{getTooltipContent()}</p>

            {status.isSyncing && status.currentStage && (
              <p className="text-xs text-muted-foreground">{status.currentStage}</p>
            )}

            {status.isSyncing && status.estimatedTimeMs && (
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? `الوقت المتبقي: ${Math.ceil(status.estimatedTimeMs / 1000)}ث`
                  : `ETA: ${Math.ceil(status.estimatedTimeMs / 1000)}s`}
              </p>
            )}

            {/* Show counts when syncing */}
            {status.isSyncing && (
              <div className="text-xs text-muted-foreground pt-1 border-t">
                <div className="flex items-center gap-2">
                  {status.progress.locations === 'done' && (
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      {status.counts.locations} {isRTL ? 'موقع' : 'loc'}
                    </span>
                  )}
                  {status.progress.reviews === 'done' && (
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      {status.counts.reviews} {isRTL ? 'مراجعة' : 'rev'}
                    </span>
                  )}
                  {status.progress.questions === 'done' && (
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      {status.counts.questions} {isRTL ? 'سؤال' : 'q'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Compact version for mobile/sidebar
export function GlobalSyncButtonCompact() {
  const { status, triggerSync } = useSync()
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const isRTL = locale === 'ar'

  const handleSync = async () => {
    try {
      await triggerSync()
    } catch {
      toast.error(isRTL ? 'فشل التزامن' : 'Sync failed')
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleSync}
      disabled={status.isSyncing}
      className="relative h-9 w-9"
    >
      {status.error ? (
        <AlertCircle className="h-4 w-4 text-destructive" />
      ) : (
        <RefreshCw className={`h-4 w-4 ${status.isSyncing ? 'animate-spin' : ''}`} />
      )}

      {!status.isSyncing && !status.error && status.lastSync && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
      )}
    </Button>
  )
}
