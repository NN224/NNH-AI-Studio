"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Eye, MousePointerClick, Calendar, BarChart3 } from "lucide-react"
import type { GMBLocation } from "@/lib/types/database"

interface LocationPerformanceWidgetProps {
  locationId: string
  compact?: boolean
}

interface PerformanceMetrics {
  impressions: number
  clicks: number
  bookings: number
  foodOrders: number
  impressionsChange: number
  clicksChange: number
}

export function LocationPerformanceWidget({ locationId, compact = false }: LocationPerformanceWidgetProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  if (!supabase) {
    throw new Error('Failed to initialize Supabase client')
  }

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true)

        const { data: { user } } = await supabase!.auth.getUser()
        if (!user) return

        // Get metrics for last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const sixtyDaysAgo = new Date()
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

        // Current period metrics
        const { data: currentMetrics, error: currentError } = await supabase!
          .from("gmb_performance_metrics")
          .select("metric_type, metric_value")
          .eq("location_id", locationId)
          .eq("user_id", user.id)
          .gte("metric_date", thirtyDaysAgo.toISOString().split('T')[0])

        // Previous period metrics (for comparison)
        const { data: previousMetrics, error: previousError } = await supabase!
          .from("gmb_performance_metrics")
          .select("metric_type, metric_value")
          .eq("location_id", locationId)
          .eq("user_id", user.id)
          .gte("metric_date", sixtyDaysAgo.toISOString().split('T')[0])
          .lt("metric_date", thirtyDaysAgo.toISOString().split('T')[0])

        if (currentError || previousError) {
          console.error("Error fetching performance metrics:", currentError || previousError)
          // Set empty metrics instead of throwing
          setMetrics({
            impressions: 0,
            clicks: 0,
            bookings: 0,
            foodOrders: 0,
            impressionsChange: 0,
            clicksChange: 0,
          })
          return
        }

        // If no metrics found, set empty values
        if (!currentMetrics || currentMetrics.length === 0) {
          setMetrics({
            impressions: 0,
            clicks: 0,
            bookings: 0,
            foodOrders: 0,
            impressionsChange: 0,
            clicksChange: 0,
          })
          return
        }

        // Calculate totals
        const currentImpressions = currentMetrics
          .filter(m => m.metric_type === 'QUERIES_DIRECT' || m.metric_type === 'QUERIES_INDIRECT')
          .reduce((sum, m) => sum + (m.metric_value || 0), 0)
        
        const previousImpressions = previousMetrics
          .filter(m => m.metric_type === 'QUERIES_DIRECT' || m.metric_type === 'QUERIES_INDIRECT')
          .reduce((sum, m) => sum + (m.metric_value || 0), 0)

        const currentClicks = currentMetrics
          .filter(m => m.metric_type === 'ACTIONS_WEBSITE' || m.metric_type === 'ACTIONS_PHONE' || m.metric_type === 'ACTIONS_DRIVING_DIRECTIONS')
          .reduce((sum, m) => sum + (m.metric_value || 0), 0)
        
        const previousClicks = previousMetrics
          .filter(m => m.metric_type === 'ACTIONS_WEBSITE' || m.metric_type === 'ACTIONS_PHONE' || m.metric_type === 'ACTIONS_DRIVING_DIRECTIONS')
          .reduce((sum, m) => sum + (m.metric_value || 0), 0)

        const bookings = currentMetrics
          .filter(m => m.metric_type === 'BUSINESS_BOOKINGS')
          .reduce((sum, m) => sum + (m.metric_value || 0), 0)

        const foodOrders = currentMetrics
          .filter(m => m.metric_type === 'BUSINESS_FOOD_ORDERS')
          .reduce((sum, m) => sum + (m.metric_value || 0), 0)

        // Calculate change percentages only if we have previous data
        const impressionsChange = previousImpressions > 0
          ? Math.round(((currentImpressions - previousImpressions) / previousImpressions) * 100 * 10) / 10
          : previousMetrics && previousMetrics.length > 0 && currentImpressions > 0
          ? 100 // New data this period
          : 0

        const clicksChange = previousClicks > 0
          ? Math.round(((currentClicks - previousClicks) / previousClicks) * 100 * 10) / 10
          : previousMetrics && previousMetrics.length > 0 && currentClicks > 0
          ? 100 // New data this period
          : 0

        setMetrics({
          impressions: currentImpressions,
          clicks: currentClicks,
          bookings,
          foodOrders,
          impressionsChange,
          clicksChange,
        })
      } catch (error) {
        console.error("Error fetching performance metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [locationId, supabase])

  if (loading || !metrics) {
    return (
      <div className="text-xs text-muted-foreground animate-pulse">
        Loading metrics...
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <Eye className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">{metrics.impressions.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <MousePointerClick className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">{metrics.clicks.toLocaleString()}</span>
        </div>
        {metrics.impressionsChange !== 0 && (
          <div className={`flex items-center gap-1 ${metrics.impressionsChange > 0 ? 'text-success' : 'text-destructive'}`}>
            <TrendingUp className={`h-3 w-3 ${metrics.impressionsChange < 0 ? 'rotate-180' : ''}`} />
            <span>{metrics.impressionsChange > 0 ? '+' : ''}{metrics.impressionsChange.toFixed(0)}%</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">30-Day Performance</span>
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Impressions</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{metrics.impressions.toLocaleString()}</p>
            {metrics.impressionsChange !== 0 && (
              <p className={`text-xs ${metrics.impressionsChange > 0 ? 'text-success' : 'text-destructive'}`}>
                {metrics.impressionsChange > 0 ? '+' : ''}{metrics.impressionsChange.toFixed(1)}%
              </p>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-1 mb-1">
              <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Clicks</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{metrics.clicks.toLocaleString()}</p>
            {metrics.clicksChange !== 0 && (
              <p className={`text-xs ${metrics.clicksChange > 0 ? 'text-success' : 'text-destructive'}`}>
                {metrics.clicksChange > 0 ? '+' : ''}{metrics.clicksChange.toFixed(1)}%
              </p>
            )}
          </div>

          {metrics.bookings > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Bookings</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{metrics.bookings.toLocaleString()}</p>
            </div>
          )}

          {metrics.foodOrders > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Food Orders</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{metrics.foodOrders.toLocaleString()}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

