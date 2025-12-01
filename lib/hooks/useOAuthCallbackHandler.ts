// lib/hooks/useOAuthCallbackHandler.ts
import { useToast } from "@/hooks/use-toast";
import type { GmbAccount } from "@/lib/types/database"; // تأكد من صحة المسار
import { gmbLogger } from "@/lib/utils/logger";
import { useCallback, useEffect, useState } from "react";

interface OAuthCallbackHandlerProps {
  // Specify Promise<GmbAccount[]> as return type
  fetchAccounts: () => Promise<GmbAccount[]>;
  handleSync: (accountId: string, isAutoSync?: boolean) => Promise<void>;
}

export function useOAuthCallbackHandler({
  fetchAccounts,
  handleSync,
}: OAuthCallbackHandlerProps) {
  const [autoSyncTriggered, setAutoSyncTriggered] = useState(false);
  const { toast } = useToast();

  const handleAutoSync = useCallback(
    async (accountsToSync: GmbAccount[]) => {
      if (!accountsToSync || accountsToSync.length === 0) {
        console.log(
          "[useOAuthCallback] No accounts available for auto-sync check.",
        );
        return;
      }
      // Filter for active accounts again, just in case fetch included inactive ones somehow
      const activeAccounts = accountsToSync.filter((a) => a.is_active === true);
      if (activeAccounts.length === 0) {
        console.log(
          "[useOAuthCallback] No active accounts found for auto-sync.",
        );
        return;
      }

      // accountsToSync should be sorted by created_at desc from fetchAccounts
      const mostRecentAccount = activeAccounts[0];
      if (!mostRecentAccount || !mostRecentAccount.id) {
        gmbLogger.error(
          "Could not determine the most recent active account for auto-sync",
          new Error("No active account found"),
        );
        return;
      }

      console.log(
        "[useOAuthCallback] Auto-triggering sync for:",
        mostRecentAccount.id,
      );

      toast({
        title: "Account Connected!",
        description: "Starting initial data sync...",
      });

      try {
        await handleSync(mostRecentAccount.id, true);
      } catch (syncError) {
        gmbLogger.error(
          "Auto-sync failed",
          syncError instanceof Error ? syncError : new Error(String(syncError)),
        );
        // Toast for sync failure is handled within handleSync
      }
    },
    [handleSync, toast],
  );

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const checkHashAndSync = async () => {
      // Ensure running only in the browser
      if (typeof window === "undefined") return;

      const hash = window.location.hash;
      console.log("[useOAuthCallback] Checking hash on mount:", hash);

      // Avoid processing if already triggered or component unmounted
      if (autoSyncTriggered || !isMounted) return;

      let needsInitialFetch = true; // Flag to track if initial fetch is needed

      if (hash.includes("#success=true")) {
        needsInitialFetch = false; // Fetch will happen within this block
        console.log("[useOAuthCallback] OAuth success detected.");
        setAutoSyncTriggered(true); // Prevent re-triggering immediately

        // Clean the URL hash robustly
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );

        // Check for specific account ID to sync from hash
        const autoSyncMatch = hash.match(/autosync=([^&]+)/);
        const accountIdToSync = autoSyncMatch
          ? decodeURIComponent(autoSyncMatch[1])
          : null;

        if (accountIdToSync) {
          console.log(
            `[useOAuthCallback] Specific account ID found in hash: ${accountIdToSync}. Syncing...`,
          );
          // Fetch accounts first to ensure the list is up-to-date before syncing
          await fetchAccounts();
          if (isMounted) {
            // Check mount status before async operation
            await handleSync(accountIdToSync, true);
          }
        } else {
          console.log(
            "[useOAuthCallback] No specific account ID. Fetching accounts and syncing latest active...",
          );
          // Fetch accounts *after* cleaning hash, then sync latest
          const latestAccounts = await fetchAccounts();
          if (isMounted) {
            // Check mount status before timeout/async op
            // Optional delay can remain if DB propagation is slow, but check mount status
            setTimeout(() => {
              if (isMounted) handleAutoSync(latestAccounts);
            }, 500);
          }
        }
      } else if (hash.includes("#error=")) {
        needsInitialFetch = false; // Fetch happens here too
        console.log("[useOAuthCallback] OAuth error detected in hash.");
        const errorMatch = hash.match(/error=([^&]+)/);
        if (errorMatch) {
          const errorMessage = decodeURIComponent(
            errorMatch[1].replace(/\+/g, " "),
          );
          toast({
            title: "Connection Failed",
            description: errorMessage || "Failed to connect Google account.",
            variant: "destructive",
          });
        }
        // Clean hash and fetch accounts
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
        if (isMounted) await fetchAccounts();
      }

      // Perform initial fetch if no relevant hash was processed
      if (needsInitialFetch && isMounted) {
        console.log(
          "[useOAuthCallback] No relevant hash processed, performing initial fetch.",
        );
        await fetchAccounts();
      }
    };

    checkHashAndSync();

    // Cleanup function to set isMounted to false when component unmounts
    return () => {
      isMounted = false;
      console.log("[useOAuthCallback] Component unmounted.");
    };
    // Dependencies: fetchAccounts and handleAutoSync callbacks ensure stability.
    // autoSyncTriggered prevents re-running logic after initial processing.
  }, [fetchAccounts, handleAutoSync, autoSyncTriggered, toast]); // Added toast as dependency

  // No return value needed as this hook manages effects
}
