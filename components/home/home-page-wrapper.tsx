"use client";

import { GMBRequiredAlert } from "@/components/gmb/GMBRequiredAlert";
import { useGMBStatus } from "@/hooks/features/use-gmb";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";
import { HomePageContent } from "./home-page-content";

interface HomePageWrapperProps {
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  homePageProps: any;
}

function HomePageInner({ homePageProps }: HomePageWrapperProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Set GMB cookie for middleware
  const { data: gmbStatus, isLoading: gmbLoading } = useGMBStatus();
  const gmbConnected = gmbStatus?.connected || gmbStatus?.hasLocations || false;

  useEffect(() => {
    if (!gmbLoading && gmbStatus !== undefined) {
      const cookieValue = gmbConnected ? "true" : "false";
      document.cookie = `gmb_connected=${cookieValue}; path=/; max-age=3600; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

      const intended = searchParams.get("intended");
      if (intended && gmbConnected) {
        router.push(intended);
      }
    }
  }, [gmbConnected, gmbLoading, gmbStatus, searchParams, router]);

  // Handle OAuth callback params
  useEffect(() => {
    const params = searchParams;

    if (params.get("gmb_connected") === "true") {
      const url = new URL(window.location.href);
      url.searchParams.delete("gmb_connected");
      url.searchParams.delete("accountId");
      router.replace(url.pathname + url.search);
      router.refresh();
    } else if (params.get("accountAdded") === "true") {
      toast.info("Syncing new account in background...", {
        description: "Your new GMB account is being synced.",
        duration: 5000,
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("accountAdded");
      url.searchParams.delete("accountId");
      router.replace(url.pathname + url.search);
      router.refresh();
    } else if (
      params.get("reauth") === "true" ||
      params.get("reconnected") === "true"
    ) {
      toast.success("Connection refreshed successfully! ✨", {
        description: "Your Google Business account is now reconnected.",
        duration: 4000,
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("reauth");
      url.searchParams.delete("reconnected");
      url.searchParams.delete("accountId");
      router.replace(url.pathname + url.search);
      router.refresh();
    } else if (params.get("newUser") === "true") {
      toast.success("Welcome to NNH AI Studio! 🎉", {
        description: "Your locations are syncing. This may take a few minutes.",
        duration: 6000,
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("newUser");
      router.replace(url.pathname + url.search);
      router.refresh();
    }
  }, [searchParams, router]);

  return (
    <>
      <GMBRequiredAlert />
      <HomePageContent {...homePageProps} />
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function HomePageWrapper({
  userId,
  homePageProps,
}: HomePageWrapperProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomePageInner userId={userId} homePageProps={homePageProps} />
    </Suspense>
  );
}
