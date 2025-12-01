import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/stats
 * Returns basic dashboard statistics
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

    // Rate limiting
    const { success, headers: rateLimitHeaders } = await checkRateLimit(
      user.id,
    );
    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          retry_after: rateLimitHeaders["X-RateLimit-Reset"],
        },
        {
          status: 429,
          headers: rateLimitHeaders as HeadersInit,
        },
      );
    }

    // Get stats from materialized view using RPC
    let dashboardStats: any = null;
    try {
      const { data, error: statsError } = await supabase
        .rpc("get_user_dashboard_stats", { p_user_id: user.id })
        .single();

      if (!statsError && data) {
        // Map RPC response to expected format
        const rpcData = data as any;
        dashboardStats = {
          total_locations: rpcData.locations_count || 0,
          total_reviews: rpcData.reviews_count || 0,
          avg_rating: rpcData.average_rating || 0,
          pending_reviews:
            (rpcData.reviews_count || 0) - (rpcData.replied_reviews_count || 0),
          replied_reviews: rpcData.replied_reviews_count || 0,
          total_questions: 0, // Not in RPC
          pending_questions: 0, // Not in RPC
          recent_reviews: rpcData.this_week_reviews_count || 0,
          avg_response_rate: rpcData.response_rate_percent || 0,
          calculated_response_rate: rpcData.response_rate_percent || 0,
          avg_response_time: "N/A",
        };
      }
    } catch (error) {
      console.log("RPC not available, calculating manually");
    }

    // Fallback: Calculate stats manually if view doesn't exist
    if (!dashboardStats) {
      const [
        { count: totalLocations },
        { data: reviews },
        { count: totalQuestions },
        { count: pendingQuestions },
      ] = await Promise.all([
        supabase
          .from("gmb_locations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_active", true),

        supabase
          .from("gmb_reviews")
          .select("rating, has_reply, reply_text")
          .eq("user_id", user.id),

        supabase
          .from("gmb_questions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),

        supabase
          .from("gmb_questions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .or("answer_status.eq.pending,answer_text.is.null"),
      ]);

      const totalReviews = reviews?.length || 0;
      const avgRating =
        totalReviews > 0
          ? reviews!.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
          : 0;

      const repliedReviews =
        reviews?.filter(
          (r) =>
            r.has_reply === true ||
            (r.reply_text && r.reply_text.trim() !== ""),
        ).length || 0;

      const responseRate =
        totalReviews > 0 ? (repliedReviews / totalReviews) * 100 : 0;

      dashboardStats = {
        total_locations: totalLocations || 0,
        total_reviews: totalReviews,
        avg_rating: Math.round(avgRating * 100) / 100,
        pending_reviews: totalReviews - repliedReviews,
        replied_reviews: repliedReviews,
        total_questions: totalQuestions || 0,
        pending_questions: pendingQuestions || 0,
        recent_reviews: 0, // Would need date filtering
        avg_response_rate: responseRate,
        calculated_response_rate: responseRate,
        avg_response_time: "N/A",
      };
    }

    // Get trends data (reviews by month)
    const { data: trendsData } = await supabase
      .from("gmb_reviews")
      .select("review_date, rating")
      .eq("user_id", user.id)
      .order("review_date", { ascending: true });

    // Process trends by month
    const trendsByMonth: Record<
      string,
      { reviews: number; totalRating: number }
    > = {};
    trendsData?.forEach((review) => {
      if (review.review_date) {
        const date = new Date(review.review_date);
        const monthKey = date.toLocaleString("en", { month: "short" });
        if (!trendsByMonth[monthKey]) {
          trendsByMonth[monthKey] = { reviews: 0, totalRating: 0 };
        }
        trendsByMonth[monthKey].reviews++;
        trendsByMonth[monthKey].totalRating += review.rating || 0;
      }
    });

    const trends = Object.entries(trendsByMonth).map(([date, data]) => ({
      date,
      reviews: data.reviews,
      rating:
        data.reviews > 0
          ? Math.round((data.totalRating / data.reviews) * 10) / 10
          : 0,
    }));

    // Get rating distribution (demographics)
    const ratingCounts: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    trendsData?.forEach((review) => {
      const rating = Math.round(review.rating || 0);
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating]++;
      }
    });

    const demographics = [
      { name: "1 Star", value: ratingCounts[1] },
      { name: "2 Stars", value: ratingCounts[2] },
      { name: "3 Stars", value: ratingCounts[3] },
      { name: "4 Stars", value: ratingCounts[4] },
      { name: "5 Stars", value: ratingCounts[5] },
    ];

    // Build response
    const response = {
      // Core metrics
      totalLocations: dashboardStats.total_locations || 0,
      averageRating: Math.round((dashboardStats.avg_rating || 0) * 10) / 10,
      totalReviews: dashboardStats.total_reviews || 0,
      responseRate:
        Math.round((dashboardStats.calculated_response_rate || 0) * 10) / 10,

      // Pending items
      pendingReviews: dashboardStats.pending_reviews || 0,
      totalQuestions: dashboardStats.total_questions || 0,
      pendingQuestions: dashboardStats.pending_questions || 0,
      avgResponseTime: dashboardStats.avg_response_time || "N/A",

      // Additional stats
      repliedReviews: dashboardStats.replied_reviews || 0,
      recentReviews: dashboardStats.recent_reviews || 0,

      // Charts data
      trends,
      demographics,

      // Metadata
      lastUpdated: new Date().toISOString(),
      source: dashboardStats ? "view" : "calculated",
    };

    // Set cache headers
    const headers = new Headers({
      "Cache-Control": "private, max-age=60, stale-while-revalidate=240",
      ...Object.fromEntries(
        Object.entries(rateLimitHeaders).map(([k, v]) => [k, String(v)]),
      ),
    });

    return NextResponse.json(response, {
      status: 200,
      headers,
    });
  } catch (error) {
    apiLogger.error(
      "Dashboard stats API error",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: request.headers.get("x-request-id") || undefined },
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch dashboard statistics",
      },
      { status: 500 },
    );
  }
}
