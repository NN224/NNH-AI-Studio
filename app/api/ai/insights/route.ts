/**
 * 📊 INSIGHTS API
 *
 * GET /api/ai/insights
 * Returns list of AI proactive insights
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getInsights,
  getInsightsStats,
  type InsightType,
  type InsightPriority,
} from "@/lib/services/insights-service";

// Force dynamic rendering (uses cookies for auth)
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as InsightType | null;
    const priority = searchParams.get("priority") as InsightPriority | null;
    const isRead = searchParams.get("read");
    const isDismissed = searchParams.get("dismissed");
    const locationId = searchParams.get("locationId") || undefined;

    // Get insights with filters
    const insights = await getInsights(user.id, {
      type: type || undefined,
      priority: priority || undefined,
      isRead: isRead === "true" ? true : isRead === "false" ? false : undefined,
      isDismissed:
        isDismissed === "true"
          ? true
          : isDismissed === "false"
            ? false
            : undefined,
      locationId,
    });

    // Get stats
    const stats = await getInsightsStats(user.id, locationId);

    return NextResponse.json({
      success: true,
      data: {
        insights,
        stats,
      },
    });
  } catch (error) {
    console.error("Insights API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
