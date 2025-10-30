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
    totalViews: 0,
    totalReviews: 0,
    avgRating: 0,
    responseRate: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const { data: locations } = await supabase.from("gmb_locations").select("*")
        const { data: reviews } = await supabase.from("gmb_reviews").select("*")

        const totalViews = locations?.reduce((sum, loc) => sum + (loc.total_views || 0), 0) || 0
        const totalReviews = reviews?.length || 0
        const avgRating =
          locations?.reduce((sum, loc) => sum + (loc.average_rating || 0), 0) / (locations?.length || 1) || 0
        const repliedReviews = reviews?.filter((r) => r.reply_text).length || 0
        const responseRate = totalReviews > 0 ? (repliedReviews / totalReviews) * 100 : 0

        setMetrics({
          totalViews,
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Views"
        value={metrics.totalViews.toLocaleString()}
        change={12.5}
        period="last month"
        isLoading={isLoading}
      />
      <MetricCard
        title="Total Reviews"
        value={metrics.totalReviews.toLocaleString()}
        change={8.3}
        period="last month"
        isLoading={isLoading}
      />
      <MetricCard
        title="Avg. Rating"
        value={(Number(metrics.avgRating ?? 0)).toFixed(1)}
        change={2.2}
        period="last month"
        isLoading={isLoading}
      />
      <MetricCard
        title="Response Rate"
        value={`${metrics.responseRate}%`}
        change={-1.5}
        period="last month"
        isLoading={isLoading}
      />
    </div>
  )
}
