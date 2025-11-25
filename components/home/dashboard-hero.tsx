"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Sparkles, TrendingUp, Zap, MessageSquare, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
// Link removed - achievements section removed
import { useState, useEffect } from "react";

interface DashboardHeroProps {
  userName?: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  stats: {
    todayReviews?: number;
    weeklyGrowth?: number;
    lastActivity?: string;
    totalReviews?: number;
    responseRate?: number;
    averageRating?: number;
  };
  profileCompletion?: number;
  streak?: number;
  achievements?: Array<{
    id: string;
    icon: string;
    title: string;
  }>;
}

export function DashboardHero({
  userName,
  timeOfDay,
  stats,
  // profileCompletion removed - using ProgressTracker instead
  streak = 0,
  // achievements removed - cleaner UI
}: DashboardHeroProps) {
  const t = useTranslations("home.hero");

  const getGreeting = () => {
    const greetings = {
      morning: t("greeting.morning"),
      afternoon: t("greeting.afternoon"),
      evening: t("greeting.evening"),
      night: t("greeting.night"),
    };
    return greetings[timeOfDay] || greetings.morning;
  };

  const getTimeEmoji = () => {
    const emojis = {
      morning: "☀️",
      afternoon: "🌤️",
      evening: "🌅",
      night: "🌙",
    };
    return emojis[timeOfDay] || "👋";
  };

  const motivationalMessages = [
    "You're doing great! Keep up the excellent work.",
    "Every review reply builds trust with customers.",
    "Your business is growing stronger every day!",
    "Keep pushing forward - success is within reach!",
  ];

  // Avoid Math.random() during SSR to prevent hydration mismatches.
  // Start with a stable default, then randomize on the client after mount.
  const [motivationIndex, setMotivationIndex] = useState(0);

  useEffect(() => {
    setMotivationIndex(Math.floor(Math.random() * motivationalMessages.length));
  }, [motivationalMessages.length]);

  const randomMotivation = motivationalMessages[motivationIndex];

  return (
    <motion.div
      className="dashboard-hero relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-900/20 via-orange-800/10 to-yellow-900/10 overflow-hidden backdrop-blur-xl">
        {/* Animated background layers */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-purple-500/5 to-orange-500/5"
          animate={{
            opacity: [0.5, 0.8, 0.5],
            x: [-100, 100, -100],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Floating orbs */}
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -30, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col gap-6">
            {/* Top Section: Greeting + Profile Progress */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left: Greeting Section */}
              <div className="flex-1 max-w-2xl">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="flex items-start gap-4"
                >
                  <motion.span
                    animate={{ rotate: [0, 14, -8, 14, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                    className="text-5xl flex-shrink-0"
                  >
                    {getTimeEmoji()}
                  </motion.span>
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                      <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                        {getGreeting()}
                      </span>
                      {userName && (
                        <span className="text-white">, {userName}!</span>
                      )}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">
                      {t("subtitle")}
                    </p>

                    {/* Motivation with icon animation */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="flex items-center gap-2 mt-4"
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          rotate: [0, 360, 360],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 3,
                        }}
                      >
                        <Sparkles className="h-4 w-4 text-orange-500" />
                      </motion.div>
                      <span className="text-sm text-gray-400">
                        {randomMotivation}
                      </span>
                    </motion.div>

                    {/* Streak indicator */}
                    {streak > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, type: "spring" }}
                        className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30"
                      >
                        <Zap className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-orange-400">
                          {streak} day streak!
                        </span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* AI Tip - Smart actionable insight */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-2"
            >
              <AITip stats={stats} />
            </motion.div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// AI Tip Component - Shows smart actionable insights
function AITip({ stats }: { stats: DashboardHeroProps["stats"] }) {
  // Determine the best tip based on stats
  const getTip = () => {
    if ((stats.responseRate || 0) < 80) {
      return {
        icon: MessageSquare,
        text: "Improve your response rate! Reply to pending reviews.",
        action: "/reviews?filter=pending",
        actionText: "Reply Now",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        hoverColor: "hover:bg-blue-500/20",
        textColor: "text-blue-500",
      };
    }
    if ((stats.weeklyGrowth || 0) > 0) {
      return {
        icon: TrendingUp,
        text: `Great job! Your reviews grew ${stats.weeklyGrowth}% this week.`,
        action: "/analytics",
        actionText: "View Analytics",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/20",
        hoverColor: "hover:bg-green-500/20",
        textColor: "text-green-500",
      };
    }
    if ((stats.averageRating || 0) >= 4.5) {
      return {
        icon: Star,
        text: `Excellent ${stats.averageRating?.toFixed(1)} rating! Keep up the great work.`,
        action: "/reviews",
        actionText: "See Reviews",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/20",
        hoverColor: "hover:bg-yellow-500/20",
        textColor: "text-yellow-500",
      };
    }
    return {
      icon: Sparkles,
      text: "Check your dashboard for new insights.",
      action: "/dashboard",
      actionText: "Explore",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      hoverColor: "hover:bg-orange-500/20",
      textColor: "text-orange-500",
    };
  };

  const tip = getTip();
  const Icon = tip.icon;

  return (
    <a
      href={tip.action}
      className={`flex items-center gap-3 p-3 rounded-xl ${tip.bgColor} border ${tip.borderColor} ${tip.hoverColor} transition-colors group`}
    >
      <div className={`p-2 rounded-lg ${tip.bgColor}`}>
        <Icon className={`h-4 w-4 ${tip.textColor}`} />
      </div>
      <span className="flex-1 text-sm text-gray-300">{tip.text}</span>
      <span
        className={`text-xs font-medium ${tip.textColor} group-hover:underline`}
      >
        {tip.actionText} →
      </span>
    </a>
  );
}
