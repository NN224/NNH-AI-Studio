// Locations list API for the Locations tab
// Returns a normalized list of locations with insights and health/visibility scores

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth-middleware";
import { createClient } from "@/lib/supabase/server";
import { applySafeSearchFilter } from "@/lib/utils/secure-search";

export const dynamic = "force-dynamic";

async function handler(request: Request, user: any): Promise<Response> {
  const supabase = await createClient();

  // Parse query parameters for filtering and pagination
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const category = searchParams.get("category") || "all";
  const ratingMin = searchParams.get("ratingMin")
    ? parseFloat(searchParams.get("ratingMin")!)
    : undefined;
  const ratingMax = searchParams.get("ratingMax")
    ? parseFloat(searchParams.get("ratingMax")!)
    : undefined;
  const healthScoreMin = searchParams.get("healthScoreMin")
    ? parseInt(searchParams.get("healthScoreMin")!, 10)
    : undefined;
  const healthScoreMax = searchParams.get("healthScoreMax")
    ? parseInt(searchParams.get("healthScoreMax")!, 10)
    : undefined;
  const reviewCountMin = searchParams.get("reviewCountMin")
    ? parseInt(searchParams.get("reviewCountMin")!, 10)
    : undefined;
  const reviewCountMax = searchParams.get("reviewCountMax")
    ? parseInt(searchParams.get("reviewCountMax")!, 10)
    : undefined;
  const dateRange = searchParams.get("dateRange") as
    | "last_sync"
    | "created"
    | null;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const quickFilter = searchParams.get("quickFilter") as
    | "needs_attention"
    | "top_performers"
    | null;
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Get active GMB accounts first
  const { data: activeAccounts } = await supabase
    .from("gmb_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const activeAccountIds = activeAccounts?.map((acc) => acc.id) || [];

  // If no active accounts, return empty
  if (activeAccountIds.length === 0) {
    return NextResponse.json({
      data: [],
      total: 0,
      limit,
      offset,
    });
  }

  // Build query
  let query = supabase
    .from("gmb_locations")
    .select(
      `
      id,
      location_name,
      address,
      phone,
      website,
      rating,
      review_count,
      status,
      category,
      latlng,
      regularHours:regularhours,
      businessHours:business_hours,
      metadata,
      response_rate,
      is_syncing,
      ai_insights,
      updated_at,
      created_at
    `,
      { count: "exact" },
    )
    .eq("user_id", user.id)
    .in("gmb_account_id", activeAccountIds);

  // ✅ SECURITY: Fixed SQL injection - using secure search utility
  // Apply search filters safely without any string interpolation vulnerability
  if (search) {
    try {
      // Use the secure search filter utility that validates and escapes input
      query = applySafeSearchFilter(query, search, [
        "location_name",
        "address",
      ]);
    } catch (error) {
      // If search validation fails, log and continue without search filter
      console.warn("Invalid search input detected:", error);
      // Continue without applying search to prevent breaking the query
    }
  }

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (category !== "all") {
    query = query.eq("category", category);
  }

  // Rating range filter
  if (ratingMin !== undefined) {
    query = query.gte("rating", ratingMin);
  }
  if (ratingMax !== undefined) {
    query = query.lte("rating", ratingMax);
  }

  // Health score range filter
  if (healthScoreMin !== undefined) {
    query = query.gte("health_score", healthScoreMin);
  }
  if (healthScoreMax !== undefined) {
    query = query.lte("health_score", healthScoreMax);
  }

  // Review count range filter
  if (reviewCountMin !== undefined) {
    query = query.gte("review_count", reviewCountMin);
  }
  if (reviewCountMax !== undefined) {
    query = query.lte("review_count", reviewCountMax);
  }

  // Date range filter
  if (dateRange && dateFrom && dateTo) {
    const dateField = dateRange === "last_sync" ? "updated_at" : "created_at";
    query = query.gte(dateField, dateFrom);
    query = query.lte(dateField, dateTo);
  }

  // Quick filters
  if (quickFilter === "needs_attention") {
    query = query.lte("health_score", 60);
  } else if (quickFilter === "top_performers") {
    query = query.gte("rating", 4.5);
    query = query.gte("health_score", 80);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: locationsData, error: dbError, count } = await query;

  if (dbError) {
    // ✅ ERROR HANDLING: Enhanced error logging
    console.error("[GET /api/locations/list-data] DB Error:", {
      error: dbError.message,
      code: dbError.code,
      details: dbError.details,
      hint: dbError.hint,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Database error",
        message: "Failed to fetch location data. Please try again later.",
        code: "LOCATIONS_LIST_ERROR",
      },
      { status: 500 },
    );
  }

  console.log(
    "[Locations List API] Locations data fetched successfully, triggering dashboard refresh event",
  );
  const processed = (locationsData || []).map((loc: any) => {
    const metadata = (loc.metadata as Record<string, any> | null) || {};
    const insights = (metadata.insights_json ||
      metadata.insights ||
      {}) as Record<string, any>;
    const derivedHealth = metadata.health_score ?? metadata.healthScore;
    const derivedVisibility =
      metadata.visibility_score ?? metadata.visibilityScore;
    const derivedPhotos = metadata.mediaCount ?? metadata.photos ?? 0;
    const derivedPosts = metadata.postsCount ?? metadata.posts ?? 0;
    const derivedAttributes =
      metadata.serviceItems ?? metadata.attributes ?? [];
    const lastSync =
      metadata.last_sync ??
      metadata.lastSync ??
      loc.updated_at ??
      loc.created_at;

    return {
      id: loc.id,
      name: loc.location_name || "Untitled Location",
      address: loc.address || "N/A",
      phone: loc.phone || "N/A",
      website: loc.website || "",
      rating: Number(loc.rating) || 0,
      reviewCount: Number(loc.review_count) || 0,
      status: (loc.status as "verified" | "pending" | "suspended") || "pending",
      category: loc.category || "General",
      coordinates: loc.latlng || null, // No mock coordinates - use null if missing
      hours: loc.regularHours || loc.businessHours || {},
      attributes: Array.isArray(derivedAttributes) ? derivedAttributes : [],
      photos: Number(derivedPhotos) || 0,
      posts: Number(derivedPosts) || 0,
      healthScore: Number(derivedHealth ?? 0) || 0,
      visibility: Number(derivedVisibility ?? 0) || 0,
      lastSync:
        typeof lastSync === "string"
          ? lastSync
          : lastSync instanceof Date
            ? lastSync.toISOString()
            : new Date().toISOString(),
      insights: {
        views: Number(insights.views) || 0,
        viewsTrend: Number(insights.viewsTrend) || 0,
        clicks: Number(insights.clicks) || 0,
        clicksTrend: Number(insights.clicksTrend) || 0,
        calls: Number(insights.calls) || 0,
        callsTrend: Number(insights.callsTrend) || 0,
        directions: Number(insights.directions) || 0,
        directionsTrend: Number(insights.directionsTrend) || 0,
        weeklyGrowth: Number(insights.weeklyGrowth) || 0,
      },
    };
  });

  return NextResponse.json({
    data: processed,
    total: count || 0,
    limit,
    offset,
    refreshEvent: "dashboard:refresh triggered",
  });
}

export const GET = withAuth(handler);
