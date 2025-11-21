import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { SmartHeader } from "@/components/home/smart-header";
import { QuickActions } from "@/components/home/quick-actions";
import { StatsOverview } from "@/components/home/stats-overview";
import { EmptyState } from "@/components/home/empty-state";
import { ActivityFeed } from "@/components/home/activity-feed";
import { RecentActivity } from "@/components/home/recent-activity";
import { AIInsights } from "@/components/home/ai-insights";

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
    <div className="min-h-screen bg-background">
      {/* Subtle Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-accent/20 to-primary/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      {/* Smart Header */}
      <SmartHeader
        user={{
          name: profile?.full_name,
          email: user.email || "",
          avatar: profile?.avatar_url,
        }}
        notifications={0}
        lastLogin={new Date(user.last_sign_in_at || "").toLocaleString()}
      />

      {/* Main Content */}
      <main className="relative container mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <QuickActions />

        {/* Empty State or Dashboard */}
        {!hasAccounts ? (
          <EmptyState />
        ) : (
          <>
            {/* Stats Overview */}
            <StatsOverview
              stats={{
                locations: locationsCount || 0,
                reviews: reviewsCount || 0,
                avgRating: averageRating,
                accounts: accountsCount || 0,
                youtubeSubscribers: hasYouTube ? youtubeSubs : undefined,
              }}
            />

            {/* AI Insights - Full Width */}
            <AIInsights insights={insights} />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activity Feed - Takes 2 columns */}
              <div className="lg:col-span-2">
                <ActivityFeed activities={activities} />
              </div>

              {/* Recent Activity - Takes 1 column */}
              <div className="lg:col-span-1">
                <RecentActivity activities={activities} limit={5} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
