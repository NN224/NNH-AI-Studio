"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface SyncProgress {
  syncId: string;
  accountId: string;
  userId: string;
  stage: string;
  status: "running" | "completed" | "error";
  current: number;
  total: number;
  percentage: number;
  message?: string;
  counts?: Record<string, number | undefined>;
  error?: string;
  timestamp: string;
}

interface FirstSyncOverlayProps {
  accountId: string;
  userId: string;
  onComplete: () => void;
  onError?: () => void;
}

const SYNC_STAGES = [
  { key: "init", labelKey: "initializing" },
  { key: "locations_fetch", labelKey: "fetchingLocations" },
  { key: "reviews_fetch", labelKey: "fetchingReviews" },
  { key: "questions_fetch", labelKey: "fetchingQuestions" },
  { key: "posts_fetch", labelKey: "fetchingPosts" },
  { key: "media_fetch", labelKey: "fetchingMedia" },
  { key: "transaction", labelKey: "savingData" },
  { key: "cache_refresh", labelKey: "refreshingCache" },
  { key: "complete", labelKey: "complete" },
];

export function FirstSyncOverlay({
  accountId,
  userId,
  onComplete,
  onError,
}: FirstSyncOverlayProps) {
  const t = useTranslations("Home.firstSync");
  const [progress, setProgress] = useState<SyncProgress>({
    syncId: "",
    accountId,
    userId,
    stage: "init",
    status: "running",
    current: 0,
    total: SYNC_STAGES.length,
    percentage: 0,
    message: t("starting"),
    timestamp: new Date().toISOString(),
  });
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let pollTimeout: NodeJS.Timeout;
    const maxPollTime = 120000; // 2 minutes max
    const startTime = Date.now();

    // Poll for progress (fallback if Realtime not available)
    const pollForProgress = async () => {
      try {
        // Check if we've exceeded max poll time
        if (Date.now() - startTime > maxPollTime) {
          console.warn("[FirstSyncOverlay] Max poll time exceeded");
          setHasError(true);
          setProgress((prev) => ({
            ...prev,
            status: "error",
            error: t("timeout"),
          }));
          onError?.();
          return;
        }

        // Check sync_worker_runs table for latest progress
        const { data: syncRun, error: syncError } = await supabase
          .from("sync_worker_runs")
          .select("*")
          .eq("account_id", accountId)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (syncError) {
          console.error(
            "[FirstSyncOverlay] Error checking sync status:",
            syncError,
          );
        }

        if (syncRun) {
          const metadata = syncRun.metadata as any;

          if (syncRun.status === "completed") {
            setProgress({
              syncId: syncRun.id,
              accountId,
              userId,
              stage: "complete",
              status: "completed",
              current: SYNC_STAGES.length,
              total: SYNC_STAGES.length,
              percentage: 100,
              message: t("success"),
              counts: metadata?.counts,
              timestamp: syncRun.completed_at || new Date().toISOString(),
            });
            setIsComplete(true);

            // Wait 2 seconds to show success message, then complete
            setTimeout(() => {
              onComplete();
            }, 2000);
            return;
          }

          if (syncRun.status === "failed") {
            setHasError(true);
            setProgress((prev) => ({
              ...prev,
              status: "error",
              error: syncRun.error_message || t("failed"),
            }));
            onError?.();
            return;
          }

          // Update progress if running
          if (syncRun.status === "running" && metadata?.stage) {
            const stageIndex = SYNC_STAGES.findIndex(
              (s) => s.key === metadata.stage,
            );
            const percentage = Math.round(
              (stageIndex / SYNC_STAGES.length) * 100,
            );

            setProgress({
              syncId: syncRun.id,
              accountId,
              userId,
              stage: metadata.stage,
              status: "running",
              current: stageIndex,
              total: SYNC_STAGES.length,
              percentage,
              message: metadata.message || t("syncing"),
              counts: metadata.counts,
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Continue polling every 3 seconds
        pollTimeout = setTimeout(pollForProgress, 3000);
      } catch (error) {
        console.error("[FirstSyncOverlay] Error in poll:", error);
        pollTimeout = setTimeout(pollForProgress, 3000);
      }
    };

    // Start polling
    pollForProgress();

    return () => {
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [accountId, userId, onComplete, onError, retryCount, t]);

  const handleRetry = () => {
    setHasError(false);
    setRetryCount((prev) => prev + 1);
    setProgress((prev) => ({
      ...prev,
      stage: "init",
      status: "running",
      percentage: 0,
      message: t("retrying"),
      error: undefined,
    }));

    // Trigger a new sync by calling the queue endpoint
    fetch("/api/gmb/queue/process", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}`,
      },
    }).catch((err) => {
      console.error("[FirstSyncOverlay] Failed to trigger retry:", err);
    });
  };

  const getStageIcon = (stageKey: string, stageIndex: number) => {
    const currentStageIndex = SYNC_STAGES.findIndex(
      (s) => s.key === progress.stage,
    );
    const isPast = currentStageIndex > stageIndex;
    const isActive = progress.stage === stageKey;

    if (hasError && isActive) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }

    if (isPast || (isComplete && stageKey === "complete")) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }

    if (isActive) {
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    }

    return (
      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
    );
  };

  const getStageStatus = (stageKey: string, stageIndex: number) => {
    const currentStageIndex = SYNC_STAGES.findIndex(
      (s) => s.key === progress.stage,
    );
    const isPast = currentStageIndex > stageIndex;
    const isActive = progress.stage === stageKey;

    if (hasError && isActive) return "text-red-500";
    if (isPast || (isComplete && stageKey === "complete"))
      return "text-green-500";
    if (isActive) return "text-primary font-medium";
    return "text-muted-foreground";
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          {hasError ? (
            <>
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-red-500">
                {t("errorTitle")}
              </h2>
              <p className="text-muted-foreground">
                {progress.error || t("errorMessage")}
              </p>
            </>
          ) : isComplete ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2 animate-bounce" />
              <h2 className="text-2xl font-bold text-green-500">
                {t("successTitle")}
              </h2>
              <p className="text-muted-foreground">{t("successMessage")}</p>
            </>
          ) : (
            <>
              <Loader2 className="h-12 w-12 text-primary mx-auto mb-2 animate-spin" />
              <h2 className="text-2xl font-bold">{t("title")}</h2>
              <p className="text-muted-foreground">{t("description")}</p>
            </>
          )}
        </div>

        {!hasError && !isComplete && (
          <>
            <Progress value={progress.percentage} className="h-2" />

            <div className="space-y-3">
              {SYNC_STAGES.map((stage, index) => (
                <div
                  key={stage.key}
                  className={`flex items-center gap-3 transition-all ${getStageStatus(stage.key, index)}`}
                >
                  {getStageIcon(stage.key, index)}
                  <span className="flex-1">
                    {t(`stages.${stage.labelKey}`)}
                  </span>
                  {progress.stage === stage.key && progress.counts && (
                    <span className="text-sm tabular-nums">
                      {Object.values(progress.counts).find(
                        (v) => v !== undefined,
                      ) || 0}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {progress.message && (
              <p className="text-sm text-center text-muted-foreground animate-pulse">
                {progress.message}
              </p>
            )}
          </>
        )}

        {isComplete && progress.counts && (
          <div className="space-y-2 text-center">
            <div className="grid grid-cols-2 gap-4">
              {progress.counts.locations !== undefined && (
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-green-500">
                    {progress.counts.locations}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("counts.locations")}
                  </p>
                </div>
              )}
              {progress.counts.reviews !== undefined && (
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-blue-500">
                    {progress.counts.reviews}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("counts.reviews")}
                  </p>
                </div>
              )}
              {progress.counts.questions !== undefined && (
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-purple-500">
                    {progress.counts.questions}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("counts.questions")}
                  </p>
                </div>
              )}
              {progress.counts.posts !== undefined &&
                progress.counts.posts > 0 && (
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-orange-500">
                      {progress.counts.posts}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("counts.posts")}
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}

        {hasError && (
          <div className="space-y-2">
            <Button onClick={handleRetry} className="w-full" variant="default">
              {t("retry")}
            </Button>
            <Button
              onClick={onError || onComplete}
              className="w-full"
              variant="outline"
            >
              {t("continue")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
