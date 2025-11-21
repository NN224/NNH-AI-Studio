"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RealtimeStatsOptions {
  refreshInterval?: number;
  enableWebSocket?: boolean;
  onUpdate?: (data: any) => void;
}

interface StatsData {
  reviews: {
    total: number;
    today: number;
    week: number;
    month: number;
    pending: number;
    averageRating: number;
    ratingDistribution: Record<string, number>;
  };
  responses: {
    total: number;
    averageTime: number;
    responseRate: number;
    autoReplies: number;
  };
  performance: {
    views: number;
    clicks: number;
    conversions: number;
    growth: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  realtime: {
    activeUsers: number;
    recentActivity: Array<{
      id: string;
      type: string;
      timestamp: Date;
      data: any;
    }>;
  };
}

export function useRealtimeStats(
  userId: string,
  options: RealtimeStatsOptions = {},
) {
  const {
    refreshInterval = 30000, // 30 seconds
    enableWebSocket = true,
    onUpdate,
  } = options;

  const { toast } = useToast();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch stats from API
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/stats/realtime?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch stats");

      const data = await response.json();
      setStats(data);
      setLastUpdate(new Date());
      setError(null);

      if (onUpdate) onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setIsLoading(false);
    }
  }, [userId, onUpdate]);

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    if (!enableWebSocket) return;

    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase.channel(`stats:${userId}`);

    // Subscribe to review changes
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gmb_reviews",
          filter: `account_id=in.(select id from gmb_accounts where user_id=eq.${userId})`,
        },
        (payload) => {
          console.log("Review change:", payload);

          // Update stats immediately
          if (stats) {
            const updatedStats = { ...stats };

            if (payload.eventType === "INSERT") {
              updatedStats.reviews.total += 1;
              updatedStats.reviews.today += 1;
              updatedStats.reviews.pending += 1;

              // Show notification
              toast({
                title: "New Review!",
                description: "A new review has been posted for your business.",
              });
            }

            setStats(updatedStats);
            setLastUpdate(new Date());
            if (onUpdate) onUpdate(updatedStats);
          }

          // Fetch fresh data
          fetchStats();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "auto_reply_logs",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Auto-reply change:", payload);

          if (payload.eventType === "INSERT") {
            // Update auto-reply count
            if (stats) {
              const updatedStats = { ...stats };
              updatedStats.responses.autoReplies += 1;
              setStats(updatedStats);
              if (onUpdate) onUpdate(updatedStats);
            }
          }
        },
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, enableWebSocket, stats, onUpdate, fetchStats, toast]);

  // Periodic refresh
  useEffect(() => {
    fetchStats();

    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStats, refreshInterval]);

  // Calculate derived metrics
  const getMetrics = useCallback(() => {
    if (!stats) return null;

    return {
      reviewsToday: stats.reviews.today,
      reviewsGrowth: calculateGrowth(stats.reviews.week, stats.reviews.month),
      responseTime: formatResponseTime(stats.responses.averageTime),
      responseRate: `${Math.round(stats.responses.responseRate)}%`,
      pendingActions: stats.reviews.pending,
      overallHealth: calculateHealthScore(stats),
      topMetric: getTopMetric(stats),
      alerts: generateAlerts(stats),
    };
  }, [stats]);

  // Generate real-time alerts
  const generateAlerts = (data: StatsData) => {
    const alerts = [];

    if (data.reviews.pending > 5) {
      alerts.push({
        type: "warning",
        message: `You have ${data.reviews.pending} reviews waiting for responses`,
        action: "/reviews?filter=pending",
      });
    }

    if (data.responses.responseRate < 70) {
      alerts.push({
        type: "error",
        message: "Your response rate is below 70%",
        action: "/settings/auto-pilot",
      });
    }

    if (data.performance.growth.daily > 20) {
      alerts.push({
        type: "success",
        message: "Great job! Your daily growth is up 20%+",
      });
    }

    return alerts;
  };

  return {
    stats,
    metrics: getMetrics(),
    isLoading,
    error,
    lastUpdate,
    isConnected,
    refresh: fetchStats,
  };
}

// Helper functions
function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

function calculateHealthScore(stats: StatsData): number {
  // Calculate overall health score based on multiple metrics
  let score = 0;

  // Response rate (40% weight)
  score += (stats.responses.responseRate / 100) * 40;

  // Average rating (30% weight)
  score += (stats.reviews.averageRating / 5) * 30;

  // Growth (20% weight)
  const growthScore = Math.min(stats.performance.growth.weekly / 10, 1) * 20;
  score += growthScore;

  // Pending reviews (10% weight - lower is better)
  const pendingScore = Math.max(0, 1 - stats.reviews.pending / 10) * 10;
  score += pendingScore;

  return Math.round(score);
}

function getTopMetric(stats: StatsData): {
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
} {
  // Determine the most impressive metric to highlight
  const metrics = [
    {
      label: "Weekly Growth",
      value: `+${stats.performance.growth.weekly}%`,
      score: stats.performance.growth.weekly,
      trend: "up" as "up" | "down" | "stable",
    },
    {
      label: "Response Rate",
      value: `${Math.round(stats.responses.responseRate)}%`,
      score: stats.responses.responseRate,
      trend: (stats.responses.responseRate > 80 ? "up" : "down") as
        | "up"
        | "down"
        | "stable",
    },
    {
      label: "Average Rating",
      value: stats.reviews.averageRating.toFixed(1),
      score: stats.reviews.averageRating * 20,
      trend: (stats.reviews.averageRating > 4.5 ? "up" : "stable") as
        | "up"
        | "down"
        | "stable",
    },
  ];

  return metrics.reduce((best, current) =>
    current.score > best.score ? current : best,
  );
}
