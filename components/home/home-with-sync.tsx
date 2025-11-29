"use client";

// Direct imports for better tree-shaking
import { useGuidedTour } from "@/components/onboarding/GuidedTour";
import { useCelebration } from "@/components/onboarding/SuccessCelebration";
import { WelcomeNewUser } from "@/components/onboarding/WelcomeNewUser";
import { SyncBanner } from "@/components/sync/sync-banner";
import { SyncProgressOverlay } from "@/components/sync/sync-progress-overlay";
import { SyncProvider, useSyncContext } from "@/contexts/sync-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
  const router = useRouter();
  const { startSync, state } = useSyncContext();
  const { startTour, TourComponent } = useGuidedTour();
  const { celebrate, CelebrationComponent } = useCelebration();

  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [hasShownSyncCelebration, setHasShownSyncCelebration] = useState(false);

  const isNewUser = searchParams.get("newUser") === "true";
  const accountId = searchParams.get("accountId");

  // Auto-start sync for new users
  useEffect(() => {
    if (isNewUser && accountId && state.status === "idle") {
      startSync(accountId, true);
    }
  }, [isNewUser, accountId, state.status, startSync]);

  // Show welcome screen when sync completes for new users
  useEffect(() => {
    if (isNewUser && state.status === "completed" && !hasShownWelcome) {
      setShowWelcomeScreen(true);
      setHasShownWelcome(true);
    }
  }, [isNewUser, state.status, hasShownWelcome]);

  // Show celebration when sync completes
  useEffect(() => {
    if (
      state.status === "completed" &&
      !hasShownSyncCelebration &&
      !isNewUser
    ) {
      celebrate("sync-complete", {
        title: "Sync Complete!",
        message: `Successfully synced ${state.counts.locations || 0} locations and ${state.counts.reviews || 0} reviews`,
      });
      setHasShownSyncCelebration(true);
    }
  }, [
    state.status,
    state.counts,
    hasShownSyncCelebration,
    isNewUser,
    celebrate,
  ]);

  const handleWelcomeComplete = () => {
    setShowWelcomeScreen(false);
    // Clean up URL params
    const url = new URL(window.location.href);
    url.searchParams.delete("newUser");
    url.searchParams.delete("accountId");
    router.replace(url.pathname);
  };

  return (
    <>
      {/* Sync Banner for returning users */}
      <SyncBanner />

      {/* Full-screen overlay for new users */}
      <SyncProgressOverlay />

      {/* Welcome screen for new users after sync */}
      {showWelcomeScreen && (
        <WelcomeNewUser
          businessName={homePageProps.businessName}
          onComplete={handleWelcomeComplete}
          onStartTour={() => {
            handleWelcomeComplete();
            startTour();
          }}
        />
      )}

      {/* Guided tour */}
      {TourComponent}

      {/* Success celebrations */}
      {CelebrationComponent}

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
