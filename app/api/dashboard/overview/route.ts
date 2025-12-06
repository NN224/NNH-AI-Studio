import { createClient } from "@/lib/supabase/server";
import { handleApiAuth } from "@/lib/utils/api-response-handler";
import { apiLogger } from "@/lib/utils/logger";
import { getDashboardOverview } from "@/server/services/dashboard.service";
import type { DashboardSnapshot } from "@/types/dashboard";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Default empty snapshot for fallback
 */
function getEmptySnapshot(userId: string): DashboardSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    userId,
    locationSummary: {
      totalLocations: 0,
      activeLocations: 0,
      inactiveLocations: 0,
      lastGlobalSync: null,
      profileCompletenessAverage: null,
      locations: [],
    },
    kpis: {
      healthScore: 0,
      responseRate: 0,
      reviewTrendPct: 0,
      ratingTrendPct: 0,
      totalReviews: 0,
      unansweredQuestions: 0,
      pendingReviews: 0,
      automationActiveCount: 0,
    },
    reviewStats: {
      totals: { total: 0, pending: 0, replied: 0, flagged: 0 },
      byRating: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      bySentiment: { positive: 0, neutral: 0, negative: 0 },
      averageRating: 0,
      responseRate: 0,
      lastSync: null,
      recentHighlights: [],
    },
    postStats: {
      totals: { total: 0, published: 0, drafts: 0, scheduled: 0, failed: 0 },
      byType: { whats_new: 0, event: 0, offer: 0 },
      thisWeek: 0,
      lastSync: null,
      recentPosts: [],
    },
    questionStats: {
      totals: { total: 0, unanswered: 0, answered: 0 },
      byStatus: { pending: 0, answered: 0, hidden: 0 },
      answerRate: 0,
      lastSync: null,
      recentQuestions: [],
    },
    automationStats: {
      totalAutomations: 0,
      activeAutomations: 0,
      pausedAutomations: 0,
      autoReplyEnabled: 0,
      successRatePct: null,
      lastRunAt: null,
      lastSync: null,
      recentLogs: [],
    },
    tasksSummary: {
      weeklyTasksGenerated: false,
      pendingTasks: 0,
      completedTasks: 0,
      lastGeneratedAt: null,
    },
    bottlenecks: [],
  };
}

/**
 * Dashboard Overview API
 * Returns comprehensive dashboard snapshot data with safe fallbacks
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // التحقق من المصادقة
  const authResult = handleApiAuth(user);
  if (!authResult.isAuthorized) {
    return authResult.response;
  }

  try {
    const snapshot = await getDashboardOverview({
      supabase,
      userId: authResult.user.id,
    });
    return NextResponse.json(snapshot);
  } catch (error) {
    apiLogger.error(
      "Error in dashboard/overview",
      error instanceof Error ? error : new Error(String(error)),
      { userId: authResult.user.id },
    );
    // Return empty snapshot in case of error
    return NextResponse.json(getEmptySnapshot(authResult.user.id));
  }
}
