// app/api/reviews/pending/route.ts

import { createClient } from "@/lib/supabase/server";
import { reviewsLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      reviewsLogger.error(
        "Auth error",
        authError instanceof Error ? authError : new Error(String(authError)),
      );

      return NextResponse.json(
        { error: "Unauthorized", details: "Please log in to view reviews" },

        { status: 401 },
      );
    }

    reviewsLogger.info("Fetching all reviews", { userId: user.id });

    const { data: reviews, error } = await supabase

      .from("gmb_reviews")

      .select(
        `

        *,

        gmb_locations!inner (

          id,

          location_name,

          address,

          user_id

        )

      `,
      )

      .eq("gmb_locations.user_id", user.id)

      .order("review_date", { ascending: false, nullsFirst: false })

      .limit(100);

    if (error) {
      reviewsLogger.error(
        "Database error fetching pending reviews",
        error instanceof Error ? error : new Error(String(error)),
        { userId: user.id },
      );

      return NextResponse.json(
        { error: "Failed to fetch reviews", details: error.message },

        { status: 500 },
      );
    }

    reviewsLogger.info("Found reviews", { count: reviews?.length || 0 });

    // Calculate stats
    const allReviews = reviews || [];
    const needsResponse = allReviews.filter(
      (r) =>
        !r.has_reply && !r.has_response && !r.reply_text && !r.review_reply,
    );
    const responded = allReviews.filter(
      (r) => r.has_reply || r.has_response || r.reply_text || r.review_reply,
    );

    // Smart sorting: Priority 1 = Needs Response, Priority 2 = Rating (negative first), Priority 3 = Date
    const sortedReviews = allReviews.sort((a, b) => {
      // Priority 1: Needs response at the top
      const aNeedsResponse =
        !a.has_reply && !a.has_response && !a.reply_text && !a.review_reply;
      const bNeedsResponse =
        !b.has_reply && !b.has_response && !b.reply_text && !b.review_reply;

      if (aNeedsResponse && !bNeedsResponse) return -1;
      if (!aNeedsResponse && bNeedsResponse) return 1;

      // Priority 2: Rating (negative reviews first)
      if (a.rating <= 2 && b.rating > 2) return -1;
      if (a.rating > 2 && b.rating <= 2) return 1;
      if (a.rating === 3 && b.rating !== 3) return -1; // Neutral after negative
      if (a.rating !== 3 && b.rating === 3) return 1;

      // Priority 3: Date (newest first)
      const aDate = a.review_date ? new Date(a.review_date).getTime() : 0;
      const bDate = b.review_date ? new Date(b.review_date).getTime() : 0;
      return bDate - aDate;
    });

    // Calculate response rate
    const responseRate =
      allReviews.length > 0
        ? Math.round((responded.length / allReviews.length) * 100 * 10) / 10
        : 0;

    return NextResponse.json({
      reviews: sortedReviews,

      total: sortedReviews.length,
      stats: {
        total: allReviews.length,
        needsResponse: needsResponse.length,
        responded: responded.length,
        responseRate,
      },
    });
  } catch (error) {
    reviewsLogger.error(
      "Unexpected error in pending reviews API",
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      { error: "Internal server error", details: String(error) },

      { status: 500 },
    );
  }
}
