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

  const statsData: Stat[] = [
    {
      label: t("locations"),
      value: stats.locations,
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: t("reviews"),
      value: stats.reviews,
      icon: MessageSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trend: trends?.reviewsTrend,
    },
    {
      label: t("avgRating"),
      value: `${stats.avgRating}/5.0`,
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: t("accounts"),
      value: stats.accounts,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
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
        >
          <motion.div
            whileHover={{
              scale: 1.05,
              y: -5,
              boxShadow:
                "0 20px 25px -5px rgba(249, 115, 22, 0.1), 0 10px 10px -5px rgba(249, 115, 22, 0.04)",
            }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="border-border/40 bg-card/50 backdrop-blur group relative overflow-hidden">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {stat.label}
                </CardTitle>
                <motion.div
                  className={`p-2 rounded-lg ${stat.bgColor}`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </motion.div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-bold">
                    <AnimatedCounter value={stat.value} />
                  </div>
                  {stat.trend && stat.trend.length > 0 && (
                    <Sparkline
                      data={stat.trend}
                      color={
                        stat.change && stat.change > 0 ? "#10b981" : "#ef4444"
                      }
                    />
                  )}
                </div>
                {stat.change !== undefined && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className={`flex items-center gap-1 text-xs mt-1 ${stat.change > 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {stat.change > 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    <span>{Math.abs(stat.change)}%</span>
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
