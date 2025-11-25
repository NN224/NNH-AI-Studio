"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getCacheValue,
  setCacheValue,
  CacheBucket,
} from "@/lib/cache/cache-manager";

export async function getDashboardStats() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== "AuthSessionMissingError") {
      console.error("Authentication error:", authError);
    }
    throw new Error("Not authenticated");
  }

  // Fetch locations with error handling
  const { data: locations, error: locationsError } = await supabase
    .from("gmb_locations")
    .select("*")
    .eq("user_id", user.id);

  if (locationsError) {
    console.error("Failed to fetch locations:", locationsError);
    throw new Error(`Database error: ${locationsError.message}`);
  }

  // Fetch reviews with error handling
  const { data: reviews, error: reviewsError } = await supabase
    .from("gmb_reviews")
    .select("*")
    .eq("user_id", user.id);

  if (reviewsError) {
    console.error("Failed to fetch reviews:", reviewsError);
    throw new Error(`Database error: ${reviewsError.message}`);
  }

  const totalLocations = locations?.length || 0;
  const totalReviews = reviews?.length || 0;
  const averageRating =
    reviews && reviews.length > 0
      ? (
          reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
        ).toFixed(1)
      : "0.0";

  const respondedReviews =
    reviews?.filter(
      (r) => typeof r.review_reply === "string" && r.review_reply.trim() !== "",
    ).length || 0;
  const responseRate =
    totalReviews > 0 ? Math.round((respondedReviews / totalReviews) * 100) : 0;

  return {
    totalLocations,
    totalReviews,
    averageRating,
    responseRate,
  };
}

export async function getActivityLogs(limit: number = 10) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { activities: [], error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { activities: [], error: error.message };
  }

  return { activities: data || [], error: null };
}

type MonthlyStatsContext = {
  supabase?: Awaited<ReturnType<typeof createClient>>;
  userId?: string;
};

export async function getMonthlyStats(context?: MonthlyStatsContext) {
  const supabase = context?.supabase ?? (await createClient());
  let resolvedUserId = context?.userId;

  if (!resolvedUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: "Not authenticated" };
    }
    resolvedUserId = user.id;
  }

  // First get active GMB account IDs
  const { data: activeAccounts } = await supabase
    .from("gmb_accounts")
    .select("id")
    .eq("user_id", resolvedUserId)
    .eq("is_active", true);

  const activeAccountIds = activeAccounts?.map((acc) => acc.id) || [];

  if (activeAccountIds.length === 0) {
    return { data: [], error: null, message: "No active GMB accounts" };
  }

  // Get active location IDs
  const { data: activeLocations } = await supabase
    .from("gmb_locations")
    .select("id")
    .eq("user_id", resolvedUserId)
    .in("gmb_account_id", activeAccountIds);

  const activeLocationIds = activeLocations?.map((loc) => loc.id) || [];

  if (activeLocationIds.length === 0) {
    return { data: [], error: null, message: "No locations found" };
  }

  // Get all reviews from active locations (prefer review_date over created_at)
  const { data: reviews, error } = await supabase
    .from("gmb_reviews")
    .select("rating, review_date, created_at")
    .eq("user_id", resolvedUserId)
    .in("location_id", activeLocationIds)
    .order("review_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch monthly stats:", error);
    return { data: [], error: error.message };
  }

  // Group reviews by month
  const monthlyData: Record<
    string,
    { total: number; sum: number; count: number }
  > = {};
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
    // Use review_date if available (actual review date), otherwise use created_at (when synced)
    const dateStr = review.review_date || review.created_at;
    if (!dateStr) return; // Skip reviews without any date

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return; // Skip invalid dates

    const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { total: 0, sum: 0, count: 0 };
    }

    monthlyData[monthKey].count += 1;
    monthlyData[monthKey].sum += review.rating || 0;
  });

  // Convert to chart format with proper sorting
  const chartData = Object.entries(monthlyData)
    .map(([monthYear, data]) => {
      const [month, year] = monthYear.split(" ");
      return {
        month: monthYear, // Keep full "Jan 2024" format for accuracy
        rating: data.count > 0 ? Number((data.sum / data.count).toFixed(1)) : 0,
        reviews: data.count,
        sortKey: new Date(`${month} 1, ${year}`).getTime(),
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ month, rating, reviews }) => ({ month, rating, reviews }));

  // If no data, return empty array instead of mock data
  if (chartData.length === 0) {
    return {
      data: [],
      error: null,
      message: "No reviews found",
    };
  }

  return { data: chartData, error: null };
}

/**
 * Get cached dashboard data for home page
 * Includes all stats needed for the home page with caching
 */
export async function getCachedDashboardData(userId: string) {
  const cacheKey = `${userId}:home-dashboard`;

  // Try to get from cache first
  const cached = await getCacheValue<any>(
    CacheBucket.DASHBOARD_OVERVIEW,
    cacheKey,
  );
  if (cached) {
    return { data: cached, fromCache: true };
  }

  // If not in cache, fetch from database
  const supabase = await createClient();

  try {
    // Fetch all data in parallel - optimized queries
    const [
      { count: locationsCount },
      { count: reviewsCount },
      { count: accountsCount },
      { data: youtubeToken },
      { count: repliedReviewsCount },
      { data: recentActivityDates },
      { data: recentReviews },
    ] = await Promise.all([
      supabase
        .from("gmb_locations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("gmb_reviews")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("gmb_accounts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("oauth_tokens")
        .select("metadata")
        .eq("user_id", userId)
        .eq("provider", "youtube")
        .maybeSingle(),
      supabase
        .from("gmb_reviews")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("reply_text", "is", null),
      supabase
        .from("gmb_reviews")
        .select("create_time, replied_at")
        .eq("user_id", userId)
        .order("create_time", { ascending: false })
        .limit(50),
      supabase
        .from("gmb_reviews")
        .select("review_id, comment, star_rating, create_time, location_name")
        .eq("user_id", userId)
        .order("create_time", { ascending: false })
        .limit(3),
    ]);

    // Calculate response rate
    const responseRate =
      reviewsCount && reviewsCount > 0
        ? Math.round(((repliedReviewsCount || 0) / reviewsCount) * 100)
        : 0;

    // Calculate streak
    let streak = 0;
    if (recentActivityDates && recentActivityDates.length > 0) {
      const dates = new Set<string>();
      recentActivityDates.forEach((item) => {
        if (item.create_time)
          dates.add(new Date(item.create_time).toDateString());
        if (item.replied_at)
          dates.add(new Date(item.replied_at).toDateString());
      });

      const sortedDates = Array.from(dates)
        .map((d) => new Date(d))
        .sort((a, b) => b.getTime() - a.getTime());

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastActivity = sortedDates[0];
      if (lastActivity) {
        const diffTime = Math.abs(today.getTime() - lastActivity.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
          streak = 1;
          for (let i = 0; i < sortedDates.length - 1; i++) {
            const current = sortedDates[i];
            const next = sortedDates[i + 1];
            const diff = Math.abs(current.getTime() - next.getTime());
            const days = Math.round(diff / (1000 * 60 * 60 * 24));

            if (days === 1) {
              streak++;
            } else {
              break;
            }
          }
        }
      }
    }

    // Calculate average rating
    let averageRating = "0.0";
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc("calculate_average_rating", { p_user_id: userId })
        .single();

      if (
        !rpcError &&
        rpcData &&
        typeof rpcData === "object" &&
        "avg" in rpcData
      ) {
        averageRating = (rpcData.avg as number).toFixed(1);
      }
    } catch {
      const { data: reviews } = await supabase
        .from("gmb_reviews")
        .select("star_rating")
        .eq("user_id", userId);

      if (reviews && reviews.length > 0) {
        const avg =
          reviews.reduce((sum, r) => sum + (r.star_rating || 0), 0) /
          reviews.length;
        averageRating = avg.toFixed(1);
      }
    }

    // YouTube stats
    const youtubeStats = youtubeToken?.metadata as unknown as {
      statistics?: { subscriberCount?: string | number };
    } | null;
    const youtubeSubs = youtubeStats?.statistics?.subscriberCount
      ? Number(youtubeStats.statistics.subscriberCount)
      : 0;
    const hasYouTube = !!youtubeToken;

    // Calculate today's reviews
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayReviewsCount } = await supabase
      .from("gmb_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("create_time", today.toISOString());

    // Calculate weekly growth
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [{ count: thisWeekCount }, { count: lastWeekCount }] =
      await Promise.all([
        supabase
          .from("gmb_reviews")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("create_time", weekAgo.toISOString()),
        supabase
          .from("gmb_reviews")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("create_time", twoWeeksAgo.toISOString())
          .lt("create_time", weekAgo.toISOString()),
      ]);

    const weeklyGrowth =
      lastWeekCount && lastWeekCount > 0
        ? Math.round(
            (((thisWeekCount || 0) - lastWeekCount) / lastWeekCount) * 100,
          )
        : 0;

    // Calculate reviews trend (single query)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (6 - i));
      return date;
    });

    const firstDay = last7Days[0];
    const { data: reviewsForTrend } = await supabase
      .from("gmb_reviews")
      .select("create_time")
      .eq("user_id", userId)
      .gte("create_time", firstDay.toISOString());

    const reviewsTrend = last7Days.map((date) => {
      const dateStr = date.toDateString();
      return (
        reviewsForTrend?.filter(
          (r) => new Date(r.create_time).toDateString() === dateStr,
        ).length || 0
      );
    });

    const dashboardData = {
      locationsCount,
      reviewsCount,
      accountsCount,
      repliedReviewsCount,
      responseRate,
      streak,
      averageRating,
      youtubeSubs,
      hasYouTube,
      todayReviewsCount,
      weeklyGrowth,
      reviewsTrend,
      recentReviews,
      hasAccounts: (accountsCount || 0) > 0 || hasYouTube,
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
    console.error("[getCachedDashboardData] Error:", error);
    throw error;
  }
}
