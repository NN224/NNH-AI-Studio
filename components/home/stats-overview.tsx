"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  MessageSquare,
  Star,
  TrendingUp,
  Play,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Sparkline } from "./mini-chart";

interface Stat {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: number[];
}

interface StatsOverviewProps {
  stats: {
    locations: number;
    reviews: number;
    avgRating: string;
    accounts: number;
    youtubeSubscribers?: number;
  };
  trends?: {
    reviewsTrend?: number[];
  };
}

function AnimatedCounter({
  value,
  duration = 2000,
}: {
  value: number | string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * numValue));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(numValue);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [numValue, duration]);

  if (typeof value === "string" && value.includes("/")) {
    return <span>{value}</span>;
  }

  return <span>{count.toLocaleString()}</span>;
}

export function StatsOverview({ stats, trends }: StatsOverviewProps) {
  const t = useTranslations("home.stats");
  const [isHovered, setIsHovered] = useState<number | null>(null);

  // Calculate growth percentages
  const reviewsGrowth = trends?.reviewsTrend
    ? ((trends.reviewsTrend[trends.reviewsTrend.length - 1] -
        trends.reviewsTrend[0]) /
        (trends.reviewsTrend[0] || 1)) *
      100
    : 0;

  const statsData: Stat[] = [
    {
      label: t("locations"),
      value: stats.locations,
      icon: Building2,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      change: 15, // Mock data
    },
    {
      label: t("reviews"),
      value: stats.reviews,
      icon: MessageSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trend: trends?.reviewsTrend,
      change: Math.round(reviewsGrowth),
    },
    {
      label: t("avgRating"),
      value: `${stats.avgRating}/5.0`,
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      change: 5, // Mock data
    },
    {
      label: t("accounts"),
      value: stats.accounts,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      change: 0, // No change
    },
  ];

  // Add YouTube stats if available
  if (stats.youtubeSubscribers) {
    statsData.push({
      label: t("youtubeSubscribers"),
      value: stats.youtubeSubscribers.toLocaleString(),
      icon: Play,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      change: 8, // Mock data
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {statsData.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
            ease: "easeOut",
          }}
          onMouseEnter={() => setIsHovered(index)}
          onMouseLeave={() => setIsHovered(null)}
        >
          <motion.div
            whileHover={{
              scale: 1.05,
              y: -5,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Card className="border-border/40 bg-gradient-to-br from-zinc-900/50 to-black/50 backdrop-blur-xl group relative overflow-hidden transition-all duration-300 hover:border-orange-500/50">
              {/* Shimmer Effect */}
              <motion.div
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent"
                animate={
                  isHovered === index
                    ? { translateX: "100%" }
                    : { translateX: "-100%" }
                }
                transition={{ duration: 0.7, ease: "easeInOut" }}
              />

              {/* Gradient Overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${
                  isHovered === index
                    ? "from-orange-500/10 to-orange-600/5"
                    : "from-transparent to-transparent"
                } transition-all duration-500`}
              />

              {/* Glow Effect */}
              <div
                className={`absolute -inset-px bg-gradient-to-br from-orange-500/20 to-orange-600/20 blur-lg opacity-0 ${
                  isHovered === index ? "opacity-100" : ""
                } transition-opacity duration-500 -z-10`}
              />

              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {stat.label}
                </CardTitle>
                <motion.div
                  className={`p-2 rounded-lg ${stat.bgColor} relative`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {/* Icon Pulse Effect */}
                  {isHovered === index && (
                    <motion.div
                      className={`absolute inset-0 rounded-lg ${stat.bgColor}`}
                      animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0, 0] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                  )}
                  <stat.icon
                    className={`h-4 w-4 ${stat.color} relative z-10`}
                  />
                </motion.div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <motion.div
                    className="text-2xl font-bold"
                    animate={
                      isHovered === index
                        ? { scale: [1, 1.05, 1] }
                        : { scale: 1 }
                    }
                    transition={{ duration: 0.3 }}
                  >
                    <AnimatedCounter value={stat.value} />
                  </motion.div>
                  {stat.trend && stat.trend.length > 0 && (
                    <motion.div
                      animate={
                        isHovered === index ? { scale: 1.1 } : { scale: 1 }
                      }
                      transition={{ duration: 0.2 }}
                    >
                      <Sparkline
                        data={stat.trend}
                        color={
                          stat.change && stat.change > 0 ? "#10b981" : "#ef4444"
                        }
                      />
                    </motion.div>
                  )}
                </div>
                {stat.change !== undefined && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className={`flex items-center gap-1 text-xs mt-1 ${
                      stat.change > 0
                        ? "text-green-500"
                        : stat.change < 0
                          ? "text-red-500"
                          : "text-gray-500"
                    }`}
                  >
                    {stat.change > 0 ? (
                      <motion.div
                        animate={{ y: [0, -2, 0] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </motion.div>
                    ) : stat.change < 0 ? (
                      <motion.div
                        animate={{ y: [0, 2, 0] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </motion.div>
                    ) : (
                      <span className="w-3 h-3 rounded-full bg-gray-500" />
                    )}
                    <span className="font-semibold">
                      {Math.abs(stat.change)}%
                    </span>
                    <span className="text-muted-foreground ml-1">
                      vs last week
                    </span>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
