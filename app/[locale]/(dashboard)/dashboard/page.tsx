"use client";

import { useEffect } from "react";
import { AIHeroChat } from "@/components/ai-command-center/ai/ai-hero-chat";
import { UrgentItemsFeed } from "@/components/ai-command-center/urgent/urgent-items-feed";
import { ManagementSectionsGrid } from "@/components/ai-command-center/management/management-sections-grid";
import { useTranslations } from "next-intl";
import { Sparkles, RefreshCw, AlertCircle, Activity, Home } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useAICommandCenterData,
  useAIChat,
  useAIActions,
} from "@/hooks/use-ai-command-center";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// AI Command Center is now the main dashboard
export default function DashboardPage() {
  const t = useTranslations("aiCommandCenter");
  const params = useParams();
  const locale = params?.locale || "en";
  const { data, isLoading, error, refetch, isFetching } =
    useAICommandCenterData();
  const { sendMessage } = useAIChat();
  const { processAction } = useAIActions();

  // Prevent unwanted scroll on page load
  useEffect(() => {
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener("scroll", preventScroll, { passive: false });
    window.scrollTo(0, 0);

    return () => {
      window.removeEventListener("scroll", preventScroll);
    };
  }, []);

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <div className="text-center">
          <Activity className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-lg text-white">Loading AI Command Center...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Card className="bg-red-900/20 border-red-500/30 max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">
                {t("error.title", { defaultValue: "Error Loading Data" })}
              </h2>
              <p className="text-gray-400 mb-6">
                {error instanceof Error
                  ? error.message
                  : t("error.description", {
                      defaultValue:
                        "Failed to load AI Command Center. Please try again.",
                    })}
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t("error.retry", { defaultValue: "Retry" })}
                </Button>
                <Link href={`/${locale}/home`}>
                  <Button
                    variant="outline"
                    className="border-gray-500/50 text-white hover:bg-gray-800"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    {t("error.goHome", { defaultValue: "Go to Home" })}
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-x-hidden pb-20">
      {/* Header Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl backdrop-blur">
              <Sparkles className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                {t("title", { defaultValue: "AI Command Center" })}
              </h1>
              <p className="text-sm text-gray-400">
                {t("subtitle", {
                  defaultValue: "Your AI-powered business control hub",
                })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              variant="outline"
              size="sm"
              className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
              />
              {t("refresh", { defaultValue: "Refresh" })}
            </Button>
          </div>
        </div>

        {/* AI Hero Chat Section */}
        <div className="mb-8">
          <AIHeroChat
            onSendMessage={sendMessage}
            suggestions={data?.suggestions || []}
          />
        </div>

        {/* Grid Layout: Urgent Items + Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Urgent Items Feed (left column - takes 4 cols on large screens) */}
          <div className="lg:col-span-4">
            <UrgentItemsFeed
              items={data?.urgentItems || []}
              onActionClick={(action) => {
                processAction(action);
              }}
            />
          </div>

          {/* Management Sections Grid (right column - takes 8 cols on large screens) */}
          <div className="lg:col-span-8">
            <ManagementSectionsGrid
              sections={data?.managementSections || []}
              onNavigate={(path) => {
                window.location.href = `/${locale}${path}`;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
