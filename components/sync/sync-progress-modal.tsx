"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, Clock, PauseCircle } from "lucide-react"
import type { SyncProgressState, SyncProgressStage } from "@/hooks/use-sync-progress"

type SyncProgressModalProps = {
  open: boolean
  onClose?: () => void
  onCancel?: () => void
  progress: SyncProgressState | null
  elapsedMs?: number | null
  etaMs?: number | null
  isConnected?: boolean
  usingFallback?: boolean
}

const STAGE_LABELS: Partial<Record<SyncProgressStage, string>> = {
  init: "تهيئة المزامنة",
  locations_fetch: "جلب المواقع",
  reviews_fetch: "جلب المراجعات",
  questions_fetch: "جلب الأسئلة",
  transaction: "حفظ البيانات",
  cache_refresh: "تحديث الذاكرة المؤقتة",
  complete: "انتهت المزامنة",
}

function formatDuration(value?: number | null) {
  if (!value || value <= 0) {
    return null
  }
  const seconds = Math.floor(value / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}m ${remaining}s`
}

export function SyncProgressModal({
  open,
  onClose,
  onCancel,
  progress,
  elapsedMs,
  etaMs,
  isConnected,
  usingFallback,
}: SyncProgressModalProps) {
  const percentage = progress?.percentage ?? 0
  const status = progress?.status ?? "pending"

  const statusIcon = {
    running: <Clock className="h-4 w-4 text-primary animate-spin" />,
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    error: <AlertTriangle className="h-4 w-4 text-red-500" />,
    pending: <PauseCircle className="h-4 w-4 text-muted-foreground" />,
  }[status]

  const elapsed = formatDuration(elapsedMs)
  const eta = formatDuration(etaMs)

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose?.() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>مزامنة Google My Business</DialogTitle>
          <DialogDescription>
            يتم عرض تقدم العملية في الوقت الفعلي. لا تغلق النافذة حتى تنتهي المزامنة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                {STAGE_LABELS[progress?.stage ?? "init"] ?? "جارٍ التحضير"}
              </p>
              <p className="text-xs text-muted-foreground">
                {progress?.message ?? "نقوم بالتواصل مع واجهات Google وإعداد البيانات"}
              </p>
            </div>
            {statusIcon}
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>التقدّم</span>
              <span>{percentage}%</span>
            </div>
            <Progress value={percentage} />
          </div>

          {progress?.counts && Object.keys(progress.counts).length > 0 && (
            <div className="rounded-lg border border-border px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground mb-1">عناصر تمت معالجتها</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(progress.counts).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="uppercase text-muted-foreground">{key}:</span>{" "}
                    <span className="font-semibold">{value ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">الوقت المنقضي</p>
              <p className="font-medium">
                {elapsed ?? <span className="text-muted-foreground">--</span>}
              </p>
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">المتبقي التقديري</p>
              <p className="font-medium">
                {eta ?? <span className="text-muted-foreground">محسوب تلقائياً</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {isConnected ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span>متصل بتحديثات مباشرة {usingFallback && "(وضع الاستطلاع)"}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                <span>انقطع الاتصال المؤقت بالـ SSE، نحاول إعادة الاتصال...</span>
              </>
            )}
          </div>

          {progress?.error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {progress.error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel?.()}
              disabled={!onCancel || status !== "running"}
              title={onCancel ? "طلب إلغاء العملية" : "الإلغاء غير متاح حالياً"}
            >
              إلغاء
            </Button>
            <Button size="sm" onClick={() => onClose?.()}>
              {status === "completed" ? "تم" : status === "error" ? "إغلاق" : "إخفاء"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

