// Location Metrics API
// Fetches performance metrics for a single location from Supabase

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { apiLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

/**
 * Calculate date range from string (7d, 30d, 90d, 1y)
 */
function getDateRange(range: string): {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
} {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  let start: Date;
  let previousStart: Date;
  let previousEnd: Date;

  switch (range) {
    case "7d":
      start = new Date(end);
      start.setDate(start.getDate() - 7);
      previousEnd = new Date(start);
      previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - 7);
      break;
    case "30d":
      start = new Date(end);
      start.setDate(start.getDate() - 30);
      previousEnd = new Date(start);
      previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - 30);
      break;
    case "90d":
      start = new Date(end);
      start.setDate(start.getDate() - 90);
      previousEnd = new Date(start);
      previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - 90);
      break;
    case "1y":
      start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      previousEnd = new Date(start);
      previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
      previousStart = new Date(previousEnd);
      previousStart.setFullYear(previousStart.getFullYear() - 1);
      break;
    default:
      // Default to 30 days
      start = new Date(end);
      start.setDate(start.getDate() - 30);
      previousEnd = new Date(start);
      previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - 30);
  }

  start.setHours(0, 0, 0, 0);
  previousStart.setHours(0, 0, 0, 0);

  return { start, end, previousStart, previousEnd };
}

/**
 * GET - Fetch metrics for a location
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // ✅ SECURITY: Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication required. Please log in again.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 },
      );
    }

    // ✅ SECURITY: Rate limiting
    const { success, headers: rateLimitHeaders } = await checkRateLimit(
      user.id,
    );
    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retry_after: rateLimitHeaders["X-RateLimit-Reset"],
        },
        {
          status: 429,
          headers: rateLimitHeaders as HeadersInit,
        },
      );
    }

    const { id: locationId } = params;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";

    // ✅ Input validation
    if (!locationId || typeof locationId !== "string") {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "Location ID is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const validRanges = ["7d", "30d", "90d", "1y"];
    if (!validRanges.includes(range)) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `Invalid range. Must be one of: ${validRanges.join(", ")}`,
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    // ✅ SECURITY: Verify location ownership
    const { data: location, error: locationError } = await supabase
      .from("gmb_locations")
      .select("id, location_name")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (locationError || !location) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Location not found or you do not have access",
          code: "NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Get date ranges
    const { start, end, previousStart, previousEnd } = getDateRange(range);

    // Fetch current period metrics
    const { data: currentMetrics, error: currentError } = await supabase
      .from("gmb_performance_metrics")
      .select("metric_type, metric_value")
      .eq("location_id", locationId)
      .eq("user_id", user.id)
      .gte("metric_date", start.toISOString().split("T")[0])
      .lte("metric_date", end.toISOString().split("T")[0]);

    // Fetch previous period metrics (for comparison)
    const { data: previousMetrics, error: previousError } = await supabase
      .from("gmb_performance_metrics")
      .select("metric_type, metric_value")
      .eq("location_id", locationId)
      .eq("user_id", user.id)
      .gte("metric_date", previousStart.toISOString().split("T")[0])
      .lte("metric_date", previousEnd.toISOString().split("T")[0]);

    if (currentError || previousError) {
      apiLogger.error(
        "[GET /api/locations/[id]/metrics] DB Error",
        (currentError || previousError) instanceof Error
          ? (currentError || previousError)!
          : new Error(String(currentError || previousError)),
        {
          locationId,
          userId: user.id,
          timestamp: new Date().toISOString(),
        },
      );

      return NextResponse.json(
        {
          error: "Database error",
          message: "Failed to fetch metrics. Please try again later.",
          code: "METRICS_FETCH_ERROR",
        },
        { status: 500 },
      );
    }

    // Calculate metrics
    // Views (Impressions) - sum of all impression types
    const impressionTypes = [
      "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
      "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
      "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
      "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
    ];

    const currentViews = (currentMetrics || [])
      .filter((m) => impressionTypes.includes(m.metric_type))
      .reduce((sum, m) => sum + (Number(m.metric_value) || 0), 0);

    const previousViews = (previousMetrics || [])
      .filter((m) => impressionTypes.includes(m.metric_type))
      .reduce((sum, m) => sum + (Number(m.metric_value) || 0), 0);

    // Clicks - sum of all click types
    const clickTypes = [
      "WEBSITE_CLICKS",
      "CALL_CLICKS",
      "BUSINESS_DIRECTION_REQUESTS",
    ];

    const currentClicks = (currentMetrics || [])
      .filter((m) => clickTypes.includes(m.metric_type))
      .reduce((sum, m) => sum + (Number(m.metric_value) || 0), 0);

    const previousClicks = (previousMetrics || [])
      .filter((m) => clickTypes.includes(m.metric_type))
      .reduce((sum, m) => sum + (Number(m.metric_value) || 0), 0);

    // Calls - specific metric
    const currentCalls = (currentMetrics || [])
      .filter((m) => m.metric_type === "CALL_CLICKS")
      .reduce((sum, m) => sum + (Number(m.metric_value) || 0), 0);

    const previousCalls = (previousMetrics || [])
      .filter((m) => m.metric_type === "CALL_CLICKS")
      .reduce((sum, m) => sum + (Number(m.metric_value) || 0), 0);

    // Directions - specific metric
    const currentDirections = (currentMetrics || [])
      .filter((m) => m.metric_type === "BUSINESS_DIRECTION_REQUESTS")
      .reduce((sum, m) => sum + (Number(m.metric_value) || 0), 0);

    const previousDirections = (previousMetrics || [])
      .filter((m) => m.metric_type === "BUSINESS_DIRECTION_REQUESTS")
      .reduce((sum, m) => sum + (Number(m.metric_value) || 0), 0);

    // Calculate trends (percentage change)
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    };

    const viewsTrend = calculateTrend(currentViews, previousViews);
    const clicksTrend = calculateTrend(currentClicks, previousClicks);
    const callsTrend = calculateTrend(currentCalls, previousCalls);
    const directionsTrend = calculateTrend(
      currentDirections,
      previousDirections,
    );

    // Convert headers object to Record<string, string>
    const responseHeaders: Record<string, string> = {};
    if (rateLimitHeaders) {
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        if (typeof value === "string") {
          responseHeaders[key] = value;
        }
      });
    }

    return NextResponse.json(
      {
        views: currentViews,
        clicks: currentClicks,
        calls: currentCalls,
        directions: currentDirections,
        viewsTrend,
        clicksTrend,
        callsTrend,
        directionsTrend,
        range,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          previousStart: previousStart.toISOString(),
          previousEnd: previousEnd.toISOString(),
        },
      },
      {
        headers: responseHeaders,
      },
    );
  } catch (error: any) {
    apiLogger.error(
      "[GET /api/locations/[id]/metrics] Unexpected error",
      error instanceof Error ? error : new Error(String(error)),
      { timestamp: new Date().toISOString() },
    );

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred. Please try again later.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
