"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

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
              isNeutral ? "text-muted-foreground" : isPositive ? "text-green-500" : "text-red-500"
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

export function MetricsOverview() {
  const [metrics, setMetrics] = useState({
    totalImpressions: 0,
    totalConversations: 0,
    totalClicks: 0,
    totalDirectionRequests: 0,
    totalReviews: 0,
    avgRating: 0,
    responseRate: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchMetrics() {
      try {
        // Get current user first
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        // Get active account IDs
        const { data: accounts } = await supabase
          .from("gmb_accounts")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)

        const accountIds = accounts?.map(acc => acc.id) || []
        if (accountIds.length === 0) {
          setIsLoading(false)
          return
        }

        // Get locations
        const { data: locations } = await supabase
          .from("gmb_locations")
          .select("id")
          .eq("user_id", user.id)
          .in("gmb_account_id", accountIds)

        const locationIds = locations?.map(loc => loc.id) || []

        // Get reviews for response rate
        const { data: reviews } = locationIds.length > 0
          ? await supabase
              .from("gmb_reviews")
              .select("rating, reply_text")
              .eq("user_id", user.id)
              .in("location_id", locationIds)
          : { data: [] }

        // Calculate review metrics
        const reviewsArray = reviews || []
        const totalReviews = reviewsArray.length
        const repliedReviews = reviewsArray.filter((r) => r.reply_text).length
        const responseRate = totalReviews > 0 ? (repliedReviews / totalReviews) * 100 : 0
        const avgRating =
          totalReviews > 0
            ? reviewsArray.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
            : 0

        // Get performance metrics from Performance API data (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const today = new Date()

        const { data: performanceMetrics } = locationIds.length > 0
          ? await supabase
              .from("gmb_performance_metrics")
              .select("metric_type, metric_value")
              .eq("user_id", user.id)
              .in("location_id", locationIds)
              .gte("metric_date", thirtyDaysAgo.toISOString().split('T')[0])
              .lte("metric_date", today.toISOString().split('T')[0])
          : { data: [] }

        // Aggregate performance metrics
        let totalImpressions = 0
        let totalConversations = 0
        let totalClicks = 0
        let totalDirectionRequests = 0

        if (performanceMetrics) {
          performanceMetrics.forEach((metric) => {
            const value = parseInt(metric.metric_value) || 0
            switch (metric.metric_type) {
              case 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS':
              case 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH':
              case 'BUSINESS_IMPRESSIONS_MOBILE_MAPS':
              case 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH':
                totalImpressions += value
                break
              case 'BUSINESS_CONVERSATIONS':
                totalConversations += value
                break
              case 'WEBSITE_CLICKS':
              case 'CALL_CLICKS':
                totalClicks += value
                break
              case 'BUSINESS_DIRECTION_REQUESTS':
                totalDirectionRequests += value
                break
            }
          })
        }

        setMetrics({
          totalImpressions,
          totalConversations,
          totalClicks,
          totalDirectionRequests,
          totalReviews,
          avgRating: Math.round(avgRating * 10) / 10,
          responseRate: Math.round(responseRate),
        })
      } catch (error) {
        console.error("Error fetching metrics:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()

    const channel = supabase
      .channel("analytics-metrics")
      .on("postgres_changes", { event: "*", schema: "public", table: "gmb_locations" }, fetchMetrics)
      .on("postgres_changes", { event: "*", schema: "public", table: "gmb_reviews" }, fetchMetrics)
      .on("postgres_changes", { event: "*", schema: "public", table: "gmb_performance_metrics" }, fetchMetrics)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Impressions"
        value={metrics.totalImpressions.toLocaleString()}
        change={12.5}
        period="last 30 days"
        isLoading={isLoading}
      />
      <MetricCard
        title="Website/Call Clicks"
        value={metrics.totalClicks.toLocaleString()}
        change={8.3}
        period="last 30 days"
        isLoading={isLoading}
      />
      <MetricCard
        title="Conversations"
        value={metrics.totalConversations.toLocaleString()}
        change={5.2}
        period="last 30 days"
        isLoading={isLoading}
      />
      <MetricCard
        title="Direction Requests"
        value={metrics.totalDirectionRequests.toLocaleString()}
        change={-1.5}
        period="last 30 days"
        isLoading={isLoading}
      />
    </div>
  )
}
