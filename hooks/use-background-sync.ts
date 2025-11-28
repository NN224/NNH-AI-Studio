"use client";

import { useSyncContextSafe } from "@/contexts/sync-context";
import { useGMBStatus } from "@/hooks/features/use-gmb";
import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

interface BackgroundSyncOptions {
  /**
   * Sync interval in minutes
   * @default 30
   */
  intervalMinutes?: number;

  /**
   * Whether to sync on mount if last sync is old
   * @default true
   */
  syncOnMount?: boolean;

  /**
   * Show toast notifications for background syncs
   * @default false
   */
  showNotifications?: boolean;

  /**
   * Only sync if user is active (last interaction < 5 minutes ago)
   * @default true
   */
  syncOnlyWhenActive?: boolean;
}

/**
 * Hook for automatic background syncing
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   // Sync every 30 minutes (default)
 *   useBackgroundSync();
 *
 *   // Custom interval: sync every hour
 *   useBackgroundSync({ intervalMinutes: 60 });
 *
 *   // With notifications
 *   useBackgroundSync({
 *     intervalMinutes: 30,
 *     showNotifications: true
 *   });
 * }
 * ```
 */
export function useBackgroundSync(options: BackgroundSyncOptions = {}) {
  const {
    intervalMinutes = 30,
    syncOnMount = true,
    showNotifications = false,
    syncOnlyWhenActive = true,
  } = options;

  const syncContext = useSyncContextSafe();
  const { data: gmbStatus } = useGMBStatus();
  const lastInteractionRef = useRef<number>(Date.now());

  const activeAccountId = gmbStatus?.activeAccount?.id;
  const isSyncing = syncContext?.state.status === "syncing";
  const lastSyncAt = syncContext?.state.lastSyncAt;
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasSyncedOnMount = useRef(false);

  // Track user interactions
  useEffect(() => {
    if (!syncOnlyWhenActive) return;

    const updateLastInteraction = () => {
      lastInteractionRef.current = Date.now();
    };

    // Listen to user interactions
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, updateLastInteraction, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateLastInteraction);
      });
    };
  }, [syncOnlyWhenActive]);

  // Helper: Check if user is active (interacted in last 5 minutes)
  const isUserActive = () => {
    if (!syncOnlyWhenActive) return true;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return lastInteractionRef.current > fiveMinutesAgo;
  };

  // Helper: Check if sync is needed
  const shouldSync = () => {
    // Don't sync if no account or context
    if (!activeAccountId || !syncContext) return false;

    // Don't sync if already syncing
    if (isSyncing) return false;

    // Don't sync if user is inactive
    if (!isUserActive()) return false;

    // If never synced, sync now
    if (!lastSyncAt) return true;

    // Check if last sync was more than intervalMinutes ago
    const minutesSinceLastSync =
      (Date.now() - new Date(lastSyncAt).getTime()) / 1000 / 60;
    return minutesSinceLastSync >= intervalMinutes;
  };

  // Retry counter for error recovery
  const retryCount = useRef(0);

  // Helper: Perform background sync with error recovery
  const performSync = useCallback(async () => {
    if (!shouldSync()) return;

    try {
      if (showNotifications) {
        toast.info("🔄 Updating data in background...", {
          duration: 2000,
        });
      }

      if (activeAccountId && syncContext) {
        await syncContext.startSync(activeAccountId, false);
      }

      // Reset retry count on success
      retryCount.current = 0;

      if (showNotifications) {
        toast.success("✓ Data updated successfully", {
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("[Background Sync] Failed:", error);

      // Track retry attempts
      retryCount.current = retryCount.current + 1;

      if (showNotifications) {
        toast.error("Background sync failed", {
          description: error instanceof Error ? error.message : "Unknown error",
          duration: 3000,
        });
      }

      // Report to error monitoring
      Sentry.captureException(error, {
        tags: { component: "background-sync" },
        extra: { retryCount: retryCount.current },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shouldSync intentionally reads latest values at execution time
  }, [activeAccountId, syncContext, showNotifications]);

  // Sync on mount if needed
  useEffect(() => {
    if (!syncOnMount || hasSyncedOnMount.current) return;

    const checkAndSync = async () => {
      if (shouldSync()) {
        hasSyncedOnMount.current = true;
        await performSync();
      }
    };

    // Delay initial sync by 5 seconds to avoid blocking UI
    const timeout = setTimeout(checkAndSync, 5000);
    return () => clearTimeout(timeout);
  }, [syncOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Async wrapper for periodic sync to properly handle errors
  const runPeriodicSync = useCallback(async () => {
    try {
      await performSync();
    } catch (error) {
      // Errors already handled in performSync, but catch any unexpected ones
      console.error("[Periodic Sync] Unexpected error:", error);
    }
  }, [performSync]);

  // Set up periodic background sync
  useEffect(() => {
    // Clear any existing interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    // Set up new interval - properly await async calls
    syncIntervalRef.current = setInterval(
      () => {
        void runPeriodicSync(); // Use void to explicitly mark fire-and-forget with proper error handling
      },
      intervalMinutes * 60 * 1000,
    );

    // Cleanup on unmount
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [intervalMinutes, runPeriodicSync]);

  // Async wrapper for visibility change sync
  const runSyncOnVisible = useCallback(async () => {
    try {
      if (shouldSync()) {
        await performSync();
      }
    } catch (error) {
      console.error("[Visibility Sync] Error:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shouldSync intentionally reads latest values at execution time
  }, [performSync]);

  // Pause sync when page is hidden, resume when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page hidden - pause interval
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
          syncIntervalRef.current = null;
        }
      } else {
        // Page visible - resume interval and check if sync needed
        if (!syncIntervalRef.current) {
          syncIntervalRef.current = setInterval(
            () => {
              void runPeriodicSync(); // Use void to explicitly mark fire-and-forget with proper error handling
            },
            intervalMinutes * 60 * 1000,
          );

          // Check if sync needed immediately - properly handle async
          void runSyncOnVisible();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMinutes, runPeriodicSync, runSyncOnVisible]);
}

/**
 * Hook for aggressive background syncing (every 10 minutes)
 * Use with caution - may consume API quota quickly
 */
export function useAggressiveBackgroundSync() {
  return useBackgroundSync({
    intervalMinutes: 10,
    syncOnMount: true,
    showNotifications: false,
    syncOnlyWhenActive: true,
  });
}

/**
 * Hook for passive background syncing (every hour)
 * Good for low-traffic pages or when API quota is a concern
 */
export function usePassiveBackgroundSync() {
  return useBackgroundSync({
    intervalMinutes: 60,
    syncOnMount: false,
    showNotifications: false,
    syncOnlyWhenActive: true,
  });
}
