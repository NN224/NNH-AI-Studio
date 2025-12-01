"use client";

import { AIActivityPulse } from "@/components/home/ai-activity-pulse";
import { AIChatWidgetEnhanced } from "@/components/home/ai-chat-widget-enhanced";
import { AIHeroSection } from "@/components/home/ai-hero-section";
import { AISmartInsights } from "@/components/home/ai-smart-insights";
import { AnimatedBackground } from "@/components/home/animated-background";
import { BusinessProfileCard } from "@/components/home/business-profile-card";
import { CompetitorsCard } from "@/components/home/competitors-card";
import { DashboardCTAButtons } from "@/components/home/dashboard-cta-buttons";
import { DashboardHero } from "@/components/home/dashboard-hero";
import { EmptyState } from "@/components/home/empty-state";
import { InteractiveStatsDashboard } from "@/components/home/interactive-stats-dashboard";
import { KeywordsCard } from "@/components/home/keywords-card";
import { ManagementQuickStats } from "@/components/home/management-quick-stats";
import { SimpleProgressTracker } from "@/components/home/progress-tracker-simple";
import { QuickActions } from "@/components/home/quick-actions";
import { SmartAISuggestions } from "@/components/home/smart-ai-suggestions";
import { SmartHeader } from "@/components/home/smart-header";
import { logger } from "@/lib/utils/logger";
// Direct imports for better tree-shaking
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { WelcomeBack } from "@/components/onboarding/WelcomeBack";
import { useHomeData } from "@/hooks/use-home-data";
import { motion } from "framer-motion";
import { Bot, Building2, MessageSquare, Settings } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";

// Lazy load UrgentItemsFeed for better performance
const UrgentItemsFeed = dynamic(
  () =>
    import("@/components/ai-command-center/urgent/urgent-items-feed").then(
      (mod) => mod.UrgentItemsFeed,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 bg-zinc-900/50 rounded-lg animate-pulse" />
    ),
  },
);

interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

interface PrimaryLocation {
  id: string;
  location_name: string;
  logo_url?: string;
  cover_photo_url?: string;
  address?: string;
  phone?: string;
  category?: string;
  website?: string;
  rating?: number;
  review_count?: number;
  response_rate?: number;
  health_score?: number;
  profile_completeness?: number;
  business_hours?: BusinessHours;
  is_verified?: boolean;
  menu_url?: string;
  booking_url?: string;
  order_url?: string;
  appointment_url?: string;
  latitude?: number;
  longitude?: number;
}

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
  reviewsCount: number | null;
  averageRating: string;
  todayReviewsCount: number | null;
  weeklyGrowth: number;
  progressItems: Array<{
    id: string;
    label: string;
    completed: boolean;
    href: string;
  }>;
  responseRate: number;
  streak: number;
  lastLogin?: string;
  businessName?: string;
  businessLogo?: string;
  primaryLocation?: PrimaryLocation | null;
  pendingReviewsCount?: number;
  hasAutoReply?: boolean;
}

export function HomePageContent({
  user,
  profile,
  hasAccounts,
  accountsCount,
  reviewsCount,
  averageRating,
  todayReviewsCount,
  weeklyGrowth,
  progressItems,
  responseRate,
  streak,
  lastLogin,
  businessName,
  businessLogo,
  primaryLocation,
  pendingReviewsCount = 0,
  hasAutoReply = false,
}: HomePageContentProps) {
  const router = useRouter();
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [hasShownWelcomeBack, setHasShownWelcomeBack] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<
    "morning" | "afternoon" | "evening" | "night"
  >("morning");

  // 🔴 HYBRID DATA: Use live data from hook, fallback to SSR props
  const { managementStats } = useHomeData();

  // Use live data if available, otherwise fall back to SSR
  const liveReviewCount = managementStats?.reviews?.total;
  const livePendingReviews = managementStats?.reviews?.pending;
  const liveResponseRate = managementStats?.reviews?.responseRate;

  // Effective values: live data takes precedence over SSR props
  const effectiveReviewCount = liveReviewCount ?? reviewsCount ?? 0;
  const effectivePendingReviews =
    livePendingReviews ?? pendingReviewsCount ?? 0;
  const effectiveResponseRate = liveResponseRate
    ? parseInt(liveResponseRate.replace("%", ""))
    : responseRate;

  // Calculate time of day based on user's local timezone (client-side only)
  useEffect(() => {
    const hour = new Date().getHours();
    const calculatedTimeOfDay: "morning" | "afternoon" | "evening" | "night" =
      hour < 12
        ? "morning"
        : hour < 18
          ? "afternoon"
          : hour < 22
            ? "evening"
            : "night";
    setTimeOfDay(calculatedTimeOfDay);
  }, []);

  // Check if user is returning after a while
  useEffect(() => {
    if (lastLogin && !hasShownWelcomeBack) {
      const lastLoginDate = new Date(lastLogin);
      const now = new Date();
      const hoursSinceLastLogin = Math.floor(
        (now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60),
      );

      // Show welcome back if user hasn't logged in for 1+ hours (for testing, change to 72 for 3 days in production)
      if (hoursSinceLastLogin >= 1) {
        setShowWelcomeBack(true);
        setHasShownWelcomeBack(true);
      }
    }
  }, [lastLogin, hasShownWelcomeBack]);

  // Calculate stats for welcome back
  const welcomeBackStats = {
    newReviews: todayReviewsCount || 0,
    pendingReplies: effectivePendingReviews,
    ratingChange: weeklyGrowth ? weeklyGrowth / 100 : undefined,
  };
  // Calculate completed tasks count
  const completedTasksCount = progressItems.filter(
    (item) => item.completed,
  ).length;

  // Calculate health score based on various factors
  const calculateHealthScore = (
    location: PrimaryLocation | null | undefined,
    reviews: number | null,
    respRate: number,
  ): number => {
    if (!location) return 0;
    let score = 0;

    // Has reviews (30 points)
    if (reviews && reviews > 0) score += 30;

    // Good response rate (25 points)
    if (respRate >= 80) score += 25;
    else if (respRate >= 50) score += 15;

    // Has basic info (15 points)
    if (location.phone) score += 5;
    if (location.website) score += 5;
    if (location.address) score += 5;

    // Has business hours (10 points)
    if (location.business_hours) score += 10;

    // Has rating (20 points)
    if (location.rating && location.rating >= 4) score += 20;
    else if (location.rating && location.rating >= 3) score += 10;

    return Math.min(score, 100);
  };

  // Calculate profile completeness
  const calculateProfileCompleteness = (
    location: PrimaryLocation | null | undefined,
  ): number => {
    if (!location) return 0;
    let filled = 0;
    const fields = [
      location.location_name,
      location.category,
      location.address,
      location.phone,
      location.website,
      location.logo_url,
      location.cover_photo_url,
      location.business_hours,
    ];
    fields.forEach((f) => {
      if (f) filled++;
    });
    return Math.round((filled / fields.length) * 100);
  };

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Welcome Back for returning users */}
      {showWelcomeBack && (
        <WelcomeBack
          userName={profile?.full_name || businessName}
          lastLogin={lastLogin}
          stats={welcomeBackStats}
          onDismiss={() => setShowWelcomeBack(false)}
          onViewReviews={() => router.push("/reviews")}
          onViewQuestions={() => router.push("/questions")}
        />
      )}

      {/* Smart Header */}
      <SmartHeader
        user={{
          id: user.id,
          name: businessName || profile?.full_name, // Prefer business name
          email: user.email || "",
          avatar: businessLogo || profile?.avatar_url, // Prefer business logo
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
            {/* Top Section: Business Profile + Progress */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Business Profile Card - Main */}
              <div className="xl:col-span-8">
                {primaryLocation ? (
                  <BusinessProfileCard
                    name={primaryLocation.location_name}
                    category={primaryLocation.category}
                    address={primaryLocation.address}
                    phone={primaryLocation.phone}
                    website={primaryLocation.website}
                    logoUrl={businessLogo || primaryLocation.logo_url}
                    coverPhotoUrl={primaryLocation.cover_photo_url}
                    rating={
                      primaryLocation.rating || parseFloat(averageRating) || 0
                    }
                    reviewCount={
                      effectiveReviewCount || primaryLocation.review_count || 0
                    }
                    responseRate={
                      effectiveResponseRate ||
                      primaryLocation.response_rate ||
                      0
                    }
                    healthScore={calculateHealthScore(
                      primaryLocation,
                      effectiveReviewCount,
                      effectiveResponseRate,
                    )}
                    profileCompleteness={
                      primaryLocation.profile_completeness ||
                      calculateProfileCompleteness(primaryLocation)
                    }
                    businessHours={primaryLocation.business_hours}
                    menuUrl={primaryLocation.menu_url}
                    bookingUrl={primaryLocation.booking_url}
                    orderUrl={primaryLocation.order_url}
                    appointmentUrl={primaryLocation.appointment_url}
                    isVerified={primaryLocation.is_verified}
                  />
                ) : (
                  <DashboardHero
                    userName={profile?.full_name}
                    timeOfDay={timeOfDay}
                    stats={{
                      todayReviews: todayReviewsCount || 0,
                      weeklyGrowth: weeklyGrowth,
                      totalReviews: effectiveReviewCount || 0,
                      averageRating: parseFloat(averageRating) || 0,
                      responseRate: effectiveResponseRate,
                    }}
                    profileCompletion={
                      (completedTasksCount / progressItems.length) * 100
                    }
                    streak={streak}
                    achievements={[]}
                  />
                )}
              </div>

              {/* Progress Tracker - Sidebar */}
              <div className="xl:col-span-4 space-y-6">
                <SimpleProgressTracker
                  items={progressItems.map((item) => ({
                    id: item.id,
                    label: item.label,
                    completed: item.completed,
                    href: item.href,
                    points: item.completed ? 100 : 50,
                  }))}
                  hideWhenComplete={false}
                />

                {/* Onboarding Checklist for new users */}
                {completedTasksCount < progressItems.length && (
                  <OnboardingChecklist
                    items={[
                      {
                        id: "connect-gmb",
                        title: "Connect Google Business",
                        description:
                          "Link your business to start managing reviews",
                        completed: (accountsCount || 0) > 0,
                        href: "/settings",
                        icon: Building2,
                      },
                      {
                        id: "first-review",
                        title: "Reply to your first review",
                        description: "Respond to a customer review",
                        completed: responseRate > 0,
                        href: "/reviews",
                        icon: MessageSquare,
                      },
                      {
                        id: "setup-ai",
                        title: "Configure AI settings",
                        description: "Customize how AI generates responses",
                        completed: false, // TODO: Check if AI settings configured
                        href: "/settings/ai",
                        icon: Bot,
                      },
                      {
                        id: "enable-autopilot",
                        title: "Enable Auto-Reply",
                        description: "Let AI handle responses automatically",
                        completed: hasAutoReply,
                        href: "/settings/auto-pilot",
                        icon: Settings,
                      },
                    ]}
                  />
                )}
              </div>
            </div>

            {/* 🤖 AI HERO SECTION - Main AI Interface */}
            <AIHeroSection businessName={primaryLocation?.location_name} />

            {/* Dashboard CTAs - Only show if not all accounts connected */}
            {(accountsCount || 0) < 2 && <DashboardCTAButtons />}

            {/* AI Activity Pulse */}
            <AIActivityPulse />

            {/* Quick Actions - Full Width */}
            <QuickActions />

            {/* Urgent Items Feed - Live from useHomeData */}
            <UrgentItemsSection userId={user.id} />

            {/* 🧠 AI Smart Insights - Proactive Suggestions */}
            <AISmartInsights />

            {/* Smart AI Suggestions - Based on real data */}
            <SmartAISuggestions
              userId={user.id}
              pendingReviews={effectivePendingReviews}
              responseRate={effectiveResponseRate}
              avgRating={parseFloat(averageRating) || 0}
              totalReviews={effectiveReviewCount || 0}
              weeklyGrowth={weeklyGrowth}
              hasAutoReply={hasAutoReply}
            />

            {/* Management Quick Stats */}
            <ManagementQuickStats />

            {/* Keywords & Competitors Section */}
            <div className="grid gap-6 md:grid-cols-2">
              <KeywordsCard locationId={primaryLocation?.id} limit={5} />
              <CompetitorsCard
                lat={primaryLocation?.latitude}
                lng={primaryLocation?.longitude}
                categoryName={primaryLocation?.category}
                limit={5}
              />
            </div>

            {/* Interactive Dashboard */}
            <InteractiveStatsDashboard />
          </div>
        )}
      </main>

      {/* AI Chat Widget - Floating Assistant */}
      <AIChatWidgetEnhanced userId={user.id} />
    </div>
  );
}

// Separate component for Urgent Items to use hooks
function UrgentItemsSection({ userId: _userId }: { userId: string }) {
  const { urgentItems, isLoading } = useHomeData();

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  if (!urgentItems || urgentItems.length === 0) {
    return null; // Don't show section if no urgent items
  }

  return (
    <UrgentItemsFeed
      items={urgentItems}
      isLoading={false}
      onAIAction={(itemId: string) => {
        logger.warn("Urgent item action", { itemId });
        // TODO: Implement AI action handling
      }}
    />
  );
}
