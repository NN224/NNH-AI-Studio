"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  TrendingUp,
  Calendar,
  Zap,
  MessageSquare,
  Star,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
    healthScore?: number;
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
  profileCompletion = 75,
  streak = 0,
  achievements = [],
}: DashboardHeroProps) {
  const t = useTranslations("home.hero");
  const [currentStatIndex, setCurrentStatIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

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

  // Additional stats for carousel
  const statsCarousel = [
    {
      icon: Calendar,
      label: t("stats.today"),
      value: stats.todayReviews || 0,
      suffix: t("stats.reviews"),
      color: "orange",
      bgColor: "bg-orange-500/20",
      borderColor: "border-orange-500/30",
    },
    {
      icon: TrendingUp,
      label: t("stats.growth"),
      value: `${stats.weeklyGrowth || 0}%`,
      suffix: t("stats.thisWeek"),
      color: "green",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/30",
    },
    {
      icon: MessageSquare,
      label: "Total Reviews",
      value: stats.totalReviews || 0,
      suffix: "all time",
      color: "blue",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/30",
    },
    {
      icon: Star,
      label: "Rating",
      value: stats.averageRating?.toFixed(1) || "0.0",
      suffix: "average",
      color: "yellow",
      bgColor: "bg-yellow-500/20",
      borderColor: "border-yellow-500/30",
    },
    ...(typeof stats.healthScore === "number"
      ? [
          {
            icon: Sparkles,
            label: "Health Score",
            value: `${stats.healthScore}%`,
            suffix: "overall",
            color: "purple",
            bgColor: "bg-purple-500/20",
            borderColor: "border-purple-500/30",
          },
        ]
      : []),
  ];

  // Auto-cycle through stats
  useEffect(() => {
    if (!isHovered) {
      const interval = setInterval(() => {
        setCurrentStatIndex((prev) => (prev + 1) % statsCarousel.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isHovered, statsCarousel.length]);

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

              {/* Right: Profile Completion */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="flex-shrink-0"
              >
                <div className="bg-black/40 backdrop-blur-xl border border-orange-500/20 rounded-2xl p-6 min-w-[280px]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-300">
                      Profile Strength
                    </h3>
                    <Badge
                      variant="outline"
                      className={`
                        ${
                          profileCompletion >= 80
                            ? "border-green-500 text-green-500"
                            : profileCompletion >= 50
                              ? "border-yellow-500 text-yellow-500"
                              : "border-orange-500 text-orange-500"
                        }
                      `}
                    >
                      {profileCompletion}%
                    </Badge>
                  </div>

                  <Progress value={profileCompletion} className="h-2 mb-3" />

                  {profileCompletion < 100 && (
                    <Link href="/settings">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-between hover:bg-orange-500/10 group"
                        aria-label="Complete your profile"
                      >
                        <span className="text-xs">Complete your profile</span>
                        <motion.span
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="text-orange-500"
                        >
                          →
                        </motion.span>
                      </Button>
                    </Link>
                  )}
                  {typeof stats.healthScore === "number" && (
                    <div className="mt-5 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-300">
                          Business Health
                        </p>
                        <Badge
                          variant="outline"
                          className={`${
                            stats.healthScore >= 80
                              ? "border-green-500 text-green-500"
                              : stats.healthScore >= 60
                                ? "border-yellow-500 text-yellow-500"
                                : "border-red-500 text-red-500"
                          }`}
                        >
                          {stats.healthScore >= 80
                            ? "Healthy"
                            : stats.healthScore >= 60
                              ? "Needs attention"
                              : "Critical"}
                        </Badge>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-3xl font-bold text-purple-300">
                          {stats.healthScore}%
                        </p>
                        <span className="text-xs text-muted-foreground">
                          Based on reviews & response metrics
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Bottom Section: Stats Carousel + Achievements */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Stats Carousel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex-1"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className="relative h-[100px] overflow-hidden">
                  <AnimatePresence mode="wait">
                    {statsCarousel.map(
                      (stat, index) =>
                        index === currentStatIndex && (
                          <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ duration: 0.5, type: "spring" }}
                            className="absolute inset-0"
                          >
                            <div
                              className={`h-full ${stat.bgColor} backdrop-blur-xl border ${stat.borderColor} rounded-2xl p-6 flex items-center justify-between`}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`p-3 rounded-xl ${stat.bgColor} backdrop-blur`}
                                >
                                  <stat.icon
                                    className={`h-6 w-6 text-${stat.color}-500`}
                                  />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">
                                    {stat.label}
                                  </p>
                                  <p
                                    className={`text-2xl font-bold text-${stat.color}-500`}
                                  >
                                    {stat.value}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {stat.suffix}
                                  </p>
                                </div>
                              </div>

                              {/* Stat navigation dots */}
                              <div className="flex flex-col gap-1">
                                {statsCarousel.map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setCurrentStatIndex(idx)}
                                    aria-label={`View stat ${idx + 1}`}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                                      idx === currentStatIndex
                                        ? "bg-orange-500 h-6"
                                        : "bg-gray-600 hover:bg-gray-400"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        ),
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Achievements Preview */}
              {achievements.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="flex gap-2"
                >
                  {achievements.slice(0, 3).map((achievement) => (
                    <motion.div
                      key={achievement.id}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30 flex items-center justify-center cursor-pointer"
                      title={achievement.title}
                    >
                      <span className="text-2xl">{achievement.icon}</span>
                    </motion.div>
                  ))}
                  {achievements.length > 3 && (
                    <Link href="/achievements">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="w-16 h-16 rounded-xl bg-black/40 border border-gray-700 flex items-center justify-center cursor-pointer"
                      >
                        <span className="text-sm text-gray-400">
                          +{achievements.length - 3}
                        </span>
                      </motion.div>
                    </Link>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
