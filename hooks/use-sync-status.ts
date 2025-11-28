"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SyncJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  sync_type: string;
  created_at: string;
  updated_at: string;
}

interface UseSyncStatusResult {
  isSyncing: boolean;
  lastJob: SyncJob | null;
  error: string | null;
}

/**
 * Hook to monitor GMB sync status
 *
 * CRITICAL FIX: Supabase client created INSIDE useEffect to avoid infinite loops
 * Previous bug: supabase in dependency array caused 1000s of re-renders
 *
 * @param userId - User ID to monitor sync status for
 * @returns Sync status, last job, and any errors
 */
export function useSyncStatus(userId?: string): UseSyncStatusResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastJob, setLastJob] = useState<SyncJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // ✅ CRITICAL FIX: Create Supabase client INSIDE effect
    // This ensures stable reference and prevents infinite loops
    const supabase = createClient();

    const checkSyncStatus = async () => {
      if (!userId || !supabase) return;

      try {
        // Check for any active jobs (pending or processing)
        const { data: activeJobs, error: activeError } = await supabase
          .from("sync_queue")
          .select("*")
          .eq("user_id", userId)
          .in("status", ["pending", "processing"])
          .order("created_at", { ascending: false })
          .limit(1);

        if (activeError) throw activeError;

        if (activeJobs && activeJobs.length > 0) {
          if (mountedRef.current) {
            setIsSyncing(true);
            setLastJob(activeJobs[0]);
          }
        } else {
          // If no active jobs, get the last completed/failed job for reference
          const { data: lastJobs, error: lastError } = await supabase
            .from("sync_queue")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (lastError) throw lastError;

          if (mountedRef.current) {
            setIsSyncing(false);
            setLastJob(lastJobs && lastJobs.length > 0 ? lastJobs[0] : null);
          }
        }
      } catch (err) {
        if (mountedRef.current) {
          console.error("[useSyncStatus] Error checking sync status:", err);
          setError(err instanceof Error ? err.message : "Unknown error");

          // Report to Sentry if available
          if (typeof window !== "undefined" && (window as any).Sentry) {
            (window as any).Sentry.captureException(err, {
              tags: { hook: "useSyncStatus" },
              extra: { userId },
            });
          }
        }
      }
    };

    // Initial check
    checkSyncStatus();

    // Poll every 5 seconds
    const intervalId = setInterval(checkSyncStatus, 5000);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [userId]); // ✅ FIXED: Only userId in dependencies, NOT supabase!

  return { isSyncing, lastJob, error };
}
