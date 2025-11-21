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

    // Get user name from localStorage or API
    const storedUserName = localStorage.getItem("userName");
    if (storedUserName) {
      setUserName(storedUserName);
    } else {
      setUserName("User"); // Fallback
    }
  }, []);

  // Example data - would come from API in real app
  const aiStatus = {
    autoReplyEnabled: false,
    autoAnswerEnabled: false,
    profileOptimizerEnabled: false,
    reviewsAnalyzed: 412,
    avgResponseTime: 45,
    responseRate: 98,
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

  const recentActions = [
    {
      id: "1",
      type: "reply" as const,
      content: 'Replied to "Great service!"',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: "2",
      type: "answer" as const,
      content: 'Answered "Are you open on Sunday?"',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    },
    {
      id: "3",
      type: "suggestion" as const,
      content: "Suggested profile update",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    },
  ];

  const statsData = {
    totalLocations: 1,
    avgRating: 4.2,
    ratingChange: 0.4,
    weeklyReviews: 23,
    weeklyReplies: 12,
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
