"use client";

import { formatLargeNumber } from "@/components/locations/location-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardSnapshot } from "@/hooks/use-dashboard-cache";
import type { DashboardSnapshot } from "@/types/dashboard";
import { Eye, MapPin, Star, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface StatsData {
  totalLocations: number;
  avgRating: number;
  totalReviews: number;
  avgHealthScore: number;
}

/**
 * Validates that a snapshot has all required nested properties for location stats.
 * This prevents errors from accessing properties on undefined nested objects.
 */
function isValidSnapshotForStats(
  snapshot: DashboardSnapshot | null | undefined,
): snapshot is DashboardSnapshot {
  if (!snapshot) {
    return false;
  }

  // Check for required nested objects
  if (
    !snapshot.locationSummary ||
    typeof snapshot.locationSummary !== "object"
  ) {
    return false;
  }

  if (!snapshot.reviewStats || typeof snapshot.reviewStats !== "object") {
    return false;
  }

  if (
    !snapshot.reviewStats.totals ||
    typeof snapshot.reviewStats.totals !== "object"
  ) {
    return false;
  }

  if (!snapshot.kpis || typeof snapshot.kpis !== "object") {
    return false;
  }

  // Check for required properties
  if (typeof snapshot.locationSummary.totalLocations !== "number") {
    return false;
  }

  return true;
}

export function LocationsStatsCardsAPI({
  refreshKey,
}: { refreshKey?: number } = {}) {
  const { data: snapshot, loading: snapshotLoading } = useDashboardSnapshot();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      // Use snapshot only if it has all required nested properties
      if (isValidSnapshotForStats(snapshot)) {
        setStats({
          totalLocations: snapshot.locationSummary.totalLocations ?? 0,
          avgRating: snapshot.reviewStats.averageRating ?? 0,
          totalReviews: snapshot.reviewStats.totals.total ?? 0,
          avgHealthScore: snapshot.kpis.healthScore ?? 0,
        });
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/locations/stats", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch stats: ${response.status} ${response.statusText} - ${errorText}`,
          );
        }

        const data = await response.json();
        setStats({
          totalLocations: data.totalLocations ?? 0,
          avgRating: data.avgRating ?? 0,
          totalReviews: data.totalReviews ?? 0,
          avgHealthScore: data.avgHealthScore ?? 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
        setStats(null);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [refreshKey, snapshot]);

  const loadingState = loading || snapshotLoading;
  const monthlyComparison = snapshot?.monthlyComparison ?? null;
  const locationsCurrent = stats?.totalLocations ?? 0;
  const locationsPrevious = locationsCurrent; // No historical data yet
  const reviewsCurrent =
    monthlyComparison?.current?.reviews ?? stats?.totalReviews ?? 0;
  const reviewsPrevious =
    monthlyComparison?.previous?.reviews ?? reviewsCurrent;
  const ratingCurrent =
    monthlyComparison?.current?.rating ?? stats?.avgRating ?? 0;
  const ratingPrevious = monthlyComparison?.previous?.rating ?? ratingCurrent;
  const healthScoreValue = stats?.avgHealthScore ?? 0;
  const healthPrevious =
    snapshot?.locationSummary?.profileCompletenessAverage ?? healthScoreValue;
  const locationTrendPct = calculateTrend(locationsCurrent, locationsPrevious);
  const reviewTrendPct = calculateTrend(reviewsCurrent, reviewsPrevious);
  const ratingTrendPct = calculateTrend(ratingCurrent, ratingPrevious);
  const healthTrendPct = calculateTrend(healthScoreValue, healthPrevious);
  const healthBorderClass = getHealthBorderClass(healthScoreValue);

  const statsConfig = [
    {
      label: "Total Locations",
      value: stats?.totalLocations ?? 0,
      icon: MapPin,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      trendPct: locationTrendPct,
      borderClass: "border border-primary/20",
    },
    {
      label: "Average Rating",
      value:
        stats?.avgRating && stats.avgRating > 0
          ? stats.avgRating.toFixed(1)
          : "—",
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      trendPct: ratingTrendPct,
      borderClass: "border border-primary/20",
    },
    {
      label: "Total Reviews",
      value: formatLargeNumber(stats?.totalReviews ?? 0),
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      trendPct: reviewTrendPct,
      borderClass: "border border-primary/20",
    },
    {
      label: "Avg Health Score",
      value:
        stats?.avgHealthScore != null && Number.isFinite(stats.avgHealthScore)
          ? `${Math.round(stats.avgHealthScore)}%`
          : "—",
      icon: Eye,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      trendPct: healthTrendPct,
      borderClass: `border ${healthBorderClass}`,
    },
  ];

  if (loadingState) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="mb-4 h-4 w-3/4 rounded bg-muted" />
              <div className="h-8 w-1/2 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-destructive md:col-span-2 lg:col-span-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="mb-1 text-sm font-semibold text-destructive">
                  Failed to load stats
                </h3>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  window.location.reload();
                }}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className={stat.borderClass}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {renderTrend(stat.trendPct)}
                <span>vs last month</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function renderTrend(trendPct: number | null) {
  if (trendPct == null) {
    return <span className="text-gray-500">—</span>;
  }

  if (trendPct > 0) {
    return <span className="text-green-500">↑ +{Math.round(trendPct)}%</span>;
  }

  if (trendPct < 0) {
    return <span className="text-red-500">↓ {Math.round(trendPct)}%</span>;
  }

  return <span className="text-gray-400">→ 0%</span>;
}

function getHealthBorderClass(score: number) {
  if (score >= 80) return "border-green-500/30";
  if (score >= 60) return "border-yellow-500/30";
  return "border-red-500/30";
}

function calculateTrend(current: number, previous: number) {
  if (!Number.isFinite(current)) {
    return null;
  }

  if (!Number.isFinite(previous) || previous <= 0) {
    return null;
  }

  const delta = current - previous;
  return (delta / Math.abs(previous)) * 100;
}
