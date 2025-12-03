/**
 * 🎛️ COMMAND CENTER SERVICE
 *
 * الـ orchestrator الرئيسي - يجمع كل شي للـ Command Center
 * - Proactive greeting
 * - Pending approvals
 * - Attention required
 * - Stats
 * - Autopilot status
 */

import { createAdminClient } from "@/lib/supabase/server";
import {
  generateProactiveGreeting,
  type ProactiveGreeting,
} from "./ai-proactive-service";
import {
  getPendingActions,
  getPendingActionsCounts,
  getAttentionRequiredActions,
  type PendingAction,
} from "./pending-actions-service";
import { getBusinessDNA, type BusinessDNA } from "./business-dna-service";

// ============================================
// TYPES
// ============================================

export interface CommandCenterStats {
  rating: number;
  ratingChange: number;
  totalReviews: number;
  newReviewsThisWeek: number;
  responseRate: number;
  growthPercentage: number;
}

export interface AutopilotStatus {
  enabled: boolean;
  autoReplyEnabled: boolean;
  autoRepliedThisWeek: number;
  settings: {
    replyToPositive: boolean;
    replyToNeutral: boolean;
    replyToNegative: boolean;
    requireApproval: boolean;
  };
}

export interface CompetitorAlert {
  id: string;
  competitorName: string;
  alertType: string;
  alertTitle: string;
  alertDetails: any;
  createdAt: Date;
}

export interface CommandCenterData {
  // الترحيب الذكي
  proactiveGreeting: ProactiveGreeting;

  // الأعمال المعلقة
  pendingApprovals: {
    reviewReplies: PendingAction[];
    questionAnswers: PendingAction[];
    posts: PendingAction[];
    totalCount: number;
  };

  // يحتاج انتباه شخصي
  attentionRequired: {
    negativeReviews: PendingAction[];
    competitorAlerts: CompetitorAlert[];
    totalCount: number;
  };

  // الإحصائيات
  stats: CommandCenterStats;

  // حالة الطيار الآلي
  autopilotStatus: AutopilotStatus;

  // Business DNA (for reference)
  businessDNA: BusinessDNA | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get stats for the command center
 */
async function getStats(
  userId: string,
  locationId?: string,
): Promise<CommandCenterStats> {
  const supabase = createAdminClient();

  // Get business DNA for rating
  const dna = await getBusinessDNA(userId, locationId);

  // Get reviews this week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let reviewsQuery = supabase
    .from("gmb_reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("review_date", weekAgo.toISOString());

  if (locationId) {
    reviewsQuery = reviewsQuery.eq("location_id", locationId);
  }

  const { count: newReviewsThisWeek } = await reviewsQuery;

  // Calculate rating change (this month vs last month)
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  let currentQuery = supabase
    .from("gmb_reviews")
    .select("rating")
    .eq("user_id", userId)
    .gte("review_date", monthAgo.toISOString());

  let previousQuery = supabase
    .from("gmb_reviews")
    .select("rating")
    .eq("user_id", userId)
    .gte("review_date", twoMonthsAgo.toISOString())
    .lt("review_date", monthAgo.toISOString());

  if (locationId) {
    currentQuery = currentQuery.eq("location_id", locationId);
    previousQuery = previousQuery.eq("location_id", locationId);
  }

  const [{ data: currentReviews }, { data: previousReviews }] =
    await Promise.all([currentQuery, previousQuery]);

  const currentAvg =
    currentReviews && currentReviews.length > 0
      ? currentReviews.reduce((sum, r) => sum + r.rating, 0) /
        currentReviews.length
      : dna?.averageRating || 0;

  const previousAvg =
    previousReviews && previousReviews.length > 0
      ? previousReviews.reduce((sum, r) => sum + r.rating, 0) /
        previousReviews.length
      : currentAvg;

  const ratingChange = Math.round((currentAvg - previousAvg) * 10) / 10;

  // Calculate growth percentage
  const currentCount = currentReviews?.length || 0;
  const previousCount = previousReviews?.length || 1;
  const growthPercentage = Math.round(
    ((currentCount - previousCount) / previousCount) * 100,
  );

  return {
    rating: dna?.averageRating || 0,
    ratingChange,
    totalReviews: dna?.totalReviews || 0,
    newReviewsThisWeek: newReviewsThisWeek || 0,
    responseRate: dna?.responseRate || 0,
    growthPercentage,
  };
}

/**
 * Get autopilot status
 */
async function getAutopilotStatus(
  userId: string,
  locationId?: string,
): Promise<AutopilotStatus> {
  const supabase = createAdminClient();

  // Get autopilot settings
  let settingsQuery = supabase
    .from("autopilot_settings")
    .select("*")
    .eq("user_id", userId);

  if (locationId) {
    settingsQuery = settingsQuery.eq("location_id", locationId);
  }

  const { data: autopilotSettings } = await settingsQuery.maybeSingle();

  // Get auto_reply_settings too
  let autoReplyQuery = supabase
    .from("auto_reply_settings")
    .select("*")
    .eq("user_id", userId);

  if (locationId) {
    autoReplyQuery = autoReplyQuery.eq("location_id", locationId);
  }

  const { data: autoReplySettings } = await autoReplyQuery.maybeSingle();

  // Count auto-published this week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { count: autoRepliedThisWeek } = await supabase
    .from("pending_ai_actions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "auto_published")
    .gte("published_at", weekAgo.toISOString());

  return {
    enabled: autopilotSettings?.is_enabled || false,
    autoReplyEnabled:
      autoReplySettings?.enabled ||
      autopilotSettings?.auto_reply_enabled ||
      false,
    autoRepliedThisWeek: autoRepliedThisWeek || 0,
    settings: {
      replyToPositive: autoReplySettings?.reply_to_positive ?? true,
      replyToNeutral: autoReplySettings?.reply_to_neutral ?? false,
      replyToNegative: autoReplySettings?.reply_to_negative ?? false,
      requireApproval: autoReplySettings?.require_approval ?? true,
    },
  };
}

/**
 * Get competitor alerts
 */
async function getCompetitorAlerts(
  userId: string,
  locationId?: string,
): Promise<CompetitorAlert[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("competitor_alerts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(5);

  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { data } = await query;

  return (data || []).map((alert) => ({
    id: alert.id,
    competitorName: alert.competitor_name,
    alertType: alert.alert_type,
    alertTitle: alert.alert_title,
    alertDetails: alert.alert_details,
    createdAt: new Date(alert.created_at),
  }));
}

// ============================================
// MAIN EXPORTED FUNCTION
// ============================================

/**
 * Get all data for the Command Center
 */
export async function getCommandCenterData(
  userId: string,
  locationId?: string,
): Promise<CommandCenterData> {
  // Fetch all data in parallel
  const [
    proactiveGreeting,
    reviewReplies,
    questionAnswers,
    posts,
    attentionActions,
    counts,
    stats,
    autopilotStatus,
    competitorAlerts,
    businessDNA,
  ] = await Promise.all([
    // Proactive greeting
    generateProactiveGreeting(userId, locationId),

    // Pending actions by type
    getPendingActions(userId, {
      actionType: "review_reply",
      status: "pending",
      locationId,
    }),
    getPendingActions(userId, {
      actionType: "question_answer",
      status: "pending",
      locationId,
    }),
    getPendingActions(userId, {
      actionType: "post",
      status: "pending",
      locationId,
    }),

    // Actions requiring attention
    getAttentionRequiredActions(userId, locationId),

    // Counts
    getPendingActionsCounts(userId, locationId),

    // Stats
    getStats(userId, locationId),

    // Autopilot
    getAutopilotStatus(userId, locationId),

    // Competitor alerts
    getCompetitorAlerts(userId, locationId),

    // Business DNA
    getBusinessDNA(userId, locationId),
  ]);

  return {
    proactiveGreeting,
    pendingApprovals: {
      reviewReplies,
      questionAnswers,
      posts,
      totalCount: counts.total,
    },
    attentionRequired: {
      negativeReviews: attentionActions,
      competitorAlerts,
      totalCount: attentionActions.length + competitorAlerts.length,
    },
    stats,
    autopilotStatus,
    businessDNA,
  };
}

/**
 * Quick summary for dashboard widget
 */
export async function getCommandCenterSummary(
  userId: string,
  locationId?: string,
): Promise<{
  pendingCount: number;
  attentionCount: number;
  rating: number;
  autopilotEnabled: boolean;
}> {
  const [counts, stats, autopilot, attentionActions, competitorAlerts] =
    await Promise.all([
      getPendingActionsCounts(userId, locationId),
      getStats(userId, locationId),
      getAutopilotStatus(userId, locationId),
      getAttentionRequiredActions(userId, locationId),
      getCompetitorAlerts(userId, locationId),
    ]);

  return {
    pendingCount: counts.total,
    attentionCount: attentionActions.length + competitorAlerts.length,
    rating: stats.rating,
    autopilotEnabled: autopilot.enabled,
  };
}
