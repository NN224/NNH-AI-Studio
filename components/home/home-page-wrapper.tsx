"use client";

import { Suspense, useState } from "react";
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
