/**
 * AI Insights API Route
 * Generates AI-powered business insights from dashboard data
 *
 * @security Protected by withAIProtection HOF with rate limiting
 */

import { getAIProvider } from "@/lib/ai/provider";
import {
  withAIAuth,
  withAIProtection,
  type AIProtectionContext,
} from "@/lib/api/with-ai-protection";
import { createClient } from "@/lib/supabase/server";
import type { AIInsight, AIInsightsResponse } from "@/lib/types/ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache duration: 1 hour
const CACHE_DURATION = 60 * 60 * 1000;

interface CachedInsights {
  data: AIInsightsResponse;
  timestamp: number;
}

// In-memory cache (consider using Redis in production)
const insightsCache = new Map<string, CachedInsights>();

/**
 * Main handler - protected by withAIProtection
 */
async function handleInsights(
  _request: Request,
  { userId }: AIProtectionContext,
): Promise<Response> {
  try {
    const supabase = await createClient();

    // Check cache
    const cacheKey = `insights_${userId}`;
    const cached = insightsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // Get AI provider
    const aiProvider = await getAIProvider(userId);
    if (!aiProvider) {
      return NextResponse.json(
        {
          error:
            "AI provider not configured. Please add your API key in settings.",
        },
        { status: 400 },
      );
    }

    // Fetch dashboard data from materialized view using RPC
    const { data: stats, error: statsError } = await supabase
      .rpc("get_user_dashboard_stats", { p_user_id: userId })
      .single();

    if (statsError) {
      return NextResponse.json(
        { error: "Failed to fetch dashboard stats" },
        { status: 500 },
      );
    }

    // Get recent reviews for sentiment analysis
    const { data: recentReviews } = await supabase
      .from("gmb_reviews")
      .select("rating, review_text, review_date, ai_sentiment")
      .eq("user_id", userId)
      .order("review_date", { ascending: false })
      .limit(50);

    // Get locations data
    const { data: locations } = await supabase
      .from("gmb_locations")
      .select(
        "location_name, rating, review_count, response_rate, health_score",
      )
      .eq("user_id", userId)
      .eq("is_active", true);

    // Build analysis prompt
    const prompt = buildAnalysisPrompt(
      stats,
      recentReviews || [],
      locations || [],
    );

    // Generate AI insights
    const { content } = await aiProvider.generateCompletion(
      prompt,
      "dashboard_insights",
    );

    // Parse AI response
    const insights = parseAIResponse(content);

    // Cache results
    const response: AIInsightsResponse = {
      ...insights,
      generatedAt: new Date().toISOString(),
    };

    insightsCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("AI Insights API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// Export with AI protection (rate limiting + auth)
export const GET = withAIProtection(handleInsights, {
  endpointType: "insights",
});

/**
 * Build analysis prompt for AI
 */
function buildAnalysisPrompt(
  stats: any,
  recentReviews: any[],
  locations: any[],
): string {
  const avgRating = stats.avg_rating || 0;
  const totalReviews = stats.total_reviews || 0;
  const responseRate = stats.response_rate || 0;
  const pendingReviews = stats.pending_reviews || 0;

  // Calculate sentiment distribution
  const sentimentDist = recentReviews.reduce(
    (acc, review) => {
      if (review.rating >= 4) acc.positive++;
      else if (review.rating === 3) acc.neutral++;
      else acc.negative++;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 },
  );

  // Calculate review trend (last 7 days vs previous 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const lastWeekReviews = recentReviews.filter(
    (r) => new Date(r.review_date) >= sevenDaysAgo,
  ).length;
  const previousWeekReviews = recentReviews.filter(
    (r) =>
      new Date(r.review_date) >= fourteenDaysAgo &&
      new Date(r.review_date) < sevenDaysAgo,
  ).length;

  return `Analyze the following Google My Business dashboard data and provide actionable insights:

**Current Metrics:**
- Total Locations: ${stats.total_locations || 0}
- Total Reviews: ${totalReviews}
- Average Rating: ${avgRating.toFixed(2)}/5
- Response Rate: ${(responseRate * 100).toFixed(1)}%
- Pending Reviews: ${pendingReviews}
- Recent Reviews (7 days): ${lastWeekReviews}
- Previous Week Reviews: ${previousWeekReviews}

**Sentiment Distribution (Last 50 Reviews):**
- Positive (4-5 stars): ${sentimentDist.positive}
- Neutral (3 stars): ${sentimentDist.neutral}
- Negative (1-2 stars): ${sentimentDist.negative}

**Top Locations:**
${locations
  .slice(0, 5)
  .map(
    (loc) =>
      `- ${loc.location_name}: ${loc.rating?.toFixed(1) || "N/A"} stars, ${loc.review_count || 0} reviews, ${((loc.response_rate || 0) * 100).toFixed(0)}% response rate`,
  )
  .join("\n")}

Please provide a JSON response with the following structure:
{
  "summary": "Brief 2-3 sentence summary of overall business health",
  "insights": [
    {
      "type": "recommendation|anomaly|trend|prediction|competitor",
      "title": "Short title",
      "description": "Detailed description",
      "impact": "high|medium|low",
      "confidence": 85,
      "category": "reviews|rating|response|engagement",
      "suggestedActions": [
        {
          "label": "Action label",
          "description": "What this action does",
          "actionType": "navigate|api_call|external_link"
        }
      ]
    }
  ],
  "predictions": [
    {
      "metric": "Average Rating",
      "currentValue": ${avgRating},
      "predictedValue": 4.5,
      "change": 0.2,
      "changePercent": 4.4,
      "confidence": 75,
      "timeframe": "next 7 days",
      "factors": ["Increased positive reviews", "Improved response time"]
    }
  ],
  "anomalies": [
    {
      "metric": "Review Volume",
      "expectedValue": ${previousWeekReviews},
      "actualValue": ${lastWeekReviews},
      "deviation": ${((lastWeekReviews - previousWeekReviews) / Math.max(previousWeekReviews, 1)) * 100},
      "severity": "warning|info|critical",
      "possibleCauses": ["Reason 1", "Reason 2"]
    }
  ]
}

Focus on:
1. Actionable recommendations (not just observations)
2. Predictions based on trends
3. Anomaly detection (unusual patterns)
4. Competitive insights if applicable
5. Prioritize high-impact actions

Return ONLY valid JSON, no markdown or explanation.`;
}

/**
 * Parse AI response into structured insights
 */
function parseAIResponse(
  content: string,
): Omit<AIInsightsResponse, "generatedAt" | "cacheKey"> {
  try {
    // Remove markdown code blocks if present
    const cleanContent = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleanContent);

    // Add IDs and dates to insights
    const insights: AIInsight[] = (parsed.insights || []).map(
      (insight: any, index: number) => ({
        id: `insight_${Date.now()}_${index}`,
        type: insight.type || "recommendation",
        title: insight.title || "",
        description: insight.description || "",
        impact: insight.impact || "medium",
        confidence: insight.confidence || 70,
        category: insight.category || "general",
        suggestedActions: insight.suggestedActions || [],
        metadata: {},
        createdAt: new Date(),
      }),
    );

    return {
      insights,
      predictions: parsed.predictions || [],
      anomalies: parsed.anomalies || [],
      summary: parsed.summary || "No insights available at this time.",
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);

    // Return fallback insights
    return {
      insights: [
        {
          id: `insight_${Date.now()}`,
          type: "info",
          title: "Review Your Dashboard",
          description:
            "Check your recent reviews and respond to pending ones to improve customer engagement.",
          impact: "medium",
          confidence: 100,
          category: "reviews",
          createdAt: new Date().toISOString(),
        },
      ],
      predictions: [],
      anomalies: [],
      summary: {
        totalInsights: 1,
        criticalItems: 0,
        opportunitiesCount: 1,
        overallScore: 75,
      },
    };
  }
}

/**
 * Invalidate cache for user - uses lightweight auth
 */
async function handleDeleteCache(
  _request: Request,
  userId: string,
): Promise<Response> {
  const cacheKey = `insights_${userId}`;
  insightsCache.delete(cacheKey);
  return NextResponse.json({ success: true, message: "Cache invalidated" });
}

export const DELETE = withAIAuth(handleDeleteCache);
