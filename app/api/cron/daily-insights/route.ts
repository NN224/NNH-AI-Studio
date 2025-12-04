/**
 * 📊 DAILY INSIGHTS CRON JOB
 *
 * /api/cron/daily-insights
 *
 * Runs every day at 6 AM to:
 * 1. Analyze yesterday's data
 * 2. Detect patterns and problems using pattern-detection-service
 * 3. Generate proactive insights
 * 4. Save to ai_proactive_insights table for Command Center display
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { detectAllPatterns } from "@/lib/services/pattern-detection-service";
import { buildBusinessDNA } from "@/lib/services/business-dna-service";

// Verify cron secret
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const results = {
      usersProcessed: 0,
      insightsGenerated: 0,
      dnaUpdated: 0,
      errors: [] as string[],
    };

    // Get all users with active locations
    const { data: users } = await supabase
      .from("gmb_locations")
      .select("user_id")
      .eq("is_active", true);

    const uniqueUserIds = [...new Set(users?.map((u) => u.user_id) || [])];

    for (const userId of uniqueUserIds) {
      try {
        await processUserInsights(supabase, userId, results);
        results.usersProcessed++;
      } catch (error) {
        results.errors.push(`User ${userId}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Daily insights completed",
      results,
    });
  } catch (error) {
    console.error("Daily Insights Cron Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function processUserInsights(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  results: any,
) {
  // 1. Update Business DNA (re-analyze)
  const dnaResult = await buildBusinessDNA(userId, undefined, {
    forceRefresh: true,
  });
  if (dnaResult.success) {
    results.dnaUpdated++;
  }

  // 2. Detect patterns using new pattern detection service
  const patterns = await detectAllPatterns(userId, undefined, "week");

  // 3. Create insights for significant patterns
  for (const pattern of patterns) {
    if (pattern.severity === "high" || pattern.severity === "medium") {
      const { error } = await supabase.from("ai_proactive_insights").insert({
        user_id: userId,
        insight_type: mapPatternToInsightType(pattern.type),
        priority: pattern.severity,
        title: getPatternTitle(pattern),
        message: pattern.description,
        detailed_analysis: pattern.data,
        suggested_actions: getSuggestedActions(pattern),
        valid_until: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // Valid for 7 days
      });

      if (!error) {
        results.insightsGenerated++;
      }
    }
  }

  // 4. Check for milestones
  await checkMilestones(supabase, userId, results);
}

function mapPatternToInsightType(patternType: string): string {
  const mapping: Record<string, string> = {
    complaint_cluster: "problem_detected",
    day_pattern: "problem_detected",
    time_pattern: "problem_detected",
    topic_trend: "trend",
    rating_drop: "problem_detected",
    rating_rise: "positive_trend",
    service_issue: "problem_detected",
    product_issue: "problem_detected",
  };
  return mapping[patternType] || "suggestion";
}

function getPatternTitle(pattern: any): string {
  // Use the pattern's own title which is already descriptive
  return pattern.title || "💡 Insight";
}

function getSuggestedActions(pattern: any): any[] {
  // Use pattern's suggested action if available
  if (pattern.suggestedAction) {
    return [
      {
        label: "🔍 View Details",
        action: "view_details",
        primary: true,
      },
      {
        label: "📊 Analyze",
        action: "analyze",
      },
    ];
  }

  // Fallback actions based on type
  switch (pattern.type) {
    case "complaint_cluster":
    case "service_issue":
    case "product_issue":
      return [
        {
          label: "📊 Analyze Issues",
          action: "analyze_complaints",
          primary: true,
        },
        { label: "📝 Create Action Plan", action: "improvement_plan" },
      ];
    case "day_pattern":
    case "time_pattern":
      return [
        { label: "🔍 View Details", action: "view_details", primary: true },
        { label: "📋 Review Schedule", action: "review_schedule" },
      ];
    case "rating_drop":
      return [
        { label: "🔍 Show Reviews", action: "show_reviews", primary: true },
        { label: "📝 Suggest Solutions", action: "suggest_solutions" },
      ];
    case "rating_rise":
      return [
        { label: "✨ Capitalize", action: "create_offer", primary: true },
        { label: "📊 Details", action: "view_details" },
      ];
    default:
      return [{ label: "👁️ View", action: "view", primary: true }];
  }
}

async function checkMilestones(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  results: any,
) {
  // Get current stats
  const { data: dna } = await supabase
    .from("business_dna")
    .select("total_reviews, average_rating")
    .eq("user_id", userId)
    .single();

  if (!dna) return;

  const milestones = [
    { reviews: 50, message: "Reached 50 reviews! 🎉" },
    { reviews: 100, message: "Congratulations! 100 reviews! 🏆" },
    { reviews: 250, message: "250 reviews - Amazing achievement! ⭐" },
    { reviews: 500, message: "500 reviews! You're a star! 🌟" },
    { reviews: 1000, message: "1000 reviews! Incredible milestone! 🚀" },
    { rating: 4.5, message: "Rating reached 4.5+! Excellent! 🔥" },
    { rating: 4.7, message: "Rating 4.7+! Outstanding quality! 💎" },
  ];

  for (const milestone of milestones) {
    if (milestone.reviews && dna.total_reviews === milestone.reviews) {
      // Check if we already created this milestone
      const { count } = await supabase
        .from("ai_proactive_insights")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("insight_type", "milestone")
        .ilike("message", `%${milestone.reviews} reviews%`);

      if (count === 0) {
        await supabase.from("ai_proactive_insights").insert({
          user_id: userId,
          insight_type: "milestone",
          priority: "low",
          title: "🏆 New Achievement!",
          message: milestone.message,
          suggested_actions: [
            { label: "📢 Share Achievement", action: "share", primary: true },
            { label: "👁️ View Stats", action: "view_stats" },
          ],
        });
        results.insightsGenerated++;
      }
    }

    if (
      milestone.rating &&
      dna.average_rating >= milestone.rating &&
      dna.average_rating < milestone.rating + 0.1
    ) {
      const { count } = await supabase
        .from("ai_proactive_insights")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("insight_type", "milestone")
        .ilike("message", `%${milestone.rating}%`);

      if (count === 0) {
        await supabase.from("ai_proactive_insights").insert({
          user_id: userId,
          insight_type: "milestone",
          priority: "low",
          title: "⭐ Excellent Rating!",
          message: milestone.message,
          suggested_actions: [
            { label: "📢 Share Success", action: "share", primary: true },
            { label: "💡 Maintain Quality", action: "quality_tips" },
          ],
        });
        results.insightsGenerated++;
      }
    }
  }
}

// Also export POST for flexibility
export { GET as POST };
