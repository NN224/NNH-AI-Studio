import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId || userId !== user.id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Fetch reviews stats
    const [
      { count: totalReviews },
      { count: todayReviews },
      { count: weekReviews },
      { count: monthReviews },
      { count: pendingReviews },
      { data: reviews },
    ] = await Promise.all([
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte(
          "create_time",
          new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        ),
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte(
          "create_time",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        ),
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte(
          "create_time",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        ),
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("reply_text", null),
      supabase
        .from("gmb_reviews")
        .select("star_rating")
        .eq("user_id", userId)
        .limit(1000),
    ]);

    // Calculate average rating
    let averageRating = 0;
    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + (r.star_rating || 0), 0);
      averageRating = sum / reviews.length;
    }

    // Calculate rating distribution
    const ratingDistribution: Record<string, number> = {};
    if (reviews) {
      reviews.forEach((r) => {
        const rating = r.star_rating?.toString() || "0";
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      });
    }

    // Fetch response stats
    const { count: totalResponses } = await supabase
      .from("gmb_reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("reply_text", "is", null);

    const responseRate =
      totalReviews && totalReviews > 0
        ? Math.round(((totalResponses || 0) / totalReviews) * 100)
        : 0;

    // Fetch auto-reply stats
    const { count: autoReplies } = await supabase
      .from("auto_replies")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const stats = {
      reviews: {
        total: totalReviews || 0,
        today: todayReviews || 0,
        week: weekReviews || 0,
        month: monthReviews || 0,
        pending: pendingReviews || 0,
        averageRating: averageRating,
        ratingDistribution: ratingDistribution,
      },
      responses: {
        total: totalResponses || 0,
        averageTime: 0,
        responseRate: responseRate,
        autoReplies: autoReplies || 0,
      },
      performance: {
        views: 0,
        clicks: 0,
        conversions: 0,
        growth: {
          daily: 0,
          weekly: 0,
          monthly: 0,
        },
      },
      realtime: {
        activeUsers: 1,
        recentActivity: [],
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    apiLogger.error(
      "Error fetching realtime stats",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
