/**
 * 📊 DAILY INSIGHTS CRON JOB
 *
 * /api/cron/daily-insights
 *
 * Runs every day at 6 AM to:
 * 1. Analyze yesterday's data
 * 2. Detect patterns and problems
 * 3. Generate proactive insights
 * 4. Save for Command Center display
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { detectPatterns } from "@/lib/services/ai-proactive-service";
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

  // 2. Detect patterns
  const patterns = await detectPatterns(userId);

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
    topic_trend: "trend",
    rating_drop: "problem_detected",
    rating_rise: "positive_trend",
  };
  return mapping[patternType] || "suggestion";
}

function getPatternTitle(pattern: any): string {
  switch (pattern.type) {
    case "complaint_cluster":
      return "🔴 شكاوى متكررة";
    case "day_pattern":
      return "📅 نمط يومي ملاحظ";
    case "rating_drop":
      return "📉 انخفاض بالتقييم";
    case "rating_rise":
      return "📈 تحسن بالتقييم";
    default:
      return "💡 ملاحظة";
  }
}

function getSuggestedActions(pattern: any): any[] {
  switch (pattern.type) {
    case "complaint_cluster":
      return [
        {
          label: "📊 حلل الشكاوى",
          action: "analyze_complaints",
          primary: true,
        },
        { label: "📝 خطة تحسين", action: "improvement_plan" },
      ];
    case "day_pattern":
      return [
        { label: "🔍 شوف التفاصيل", action: "view_details", primary: true },
        { label: "📋 راجع الجدول", action: "review_schedule" },
      ];
    case "rating_drop":
      return [
        { label: "🔍 وريني المراجعات", action: "show_reviews", primary: true },
        { label: "📝 اقترح حلول", action: "suggest_solutions" },
      ];
    case "rating_rise":
      return [
        { label: "✨ استغل الفرصة", action: "create_offer", primary: true },
        { label: "📊 التفاصيل", action: "view_details" },
      ];
    default:
      return [{ label: "👁️ عرض", action: "view", primary: true }];
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
    { reviews: 50, message: "وصلت لـ 50 مراجعة! 🎉" },
    { reviews: 100, message: "مبروك! 100 مراجعة! 🏆" },
    { reviews: 250, message: "250 مراجعة - إنجاز رائع! ⭐" },
    { reviews: 500, message: "500 مراجعة! أنت نجم! 🌟" },
    { rating: 4.5, message: "تقييمك وصل 4.5+! ممتاز! 🔥" },
  ];

  for (const milestone of milestones) {
    if (milestone.reviews && dna.total_reviews === milestone.reviews) {
      // Check if we already created this milestone
      const { count } = await supabase
        .from("ai_proactive_insights")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("insight_type", "milestone")
        .ilike("message", `%${milestone.reviews} مراجعة%`);

      if (count === 0) {
        await supabase.from("ai_proactive_insights").insert({
          user_id: userId,
          insight_type: "milestone",
          priority: "low",
          title: "🏆 إنجاز جديد!",
          message: milestone.message,
          suggested_actions: [
            { label: "📢 شارك الإنجاز", action: "share", primary: true },
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
          title: "⭐ تقييم ممتاز!",
          message: milestone.message,
          suggested_actions: [
            { label: "📢 شارك", action: "share", primary: true },
          ],
        });
        results.insightsGenerated++;
      }
    }
  }
}

// Also export POST for flexibility
export { GET as POST };
