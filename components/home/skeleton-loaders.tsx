/**
 * Skeleton Loaders for Home Page
 *
 * Professional loading states for all dashboard sections
 * Provides smooth perceived performance while data loads
 */

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// =====================================================
// Stats Overview Skeleton
// =====================================================

export function StatsOverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="p-6 bg-gray-900/50 border-gray-800">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24 bg-gray-800" />
            <Skeleton className="h-8 w-16 bg-gray-800" />
            <Skeleton className="h-3 w-32 bg-gray-800" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// =====================================================
// Dashboard Hero Skeleton
// =====================================================

export function DashboardHeroSkeleton() {
  return (
    <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      <div className="space-y-6">
        {/* Greeting */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-gray-700" />
          <Skeleton className="h-4 w-48 bg-gray-700" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20 bg-gray-700" />
              <Skeleton className="h-6 w-12 bg-gray-700" />
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-32 bg-gray-700" />
          <Skeleton className="h-2 w-full bg-gray-700" />
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// Progress Tracker Skeleton
// =====================================================

export function ProgressTrackerSkeleton() {
  return (
    <Card className="p-6 bg-gray-900/50 border-gray-800">
      <div className="space-y-4">
        <Skeleton className="h-6 w-32 bg-gray-800" />

        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50"
          >
            <Skeleton className="h-5 w-5 rounded-full bg-gray-700" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full bg-gray-700" />
              <Skeleton className="h-3 w-3/4 bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// =====================================================
// Activity Feed Skeleton
// =====================================================

export function ActivityFeedSkeleton() {
  return (
    <Card className="p-6 bg-gray-900/50 border-gray-800">
      <div className="space-y-4">
        <Skeleton className="h-6 w-32 bg-gray-800" />

        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg bg-gray-800/50">
            <Skeleton className="h-10 w-10 rounded-full bg-gray-700" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 bg-gray-700" />
              <Skeleton className="h-3 w-full bg-gray-700" />
              <Skeleton className="h-3 w-24 bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// =====================================================
// AI Insights Skeleton
// =====================================================

export function AIInsightsSkeleton() {
  return (
    <Card className="p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-800/30">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded bg-purple-700" />
          <Skeleton className="h-6 w-32 bg-purple-700" />
        </div>

        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg bg-gray-800/50 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4 bg-gray-700" />
                <Skeleton className="h-4 w-full bg-gray-700" />
                <Skeleton className="h-4 w-5/6 bg-gray-700" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full bg-gray-700" />
            </div>
            <Skeleton className="h-9 w-24 rounded bg-gray-700" />
          </div>
        ))}
      </div>
    </Card>
  );
}

// =====================================================
// Quick Actions Skeleton
// =====================================================

export function QuickActionsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="p-4 bg-gray-900/50 border-gray-800">
          <div className="flex flex-col items-center gap-3 text-center">
            <Skeleton className="h-12 w-12 rounded-lg bg-gray-800" />
            <Skeleton className="h-4 w-16 bg-gray-800" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// =====================================================
// Charts Skeleton
// =====================================================

export function ChartSkeleton() {
  return (
    <Card className="p-6 bg-gray-900/50 border-gray-800">
      <div className="space-y-4">
        <Skeleton className="h-6 w-32 bg-gray-800" />
        <div className="h-64 flex items-end justify-between gap-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 bg-gray-800"
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-8 bg-gray-800" />
          ))}
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// Achievement System Skeleton
// =====================================================

export function AchievementsSkeleton() {
  return (
    <Card className="p-6 bg-gray-900/50 border-gray-800">
      <div className="space-y-4">
        <Skeleton className="h-6 w-32 bg-gray-800" />

        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-16 w-16 rounded-full bg-gray-800" />
              <Skeleton className="h-3 w-20 bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// =====================================================
// Full Page Skeleton
// =====================================================

export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />

      {/* Header Skeleton */}
      <div className="relative border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48 bg-gray-800" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-32 bg-gray-800" />
              <Skeleton className="h-10 w-10 rounded-full bg-gray-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Top Section */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <DashboardHeroSkeleton />
            </div>
            <div className="xl:col-span-4">
              <ProgressTrackerSkeleton />
            </div>
          </div>

          {/* Quick Actions */}
          <QuickActionsSkeleton />

          {/* Stats Overview */}
          <StatsOverviewSkeleton />

          {/* AI Insights */}
          <AIInsightsSkeleton />

          {/* Activity Feed & Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityFeedSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </main>
    </div>
  );
}

// =====================================================
// Section-specific Skeletons
// =====================================================

export function SectionSkeleton({
  rows = 3,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-4 w-full bg-gray-800" />
      ))}
    </div>
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <Card className={`p-6 bg-gray-900/50 border-gray-800 ${className}`}>
      <div className="space-y-4">
        <Skeleton className="h-6 w-32 bg-gray-800" />
        <SectionSkeleton rows={3} />
      </div>
    </Card>
  );
}
