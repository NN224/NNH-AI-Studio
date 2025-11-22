import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { HomePageContent } from "@/components/home/home-page-content";

export const metadata: Metadata = {
  title: "Home | NNH - AI Studio",
  description: "Your AI-powered business management dashboard",
};

export default async function HomePage({
  params,
}: {
  params: { locale: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const locale =
    typeof params.locale === "string" ? params.locale : (await params).locale;

  if (error || !user) {
    redirect(`/${locale}/auth/login`);
  }

  // Type assertion: user is guaranteed to be non-null after the redirect check
  const userId = user!.id;

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  // Fetch stats in parallel
  const [
    { count: locationsCount },
    { count: reviewsCount },
    { count: accountsCount },
    { data: youtubeToken },
  ] = await Promise.all([
    supabase
      .from("gmb_locations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("gmb_reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("gmb_accounts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("oauth_tokens")
      .select("metadata")
      .eq("user_id", userId)
      .eq("provider", "youtube")
      .maybeSingle(),
  ]);

  // Calculate average rating
  let averageRating = "0.0";
  try {
    const { data: rpcData } = await supabase
      .rpc("calculate_average_rating", { p_user_id: userId })
      .single();

    if (rpcData && typeof rpcData === "object" && "avg" in rpcData) {
      averageRating = (rpcData.avg as number).toFixed(1);
    }
  } catch {
    const { data: reviews } = await supabase
      .from("gmb_reviews")
      .select("star_rating")
      .eq("user_id", userId)
      .limit(1000);

    if (reviews && reviews.length > 0) {
      const avg =
        reviews.reduce((sum, r) => sum + (r.star_rating || 0), 0) /
        reviews.length;
      averageRating = avg.toFixed(1);
    }
  }

  // YouTube stats
  const youtubeStats = youtubeToken?.metadata as any;
  const youtubeSubs = youtubeStats?.statistics?.subscriberCount
    ? Number(youtubeStats.statistics.subscriberCount)
    : 0;
  const hasYouTube = !!youtubeToken;
  const hasAccounts = (accountsCount || 0) > 0 || hasYouTube;

  // Calculate today's reviews count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: todayReviewsCount } = await supabase
    .from("gmb_reviews")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("create_time", today.toISOString());

  // Calculate weekly growth (comparing this week vs last week)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const [{ count: thisWeekCount }, { count: lastWeekCount }] =
    await Promise.all([
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("create_time", weekAgo.toISOString()),
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
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

  // Calculate trend data for last 7 days (for sparkline charts)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    return date.toISOString().split("T")[0];
  });

  // Fetch reviews count per day for last 7 days
  const reviewsTrendPromises = last7Days.map(async (date) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const { count } = await supabase
      .from("gmb_reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("create_time", date)
      .lt("create_time", nextDate.toISOString().split("T")[0]);
    return count || 0;
  });

  const reviewsTrend = await Promise.all(reviewsTrendPromises);

  // Calculate time of day for greeting
  const getTimeOfDay = (): "morning" | "afternoon" | "evening" | "night" => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
  };

  // Build progress tracker items
  const progressItems = [
    {
      id: "profile-complete",
      label: "Complete your profile information",
      completed: !!(profile?.full_name && profile?.avatar_url),
      href: "/settings",
    },
    {
      id: "connect-gmb",
      label: "Connect Google My Business account",
      completed: (accountsCount || 0) > 0,
      href: "/settings",
    },
    {
      id: "connect-youtube",
      label: "Connect YouTube channel",
      completed: hasYouTube,
      href: "/youtube-dashboard",
    },
    {
      id: "first-review",
      label: "Respond to your first review",
      completed: (reviewsCount || 0) > 0,
      href: "/reviews",
    },
  ];

  // Calculate completed tasks count
  const completedTasksCount = progressItems.filter(
    (item) => item.completed,
  ).length;

  // Fetch recent activities
  const { data: recentReviews } = await supabase
    .from("gmb_reviews")
    .select("review_id, comment, star_rating, create_time, location_name")
    .eq("user_id", userId)
    .order("create_time", { ascending: false })
    .limit(3);

  // Build activities array
  const activities = [];

  if (recentReviews) {
    for (const review of recentReviews) {
      activities.push({
        id: review.review_id,
        type: "review" as const,
        title: `New ${review.star_rating}-star review`,
        description: review.comment || "No comment provided",
        timestamp: new Date(review.create_time),
        metadata: {
          rating: review.star_rating,
          location: review.location_name,
        },
        actionUrl: "/reviews",
      });
    }
  }

  // Build AI Insights based on user data
  const insights = [];

  // Check for pending reviews
  if (recentReviews && recentReviews.length > 0) {
    const unansweredReviews = recentReviews.filter((r) => !r.comment);
    if (unansweredReviews.length > 0) {
      insights.push({
        id: "pending-reviews",
        type: "alert" as const,
        title: `${unansweredReviews.length} reviews need your response`,
        description:
          "Responding to reviews quickly improves your business rating and customer trust.",
        priority: "high" as const,
        actionText: "Reply Now",
        actionUrl: "/reviews",
        impact: "+15% customer engagement",
      });
    }
  }

  // Rating analysis
  if (reviewsCount && reviewsCount > 5) {
    const avgRatingNum = parseFloat(averageRating);
    if (avgRatingNum < 4.0) {
      insights.push({
        id: "low-rating",
        type: "alert" as const,
        title: "Your average rating needs attention",
        description: `Current rating is ${averageRating}/5.0. Focus on addressing negative feedback to improve your score.`,
        priority: "high" as const,
        actionText: "View Insights",
        actionUrl: "/analytics",
        impact: "Potential +0.5 rating improvement",
      });
    } else if (avgRatingNum >= 4.5) {
      insights.push({
        id: "great-rating",
        type: "success" as const,
        title: "Excellent rating performance!",
        description: `You're maintaining a strong ${averageRating}/5.0 rating. Keep up the great work!`,
        priority: "low" as const,
      });
    }
  }

  // Growth opportunity
  if (locationsCount && locationsCount < 3) {
    insights.push({
      id: "add-locations",
      type: "recommendation" as const,
      title: "Expand your business presence",
      description:
        "Add more locations to reach a wider audience and increase your visibility.",
      priority: "medium" as const,
      actionText: "Add Location",
      actionUrl: "/locations",
      impact: "+30% reach potential",
    });
  }

  // YouTube opportunity
  if (!hasYouTube) {
    insights.push({
      id: "connect-youtube",
      type: "tip" as const,
      title: "Connect your YouTube channel",
      description:
        "Manage your videos, analytics, and comments all in one place with AI-powered tools.",
      priority: "medium" as const,
      actionText: "Connect Now",
      actionUrl: "/youtube-dashboard",
      impact: "Unified content management",
    });
  }

  return (
    <HomePageContent
      user={user!}
      profile={profile}
      hasAccounts={hasAccounts}
      accountsCount={accountsCount}
      locationsCount={locationsCount}
      reviewsCount={reviewsCount}
      averageRating={averageRating}
      todayReviewsCount={todayReviewsCount}
      weeklyGrowth={weeklyGrowth}
      reviewsTrend={reviewsTrend}
      youtubeSubs={youtubeSubs ? youtubeSubs.toString() : null}
      hasYouTube={hasYouTube}
      progressItems={progressItems}
      activities={activities}
      insights={insights}
    />
  );
}
