"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSyncContextSafe } from "@/contexts/sync-context";
import { useGMBStatus } from "@/hooks/features/use-gmb";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export function GlobalSyncButton() {
  const syncContext = useSyncContextSafe();
  const { data: gmbStatus } = useGMBStatus();
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const isRTL = locale === "ar";

  const activeAccountId = gmbStatus?.activeAccount?.id;
  const isSyncing = syncContext?.state.status === "syncing";
  const progress = syncContext?.state.progress || 0;
  const error = syncContext?.state.error;
  const lastSyncAt = syncContext?.state.lastSyncAt;

  const handleSync = async () => {
    if (!activeAccountId) {
      toast.error(isRTL ? "لا يوجد حساب GMB متصل" : "No GMB account connected");
      return;
    }

    if (!syncContext) {
      toast.error(isRTL ? "خطأ في النظام" : "System error");
      return;
    }

    try {
      await syncContext.startSync(activeAccountId, false);
      toast.success(isRTL ? "بدأ التزامن..." : "Sync started...");
    } catch (err) {
      toast.error(
        isRTL
          ? `فشل التزامن: ${err instanceof Error ? err.message : "خطأ غير معروف"}`
          : `Sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const getTooltipContent = () => {
    if (isSyncing) {
      return isRTL ? `جاري التزامن... ${progress}%` : `Syncing... ${progress}%`;
    }

    if (error) {
      return isRTL ? `خطأ: ${error}` : `Error: ${error}`;
    }

    if (lastSyncAt) {
      const timeAgo = formatDistanceToNow(new Date(lastSyncAt), {
        addSuffix: true,
        locale: isRTL ? ar : undefined,
      });
      return isRTL ? `آخر تزامن: ${timeAgo}` : `Last sync: ${timeAgo}`;
    }

    return isRTL ? "انقر للمزامنة" : "Click to sync";
  };

  const getStatusIcon = () => {
    if (isSyncing) {
      return null;
    }

    if (error) {
      return (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
      );
    }

    if (lastSyncAt) {
      return (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
      );
    }

    return null;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || !activeAccountId}
            className="relative gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            <span className="hidden md:inline">
              {isSyncing
                ? isRTL
                  ? "جاري المزامنة..."
                  : "Syncing..."
                : isRTL
                  ? "مزامنة"
                  : "Sync"}
            </span>

            {getStatusIcon()}
          </Button>
        </TooltipTrigger>

        <TooltipContent side="bottom" align="end">
          <div className="text-sm space-y-1">
            <p className="font-medium">{getTooltipContent()}</p>

            {isSyncing && syncContext?.state.message && (
              <p className="text-xs text-muted-foreground">
                {syncContext.state.message}
              </p>
            )}

            {isSyncing && (
              <div className="text-xs text-muted-foreground pt-1 border-t">
                <div className="flex items-center gap-2">
                  {syncContext?.state.counts.locations && (
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      {syncContext.state.counts.locations}{" "}
                      {isRTL ? "موقع" : "loc"}
                    </span>
                  )}
                  {syncContext?.state.counts.reviews && (
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      {syncContext.state.counts.reviews}{" "}
                      {isRTL ? "مراجعة" : "rev"}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact version for mobile/sidebar
export function GlobalSyncButtonCompact() {
  const syncContext = useSyncContextSafe();
  const { data: gmbStatus } = useGMBStatus();
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const isRTL = locale === "ar";

  const activeAccountId = gmbStatus?.activeAccount?.id;
  const isSyncing = syncContext?.state.status === "syncing";
  const error = syncContext?.state.error;
  const lastSyncAt = syncContext?.state.lastSyncAt;

  const handleSync = async () => {
    if (!activeAccountId || !syncContext) return;

    try {
      await syncContext.startSync(activeAccountId, false);
    } catch {
      toast.error(isRTL ? "فشل التزامن" : "Sync failed");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleSync}
      disabled={isSyncing || !activeAccountId}
      className="relative h-9 w-9"
    >
      {error ? (
        <AlertCircle className="h-4 w-4 text-destructive" />
      ) : (
        <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
      )}

      {!isSyncing && !error && lastSyncAt && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
      )}
    </Button>
  );
}
