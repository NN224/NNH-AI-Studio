import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reviewsLogger } from "@/lib/utils/logger";

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

    const { data: reviews, error } = await supabase
      .from("gmb_reviews")
      .select(
        `
        id,
        rating,
        has_reply,
        has_response,
        reply_text,
        review_reply,
        review_date,
        gmb_locations!inner (user_id)
      `,
      )
      .eq("gmb_locations.user_id", user.id);

    if (error) {
      reviewsLogger.error(
        "Database error fetching review stats",
        error instanceof Error ? error : new Error(String(error)),
        { userId: user.id },
      );
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allReviews = reviews || [];
    const total = allReviews.length;
    const pending = allReviews.filter(
      (r) =>
        !r.has_reply && !r.has_response && !r.reply_text && !r.review_reply,
    ).length;
    const responded = total - pending;
    const responseRate =
      total > 0 ? Math.round((responded / total) * 100 * 10) / 10 : 0;

    const avgRating =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
          allReviews.length
        : 0;

    // Calculate trends (simplified - compare last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentReviews = allReviews.filter((r) => {
      const reviewDate = r.review_date ? new Date(r.review_date) : null;
      return reviewDate && reviewDate >= sevenDaysAgo;
    });

    const previousReviews = allReviews.filter((r) => {
      const reviewDate = r.review_date ? new Date(r.review_date) : null;
      return (
        reviewDate && reviewDate >= fourteenDaysAgo && reviewDate < sevenDaysAgo
      );
    });

    const totalTrend =
      previousReviews.length > 0
        ? Math.round(
            ((recentReviews.length - previousReviews.length) /
              previousReviews.length) *
              100,
          )
        : recentReviews.length > 0
          ? 100
          : 0;

    const totalTrendLabel =
      totalTrend > 0
        ? `+${recentReviews.length} this week`
        : totalTrend < 0
          ? `${recentReviews.length} this week`
          : "No change";

    const recentAvgRating =
      recentReviews.length > 0
        ? recentReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
          recentReviews.length
        : 0;

    const previousAvgRating =
      previousReviews.length > 0
        ? previousReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
          previousReviews.length
        : 0;

    const ratingTrend =
      previousAvgRating > 0
        ? Math.round(
            ((recentAvgRating - previousAvgRating) / previousAvgRating) *
              100 *
              10,
          ) / 10
        : 0;

    const ratingTrendLabel =
      ratingTrend > 0
        ? `+${ratingTrend.toFixed(1)}% this week`
        : ratingTrend < 0
          ? `${ratingTrend.toFixed(1)}% this week`
          : "No change";

    return NextResponse.json({
      total,
      pending,
      responded,
      responseRate,
      avgRating,
      totalTrend,
      responseRateTrend: 0, // Can be calculated similarly
      ratingTrend,
      totalTrendLabel,
      ratingTrendLabel,
    });
  } catch (error) {
    reviewsLogger.error(
      "Unexpected error in review stats API",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
