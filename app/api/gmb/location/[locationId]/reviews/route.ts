import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locationId = params.locationId;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Fetch reviews for the specific location
    const {
      data: reviews,
      error: reviewsError,
      count,
    } = await supabase
      .from("gmb_reviews")
      .select("*", { count: "exact" })
      .eq("location_id", locationId)
      .eq("user_id", user.id)
      .order("review_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (reviewsError) {
      console.error("Reviews fetch error:", reviewsError);
      return NextResponse.json(
        { error: "Failed to fetch reviews" },
        { status: 500 },
      );
    }

    // Calculate basic stats
    const totalReviews = count || 0;
    const averageRating =
      reviews && reviews.length > 0
        ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) /
          reviews.length
        : 0;

    const pendingReplies = reviews
      ? reviews.filter((review) => !review.reply_text).length
      : 0;

    return NextResponse.json({
      reviews: reviews || [],
      pagination: {
        page,
        limit,
        total: totalReviews,
        totalPages: Math.ceil(totalReviews / limit),
        hasNext: offset + limit < totalReviews,
        hasPrev: page > 1,
      },
      stats: {
        total: totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        pendingReplies,
      },
    });
  } catch (error) {
    console.error("Reviews API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
