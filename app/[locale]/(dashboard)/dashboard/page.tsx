"use client";

import { useEffect, useState } from "react";
import { AIHeroChat } from "@/components/ai-command-center/ai/ai-hero-chat";
import { UrgentItemsFeed } from "@/components/ai-command-center/urgent/urgent-items-feed";
import { ManagementSectionsGrid } from "@/components/ai-command-center/management/management-sections-grid";
import { useTranslations } from "next-intl";
import { Sparkles, RefreshCw, AlertCircle, Activity, Home } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  useAICommandCenterData,
  useAIChat,
  useAIActions,
} from "@/hooks/use-ai-command-center";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  updateAccountSyncSettings,
  getAccountSyncSettings,
} from "@/server/actions/gmb-settings";
import { toast } from "sonner";
import { GMBOnboardingView } from "@/components/ai-command-center/onboarding/gmb-onboarding-view";

// AI Command Center is now the main dashboard
export default function DashboardPage() {
  const t = useTranslations("aiCommandCenter");
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params?.locale || "en";
  const { data, isLoading, error, refetch, isFetching } =
    useAICommandCenterData();
  const { sendMessage } = useAIChat();
  const { processAction } = useAIActions();
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load sync settings when data is available
  useEffect(() => {
    async function loadSettings() {
      if (data?.businessInfo?.accountId) {
        const result = await getAccountSyncSettings(
          data.businessInfo.accountId,
        );
        if (result.success) {
          setAutoSyncEnabled(result.enabled || false);
        }
        setIsLoadingSettings(false);
      }
    }
    if (data?.businessInfo?.accountId) {
      loadSettings();
    }
  }, [data?.businessInfo?.accountId]);

  const handleAutoSyncChange = async (checked: boolean) => {
    if (!data?.businessInfo?.accountId) return;

    setAutoSyncEnabled(checked); // Optimistic update
    const result = await updateAccountSyncSettings(
      data.businessInfo.accountId,
      checked,
    );
    if (result.success) {
      toast.success(checked ? "Auto sync enabled" : "Auto sync disabled");
    } else {
      setAutoSyncEnabled(!checked); // Revert on failure
      toast.error("Failed to update settings");
    }
  };

  // Prevent unwanted scroll on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ✅ Handle OAuth callback states
  useEffect(() => {
    const params = searchParams;

    // CASE 1: Additional account added
    if (params.get("accountAdded") === "true") {
      toast.info("Syncing new account in background...", {
        description:
          "Your new GMB account is being synced. This may take a few moments.",
        duration: 5000,
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("accountAdded");
      url.searchParams.delete("accountId");
      router.replace(url.pathname + url.search);
      refetch();
    }

    // CASE 2: Re-authentication completed
    else if (params.get("reauth") === "true") {
      toast.success("Connection refreshed successfully", {
        description: "Your GMB connection has been updated.",
        duration: 3000,
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("reauth");
      router.replace(url.pathname + url.search);
      refetch();
    }

    // CASE 3: First-time connection (newUser handled by GMBOnboardingView)
    else if (params.get("gmb_connected") === "true") {
      const url = new URL(window.location.href);
      url.searchParams.delete("gmb_connected");
      url.searchParams.delete("accountId");
      router.replace(url.pathname + url.search);
      refetch();
    }
  }, [searchParams, router, refetch]);

  const handleAIAction = async (itemId: string) => {
    try {
      await processAction(itemId, "draft");
      refetch();
    } catch (error) {
      console.error("Failed to process AI action:", error);
      toast.error("Failed to process action. Please try again.");
    }
  };

  const handleAIMessage = async (message: string): Promise<string> => {
    try {
      const response = await sendMessage(message);
      return response;
    } catch (error) {
      console.error("AI chat error:", error);
      throw error;
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-red-500/20 bg-zinc-900/50">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <h2 className="text-xl font-semibold text-zinc-100">
              Failed to load AI Command Center
            </h2>
            <p className="text-sm text-zinc-400 text-center max-w-md">
              {error.message ||
                "An unexpected error occurred. Please try again."}
            </p>
            <Button onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state with skeleton
  if (isLoading || !data) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-orange-500" />
            <h1 className="text-3xl font-bold tracking-tight">
              {t("title", { defaultValue: "AI Command Center" })}
            </h1>
          </div>
          <p className="text-zinc-400">
            {t("subtitle", {
              defaultValue:
                "Your intelligent business assistant - monitoring and optimizing your GMB presence",
            })}
          </p>
        </div>

        <div className="space-y-6">
          <div className="h-[600px] bg-zinc-900/50 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 gap-6">
            <div className="h-64 bg-zinc-900/50 rounded-lg animate-pulse" />
            <div className="h-96 bg-zinc-900/50 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Check if GMB is connected
  const hasGMBConnection =
    data?.businessInfo?.locationId &&
    data?.businessInfo?.name !== "Your Business";

  if (!hasGMBConnection) {
    return <GMBOnboardingView />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {/* Page Title */}
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-orange-500" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t("title", { defaultValue: "AI Command Center" })}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                {t("subtitle", {
                  defaultValue:
                    "Your intelligent business assistant - monitoring and optimizing your GMB presence",
                })}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Back to Home Button */}
            <Link href={`/${locale}/home`}>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-zinc-700 hover:bg-zinc-800"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>

            {/* Auto-refresh Indicator */}
            {isFetching && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Activity className="h-3.5 w-3.5 text-orange-400 animate-pulse" />
                <span className="text-xs text-orange-400 font-medium hidden sm:inline">
                  Syncing...
                </span>
              </div>
            )}

            {/* Sync Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="gap-2 border-orange-500/30 hover:bg-orange-500/10"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Sync</span>
            </Button>

            {/* Auto Sync Toggle */}
            <div className="flex items-center space-x-2 border rounded-md px-3 py-1.5 bg-background/50 border-zinc-700">
              <Switch
                id="auto-sync-dashboard"
                checked={autoSyncEnabled}
                onCheckedChange={handleAutoSyncChange}
                disabled={isLoadingSettings || !data?.businessInfo?.accountId}
              />
              <Label
                htmlFor="auto-sync-dashboard"
                className="text-xs font-medium cursor-pointer text-zinc-300 hidden sm:inline"
              >
                Auto Sync
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* AI Hero Chat Section */}
      <section>
        <AIHeroChat
          businessInfo={data.businessInfo}
          onSendMessage={handleAIMessage}
        />
      </section>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Urgent Items Feed */}
        <section>
          <UrgentItemsFeed
            items={data.urgentItems}
            onAIAction={handleAIAction}
          />
        </section>

        {/* Management Sections - Full Width با قياسات أفضل */}
        <section>
          <ManagementSectionsGrid data={data.managementStats} />
        </section>
      </div>
    </div>
  );
}
