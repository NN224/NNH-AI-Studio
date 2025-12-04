/**
 * 🏆 COMPETITOR MONITORING SERVICE
 *
 * Tracks competitor performance and generates alerts
 * for competitive intelligence.
 *
 * Key Capabilities:
 * - Track competitor ratings over time
 * - Monitor competitor review volume
 * - Detect competitor promotions/offers
 * - Compare performance metrics
 * - Alert on significant changes
 */

import { createAdminClient } from "@/lib/supabase/server";

// ============================================
// TYPES
// ============================================

export interface CompetitorData {
  id: string;
  name: string;
  placeId: string;
  rating: number;
  totalReviews: number;
  lastChecked: Date;
}

export interface CompetitorAlert {
  competitorId: string;
  competitorName: string;
  alertType:
    | "rating_increase"
    | "review_surge"
    | "promotion_detected"
    | "quality_improvement";
  severity: "high" | "medium" | "low";
  title: string;
  message: string;
  data: {
    currentRating?: number;
    previousRating?: number;
    currentReviews?: number;
    previousReviews?: number;
    changePercentage?: number;
  };
  suggestedActions: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
}

export interface PerformanceComparison {
  myBusiness: {
    rating: number;
    totalReviews: number;
    recentReviews: number;
  };
  competitors: Array<{
    name: string;
    rating: number;
    totalReviews: number;
    recentReviews: number;
    trend: "improving" | "declining" | "stable";
  }>;
  insights: string[];
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Monitor all competitors for a user's location
 */
export async function monitorCompetitors(
  userId: string,
  locationId?: string,
): Promise<CompetitorAlert[]> {
  const supabase = createAdminClient();
  const alerts: CompetitorAlert[] = [];

  try {
    // Get user's competitors
    let query = supabase
      .from("competitor_tracking")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data: competitors } = await query;

    if (!competitors || competitors.length === 0) {
      return alerts;
    }

    // Check each competitor for changes
    for (const competitor of competitors) {
      const competitorAlerts = await checkCompetitorChanges(competitor);
      alerts.push(...competitorAlerts);
    }

    // Save alerts to database
    if (alerts.length > 0) {
      for (const alert of alerts) {
        await supabase.from("competitor_alerts").insert({
          user_id: userId,
          location_id: locationId,
          competitor_id: alert.competitorId,
          alert_type: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          alert_data: alert.data,
          suggested_actions: alert.suggestedActions,
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error("Error monitoring competitors:", error);
    return [];
  }
}

/**
 * Compare performance with competitors
 */
export async function compareWithCompetitors(
  userId: string,
  locationId?: string,
): Promise<PerformanceComparison | null> {
  const supabase = createAdminClient();

  try {
    // Get user's business data
    const { data: businessDna } = await supabase
      .from("business_dna")
      .select("total_reviews, average_rating")
      .eq("user_id", userId)
      .maybeSingle();

    if (!businessDna) return null;

    // Get recent reviews count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: recentReviews } = await supabase
      .from("gmb_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("create_time", thirtyDaysAgo.toISOString());

    // Get competitors data
    let competitorsQuery = supabase
      .from("competitor_tracking")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (locationId) {
      competitorsQuery = competitorsQuery.eq("location_id", locationId);
    }

    const { data: competitors } = await competitorsQuery;

    const competitorsData =
      competitors?.map((comp) => ({
        name: comp.competitor_name,
        rating: comp.current_rating || 0,
        totalReviews: comp.total_reviews || 0,
        recentReviews: comp.recent_reviews_count || 0,
        trend: determineTrend(comp.current_rating, comp.previous_rating),
      })) || [];

    // Generate insights
    const insights = generateComparisonInsights(
      {
        rating: businessDna.average_rating,
        totalReviews: businessDna.total_reviews,
        recentReviews: recentReviews || 0,
      },
      competitorsData,
    );

    return {
      myBusiness: {
        rating: businessDna.average_rating,
        totalReviews: businessDna.total_reviews,
        recentReviews: recentReviews || 0,
      },
      competitors: competitorsData,
      insights,
    };
  } catch (error) {
    console.error("Error comparing with competitors:", error);
    return null;
  }
}

/**
 * Add a new competitor to track
 */
export async function addCompetitor(
  userId: string,
  locationId: string,
  competitorData: {
    name: string;
    placeId: string;
    rating: number;
    totalReviews: number;
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  try {
    const { error } = await supabase.from("competitor_tracking").insert({
      user_id: userId,
      location_id: locationId,
      competitor_name: competitorData.name,
      competitor_place_id: competitorData.placeId,
      current_rating: competitorData.rating,
      total_reviews: competitorData.totalReviews,
      is_active: true,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error adding competitor:", error);
    return { success: false, error: "Failed to add competitor" };
  }
}

/**
 * Remove competitor from tracking
 */
export async function removeCompetitor(
  competitorId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from("competitor_tracking")
      .update({ is_active: false })
      .eq("id", competitorId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error removing competitor:", error);
    return { success: false, error: "Failed to remove competitor" };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check for significant changes in competitor data
 */
async function checkCompetitorChanges(
  competitor: any,
): Promise<CompetitorAlert[]> {
  const alerts: CompetitorAlert[] = [];

  // Check rating increase
  if (competitor.current_rating && competitor.previous_rating) {
    const ratingDiff = competitor.current_rating - competitor.previous_rating;
    if (ratingDiff >= 0.3) {
      alerts.push({
        competitorId: competitor.id,
        competitorName: competitor.competitor_name,
        alertType: "rating_increase",
        severity: ratingDiff >= 0.5 ? "high" : "medium",
        title: `${competitor.competitor_name} rating increased`,
        message: `Competitor's rating improved from ${competitor.previous_rating.toFixed(1)} to ${competitor.current_rating.toFixed(1)}`,
        data: {
          currentRating: competitor.current_rating,
          previousRating: competitor.previous_rating,
          changePercentage: Math.round(
            (ratingDiff / competitor.previous_rating) * 100,
          ),
        },
        suggestedActions: [
          {
            label: "📊 View Details",
            action: "view_competitor",
            primary: true,
          },
          { label: "🔍 Analyze Their Strategy", action: "analyze_strategy" },
        ],
      });
    }
  }

  // Check review surge (significant increase in reviews)
  if (competitor.total_reviews && competitor.previous_total_reviews) {
    const reviewDiff =
      competitor.total_reviews - competitor.previous_total_reviews;
    const percentageIncrease =
      (reviewDiff / competitor.previous_total_reviews) * 100;

    if (percentageIncrease >= 20) {
      alerts.push({
        competitorId: competitor.id,
        competitorName: competitor.competitor_name,
        alertType: "review_surge",
        severity: percentageIncrease >= 40 ? "high" : "medium",
        title: `${competitor.competitor_name} review surge detected`,
        message: `Competitor gained ${reviewDiff} reviews (${Math.round(percentageIncrease)}% increase)`,
        data: {
          currentReviews: competitor.total_reviews,
          previousReviews: competitor.previous_total_reviews,
          changePercentage: Math.round(percentageIncrease),
        },
        suggestedActions: [
          {
            label: "📈 Investigate Cause",
            action: "investigate",
            primary: true,
          },
          { label: "🚀 Boost Your Reviews", action: "boost_reviews" },
        ],
      });
    }
  }

  return alerts;
}

/**
 * Determine trend based on rating changes
 */
function determineTrend(
  currentRating: number,
  previousRating: number,
): "improving" | "declining" | "stable" {
  if (!previousRating) return "stable";

  const diff = currentRating - previousRating;
  if (diff >= 0.2) return "improving";
  if (diff <= -0.2) return "declining";
  return "stable";
}

/**
 * Generate comparison insights
 */
function generateComparisonInsights(
  myBusiness: { rating: number; totalReviews: number; recentReviews: number },
  competitors: Array<{
    name: string;
    rating: number;
    totalReviews: number;
    recentReviews: number;
    trend: string;
  }>,
): string[] {
  const insights: string[] = [];

  if (competitors.length === 0) {
    return ["No competitor data available for comparison"];
  }

  // Rating comparison
  const avgCompetitorRating =
    competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length;

  if (myBusiness.rating > avgCompetitorRating + 0.3) {
    insights.push(
      `✅ Your rating (${myBusiness.rating.toFixed(1)}) is above competitor average (${avgCompetitorRating.toFixed(1)})`,
    );
  } else if (myBusiness.rating < avgCompetitorRating - 0.3) {
    insights.push(
      `⚠️ Your rating (${myBusiness.rating.toFixed(1)}) is below competitor average (${avgCompetitorRating.toFixed(1)})`,
    );
  } else {
    insights.push(
      `📊 Your rating (${myBusiness.rating.toFixed(1)}) is competitive with market average (${avgCompetitorRating.toFixed(1)})`,
    );
  }

  // Review volume comparison
  const avgCompetitorReviews =
    competitors.reduce((sum, c) => sum + c.totalReviews, 0) /
    competitors.length;

  if (myBusiness.totalReviews < avgCompetitorReviews * 0.7) {
    insights.push(
      `📈 Opportunity: Competitors have ${Math.round(avgCompetitorReviews)} reviews on average, you have ${myBusiness.totalReviews}`,
    );
  }

  // Recent activity comparison
  const avgRecentReviews =
    competitors.reduce((sum, c) => sum + c.recentReviews, 0) /
    competitors.length;

  if (myBusiness.recentReviews > avgRecentReviews) {
    insights.push(
      `🔥 You're more active than competitors (${myBusiness.recentReviews} recent reviews vs ${Math.round(avgRecentReviews)} average)`,
    );
  }

  // Improving competitors
  const improvingCompetitors = competitors.filter(
    (c) => c.trend === "improving",
  );
  if (improvingCompetitors.length > 0) {
    insights.push(
      `👀 ${improvingCompetitors.length} competitor(s) are improving: ${improvingCompetitors.map((c) => c.name).join(", ")}`,
    );
  }

  return insights;
}

/**
 * Get top competitor (highest rated)
 */
export async function getTopCompetitor(
  userId: string,
  locationId?: string,
): Promise<CompetitorData | null> {
  const supabase = createAdminClient();

  try {
    let query = supabase
      .from("competitor_tracking")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("current_rating", { ascending: false })
      .limit(1);

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    const { data } = await query.maybeSingle();

    if (!data) return null;

    return {
      id: data.id,
      name: data.competitor_name,
      placeId: data.competitor_place_id,
      rating: data.current_rating,
      totalReviews: data.total_reviews,
      lastChecked: new Date(data.last_checked_at),
    };
  } catch (error) {
    console.error("Error getting top competitor:", error);
    return null;
  }
}

/**
 * Update competitor data (called by cron job)
 */
export async function updateCompetitorData(
  competitorId: string,
  newData: {
    rating: number;
    totalReviews: number;
  },
): Promise<{ success: boolean }> {
  const supabase = createAdminClient();

  try {
    // Get current data first
    const { data: current } = await supabase
      .from("competitor_tracking")
      .select("current_rating, total_reviews")
      .eq("id", competitorId)
      .single();

    // Update with new data
    const { error } = await supabase
      .from("competitor_tracking")
      .update({
        previous_rating: current?.current_rating,
        previous_total_reviews: current?.total_reviews,
        current_rating: newData.rating,
        total_reviews: newData.totalReviews,
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", competitorId);

    if (error) {
      console.error("Error updating competitor data:", error);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateCompetitorData:", error);
    return { success: false };
  }
}
