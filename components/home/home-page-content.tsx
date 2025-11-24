"use client";

import { motion } from "framer-motion";
import { CheckCircle, Building, Video, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { AISuggestions } from "@/components/home/ai-suggestions";
import { InteractiveStatsDashboard } from "@/components/home/interactive-stats-dashboard";
import { AchievementSystem } from "@/components/home/achievement-system";

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
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
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

  progressItems,
  activities,
  insights,
  responseRate,
  streak,
}: HomePageContentProps) {
  // Calculate completed tasks count
  const completedTasksCount = progressItems.filter(
    (item) => item.completed,
  ).length;

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <AnimatedBackground />

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
                  youtubeSubscribers: youtubeSubs
                    ? parseInt(youtubeSubs)
                    : undefined,
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
                  responseRate: responseRate,
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
                <Card className="p-4 border-orange-500/30 bg-linear-to-br from-orange-900/10 via-black to-purple-900/10">
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
