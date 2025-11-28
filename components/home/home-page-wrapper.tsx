"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FirstSyncOverlay } from "./first-sync-overlay";
import { HomeWithSync } from "./home-with-sync";

interface HomePageWrapperProps {
  userId: string;
  homePageProps: any; // Use the same type as HomeWithSync props
}

function HomePageContent({ userId, homePageProps }: HomePageWrapperProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showOverlay, setShowOverlay] = useState(() => {
    return (
      searchParams.get("newUser") === "true" && !!searchParams.get("accountId")
    );
  });

  const accountId = searchParams.get("accountId");

  // ✅ CRITICAL FIX: Refresh page after GMB OAuth connection
  // This ensures server-side data is refetched with new account
  useEffect(() => {
    if (searchParams.get("gmb_connected") === "true") {
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("gmb_connected");
      url.searchParams.delete("accountId");
      router.replace(url.pathname + url.search);

      // Force refresh to get updated data
      router.refresh();
    }
  }, [searchParams, router]);

  const handleSyncComplete = () => {
    setShowOverlay(false);
    // Refresh the page to load new data
    router.refresh();
  };

  const handleSyncError = () => {
    setShowOverlay(false);
    // Optionally show an error message
    console.error("Sync failed, but continuing...");
  };

  return (
    <>
      {showOverlay && accountId && (
        <FirstSyncOverlay
          accountId={accountId}
          userId={userId}
          onComplete={handleSyncComplete}
          onError={handleSyncError}
        />
      )}
      <HomeWithSync userId={userId} homePageProps={homePageProps} />
    </>
  );
}

export function HomePageWrapper({
  userId,
  homePageProps,
}: HomePageWrapperProps) {
  return (
    <Suspense
      fallback={<HomeWithSync userId={userId} homePageProps={homePageProps} />}
    >
      <HomePageContent userId={userId} homePageProps={homePageProps} />
    </Suspense>
  );
}
