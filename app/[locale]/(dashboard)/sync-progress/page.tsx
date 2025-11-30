"use client";

import { useSyncContext } from "@/contexts/sync-context";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Sync Progress Page
 *
 * This intermediate page handles the race condition where users are redirected
 * to the dashboard before their GMB data has finished syncing.
 *
 * Flow:
 * 1. OAuth callback redirects here with ?initial=true&accountId=xxx
 * 2. Page polls sync status and shows progress
 * 3. Once locations are ready in DB, redirects to /dashboard
 */

const POLL_INTERVAL = 2000; // 2 seconds
const MAX_WAIT_TIME = 120000; // 2 minutes max wait
const MIN_LOCATIONS_REQUIRED = 1;

type SyncPhase =
  | "checking"
  | "waiting"
  | "syncing"
  | "verifying"
  | "ready"
  | "error"
  | "timeout";

export default function SyncProgressPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params?.locale || "en";

  const isInitial = searchParams.get("initial") === "true";
  const _accountId = searchParams.get("accountId"); // Kept for future use

  const { state: syncState } = useSyncContext();
  const supabase = useMemo(() => createClient(), []);

  const [phase, setPhase] = useState<SyncPhase>("checking");
  const [message, setMessage] = useState("Checking sync status...");
  const [locationsCount, setLocationsCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  // Check if locations exist in DB
  const checkLocationsReady = useCallback(async (): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { count, error } = await supabase
        .from("gmb_locations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) {
        console.error("[SyncProgress] Error checking locations:", error);
        return false;
      }

      const locationCount = count || 0;
      setLocationsCount(locationCount);

      return locationCount >= MIN_LOCATIONS_REQUIRED;
    } catch (err) {
      console.error("[SyncProgress] Error:", err);
      return false;
    }
  }, [supabase]);

  // Main polling logic
  useEffect(() => {
    if (!isInitial) {
      // Not an initial sync, redirect to dashboard
      router.replace(`/${locale}/dashboard`);
      return;
    }

    let pollTimer: NodeJS.Timeout;
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;

      const elapsed = Date.now() - startTime;

      // Timeout check
      if (elapsed > MAX_WAIT_TIME) {
        setPhase("timeout");
        setMessage(
          "Sync is taking longer than expected. You can continue to the dashboard.",
        );
        return;
      }

      // Check sync context state
      if (syncState.status === "error") {
        setPhase("error");
        setError(syncState.error || "Sync failed");
        setMessage("There was an error during sync.");
        return;
      }

      // Check if locations are ready
      const locationsReady = await checkLocationsReady();

      if (locationsReady) {
        setPhase("ready");
        setMessage("Your business data is ready!");

        // Small delay before redirect for UX
        setTimeout(() => {
          if (isMounted) {
            router.replace(`/${locale}/dashboard?synced=true`);
          }
        }, 1500);
        return;
      }

      // Update phase based on sync state
      if (syncState.status === "syncing") {
        setPhase("syncing");
        setMessage(syncState.message || "Syncing your business data...");
      } else if (syncState.status === "completed") {
        setPhase("verifying");
        setMessage("Verifying data...");
      } else {
        setPhase("waiting");
        setMessage("Waiting for sync to start...");
      }

      // Continue polling
      pollTimer = setTimeout(poll, POLL_INTERVAL);
    };

    // Start polling
    poll();

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [isInitial, locale, router, startTime, syncState, checkLocationsReady]);

  const handleContinue = () => {
    router.replace(`/${locale}/dashboard`);
  };

  const handleRetry = () => {
    setPhase("checking");
    setError(null);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="max-w-md w-full">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            {phase === "ready" ? (
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            ) : phase === "error" ? (
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            ) : phase === "timeout" ? (
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-yellow-500" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <h1 className="text-xl font-semibold text-white mb-2">
              {phase === "ready"
                ? "All Set!"
                : phase === "error"
                  ? "Sync Error"
                  : phase === "timeout"
                    ? "Taking Longer Than Expected"
                    : "Setting Up Your Account"}
            </h1>
            <p className="text-zinc-400 text-sm">{message}</p>
          </div>

          {/* Progress indicator */}
          {(phase === "syncing" ||
            phase === "waiting" ||
            phase === "verifying") && (
            <div className="space-y-3">
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-orange-500 to-orange-400 transition-all duration-500"
                  style={{
                    width: `${syncState.progress || 10}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>
                  {locationsCount > 0
                    ? `${locationsCount} location${locationsCount > 1 ? "s" : ""} found`
                    : "Searching for locations..."}
                </span>
                <span>{syncState.progress || 0}%</span>
              </div>
            </div>
          )}

          {/* Error details */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {(phase === "timeout" || phase === "error") && (
              <>
                <button
                  onClick={handleContinue}
                  className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                >
                  Continue to Dashboard
                </button>
                {phase === "error" && (
                  <button
                    onClick={handleRetry}
                    className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                )}
              </>
            )}
          </div>

          {/* Tip */}
          {phase !== "ready" && phase !== "error" && (
            <p className="text-xs text-zinc-600">
              This usually takes less than a minute. Please don&apos;t close
              this page.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
