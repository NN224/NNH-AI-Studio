"use client";

import { motion } from "framer-motion";
import { CheckCircle, Building, Video, MessageSquare } from "lucide-react";
import { SmartHeader } from "@/components/home/smart-header";
import { QuickActions } from "@/components/home/quick-actions";
import { StatsOverview } from "@/components/home/stats-overview";
import { EmptyState } from "@/components/home/empty-state";
import { RecentActivity } from "@/components/home/recent-activity";
import { AIInsights } from "@/components/home/ai-insights";
import { AnimatedBackground } from "@/components/home/animated-background";
import { DashboardHero } from "@/components/home/dashboard-hero";
import { ProgressTracker } from "@/components/home/progress-tracker";
import { AIChatWidget } from "@/components/home/ai-chat-widget";
import { EnhancedOnboarding } from "@/components/home/enhanced-onboarding";
import { DashboardCTAButtons } from "@/components/home/dashboard-cta-buttons";
import { AISuggestions } from "@/components/home/ai-suggestions";
import { AchievementSystem } from "@/components/home/achievement-system";
import type {
  UserProgress,
  UserAchievement,
} from "@/server/actions/achievements";
import { InteractiveStatsDashboard } from "@/components/home/interactive-stats-dashboard";

interface HomePageContentProps {
  user: {
    id: string;
    email?: string;
    last_sign_in_at?: string;
  };
  profile: {
    full_name?: string;
    avatar_url?: string;
  } | null;
  hasAccounts: boolean;
  accountsCount: number | null;
  locationsCount: number | null;
  reviewsCount: number | null;
  averageRating: string;
  todayReviewsCount: number | null;
  weeklyGrowth: number;
  reviewsTrend: number[];
  youtubeSubs: string | null;
  hasYouTube: boolean;
  progressItems: Array<{
    id: string;
    label: string;
    completed: boolean;
    href: string;
  }>;
  activities: Array<{
    id: string;
    type: "review" | "youtube" | "location" | "post";
    title: string;
    description: string;
    timestamp: Date;
    metadata?: any;
    actionUrl?: string;
  }>;
  insights: Array<{
    id: string;
    type: "alert" | "success" | "recommendation" | "tip";
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    actionText?: string;
    actionUrl?: string;
    impact?: string;
  }>;
  responseRate: number;
  streak: number;
  timeOfDay?: "morning" | "afternoon" | "evening" | "night"; // Optional: calculated on server to avoid hydration mismatch
  lastLogin?: string;
  userProgress?: UserProgress | null;
  userAchievements?: UserAchievement[];
}

export function HomePageContent({
  user,
  profile,
  hasAccounts,
  accountsCount,
  locationsCount,
  reviewsCount,
  averageRating,
  todayReviewsCount,
  weeklyGrowth,
  reviewsTrend,
  youtubeSubs,
  hasYouTube,
  progressItems,
  activities,
  insights,
  responseRate,
  streak,
  timeOfDay: serverTimeOfDay,
  lastLogin,
  userProgress,
  userAchievements = [],
}: HomePageContentProps) {
  // Calculate completed tasks count
  const completedTasksCount = progressItems.filter(
    (item) => item.completed,
  ).length;

  // Use server-provided timeOfDay (always provided now to avoid hydration mismatch)
  const timeOfDay = serverTimeOfDay || "morning";

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Smart Header */}
      <SmartHeader
        user={{
          id: user.id,
          name: profile?.full_name,
          email: user.email || "",
          avatar: profile?.avatar_url,
        }}
        lastLogin={lastLogin}
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
          /* Full Dashboard Layout - OPTIMIZED */
          <div className="space-y-6">
            {/* Top Section: Hero + Progress */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Dashboard Hero - Takes more space */}
              <div className="xl:col-span-8">
                <DashboardHero
                  userName={profile?.full_name}
                  timeOfDay={timeOfDay}
                  stats={{
                    todayReviews: todayReviewsCount || 0,
                    weeklyGrowth: weeklyGrowth,
                    totalReviews: reviewsCount || 0,
                    averageRating: parseFloat(averageRating) || 0,
                    responseRate: responseRate,
                  }}
                  profileCompletion={
                    (completedTasksCount / progressItems.length) * 100
                  }
                  streak={streak}
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

            {/* Quick Actions - Full Width */}
            <QuickActions />

            {/* Stats Overview */}
            <StatsOverview
              stats={{
                locations: locationsCount || 0,
                reviews: reviewsCount || 0,
                avgRating: averageRating,
                accounts: accountsCount || 0,
                youtubeSubscribers: youtubeSubs
                  ? parseInt(youtubeSubs)
                  : undefined,
              }}
              trends={{
                reviewsTrend: reviewsTrend,
              }}
            />

            {/* AI Suggestions */}
            <AISuggestions
              userId={user.id}
              businessData={{
                reviewCount: reviewsCount || 0,
                avgRating: parseFloat(averageRating) || 0,
                responseRate: responseRate,
                lastActivity: new Date(),
              }}
            />

            {/* Interactive Dashboard */}
            <InteractiveStatsDashboard />

            {/* AI Insights + Achievements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Insights */}
              <AIInsights insights={insights} />

              {/* Achievement System */}
              <AchievementSystem
                userId={user.id}
                initialProgress={userProgress}
                initialAchievements={userAchievements}
              />
            </div>

            {/* Recent Activity */}
            <RecentActivity activities={activities} limit={10} />
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
