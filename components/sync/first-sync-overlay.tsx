'use client'

import { useEffect, useState } from 'react'
import { useSync } from '@/contexts/SyncContext'
import {
  Loader2,
  Check,
  AlertCircle,
  MapPin,
  MessageSquare,
  HelpCircle,
  FileText,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useParams } from 'next/navigation'
import { Progress } from '@/components/ui/progress'

type StageIconProps = {
  status: 'pending' | 'syncing' | 'done' | 'error'
  icon: React.ReactNode
}

function StageIcon({ status, icon }: StageIconProps) {
  if (status === 'pending') {
    return (
      <div className="w-10 h-10 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-muted-foreground/30">
        {icon}
      </div>
    )
  }
  if (status === 'syncing') {
    return (
      <div className="w-10 h-10 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-primary animate-pulse">
        {icon}
      </div>
    )
  }
  if (status === 'done') {
    return (
      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
        <Check className="h-5 w-5" />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center text-white">
        <AlertCircle className="h-5 w-5" />
      </div>
    )
  }
  return null
}

export function FirstSyncOverlay() {
  const { status, triggerSync, isFirstSync } = useSync()
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const isRTL = locale === 'ar'

  const [show, setShow] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)

  // Check if this is auto-sync from OAuth callback
  useEffect(() => {
    const autoSync = searchParams?.get('autoSync') === 'true'
    const firstSync = searchParams?.get('firstSync') === 'true'

    if ((autoSync || firstSync || isFirstSync) && !status.lastSync && !hasTriggered) {
      setShow(true)
      // Auto-trigger sync
      if (!status.isSyncing) {
        triggerSync().catch(console.error)
        setHasTriggered(true)
      }
    }
  }, [searchParams, isFirstSync, status.lastSync, status.isSyncing, triggerSync, hasTriggered])

  // Hide overlay after sync completes
  useEffect(() => {
    if (!status.isSyncing && status.lastSync && show && hasTriggered) {
      // Show success for 2 seconds then hide
      const timer = setTimeout(() => {
        setShow(false)
        // Remove URL parameters
        const url = new URL(window.location.href)
        url.searchParams.delete('autoSync')
        url.searchParams.delete('firstSync')
        router.replace(url.pathname)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [status.isSyncing, status.lastSync, show, router, hasTriggered])

  if (!show) return null

  const stages = [
    {
      key: 'locations',
      icon: <MapPin className="h-5 w-5" />,
      labelEn: 'Locations',
      labelAr: 'المواقع',
      status: status.progress.locations,
      count: status.counts.locations,
    },
    {
      key: 'reviews',
      icon: <MessageSquare className="h-5 w-5" />,
      labelEn: 'Reviews',
      labelAr: 'المراجعات',
      status: status.progress.reviews,
      count: status.counts.reviews,
    },
    {
      key: 'questions',
      icon: <HelpCircle className="h-5 w-5" />,
      labelEn: 'Questions',
      labelAr: 'الأسئلة',
      status: status.progress.questions,
      count: status.counts.questions,
    },
    {
      key: 'posts',
      icon: <FileText className="h-5 w-5" />,
      labelEn: 'Posts',
      labelAr: 'المنشورات',
      status: status.progress.posts,
      count: status.counts.posts,
    },
  ]

  const allDone = !status.isSyncing && status.lastSync && hasTriggered

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 p-4">
        <div className="bg-card p-8 shadow-2xl rounded-xl border-2 border-primary/20">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Header */}
            <div className="space-y-3">
              {status.isSyncing ? (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <h2 className="text-3xl font-bold">
                    {isRTL ? '🔄 جاري مزامنة بياناتك...' : '🔄 Syncing your GMB data...'}
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    {isRTL
                      ? 'يرجى الانتظار بينما نقوم بمزامنة بياناتك'
                      : 'Please wait while we sync your data'}
                  </p>
                </>
              ) : allDone ? (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <h2 className="text-3xl font-bold text-green-500">
                    {isRTL ? '✅ اكتمل!' : '✅ All set!'}
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    {isRTL ? 'بياناتك جاهزة الآن!' : 'Your GMB data is ready!'}
                  </p>
                </>
              ) : null}
            </div>

            {/* Progress Bar */}
            {status.isSyncing && (
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{isRTL ? 'التقدم' : 'Progress'}</span>
                  <span className="font-bold text-primary">{status.percentage}%</span>
                </div>
                <Progress value={status.percentage} className="h-2" />
                {status.currentStage && (
                  <p className="text-xs text-muted-foreground">{status.currentStage}</p>
                )}
              </div>
            )}

            {/* Stages Grid */}
            <div className="w-full grid grid-cols-2 gap-4">
              {stages.map((stage) => (
                <div
                  key={stage.key}
                  className={`relative flex items-center gap-3 p-4 rounded-lg border transition-all ${
                    stage.status === 'syncing'
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : stage.status === 'done'
                        ? 'border-green-500/50 bg-green-500/5'
                        : stage.status === 'error'
                          ? 'border-destructive/50 bg-destructive/5'
                          : 'border-border bg-muted/30'
                  }`}
                >
                  <StageIcon status={stage.status} icon={stage.icon} />

                  <div className="flex-1 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
                    <p className="font-semibold text-sm">{isRTL ? stage.labelAr : stage.labelEn}</p>

                    {stage.status === 'done' && stage.count !== undefined && stage.count > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {stage.count} {isRTL ? 'تمت المزامنة' : 'synced'}
                      </p>
                    )}

                    {stage.status === 'syncing' && (
                      <p className="text-xs text-primary font-medium">
                        {isRTL ? 'جاري المزامنة...' : 'Syncing...'}
                      </p>
                    )}

                    {stage.status === 'pending' && (
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? 'في الانتظار' : 'Pending'}
                      </p>
                    )}

                    {stage.status === 'error' && (
                      <p className="text-xs text-destructive">{isRTL ? 'خطأ' : 'Error'}</p>
                    )}
                  </div>

                  {/* Pulse animation for syncing */}
                  {stage.status === 'syncing' && (
                    <div className="absolute inset-0 rounded-lg border-2 border-primary animate-pulse pointer-events-none" />
                  )}
                </div>
              ))}
            </div>

            {/* Estimated Time */}
            {status.isSyncing && status.estimatedTimeMs && (
              <div className="w-full p-3 bg-muted/50 rounded-md">
                <p className="text-sm text-muted-foreground">
                  {isRTL
                    ? `الوقت المتبقي التقريبي: ${Math.ceil(status.estimatedTimeMs / 1000)} ثانية`
                    : `Estimated time remaining: ${Math.ceil(status.estimatedTimeMs / 1000)} seconds`}
                </p>
              </div>
            )}

            {/* Error Message */}
            {status.error && (
              <div className="w-full p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {isRTL ? 'حدث خطأ أثناء المزامنة' : 'An error occurred during sync'}
                    </p>
                    <p className="text-xs mt-1 opacity-90">{status.error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {allDone && (
              <div className="w-full p-4 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg border border-green-500/50">
                <p className="font-medium text-sm">
                  {isRTL
                    ? '✓ تمت مزامنة البيانات بنجاح! جاري إعادة التوجيه...'
                    : '✓ Data synced successfully! Redirecting...'}
                </p>
              </div>
            )}

            {/* Info Footer */}
            {status.isSyncing && (
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? 'يمكنك الانتظار أو العودة لاحقاً. ستكون بياناتك جاهزة عند اكتمال المزامنة.'
                  : 'You can wait or come back later. Your data will be ready when sync completes.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
