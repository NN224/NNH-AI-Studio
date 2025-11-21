"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Sparkles, TrendingUp, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";

interface DashboardHeroProps {
  userName?: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  stats: {
    todayReviews?: number;
    weeklyGrowth?: number;
    lastActivity?: string;
  };
}

export function DashboardHero({
  userName,
  timeOfDay,
  stats,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative"
    >
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-black to-purple-500/10 overflow-hidden">
        {/* Animated glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-purple-500/5 to-orange-500/5 animate-pulse" />

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl" />

        <div className="relative z-10 p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Greeting Section */}
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex items-center gap-3 mb-3"
              >
                <motion.span
                  animate={{ rotate: [0, 14, -8, 14, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-4xl"
                >
                  {getTimeEmoji()}
                </motion.span>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                    {getGreeting()}
                    {userName && `, ${userName}`}!
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("subtitle")}
                  </p>
                </div>
              </motion.div>

              {/* Quick motivational message */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="flex items-center gap-2 text-sm text-gray-400"
              >
                <Sparkles className="h-4 w-4 text-orange-500" />
                <span>{t("motivation")}</span>
              </motion.div>
            </div>

            {/* Quick Stats Summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex gap-4"
            >
              {/* Today's Reviews */}
              {stats.todayReviews !== undefined && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-black/40 backdrop-blur border border-orange-500/20 rounded-xl p-4 min-w-[120px]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <p className="text-xs text-gray-400">{t("stats.today")}</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-500">
                    {stats.todayReviews}
                  </p>
                  <p className="text-xs text-gray-500">{t("stats.reviews")}</p>
                </motion.div>
              )}

              {/* Weekly Growth */}
              {stats.weeklyGrowth !== undefined && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-black/40 backdrop-blur border border-green-500/20 rounded-xl p-4 min-w-[120px]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <p className="text-xs text-gray-400">{t("stats.growth")}</p>
                  </div>
                  <p className="text-2xl font-bold text-green-500">
                    +{stats.weeklyGrowth}%
                  </p>
                  <p className="text-xs text-gray-500">{t("stats.thisWeek")}</p>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
