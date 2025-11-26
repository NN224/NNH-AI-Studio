"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SyncProvider, useSyncContext } from "@/contexts/sync-context";
import { SyncBanner, SyncProgressOverlay } from "@/components/sync";
import { HomePageContent } from "./home-page-content";

interface HomeWithSyncProps {
  userId: string;
  homePageProps: React.ComponentProps<typeof HomePageContent>;
}

/**
 * Inner component that uses sync context
 */
function HomeWithSyncInner({
  homePageProps,
}: {
  homePageProps: HomeWithSyncProps["homePageProps"];
}) {
  const searchParams = useSearchParams();
  const { startSync, state } = useSyncContext();

  const isNewUser = searchParams.get("newUser") === "true";
  const accountId = searchParams.get("accountId");

  // Auto-start sync for new users
  useEffect(() => {
    if (isNewUser && accountId && state.status === "idle") {
      startSync(accountId, true);
    }
  }, [isNewUser, accountId, state.status, startSync]);

  return (
    <>
      {/* Sync Banner for returning users */}
      <SyncBanner />

      {/* Full-screen overlay for new users */}
      <SyncProgressOverlay />

      {/* Main content */}
      <HomePageContent {...homePageProps} />
    </>
  );
}

/**
 * Home page wrapper with sync functionality
 */
export function HomeWithSync({ userId, homePageProps }: HomeWithSyncProps) {
  return (
    <SyncProvider userId={userId}>
      <HomeWithSyncInner homePageProps={homePageProps} />
    </SyncProvider>
  );
}
