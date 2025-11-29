"use server";

import {
  CacheBucket,
  getCacheValue,
  setCacheValue,
} from "@/lib/cache/cache-manager";
import { createClient } from "@/lib/supabase/server";

// Import new dashboard services
import { getDashboardData } from "@/app/[locale]/(dashboard)/dashboard/actions";

// ==========================================
// 1. Core Statistics (Legacy & API Support)
// ==========================================

export async function getDashboardStats() {
  // Use new dashboard service with caching
  const cacheKey = "dashboard-stats";
  const cached = await getCacheValue(CacheBucket.DASHBOARD_OVERVIEW, cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const dashboardData = await getDashboardData();
    const stats = dashboardData.stats;

    // Transform to legacy format for backward compatibility
    const legacyStats = {
      totalLocations: stats.locations_count,
      averageRating: stats.average_rating,
      totalReviews: stats.reviews_count,
      responseRate: stats.response_rate_percent,
      pendingReviews: 0, // Calculate if needed
      totalQuestions: 0, // Calculate if needed
      pendingQuestions: 0, // Calculate if needed
      avgResponseTime: "0h", // Calculate if needed
      repliedReviews: stats.replied_reviews_count,
      recentReviews: stats.today_reviews_count,
      lastUpdated: new Date().toISOString(),
      source: "new-dashboard-service",
      hasAccounts: stats.has_accounts,
      hasYoutube: stats.has_youtube,
      youtubeSubs: stats.youtube_subs,
      weeklyGrowth: stats.weekly_growth,
      reviewsTrend: stats.reviews_trend,
      streak: stats.streak,
    };

    // Cache for 5 minutes
    await setCacheValue(
      CacheBucket.DASHBOARD_OVERVIEW,
      cacheKey,
      legacyStats,
      300,
    );

    return legacyStats;
  } catch (error) {
    console.error("[getDashboardStats] Error:", error);
    // Fallback to original implementation if new service fails
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Not authenticated");
    }

    // Fetch basic counts
    const { count: totalLocations } = await supabase
      .from("gmb_locations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);

    const { data: reviews, error: reviewsError } = await supabase
      .from("gmb_reviews")
      .select("rating, has_reply")
      .eq("user_id", user.id);

    if (reviewsError) throw new Error(reviewsError.message);

    const totalReviews = reviews?.length || 0;

    const averageRating =
      reviews && reviews.length > 0
        ? (
            reviews.reduce((acc, r) => acc + (r.rating || 0), 0) /
            reviews.length
          ).toFixed(1)
        : "0.0";

    const respondedReviews = reviews?.filter((r) => r.has_reply).length || 0;

    const responseRate =
      totalReviews > 0
        ? Math.round((respondedReviews / totalReviews) * 100)
        : 0;

    return {
      totalLocations: totalLocations || 0,
      totalReviews,
      averageRating,
      responseRate,
    };
  }
}

export async function getActivityLogs(limit: number = 10) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { activities: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { activities: [], error: error.message };

  return { activities: data || [], error: null };
}

type MonthlyStatsContext = {
  supabase?: Awaited<ReturnType<typeof createClient>>;
  userId?: string;
};

// This function was missing and causing the build error
export async function getMonthlyStats(context?: MonthlyStatsContext) {
  const supabase = context?.supabase ?? (await createClient());
  let resolvedUserId = context?.userId;

  if (!resolvedUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: [], error: "Not authenticated" };
    resolvedUserId = user.id;
  }

  // Get active reviews with dates using NEW schema columns
  const { data: reviews, error } = await supabase
    .from("gmb_reviews")
    .select("rating, review_date, created_at")
    .eq("user_id", resolvedUserId)
    .order("review_date", { ascending: true, nullsFirst: false });

  if (error) return { data: [], error: error.message };

  // Group by month
  const monthlyData: Record<string, { sum: number; count: number }> = {};
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  reviews?.forEach((review) => {
    // Prefer review_date (actual Google date), fallback to created_at
    const dateStr = review.review_date || review.created_at;
    if (!dateStr) return;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;

    const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { sum: 0, count: 0 };
    }

    monthlyData[monthKey].count += 1;
    monthlyData[monthKey].sum += review.rating || 0;
  });

  const chartData = Object.entries(monthlyData)
    .map(([monthYear, data]) => {
      const [month, year] = monthYear.split(" ");
      return {
        month: monthYear,
        rating: data.count > 0 ? Number((data.sum / data.count).toFixed(1)) : 0,
        reviews: data.count,
        sortKey: new Date(`${month} 1, ${year}`).getTime(),
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ month, rating, reviews }) => ({ month, rating, reviews }));

  return { data: chartData, error: null };
}

// ==========================================
// 2. Cached Dashboard Data (Main Home Logic)
// ==========================================

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
    const formattedRecentReviews = (recentReviews || []).map((r: any) => {
      // Supabase join can return an object or an array depending on relation typing
      const loc = Array.isArray(r.gmb_locations)
        ? r.gmb_locations[0]
        : r.gmb_locations;
      return {
        review_id: r.review_id,
        comment: r.review_text, // Map to UI expectation
        star_rating: r.rating,
        create_time: r.review_date,
        reviewer_name: r.reviewer_name,
        location_name: loc?.location_name ?? null,
      };
    });

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
