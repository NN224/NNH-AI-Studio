"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
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

  // ✅ IMPROVED: Smart handling for different OAuth states
  useEffect(() => {
    const params = searchParams;

    // CASE 1: Legacy gmb_connected (fallback)
    if (params.get("gmb_connected") === "true") {
      const url = new URL(window.location.href);
      url.searchParams.delete("gmb_connected");
      url.searchParams.delete("accountId");
      router.replace(url.pathname + url.search);
      router.refresh();
    }

    // CASE 2: Additional account added - show background sync notification
    else if (params.get("accountAdded") === "true") {
      toast.info("Syncing new account in background...", {
        description:
          "Your new GMB account is being synced. This may take a few moments.",
        duration: 5000,
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("accountAdded");
      url.searchParams.delete("accountId");
      router.replace(url.pathname + url.search);
      router.refresh();
    }

    // CASE 3: Re-authentication completed
    else if (params.get("reauth") === "true") {
      toast.success("Connection refreshed successfully", {
        description: "Your GMB connection has been updated.",
        duration: 3000,
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("reauth");
      router.replace(url.pathname + url.search);
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
