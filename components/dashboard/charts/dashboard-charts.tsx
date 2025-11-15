'use client'

import { ReviewsTrendChart } from './reviews-trend-chart'
import { RatingDistributionChart } from './rating-distribution-chart'
import { ResponseRateChart } from './response-rate-chart'
import { ActivityHeatmap } from './activity-heatmap'
import { AnimatedWrapper } from '../animated-wrapper'
import type { GMBReview, ActivityLog } from '@/lib/types/database'

interface DashboardChartsProps {
  reviews: GMBReview[]
  activities: ActivityLog[]
}

export function DashboardCharts({ reviews, activities }: DashboardChartsProps) {
  // Prepare review data for charts
  const reviewData = reviews.map(review => ({
    created_at: review.created_at,
    rating: review.rating,
    has_reply: review.has_reply || !!review.review_reply,
    review_reply: review.review_reply,
    replied_at: review.replied_at,
  }))

  // Prepare activity data for heatmap
  const activityData = activities.map(activity => ({
    created_at: activity.created_at,
  }))

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Visual insights into your business performance
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Reviews Trend Chart - Full Width on Mobile, Left Column on Desktop */}
        <AnimatedWrapper variant="slideUp" delay={0} className="md:col-span-2">
          <ReviewsTrendChart reviews={reviewData} />
        </AnimatedWrapper>

        {/* Rating Distribution - Left Column */}
        <AnimatedWrapper variant="slideUp" delay={0.1}>
          <RatingDistributionChart reviews={reviewData} />
        </AnimatedWrapper>

        {/* Response Rate - Right Column */}
        <AnimatedWrapper variant="slideUp" delay={0.2}>
          <ResponseRateChart reviews={reviewData} />
        </AnimatedWrapper>

        {/* Activity Heatmap - Full Width */}
        <AnimatedWrapper variant="slideUp" delay={0.3} className="md:col-span-2">
          <ActivityHeatmap activities={activityData} />
        </AnimatedWrapper>
      </div>
    </div>
  )
}

// Skeleton loader for charts
export function DashboardChartsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Full width chart skeleton */}
        <div className="md:col-span-2 h-[400px] bg-muted animate-pulse rounded-xl" />
        
        {/* Two half-width chart skeletons */}
        <div className="h-[450px] bg-muted animate-pulse rounded-xl" />
        <div className="h-[450px] bg-muted animate-pulse rounded-xl" />
        
        {/* Full width heatmap skeleton */}
        <div className="md:col-span-2 h-[500px] bg-muted animate-pulse rounded-xl" />
      </div>
    </div>
  )
}

