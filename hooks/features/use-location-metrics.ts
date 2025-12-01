import { useMemo } from "react";
import { GMBLocation } from "@/lib/types/gmb-types";
import { apiLogger } from "@/lib/utils/logger";

export interface LocationMetrics {
  status: string;
  statusTone: "success" | "warning" | "danger";
  isActive: boolean;
  rating: number | null;
  reviewCount: number;
  responseRate: number | null;
  pendingReviews: number | null;
  pendingQuestions: number | null;
  healthScore: number | null;
  weeklyGrowth: number | null;
  lastSync: string | null;
  insights: {
    views: number;
    viewsTrend: number | null;
    clicks: number;
    clicksTrend: number | null;
    calls: number;
    callsTrend: number | null;
    directions: number;
    directionsTrend: number | null;
    website: number;
    websiteTrend: number | null;
  };
  aiInsights: string[];
}

export function useLocationMetrics(location: GMBLocation) {
  return useMemo(() => {
    // 1. Parse Stats
    // Note: Some stats might be directly on the location object now

    // 2. Parse AI Insights
    let aiInsights: string[] = [];
    try {
      if (location.ai_insights) {
        const rawInsights =
          typeof location.ai_insights === "string"
            ? JSON.parse(location.ai_insights)
            : location.ai_insights;

        if (Array.isArray(rawInsights)) {
          aiInsights = rawInsights
            .map((i) => (typeof i === "string" ? i : i?.message || i?.text))
            .filter(Boolean);
        } else if (
          rawInsights?.insights &&
          Array.isArray(rawInsights.insights)
        ) {
          aiInsights = rawInsights.insights;
        }
      }
    } catch (e) {
      apiLogger.warn("Failed to parse AI insights", {
        error: e instanceof Error ? e.message : String(e),
        locationId: location.id,
      });
    }

    // 3. Calculate Metrics
    const metrics: LocationMetrics = {
      status: location.status || "UNKNOWN",
      statusTone: location.status === "verified" ? "success" : "warning",
      isActive: location.is_active !== false,
      rating: location.rating || null,
      reviewCount: location.review_count || 0,
      responseRate: location.response_rate || null,
      pendingReviews: null,
      pendingQuestions: null,
      healthScore:
        location.health_score || location.profile_completeness || null,
      weeklyGrowth: null,
      lastSync: location.last_synced_at || null,
      insights: {
        views: 0, // To be implemented with real stats
        viewsTrend: null,
        clicks: 0,
        clicksTrend: null,
        calls: 0,
        callsTrend: null,
        directions: 0,
        directionsTrend: null,
        website: 0,
        websiteTrend: null,
      },
      aiInsights: aiInsights.slice(0, 4), // Limit to 4
    };

    return metrics;
  }, [location]);
}
