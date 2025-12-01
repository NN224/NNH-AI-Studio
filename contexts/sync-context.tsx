"use client";

import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { syncLogger } from "@/lib/utils/logger";

// ============================================================================
// Types
// ============================================================================

export type SyncStage =
  | "idle"
  | "queued"
  | "locations"
  | "reviews"
  | "questions"
  | "posts"
  | "media"
  | "performance"
  | "completing"
  | "completed"
  | "error";

export type SyncStatus = "idle" | "syncing" | "completed" | "error";

export interface SyncState {
  status: SyncStatus;
  stage: SyncStage;
  progress: number; // 0-100
  message: string;
  error: string | null;
  accountId: string | null;
  isNewUser: boolean;
  lastSyncAt: string | null;
  counts: {
    locations?: number;
    reviews?: number;
    questions?: number;
    posts?: number;
    media?: number;
  };
}

export interface SyncContextValue {
  state: SyncState;
  startSync: (accountId: string, isNewUser?: boolean) => Promise<void>;
  cancelSync: () => void;
  dismissBanner: () => void;
  isBannerVisible: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const STAGE_PROGRESS: Record<SyncStage, number> = {
  idle: 0,
  queued: 5,
  locations: 20,
  reviews: 40,
  questions: 55,
  posts: 65,
  media: 75,
  performance: 85,
  completing: 95,
  completed: 100,
  error: 0,
};

const STAGE_MESSAGES: Record<SyncStage, string> = {
  idle: "",
  queued: "Starting sync...",
  locations: "Fetching locations...",
  reviews: "Fetching reviews...",
  questions: "Fetching Q&A...",
  posts: "Fetching posts...",
  media: "Fetching media...",
  performance: "Fetching analytics...",
  completing: "Saving data...",
  completed: "Sync completed successfully!",
  error: "Sync failed",
};

const BROADCAST_CHANNEL_NAME = "nnh-sync-channel";

const initialState: SyncState = {
  status: "idle",
  stage: "idle",
  progress: 0,
  message: "",
  error: null,
  accountId: null,
  isNewUser: false,
  lastSyncAt: null,
  counts: {},
};

// ============================================================================
// Context
// ============================================================================

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncContext must be used within SyncProvider");
  }
  return context;
}

// Optional hook that doesn't throw if outside provider
export function useSyncContextSafe() {
  return useContext(SyncContext);
}

// ============================================================================
// Provider
// ============================================================================

interface SyncProviderProps {
  children: ReactNode;
  userId?: string;
}

export function SyncProvider({ children, userId }: SyncProviderProps) {
  const [state, setState] = useState<SyncState>(initialState);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const supabase = createClient();
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const realtimeChannelRef = useRef<ReturnType<
    NonNullable<typeof supabase>["channel"]
  > | null>(null);

  // ============================================================================
  // Helpers
  // ============================================================================

  const invalidateAllQueries = useCallback(() => {
    // Invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: ["gmb"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["locations"] });
    queryClient.invalidateQueries({ queryKey: ["reviews"] });
    queryClient.invalidateQueries({ queryKey: ["questions"] });
    queryClient.invalidateQueries({ queryKey: ["analytics"] });

    // Refresh Server Component data (Phase 3: Auto-refresh)
    router.refresh();
  }, [queryClient, router]);

  // ============================================================================
  // Handlers (defined before useEffects that use them)
  // ============================================================================

  const handleRealtimeUpdate = useCallback(
    (payload: { eventType: string; new: Record<string, unknown> }) => {
      const { eventType, new: newRecord } = payload;

      if (eventType === "INSERT" || eventType === "UPDATE") {
        const status = newRecord.status as string;
        const accountId = (newRecord.account_id as string) || null;
        // sync_queue uses error_message, sync_status uses last_sync_error
        const errorField =
          (newRecord.error_message as string) ||
          (newRecord.last_sync_error as string) ||
          null;

        if (status === "pending" || status === "processing") {
          setState((prev) => ({
            ...prev,
            status: "syncing",
            stage: status === "pending" ? "queued" : "locations",
            progress: status === "pending" ? 5 : 20,
            message:
              status === "pending"
                ? STAGE_MESSAGES.queued
                : STAGE_MESSAGES.locations,
            accountId,
          }));
          setIsBannerVisible(true);

          broadcastChannelRef.current?.postMessage({
            type: "SYNC_STARTED",
            payload: { accountId },
          });
        } else if (status === "succeeded" || status === "completed") {
          setState((prev) => ({
            ...prev,
            status: "completed",
            stage: "completed",
            progress: 100,
            message: STAGE_MESSAGES.completed,
            lastSyncAt: new Date().toISOString(),
          }));
          invalidateAllQueries();
          broadcastChannelRef.current?.postMessage({
            type: "SYNC_COMPLETED",
            payload: { counts: {} },
          });
          setTimeout(() => {
            setIsBannerVisible(false);
            setState(initialState);
          }, 3000);
        } else if (status === "failed") {
          const errorMsg = errorField || "Sync failed";

          // Check if this was a cancellation due to disconnect
          const isCancelled =
            errorMsg.toLowerCase().includes("cancelled") ||
            errorMsg.toLowerCase().includes("disconnected");

          if (isCancelled) {
            // Silently dismiss - user intentionally disconnected
            setIsBannerVisible(false);
            setState(initialState);
          } else {
            // Real error - show error state
            setState((prev) => ({
              ...prev,
              status: "error",
              stage: "error",
              error: errorMsg,
              message: errorMsg,
            }));
            broadcastChannelRef.current?.postMessage({
              type: "SYNC_ERROR",
              payload: { error: errorMsg },
            });
          }
        }
      }
    },
    [invalidateAllQueries],
  );

  const handleSyncStatusUpdate = useCallback(
    (payload: { eventType: string; new: Record<string, unknown> }) => {
      const { eventType, new: newRecord } = payload;

      if (eventType === "INSERT" || eventType === "UPDATE") {
        const status = newRecord.status as string;
        // sync_status uses last_sync_error
        const errorField = (newRecord.last_sync_error as string) || null;

        if (status === "running") {
          setState((prev) => ({
            ...prev,
            status: "syncing",
            stage: "locations",
            progress: 20,
            message: STAGE_MESSAGES.locations,
          }));
          setIsBannerVisible(true);
        } else if (status === "completed") {
          setState((prev) => ({
            ...prev,
            status: "completed",
            stage: "completed",
            progress: 100,
            message: STAGE_MESSAGES.completed,
            lastSyncAt: new Date().toISOString(),
          }));
          invalidateAllQueries();
          setTimeout(() => {
            setIsBannerVisible(false);
            setState(initialState);
          }, 3000);
        } else if (status === "failed") {
          const errorMsg = errorField || "Sync failed";
          setState((prev) => ({
            ...prev,
            status: "error",
            stage: "error",
            error: errorMsg,
            message: errorMsg,
          }));
        }
      }
    },
    [invalidateAllQueries],
  );

  // ============================================================================
  // BroadcastChannel for cross-tab sync
  // ============================================================================

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannelRef.current = bc;

      bc.onmessage = (event) => {
        const { type, payload } = event.data;

        switch (type) {
          case "SYNC_STARTED":
            setState((prev) => ({
              ...prev,
              status: "syncing",
              stage: "queued",
              progress: 5,
              message: STAGE_MESSAGES.queued,
              accountId: payload.accountId,
              isNewUser: false,
            }));
            setIsBannerVisible(true);
            break;

          case "SYNC_PROGRESS":
            setState((prev) => ({
              ...prev,
              stage: payload.stage,
              progress: payload.progress,
              message: payload.message,
              counts: payload.counts || prev.counts,
            }));
            break;

          case "SYNC_COMPLETED":
            setState((prev) => ({
              ...prev,
              status: "completed",
              stage: "completed",
              progress: 100,
              message: STAGE_MESSAGES.completed,
              counts: payload.counts || prev.counts,
              lastSyncAt: new Date().toISOString(),
            }));
            invalidateAllQueries();
            setTimeout(() => {
              setIsBannerVisible(false);
              setState(initialState);
            }, 3000);
            break;

          case "SYNC_ERROR":
            setState((prev) => ({
              ...prev,
              status: "error",
              stage: "error",
              error: payload.error,
              message: payload.error || STAGE_MESSAGES.error,
            }));
            break;

          case "AUTH_EXPIRED":
            // Pause sync immediately on auth expiry
            setState((prev) => ({
              ...prev,
              status: "error",
              stage: "error",
              error: "Authentication expired",
              message: "Session expired. Please reconnect your account.",
            }));
            setIsBannerVisible(false);
            break;
        }
      };
    } catch (error) {
      syncLogger.warn("[SyncContext] BroadcastChannel not supported", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, [invalidateAllQueries]);

  // ============================================================================
  // Supabase Realtime for sync_queue changes
  // ============================================================================

  useEffect(() => {
    if (!userId || !supabase) return;

    const channel = supabase
      .channel(`sync_queue_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sync_queue",
          filter: `user_id=eq.${userId}`,
        },
        handleRealtimeUpdate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sync_status",
          filter: `user_id=eq.${userId}`,
        },
        handleSyncStatusUpdate,
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current && supabase) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [userId, supabase, handleRealtimeUpdate, handleSyncStatusUpdate]);

  // ============================================================================
  // Polling fallback for sync status (in case Realtime fails)
  // ============================================================================

  useEffect(() => {
    if (!userId || !supabase) return;
    if (state.status !== "syncing") return;

    const pollInterval = setInterval(async () => {
      try {
        // Check sync_queue for latest status
        const { data: queueData } = await supabase
          .from("sync_queue")
          .select("status, error_message")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (queueData) {
          if (
            queueData.status === "succeeded" ||
            queueData.status === "completed"
          ) {
            setState((prev) => ({
              ...prev,
              status: "completed",
              stage: "completed",
              progress: 100,
              message: STAGE_MESSAGES.completed,
              lastSyncAt: new Date().toISOString(),
            }));
            invalidateAllQueries();
            setTimeout(() => {
              setIsBannerVisible(false);
              setState(initialState);
            }, 3000);
          } else if (queueData.status === "failed") {
            setState((prev) => ({
              ...prev,
              status: "error",
              stage: "error",
              error: queueData.error_message || "Sync failed",
              message: queueData.error_message || "Sync failed",
            }));
          } else if (queueData.status === "processing") {
            // Simulate progress based on time
            setState((prev) => ({
              ...prev,
              progress: Math.min(prev.progress + 10, 90),
              stage: "reviews",
              message: STAGE_MESSAGES.reviews,
            }));
          }
        }
      } catch (error) {
        syncLogger.warn("[SyncContext] Polling error", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [userId, supabase, state.status, invalidateAllQueries]);

  // ============================================================================
  // Actions
  // ============================================================================

  const startSync = useCallback(
    async (accountId: string, isNewUser = false) => {
      setState({
        status: "syncing",
        stage: "queued",
        progress: 5,
        message: STAGE_MESSAGES.queued,
        error: null,
        accountId,
        isNewUser,
        lastSyncAt: null,
        counts: {},
      });
      setIsBannerVisible(true);

      // Broadcast to other tabs
      broadcastChannelRef.current?.postMessage({
        type: "SYNC_STARTED",
        payload: { accountId },
      });

      try {
        // Enqueue the sync job
        const response = await fetch("/api/gmb/enqueue-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId, syncType: "full" }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to start sync");
        }

        // The realtime subscription will handle the rest
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Failed to start sync";
        setState((prev) => ({
          ...prev,
          status: "error",
          stage: "error",
          error: errorMsg,
          message: errorMsg,
        }));

        broadcastChannelRef.current?.postMessage({
          type: "SYNC_ERROR",
          payload: { error: errorMsg },
        });
      }
    },
    [],
  );

  const cancelSync = useCallback(() => {
    setState(initialState);
    setIsBannerVisible(false);
  }, []);

  const dismissBanner = useCallback(() => {
    setIsBannerVisible(false);
    if (state.status === "completed" || state.status === "error") {
      setState(initialState);
    }
  }, [state.status]);

  // ============================================================================
  // Render
  // ============================================================================

  const value: SyncContextValue = {
    state,
    startSync,
    cancelSync,
    dismissBanner,
    isBannerVisible,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
