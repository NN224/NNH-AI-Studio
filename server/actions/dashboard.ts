"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getCacheValue,
  setCacheValue,
  CacheBucket,
} from "@/lib/cache/cache-manager";

export async function getCachedDashboardData(userId: string) {
  const cacheKey = `${userId}:home-dashboard`;

  // Try cache first
  const cached = await getCacheValue<any>(
    CacheBucket.DASHBOARD_OVERVIEW,
    cacheKey,
  );
  if (cached) {
    return { data: cached, fromCache: true };
  }

  const supabase = await createClient();

  try {
    // 1. Fetch counts efficiently
    const [
      { count: locationsCount },
      { count: reviewsCount },
      { count: accountsCount },
      { count: repliedReviewsCount },
    ] = await Promise.all([
      supabase
        .from("gmb_locations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_active", true),
      supabase
        .from("gmb_reviews")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("gmb_accounts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_active", true),
      supabase
        .from("gmb_reviews")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("has_reply", true),
    ]);

    // 2. Fetch Recent Reviews (Using NEW Schema columns)
    const { data: recentReviews } = await supabase
      .from("gmb_reviews")
      .select(
        `
        review_id,
        reviewer_name,
        rating,
        review_text,
        review_date,
        gmb_locations!inner(location_name)
      `,
      )
      .eq("user_id", userId)
      .order("review_date", { ascending: false })
      .limit(5);

    // Transform for UI
    const formattedRecentReviews =
      recentReviews?.map((r) => ({
        review_id: r.review_id,
        comment: r.review_text, // Map to UI expectation
        star_rating: r.rating,
        create_time: r.review_date,
        reviewer_name: r.reviewer_name,
        location_name: r.gmb_locations?.location_name,
      })) || [];

    // 3. Calculate Response Rate & Rating
    const responseRate =
      reviewsCount && reviewsCount > 0
        ? Math.round(((repliedReviewsCount || 0) / reviewsCount) * 100)
        : 0;

    // Use RPC or fallback for average rating
    let averageRating = "0.0";
    const { data: ratingData } = await supabase
      .from("gmb_reviews")
      .select("rating")
      .eq("user_id", userId);

    if (ratingData && ratingData.length > 0) {
      const sum = ratingData.reduce((acc, curr) => acc + (curr.rating || 0), 0);
      averageRating = (sum / ratingData.length).toFixed(1);
    }

    // 4. Calculate Trends (Simple Weekly Growth)
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { count: thisWeekReviews } = await supabase
      .from("gmb_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("review_date", lastWeek.toISOString());

    const dashboardData = {
      locationsCount: locationsCount || 0,
      reviewsCount: reviewsCount || 0,
      accountsCount: accountsCount || 0,
      repliedReviewsCount: repliedReviewsCount || 0,
      responseRate,
      averageRating,
      weeklyGrowth: thisWeekReviews || 0,
      recentReviews: formattedRecentReviews,
      hasAccounts: (accountsCount || 0) > 0,
    };

    // Cache for 5 minutes
    await setCacheValue(
      CacheBucket.DASHBOARD_OVERVIEW,
      cacheKey,
      dashboardData,
      300,
    );

    return { data: dashboardData, fromCache: false };
  } catch (error) {
    console.error("[Dashboard] Error fetching data:", error);
    throw error;
  }
}
