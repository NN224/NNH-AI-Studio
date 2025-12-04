/**
 * 📊 INSIGHTS SERVICE
 *
 * Service for fetching and managing AI proactive insights.
 * Surfaces data from ai_proactive_insights table.
 */

import { createAdminClient } from "@/lib/supabase/server";

// ============================================
// TYPES
// ============================================

export type InsightType =
  | "problem_detected"
  | "opportunity"
  | "competitor_alert"
  | "positive_trend"
  | "quiet_period"
  | "welcome_back"
  | "milestone"
  | "suggestion"
  | "all_good";

export type InsightPriority = "high" | "medium" | "low";

export interface ProactiveInsight {
  id: string;
  userId: string;
  locationId?: string;
  insightType: InsightType;
  priority: InsightPriority;
  title: string;
  message: string;
  detailedAnalysis?: Record<string, any>;
  suggestedActions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
  isRead: boolean;
  isDismissed: boolean;
  actionTaken?: string;
  validUntil?: Date;
  createdAt: Date;
  readAt?: Date;
}

export interface InsightsFilters {
  type?: InsightType;
  priority?: InsightPriority;
  isRead?: boolean;
  isDismissed?: boolean;
  locationId?: string;
}

export interface InsightsStats {
  total: number;
  unread: number;
  byType: Record<InsightType, number>;
  byPriority: Record<InsightPriority, number>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapRowToInsight(row: any): ProactiveInsight {
  return {
    id: row.id,
    userId: row.user_id,
    locationId: row.location_id,
    insightType: row.insight_type,
    priority: row.priority,
    title: row.title,
    message: row.message,
    detailedAnalysis: row.detailed_analysis,
    suggestedActions: row.suggested_actions,
    isRead: row.is_read,
    isDismissed: row.is_dismissed,
    actionTaken: row.action_taken,
    validUntil: row.valid_until ? new Date(row.valid_until) : undefined,
    createdAt: new Date(row.created_at),
    readAt: row.read_at ? new Date(row.read_at) : undefined,
  };
}

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Get insights for a user with optional filters
 */
export async function getInsights(
  userId: string,
  filters?: InsightsFilters,
): Promise<ProactiveInsight[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("ai_proactive_insights")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Apply filters
  if (filters?.type) {
    query = query.eq("insight_type", filters.type);
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }
  if (filters?.isRead !== undefined) {
    query = query.eq("is_read", filters.isRead);
  }
  if (filters?.isDismissed !== undefined) {
    query = query.eq("is_dismissed", filters.isDismissed);
  }
  if (filters?.locationId) {
    query = query.eq("location_id", filters.locationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching insights:", error);
    return [];
  }

  return (data || []).map(mapRowToInsight);
}

/**
 * Get insights stats for a user
 */
export async function getInsightsStats(
  userId: string,
  locationId?: string,
): Promise<InsightsStats> {
  const supabase = createAdminClient();

  let query = supabase
    .from("ai_proactive_insights")
    .select("insight_type, priority, is_read")
    .eq("user_id", userId);

  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { data } = await query;

  const insights = data || [];

  // Calculate stats
  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  insights.forEach((insight) => {
    byType[insight.insight_type] = (byType[insight.insight_type] || 0) + 1;
    byPriority[insight.priority] = (byPriority[insight.priority] || 0) + 1;
  });

  return {
    total: insights.length,
    unread: insights.filter((i) => !i.is_read).length,
    byType: byType as Record<InsightType, number>,
    byPriority: byPriority as Record<InsightPriority, number>,
  };
}

/**
 * Mark insight as read
 */
export async function markInsightAsRead(
  insightId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("ai_proactive_insights")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", insightId)
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Dismiss insight
 */
export async function dismissInsight(
  insightId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("ai_proactive_insights")
    .update({
      is_dismissed: true,
    })
    .eq("id", insightId)
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Record action taken on insight
 */
export async function recordInsightAction(
  insightId: string,
  userId: string,
  actionTaken: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("ai_proactive_insights")
    .update({
      action_taken: actionTaken,
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", insightId)
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete old insights (cleanup utility)
 */
export async function deleteOldInsights(
  userId: string,
  olderThanDays: number = 30,
): Promise<{ success: boolean; deleted: number }> {
  const supabase = createAdminClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { data, error } = await supabase
    .from("ai_proactive_insights")
    .delete()
    .eq("user_id", userId)
    .lt("created_at", cutoffDate.toISOString())
    .select();

  if (error) {
    return { success: false, deleted: 0 };
  }

  return { success: true, deleted: data?.length || 0 };
}
