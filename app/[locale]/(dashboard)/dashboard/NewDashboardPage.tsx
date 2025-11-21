"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AIStatusCard } from "@/components/dashboard/ai-status-card";
import { NextStepsCard } from "@/components/dashboard/next-steps-card";
import { RecentAIActionsCard } from "@/components/dashboard/recent-ai-actions-card";
import { KeyStatsGrid } from "@/components/dashboard/key-stats-grid";

export default function NewDashboardPage() {
  const t = useTranslations("dashboard");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // Get time of day
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay("morning");
    else if (hour < 18) setTimeOfDay("afternoon");
    else setTimeOfDay("evening");

    // Get user name from Supabase
    const getUserName = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const name =
          user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
        setUserName(name);
        localStorage.setItem("userName", name);
      }
    };

    getUserName();
  }, []);

  // TODO: Replace with real API data
  // For now, using placeholder data that makes sense for BETA
  const aiStatus = {
    autoReplyEnabled: false, // User needs to enable
    autoAnswerEnabled: false, // User needs to enable
    profileOptimizerEnabled: false, // User needs to enable
    reviewsAnalyzed: 0, // No data yet (new user)
    avgResponseTime: 0, // No data yet
    responseRate: 0, // No data yet
  };

  const nextSteps = [
    {
      id: "1",
      icon: "zap" as const,
      titleKey: "enableAutoReply",
      href: "/settings/auto-pilot",
      priority: "high" as const,
    },
    {
      id: "2",
      icon: "check" as const,
      titleKey: "replyToPending",
      href: "/reviews",
      priority: "medium" as const,
    },
    {
      id: "3",
      icon: "video" as const,
      titleKey: "connectYouTube",
      href: "/youtube-dashboard",
      priority: "low" as const,
    },
  ];

  // Empty initially - will show "No AI actions yet" message
  const recentActions: Array<{
    id: string;
    type: "reply" | "answer" | "suggestion";
    content: string;
    timestamp: Date;
  }> = [];

  const statsData = {
    totalLocations: 1,
    avgRating: 0, // No reviews yet
    ratingChange: 0,
    weeklyReviews: 0,
    weeklyReplies: 0,
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-1"
      >
        <h1 className="text-3xl font-bold">
          Good {timeOfDay}, {userName}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Last login: {new Date().toLocaleTimeString()}
        </p>
      </motion.div>

      {/* AI Status Card */}
      <AIStatusCard {...aiStatus} />

      {/* Key Stats Grid */}
      <KeyStatsGrid {...statsData} />

      {/* Next Steps Card */}
      <NextStepsCard steps={nextSteps} />

      {/* Recent AI Actions Card */}
      <RecentAIActionsCard actions={recentActions} />
    </div>
  );
}
