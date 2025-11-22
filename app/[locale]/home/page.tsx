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
import { AnimatedBackground } from "@/components/home/animated-background";
import { DashboardHero } from "@/components/home/dashboard-hero";
import { ProgressTracker } from "@/components/home/progress-tracker";
import { AIChatWidget } from "@/components/home/ai-chat-widget";
import { AchievementsBadge } from "@/components/home/achievements-badge";
import { EnhancedOnboarding } from "@/components/home/enhanced-onboarding";
import { DashboardCTAButtons } from "@/components/home/dashboard-cta-buttons";
import { SmartNotifications } from "@/components/home/smart-notifications";
import { AISuggestions } from "@/components/home/ai-suggestions";
import { InteractiveStatsDashboard } from "@/components/home/interactive-stats-dashboard";
import { AchievementSystem } from "@/components/home/achievement-system";
import { motion } from "framer-motion";
import { CheckCircle, Building, Video, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";

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
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (6 - i));
      return date;
    });

    // Fetch reviews count per day for last 7 days
    const reviewsTrendPromises = last7Days.map(async (startDate) => {
      const endDate = new Date(startDate);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      const { count } = await supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("create_time", startDate.toISOString())
        .lt("create_time", endDate.toISOString());
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
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Smart Header */}
      <SmartHeader
        user={{
          name: profile?.full_name,
          email: user!.email || "",
          avatar: profile?.avatar_url,
        }}
        notifications={0}
        lastLogin={new Date(user!.last_sign_in_at || "").toLocaleString()}
      />

      {/* Main Content */}
      <main className="relative container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {!hasAccounts ? (
          /* Empty State for new users */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-[calc(100vh-200px)] flex items-center justify-center"
          >
            <EmptyState />
          </motion.div>
        ) : (
          /* Full Dashboard Layout */
          <div className="space-y-6 lg:space-y-8">
            {/* Top Section: Hero + Progress */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Dashboard Hero - Takes more space */}
              <div className="xl:col-span-8">
                <DashboardHero
                  userName={profile?.full_name}
                  timeOfDay={getTimeOfDay()}
                  stats={{
                    todayReviews: todayReviewsCount || 0,
                    weeklyGrowth: weeklyGrowth,
                    totalReviews: reviewsCount || 0,
                    averageRating: parseFloat(averageRating) || 0,
                    responseRate: 85, // Mock data - calculate from actual responses
                  }}
                  profileCompletion={
                    (completedTasksCount / progressItems.length) * 100
                  }
                  streak={7} // Mock data - calculate from actual activity
                  achievements={[
                    {
                      id: "first-review",
                      icon: "⭐",
                      title: "First Review Reply",
                    },
                    { id: "week-streak", icon: "🔥", title: "7 Day Streak" },
                    {
                      id: "100-reviews",
                      icon: "💯",
                      title: "100 Reviews Managed",
                    },
                  ]}
                />
              </div>

              {/* Progress Tracker - Sidebar */}
              <div className="xl:col-span-4">
                <ProgressTracker
                  items={progressItems.map((item) => ({
                    ...item,
                    icon:
                      item.id === "profile-complete"
                        ? CheckCircle
                        : item.id === "connect-gmb"
                          ? Building
                          : item.id === "connect-youtube"
                            ? Video
                            : MessageSquare,
                    reward: {
                      points: item.completed ? 100 : 50,
                      badge: item.completed ? "✅" : undefined,
                    },
                    difficulty: item.id === "first-review" ? "hard" : "easy",
                    description:
                      item.id === "profile-complete"
                        ? "Add your avatar and business details"
                        : item.id === "connect-gmb"
                          ? "Connect your Google Business account to manage reviews"
                          : item.id === "connect-youtube"
                            ? "Link your YouTube channel for video management"
                            : "Reply to customer reviews to build trust",
                  }))}
                  hideWhenComplete={false}
                  showRewards={true}
                />
              </div>
            </div>

            {/* Dashboard CTAs - Only show if not all accounts connected */}
            {(accountsCount || 0) < 2 && <DashboardCTAButtons />}

            {/* Quick Actions - Full Width with new design */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <QuickActions />
            </motion.div>

            {/* Stats Overview with Charts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <StatsOverview
                stats={{
                  locations: locationsCount || 0,
                  reviews: reviewsCount || 0,
                  avgRating: averageRating,
                  accounts: accountsCount || 0,
                  youtubeSubscribers: youtubeSubs,
                }}
                trends={{
                  reviewsTrend: reviewsTrend,
                }}
              />
            </motion.div>

            {/* AI Suggestions Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <AISuggestions
                userId={user.id}
                businessData={{
                  reviewCount: reviewsCount || 0,
                  avgRating: parseFloat(averageRating) || 0,
                  responseRate: 85, // Mock data
                  lastActivity: new Date(),
                }}
              />
            </motion.div>

            {/* Interactive Charts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <InteractiveStatsDashboard userId={user.id} />
            </motion.div>

            {/* Middle Section: AI Insights + Achievements */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* AI Insights - Main Content */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="xl:col-span-8"
              >
                <AIInsights insights={insights} />
              </motion.div>

              {/* Achievement System - Sidebar */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="xl:col-span-4 space-y-6"
              >
                <AchievementsBadge />
                <Card className="p-4 border-orange-500/30 bg-gradient-to-br from-orange-900/10 via-black to-purple-900/10">
                  <h3 className="text-lg font-semibold mb-3">Your Progress</h3>
                  <AchievementSystem
                    userId={user.id}
                    userLevel={3}
                    userPoints={850}
                  />
                </Card>
              </motion.div>
            </div>

            {/* Bottom Section: Activity Feed + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Activity Feed - Main Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="lg:col-span-8"
              >
                <ActivityFeed activities={activities} />
              </motion.div>

              {/* Recent Activity - Sidebar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="lg:col-span-4"
              >
                <RecentActivity activities={activities} limit={5} />
              </motion.div>
            </div>
          </div>
        )}
      </main>

      {/* AI Chat Widget - Floating Assistant */}
      <AIChatWidget />

      {/* Onboarding Tour - First time users */}
      <EnhancedOnboarding />
    </div>
  );
}
