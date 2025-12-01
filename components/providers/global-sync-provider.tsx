"use client";

import { SyncBanner } from "@/components/sync/sync-banner";
import { SyncProgressOverlay } from "@/components/sync/sync-progress-overlay";
import { SyncProvider } from "@/contexts/sync-context";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { syncLogger } from "@/lib/utils/logger";

interface GlobalSyncProviderProps {
  children: ReactNode;
}

/**
 * Global Sync Provider
 *
 * This component wraps the entire application with SyncProvider,
 * ensuring sync state persists across route navigations (e.g., /home ↔ /dashboard).
 *
 * It automatically fetches the current user ID and provides it to SyncProvider.
 * The SyncBanner and SyncProgressOverlay are rendered globally so they persist
 * regardless of which page the user is on.
 */
export function GlobalSyncProvider({ children }: GlobalSyncProviderProps) {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!supabase) return;

    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUserId(user?.id);
      } catch (error) {
        syncLogger.error(
          "[GlobalSyncProvider] Failed to fetch user",
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    };

    fetchUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Don't block rendering while loading - SyncProvider handles undefined userId gracefully
  return (
    <SyncProvider userId={userId}>
      {/* Global Sync UI - renders on all pages */}
      <SyncBanner />
      <SyncProgressOverlay />
      {children}
    </SyncProvider>
  );
}
