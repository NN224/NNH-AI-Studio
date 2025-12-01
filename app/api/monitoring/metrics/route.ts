import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST endpoint to store metrics
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // This should ideally use a service account or API key
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { metrics } = body;

    if (!Array.isArray(metrics)) {
      return NextResponse.json(
        { error: "Invalid metrics format" },
        { status: 400 },
      );
    }

    // Store metrics in database
    const { error } = await supabase.from("monitoring_metrics").insert(
      metrics.map((metric) => ({
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags,
        timestamp: metric.timestamp || new Date().toISOString(),
        user_id: user.id,
      })),
    );

    if (error) {
      apiLogger.error(
        "Failed to store metrics",
        error instanceof Error ? error : new Error(String(error)),
        { userId: user.id },
      );
      return NextResponse.json(
        { error: "Failed to store metrics" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error(
      "Metrics API error (POST)",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to retrieve metrics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const metricName = searchParams.get("metric");
    const startTime = searchParams.get("start");
    const endTime = searchParams.get("end");
    const tags = searchParams.get("tags");

    let query = supabase
      .from("monitoring_metrics")
      .select("*")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false })
      .limit(1000);

    if (metricName) {
      query = query.eq("name", metricName);
    }

    if (startTime) {
      query = query.gte("timestamp", startTime);
    }

    if (endTime) {
      query = query.lte("timestamp", endTime);
    }

    if (tags) {
      // Filter by tags (assumes tags are stored as JSONB)
      try {
        const tagFilters = JSON.parse(tags) as Record<string, unknown>;
        Object.entries(tagFilters).forEach(([key, value]) => {
          query = query.contains("tags", { [key]: value });
        });
      } catch {
        return NextResponse.json(
          { error: "Invalid tags format - must be valid JSON" },
          { status: 400 },
        );
      }
    }

    const { data: metrics, error } = await query;

    if (error) {
      apiLogger.error(
        "Failed to fetch metrics",
        error instanceof Error ? error : new Error(String(error)),
        { userId: user.id },
      );
      return NextResponse.json(
        { error: "Failed to fetch metrics" },
        { status: 500 },
      );
    }

    // Aggregate metrics if requested
    const aggregate = searchParams.get("aggregate");
    if (aggregate && metrics) {
      const aggregatedData = aggregateMetrics(metrics, aggregate);
      return NextResponse.json({ metrics: aggregatedData });
    }

    return NextResponse.json({ metrics: metrics || [] });
  } catch (error) {
    apiLogger.error(
      "Metrics API error (GET)",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Aggregate metrics by time period
 */
function aggregateMetrics(metrics: any[], period: string) {
  const grouped = new Map<string, any[]>();

  metrics.forEach((metric) => {
    const date = new Date(metric.timestamp);
    let key: string;

    switch (period) {
      case "minute":
        key = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
        break;
      case "hour":
        key = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
        break;
      case "day":
        key = date.toISOString().slice(0, 10); // YYYY-MM-DD
        break;
      default:
        key = date.toISOString();
    }

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(metric);
  });

  // Calculate aggregates
  const aggregated = Array.from(grouped.entries()).map(([timestamp, group]) => {
    const values = group.map((m) => m.value);
    return {
      timestamp,
      count: group.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      metric: group[0].name,
      unit: group[0].unit,
    };
  });

  return aggregated.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}
