"use client";

import { motion } from "framer-motion";
import { SmartHeader } from "@/components/home/smart-header";
import { QuickActions } from "@/components/home/quick-actions";
import { EmptyState } from "@/components/home/empty-state";
import { AnimatedBackground } from "@/components/home/animated-background";
import { DashboardHero } from "@/components/home/dashboard-hero";
import { SimpleProgressTracker } from "@/components/home/progress-tracker-simple";
import { AIChatWidgetEnhanced } from "@/components/home/ai-chat-widget-enhanced";
import { EnhancedOnboarding } from "@/components/home/enhanced-onboarding";
import { DashboardCTAButtons } from "@/components/home/dashboard-cta-buttons";
import { SmartAISuggestions } from "@/components/home/smart-ai-suggestions";
import { InteractiveStatsDashboard } from "@/components/home/interactive-stats-dashboard";
import { BusinessProfileCard } from "@/components/home/business-profile-card";
import { KeywordsCard } from "@/components/home/keywords-card";
import { CompetitorsCard } from "@/components/home/competitors-card";

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
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
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
  timeOfDay: serverTimeOfDay,
  lastLogin,
  businessName,
  businessLogo,
  primaryLocation,
  pendingReviewsCount = 0,
  hasAutoReply = false,
}: HomePageContentProps) {
  // Calculate completed tasks count
  const completedTasksCount = progressItems.filter(
    (item) => item.completed,
  ).length;

  // Use server-provided timeOfDay (always provided now to avoid hydration mismatch)
  const timeOfDay = serverTimeOfDay || "morning";

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
                      reviewsCount || primaryLocation.review_count || 0
                    }
                    responseRate={
                      responseRate || primaryLocation.response_rate || 0
                    }
                    healthScore={calculateHealthScore(
                      primaryLocation,
                      reviewsCount,
                      responseRate,
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
                      totalReviews: reviewsCount || 0,
                      averageRating: parseFloat(averageRating) || 0,
                      responseRate: responseRate,
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
              <div className="xl:col-span-4">
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
              </div>
            </div>

            {/* Dashboard CTAs - Only show if not all accounts connected */}
            {(accountsCount || 0) < 2 && <DashboardCTAButtons />}

            {/* Quick Actions - Full Width */}
            <QuickActions />

            {/* Smart AI Suggestions - Based on real data */}
            <SmartAISuggestions
              userId={user.id}
              pendingReviews={pendingReviewsCount}
              responseRate={responseRate}
              avgRating={parseFloat(averageRating) || 0}
              totalReviews={reviewsCount || 0}
              weeklyGrowth={weeklyGrowth}
              hasAutoReply={hasAutoReply}
            />

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

      {/* Onboarding Tour */}
      <EnhancedOnboarding />
    </div>
  );
}
