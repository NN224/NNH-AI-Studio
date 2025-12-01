"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { reviewsLogger } from "@/lib/utils/logger";

interface StatsData {
  total?: number;
  pending?: number;
  responded?: number;
  responseRate?: number;
  avgRating?: number;
  totalTrend?: number;
  responseRateTrend?: number;
  ratingTrend?: number;
  totalTrendLabel?: string;
  ratingTrendLabel?: string;
}

export function StatsCards() {
  const [stats, setStats] = useState<StatsData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/reviews/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data);
      } catch (error) {
        reviewsLogger.error(
          "Error fetching stats",
          error instanceof Error ? error : new Error(String(error)),
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      icon: "📈",
      label: "Total Reviews",
      value: stats?.total || 0,
      trend: stats?.totalTrend || 0,
      subtitle: stats?.totalTrendLabel || "+0 this week",
    },
    {
      icon: "⏳",
      label: "Needs Reply",
      value: stats?.pending || 0,
      urgent: (stats?.pending || 0) > 0,
      subtitle: (stats?.pending || 0) > 0 ? "🔴 Urgent!" : "All caught up",
    },
    {
      icon: "✅",
      label: "Response Rate",
      value: `${stats?.responseRate || 0}%`,
      trend: stats?.responseRateTrend || 0,
      subtitle: `${stats?.responded || 0}/${stats?.total || 0} responded`,
    },
    {
      icon: "⭐",
      label: "Average Rating",
      value: stats?.avgRating?.toFixed(1) || "0.0",
      trend: stats?.ratingTrend || 0,
      subtitle: stats?.ratingTrendLabel || "No change",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-6 rounded-xl border bg-zinc-900/50 border-zinc-800 animate-pulse"
          >
            <div className="h-8 bg-zinc-700 rounded mb-3"></div>
            <div className="h-12 bg-zinc-700 rounded mb-2"></div>
            <div className="h-4 bg-zinc-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`
            p-6 rounded-xl border transition-all hover:scale-105 cursor-pointer
            ${
              card.urgent
                ? "bg-red-950/20 border-red-500/50"
                : "bg-zinc-900/50 border-zinc-800 hover:border-orange-500/50"
            }
          `}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-3xl">{card.icon}</span>
            {card.trend !== undefined && card.trend !== 0 && (
              <div
                className={`flex items-center text-xs ${card.trend > 0 ? "text-green-500" : "text-red-500"}`}
              >
                {card.trend > 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                <span className="ml-1">{Math.abs(card.trend)}%</span>
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-white mb-1">{card.value}</div>
          <div className="text-sm text-zinc-400">{card.label}</div>
          <div className="text-xs text-zinc-500 mt-2">{card.subtitle}</div>
        </div>
      ))}
    </div>
  );
}
