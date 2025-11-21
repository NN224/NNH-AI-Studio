"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Skeleton animation
const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: "linear",
  },
};

// Base skeleton component
function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={`relative overflow-hidden bg-gradient-to-r from-zinc-800/50 via-zinc-700/50 to-zinc-800/50 bg-[size:200%_100%] rounded ${className}`}
      animate={shimmer.animate}
      transition={shimmer.transition}
    />
  );
}

// Stats Card Skeleton
export function StatsCardSkeleton() {
  return (
    <Card className="border-border/40 bg-gradient-to-br from-zinc-900/50 to-black/50 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

// Stats Overview Skeleton
export function StatsOverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.1 }}
        >
          <StatsCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

// Quick Actions Skeleton
export function QuickActionsSkeleton() {
  return (
    <Card className="border-border/40 bg-gradient-to-br from-zinc-900/50 to-black/50 backdrop-blur-xl">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <div className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border/50 bg-gradient-to-br from-zinc-900/80 to-black/80">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-3 w-16" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// AI Insights Skeleton
export function AIInsightsSkeleton() {
  return (
    <Card className="border-border/40 bg-gradient-to-br from-zinc-900/50 to-black/50 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-48 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          >
            <div className="p-4 rounded-xl border border-border/50 bg-gradient-to-br from-zinc-900/80 to-black/80 backdrop-blur-sm">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        <Skeleton className="h-10 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// Activity Feed Skeleton
export function ActivityFeedSkeleton() {
  return (
    <Card className="border-border/40 bg-gradient-to-br from-zinc-900/50 to-black/50 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-8 w-24 rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <div className="flex gap-4 p-4 rounded-xl border border-border/50 bg-gradient-to-br from-zinc-900/80 to-black/80">
                <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Dashboard Hero Skeleton
export function DashboardHeroSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-900/20 via-orange-800/10 to-yellow-900/10 border border-orange-500/30 p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex gap-4">
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-12 mt-1" />
          </div>
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-12 mt-1" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Full Page Skeleton
export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header Skeleton */}
      <div className="border-b border-border/40 bg-gradient-to-r from-zinc-900 to-black p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-24 rounded" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Hero Skeleton */}
        <DashboardHeroSkeleton />

        {/* Quick Actions Skeleton */}
        <QuickActionsSkeleton />

        {/* Stats Overview Skeleton */}
        <StatsOverviewSkeleton />

        {/* AI Insights Skeleton */}
        <AIInsightsSkeleton />

        {/* Activity Feed Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityFeedSkeleton />
          </div>
          <div className="lg:col-span-1">
            <Card className="border-border/40 bg-gradient-to-br from-zinc-900/50 to-black/50">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
