"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import {
  useSyncProgress,
  type SyncProgressState,
} from "@/hooks/use-sync-progress";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { useGMBStatus } from "@/hooks/features/use-gmb";
import { createClient } from "@/lib/supabase/client";

export type SyncStage =
  | "init"
  | "locations"
  | "reviews"
  | "questions"
  | "posts"
  | "media"
  | "complete";
export type SyncStageStatus = "pending" | "syncing" | "done" | "error";

export interface GlobalSyncStatus {
  isSyncing: boolean;
  lastSync: Date | null;
  error: string | null;
  progress: {
    locations: SyncStageStatus;
    reviews: SyncStageStatus;
    questions: SyncStageStatus;
    posts: SyncStageStatus;
    media: SyncStageStatus;
  };
  counts: {
    locations: number;
    reviews: number;
    questions: number;
    posts: number;
  };
  percentage: number;
  currentStage?: string;
  estimatedTimeMs?: number | null;
}

interface SyncContextType {
  status: GlobalSyncStatus;
  triggerSync: () => Promise<void>;
  isFirstSync: boolean;
  activeAccountId: string | null;
  rawProgress: SyncProgressState | null;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [isFirstSync, setIsFirstSync] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Get GMB connection status
  const { data: gmbStatus } = useGMBStatus();
  const activeAccounts = gmbStatus?.activeAccount
    ? [gmbStatus.activeAccount]
    : [];

  // Get sync queue status
  const { isSyncing: isQueueSyncing, lastJob } = useSyncStatus(
    userId || undefined,
  );

  // Get real-time sync progress
  const {
    progress: syncProgress,
    startTracking,
    stopTracking,
    etaMs,
  } = useSyncProgress();

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, [supabase]);

  // Set active account ID
  useEffect(() => {
    if (activeAccounts.length > 0 && !activeAccountId) {
      setActiveAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, activeAccountId]);

  // Check if this is first sync
  useEffect(() => {
    const checkFirstSync = async () => {
      if (!userId || !supabase) return;

      try {
        // First check if we already have locations synced (from any previous sync mechanism)
        const { data: existingLocations } = await supabase
          .from("gmb_locations")
          .select("id")
          .eq("user_id", userId)
          .limit(1);

        // If we already have locations, this is NOT a first sync
        if (existingLocations && existingLocations.length > 0) {
          setIsFirstSync(false);
          return;
        }

        // Otherwise check sync_queue for completed jobs
        const { data: completedJobs } = await supabase
          .from("sync_queue")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "completed")
          .limit(1);

        setIsFirstSync(!completedJobs || completedJobs.length === 0);
      } catch (error) {
        console.error("Error checking first sync status:", error);
        // On error, assume not first sync to avoid blocking UI
        setIsFirstSync(false);
      }
    };

    checkFirstSync();
  }, [userId, supabase]);

  // Update last sync time from last job
  useEffect(() => {
    if (lastJob && lastJob.status === "completed") {
      setLastSyncTime(new Date(lastJob.updated_at));
    }
  }, [lastJob]);

  // Start tracking sync progress when sync starts
  useEffect(() => {
    if (isQueueSyncing && activeAccountId && !syncProgress) {
      startTracking({ accountId: activeAccountId, syncId: lastJob?.id });
    } else if (!isQueueSyncing && syncProgress) {
      // Sync finished, stop tracking after a delay
      setTimeout(() => {
        stopTracking();
      }, 2000);
    }
  }, [
    isQueueSyncing,
    activeAccountId,
    syncProgress,
    startTracking,
    stopTracking,
    lastJob,
  ]);

  // Map sync progress to global status
  const mapProgressToStatus = useCallback(
    (progress: SyncProgressState | null): GlobalSyncStatus => {
      const defaultStatus: GlobalSyncStatus = {
        isSyncing: isQueueSyncing,
        lastSync: lastSyncTime,
        error:
          progress?.error || lastJob?.status === "failed"
            ? "Sync failed"
            : null,
        progress: {
          locations: "pending",
          reviews: "pending",
          questions: "pending",
          posts: "pending",
          media: "pending",
        },
        counts: {
          locations: 0,
          reviews: 0,
          questions: 0,
          posts: 0,
        },
        percentage: 0,
        currentStage: undefined,
        estimatedTimeMs: etaMs,
      };

      if (!progress) {
        return defaultStatus;
      }

      // Map stages to progress states
      const progressStates = { ...defaultStatus.progress };
      const stage = progress.stage;
      const status = progress.status;

      // Update based on current stage
      if (stage === "init") {
        // All pending
      } else if (stage === "locations_fetch") {
        progressStates.locations =
          status === "running"
            ? "syncing"
            : status === "completed"
              ? "done"
              : "error";
      } else if (stage === "reviews_fetch") {
        progressStates.locations = "done";
        progressStates.reviews =
          status === "running"
            ? "syncing"
            : status === "completed"
              ? "done"
              : "error";
      } else if (stage === "questions_fetch") {
        progressStates.locations = "done";
        progressStates.reviews = "done";
        progressStates.questions =
          status === "running"
            ? "syncing"
            : status === "completed"
              ? "done"
              : "error";
      } else if (stage === "posts_fetch") {
        progressStates.locations = "done";
        progressStates.reviews = "done";
        progressStates.questions = "done";
        progressStates.posts =
          status === "running"
            ? "syncing"
            : status === "completed"
              ? "done"
              : "error";
      } else if (stage === "media_fetch") {
        progressStates.locations = "done";
        progressStates.reviews = "done";
        progressStates.questions = "done";
        progressStates.posts = "done";
        progressStates.media =
          status === "running"
            ? "syncing"
            : status === "completed"
              ? "done"
              : "error";
      } else if (stage === "transaction" || stage === "cache_refresh") {
        progressStates.locations = "done";
        progressStates.reviews = "done";
        progressStates.questions = "done";
        progressStates.posts = "done";
        progressStates.media = "done";
      } else if (stage === "complete") {
        if (status === "completed") {
          progressStates.locations = "done";
          progressStates.reviews = "done";
          progressStates.questions = "done";
          progressStates.posts = "done";
          progressStates.media = "done";
        } else if (status === "error") {
          // Keep previous states but mark as error if needed
        }
      }

      return {
        isSyncing: isQueueSyncing,
        lastSync: lastSyncTime,
        error: progress.error || null,
        progress: progressStates,
        counts: {
          locations: progress.counts?.locations || 0,
          reviews: progress.counts?.reviews || 0,
          questions: progress.counts?.questions || 0,
          posts: progress.counts?.posts || 0,
        },
        percentage: progress.percentage || 0,
        currentStage: progress.message,
        estimatedTimeMs: etaMs,
      };
    },
    [isQueueSyncing, lastSyncTime, lastJob, etaMs],
  );

  const status = mapProgressToStatus(syncProgress);

  const triggerSync = useCallback(async () => {
    if (!activeAccountId) {
      console.error("No active GMB account found");
      return;
    }

    try {
      // Call the sync API endpoint
      const response = await fetch("/api/gmb/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: activeAccountId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Sync failed");
      }

      const result = await response.json();

      // Start tracking the sync job
      if (result.syncId) {
        startTracking({ accountId: activeAccountId, syncId: result.syncId });
      }
    } catch (error) {
      console.error("Error triggering sync:", error);
      throw error;
    }
  }, [activeAccountId, startTracking]);

  const value: SyncContextType = {
    status,
    triggerSync,
    isFirstSync,
    activeAccountId,
    rawProgress: syncProgress,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within SyncProvider");
  }
  return context;
}
