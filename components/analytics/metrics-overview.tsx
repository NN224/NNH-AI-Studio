"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDateRange, getPreviousPeriodRange, aggregateMetricsByType } from "@/lib/utils/performance-calculations"

interface MetricCardProps {
  title: string
  value: string
  change: number
  period: string
  isLoading?: boolean
}

export function MetricCard({ title, value, change, period, isLoading }: MetricCardProps) {
  const isPositive = change > 0
  const isNeutral = change === 0

  if (isLoading) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-12 bg-secondary animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              isNeutral ? "text-muted-foreground" : isPositive ? "text-success" : "text-destructive"
            }`}
          >
            {isNeutral ? (
              <Minus className="w-4 h-4" />
            ) : isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">vs {period}</p>
      </CardContent>
    </Card>
  )
}

interface MetricsOverviewProps {
  dateRange?: string // "7" | "30" | "90" | "365"
  locationIds?: string[]
  comparison?: 'none' | 'previous_period' | 'previous_year'
}

export function MetricsOverview({ dateRange = "30", locationIds, comparison }: MetricsOverviewProps) {
  const [metrics, setMetrics] = useState({
    totalImpressions: 0,
    totalConversations: 0,
    totalClicks: 0,
    totalDirectionRequests: 0,
    totalBookings: 0,
    totalFoodOrders: 0,
    impressionsChange: 0,
    clicksChange: 0,
    conversationsChange: 0,
    directionsChange: 0,
    bookingsChange: 0,
    foodOrdersChange: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  if (!supabase) {
    throw new Error('Failed to initialize Supabase client')
  }

  useEffect(() => {
    async function fetchMetrics() {
      try {
        // Get current user first
        const { data: { user } } = await supabase!.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        // Get active account IDs
        const { data: accounts, error: accountsError } = await supabase!
          .from("gmb_accounts")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)

        if (accountsError) {
          console.error("Error fetching active accounts:", accountsError)
          setIsLoading(false)
          return
        }

        const accountIds = accounts?.map(acc => acc.id) || []
        if (accountIds.length === 0) {
          setIsLoading(false)
          return
        }

        // Get locations
        const { data: locations, error: locationsError } = await supabase!
          .from("gmb_locations")
          .select("id")
          .eq("user_id", user.id)
          .in("gmb_account_id", accountIds)

        if (locationsError) {
          console.error("Error fetching locations:", locationsError)
          setIsLoading(false)
          return
        }

        const locationIds = locations?.map(loc => loc.id) || []

        // Get reviews for response rate
        const { data: reviews, error: reviewsError } = locationIds.length > 0
          ? await supabase!
              .from("gmb_reviews")
              .select("rating, reply_text, review_reply")
              .eq("user_id", user.id)
              .in("location_id", locationIds)
          : { data: [], error: null }

        if (reviewsError) {
          console.error("Error fetching reviews:", reviewsError)
        }

        // Calculate review metrics
        const reviewsArray = reviews || []
        const totalReviews = reviewsArray.length
        // Check for unresponded reviews using both reply_text and review_reply for compatibility
        const repliedReviews = reviewsArray.filter((r) => {
          return !!(r.reply_text || r.review_reply)
        }).length
        const responseRate = totalReviews > 0 ? (repliedReviews / totalReviews) * 100 : 0
        const avgRating =
          totalReviews > 0
            ? reviewsArray.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
            : 0

        // Calculate date ranges
        const days = parseInt(dateRange) || 30
        const currentRange = getDateRange(days)
        const previousRange = getPreviousPeriodRange(currentRange.start, currentRange.end)

        // Fetch current period metrics
        const { data: currentMetrics, error: currentMetricsError } = locationIds.length > 0
          ? await supabase!
              .from("gmb_performance_metrics")
              .select("metric_type, metric_value, metric_date")
              .eq("user_id", user.id)
              .in("location_id", locationIds)
              .gte("metric_date", currentRange.start.toISOString().split('T')[0])
              .lte("metric_date", currentRange.end.toISOString().split('T')[0])
          : { data: [], error: null }

        // Fetch previous period metrics for comparison
        const { data: previousMetrics, error: previousMetricsError } = locationIds.length > 0
          ? await supabase!
              .from("gmb_performance_metrics")
              .select("metric_type, metric_value, metric_date")
              .eq("user_id", user.id)
              .in("location_id", locationIds)
              .gte("metric_date", previousRange.start.toISOString().split('T')[0])
              .lte("metric_date", previousRange.end.toISOString().split('T')[0])
          : { data: [], error: null }

        if (currentMetricsError) {
          console.error("Error fetching current metrics:", currentMetricsError)
        }
        if (previousMetricsError) {
          console.error("Error fetching previous metrics:", previousMetricsError)
        }

        // Aggregate current period metrics by type
        const currentAggregated = aggregateMetricsByType(currentMetrics || [], currentRange)
        const previousAggregated = aggregateMetricsByType(previousMetrics || [], previousRange)

        // Calculate totals
        const totalImpressions = 
          (currentAggregated['BUSINESS_IMPRESSIONS_DESKTOP_MAPS'] || 0) +
          (currentAggregated['BUSINESS_IMPRESSIONS_DESKTOP_SEARCH'] || 0) +
          (currentAggregated['BUSINESS_IMPRESSIONS_MOBILE_MAPS'] || 0) +
          (currentAggregated['BUSINESS_IMPRESSIONS_MOBILE_SEARCH'] || 0)

        const totalConversations = currentAggregated['BUSINESS_CONVERSATIONS'] || 0
        const totalClicks = 
          (currentAggregated['WEBSITE_CLICKS'] || 0) +
          (currentAggregated['CALL_CLICKS'] || 0)
        const totalDirectionRequests = currentAggregated['BUSINESS_DIRECTION_REQUESTS'] || 0
        const totalBookings = currentAggregated['BUSINESS_BOOKINGS'] || 0
        const totalFoodOrders = 
          (currentAggregated['BUSINESS_FOOD_ORDERS'] || 0) +
          (currentAggregated['BUSINESS_FOOD_MENU_CLICKS'] || 0)

        // Calculate previous period totals
        const prevImpressions = 
          (previousAggregated['BUSINESS_IMPRESSIONS_DESKTOP_MAPS'] || 0) +
          (previousAggregated['BUSINESS_IMPRESSIONS_DESKTOP_SEARCH'] || 0) +
          (previousAggregated['BUSINESS_IMPRESSIONS_MOBILE_MAPS'] || 0) +
          (previousAggregated['BUSINESS_IMPRESSIONS_MOBILE_SEARCH'] || 0)

        const prevConversations = previousAggregated['BUSINESS_CONVERSATIONS'] || 0
        const prevClicks = 
          (previousAggregated['WEBSITE_CLICKS'] || 0) +
          (previousAggregated['CALL_CLICKS'] || 0)
        const prevDirections = previousAggregated['BUSINESS_DIRECTION_REQUESTS'] || 0
        const prevBookings = previousAggregated['BUSINESS_BOOKINGS'] || 0
        const prevFoodOrders = 
          (previousAggregated['BUSINESS_FOOD_ORDERS'] || 0) +
          (previousAggregated['BUSINESS_FOOD_MENU_CLICKS'] || 0)

        // Calculate percentage changes
        const calculateChange = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0
          return Math.round(((current - previous) / previous) * 100 * 100) / 100
        }

        setMetrics({
          totalImpressions,
          totalConversations,
          totalClicks,
          totalDirectionRequests,
          totalBookings,
          totalFoodOrders,
          impressionsChange: calculateChange(totalImpressions, prevImpressions),
          clicksChange: calculateChange(totalClicks, prevClicks),
          conversationsChange: calculateChange(totalConversations, prevConversations),
          directionsChange: calculateChange(totalDirectionRequests, prevDirections),
          bookingsChange: calculateChange(totalBookings, prevBookings),
          foodOrdersChange: calculateChange(totalFoodOrders, prevFoodOrders),
        })
      } catch (error) {
        console.error("Error fetching metrics:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()

    const channel = supabase!
      .channel("analytics-metrics")
      .on("postgres_changes", { event: "*", schema: "public", table: "gmb_locations" }, fetchMetrics)
      .on("postgres_changes", { event: "*", schema: "public", table: "gmb_reviews" }, fetchMetrics)
      .on("postgres_changes", { event: "*", schema: "public", table: "gmb_performance_metrics" }, fetchMetrics)
      .subscribe()

    return () => {
      supabase!.removeChannel(channel)
    }
  }, [supabase, dateRange])

  const previousPeriodText = dateRange === "7" ? "previous 7 days"
    : dateRange === "30" ? "previous 30 days"
    : dateRange === "90" ? "previous 90 days"
    : "previous year"

  // Determine which optional cards to show
  const showBookings = metrics.totalBookings > 0
  const showFoodOrders = metrics.totalFoodOrders > 0
  const totalCards = 4 + (showBookings ? 1 : 0) + (showFoodOrders ? 1 : 0)

  return (
    <div className={`grid gap-4 ${totalCards === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : totalCards === 5 ? 'md:grid-cols-2 lg:grid-cols-5' : 'md:grid-cols-2 lg:grid-cols-6'}`}>
      <MetricCard
        title="Total Impressions"
        value={metrics.totalImpressions.toLocaleString()}
        change={metrics.impressionsChange}
        period={previousPeriodText}
        isLoading={isLoading}
      />
      <MetricCard
        title="Website/Call Clicks"
        value={metrics.totalClicks.toLocaleString()}
        change={metrics.clicksChange}
        period={previousPeriodText}
        isLoading={isLoading}
      />
      <MetricCard
        title="Conversations"
        value={metrics.totalConversations.toLocaleString()}
        change={metrics.conversationsChange}
        period={previousPeriodText}
        isLoading={isLoading}
      />
      <MetricCard
        title="Direction Requests"
        value={metrics.totalDirectionRequests.toLocaleString()}
        change={metrics.directionsChange}
        period={previousPeriodText}
        isLoading={isLoading}
      />
      {showBookings && (
        <MetricCard
          title="Bookings"
          value={metrics.totalBookings.toLocaleString()}
          change={metrics.bookingsChange}
          period={previousPeriodText}
          isLoading={isLoading}
        />
      )}
      {showFoodOrders && (
        <MetricCard
          title="Food Orders"
          value={metrics.totalFoodOrders.toLocaleString()}
          change={metrics.foodOrdersChange}
          period={previousPeriodText}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
