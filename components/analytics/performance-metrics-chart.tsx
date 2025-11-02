"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { aggregateMetricsByDate, getDateRange } from "@/lib/utils/performance-calculations"
import { Skeleton } from "@/components/ui/skeleton"

interface PerformanceMetricsChartProps {
  dateRange?: string // "7", "30", "90", "365"
}

export function PerformanceMetricsChart({ dateRange = "30" }: PerformanceMetricsChartProps) {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalImpressions, setTotalImpressions] = useState(0)
  const [totalClicks, setTotalClicks] = useState(0)
  const [hasBookings, setHasBookings] = useState(false)
  const [hasFoodOrders, setHasFoodOrders] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchPerformanceData() {
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

        // Get date range
        const periodDays = parseInt(dateRange) || 30
        const { start, end } = getDateRange(periodDays)

        // Get performance metrics
        const { data: metrics } = locationIds.length > 0
          ? await supabase
              .from("gmb_performance_metrics")
              .select("metric_type, metric_value, metric_date")
              .eq("user_id", user.id)
              .in("location_id", locationIds)
              .gte("metric_date", start.toISOString().split('T')[0])
              .lte("metric_date", end.toISOString().split('T')[0])
              .order("metric_date", { ascending: true })
          : { data: [] }

        if (!metrics || metrics.length === 0) {
          setData([])
          setIsLoading(false)
          return
        }

        // Aggregate metrics by date
        const impressionTypes = [
          'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
          'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
          'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
          'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
        ]

        const clickTypes = [
          'WEBSITE_CLICKS',
          'CALL_CLICKS',
        ]

        const conversationTypes = [
          'BUSINESS_CONVERSATIONS',
        ]

        const bookingTypes = [
          'BUSINESS_BOOKINGS',
        ]

        const foodTypes = [
          'BUSINESS_FOOD_ORDERS',
          'BUSINESS_FOOD_MENU_CLICKS',
        ]

        // Aggregate by date
        const aggregatedByDate: Record<string, { 
          impressions: number; 
          clicks: number; 
          conversations: number;
          bookings: number;
          foodOrders: number;
        }> = {}

        metrics.forEach((metric) => {
          const date = metric.metric_date
          if (!aggregatedByDate[date]) {
            aggregatedByDate[date] = { 
              impressions: 0, 
              clicks: 0, 
              conversations: 0,
              bookings: 0,
              foodOrders: 0,
            }
          }

          const value = typeof metric.metric_value === 'string' 
            ? parseInt(metric.metric_value) || 0 
            : metric.metric_value

          if (impressionTypes.includes(metric.metric_type)) {
            aggregatedByDate[date].impressions += value
          } else if (clickTypes.includes(metric.metric_type)) {
            aggregatedByDate[date].clicks += value
          } else if (conversationTypes.includes(metric.metric_type)) {
            aggregatedByDate[date].conversations += value
          } else if (bookingTypes.includes(metric.metric_type)) {
            aggregatedByDate[date].bookings += value
          } else if (foodTypes.includes(metric.metric_type)) {
            aggregatedByDate[date].foodOrders += value
          }
        })

        // Convert to chart format
        const chartData = Object.entries(aggregatedByDate)
          .map(([date, values]) => {
            const dateObj = new Date(date)
            const dayLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            
            return {
              date: dayLabel,
              fullDate: date,
              impressions: values.impressions,
              clicks: values.clicks,
              conversations: values.conversations,
              bookings: values.bookings || 0,
              foodOrders: values.foodOrders || 0,
            }
          })
          .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())

        // Calculate totals and check if we have optional metrics
        const totals = chartData.reduce(
          (acc, item) => ({
            impressions: acc.impressions + item.impressions,
            clicks: acc.clicks + item.clicks,
            conversations: acc.conversations + item.conversations,
            bookings: acc.bookings + item.bookings,
            foodOrders: acc.foodOrders + item.foodOrders,
          }),
          { impressions: 0, clicks: 0, conversations: 0, bookings: 0, foodOrders: 0 }
        )

        // Check which optional metrics are available
        const hasBookings = totals.bookings > 0
        const hasFoodOrders = totals.foodOrders > 0

        setTotalImpressions(totals.impressions)
        setTotalClicks(totals.clicks)
        setHasBookings(totals.bookings > 0)
        setHasFoodOrders(totals.foodOrders > 0)
        
        setData(chartData)
      } catch (error) {
        console.error("Error fetching performance data:", error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPerformanceData()

    const channel = supabase
      .channel("performance-metrics-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "gmb_performance_metrics" }, fetchPerformanceData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, dateRange])

  if (isLoading) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[300px]" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-6">
            <div className="text-muted-foreground mb-2">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-lg font-medium">No performance data available</p>
              <p className="text-sm mt-2 max-w-md">
                Sync your GMB account to see performance trends based on Google Business Profile data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Find max value for Y-axis scaling
  const maxValue = Math.max(
    ...data.map(d => Math.max(
      d.impressions, 
      d.clicks, 
      d.conversations,
      d.bookings || 0,
      d.foodOrders || 0
    ))
  )

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Performance Trends</CardTitle>
          <div className="text-sm text-muted-foreground">
            {totalImpressions.toLocaleString()} impressions • {totalClicks.toLocaleString()} clicks
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 107, 53, 0.1)" />
            <XAxis 
              dataKey="date" 
              stroke="#999999" 
              style={{ fontSize: "12px" }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#999999" 
              style={{ fontSize: "12px" }}
              domain={[0, maxValue * 1.1]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0a0a0a",
                border: "1px solid rgba(255, 107, 53, 0.3)",
                borderRadius: "8px",
                color: "#ffffff",
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="impressions" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              dot={{ fill: "#3b82f6", r: 3 }}
              name="Impressions"
            />
            <Line 
              type="monotone" 
              dataKey="clicks" 
              stroke="#22c55e" 
              strokeWidth={2} 
              dot={{ fill: "#22c55e", r: 3 }}
              name="Clicks"
            />
            <Line 
              type="monotone" 
              dataKey="conversations" 
              stroke="#f59e0b" 
              strokeWidth={2} 
              dot={{ fill: "#f59e0b", r: 3 }}
              name="Conversations"
            />
            {hasBookings && (
              <Line 
                type="monotone" 
                dataKey="bookings" 
                stroke="#a855f7" 
                strokeWidth={2} 
                dot={{ fill: "#a855f7", r: 3 }}
                name="Bookings"
                strokeDasharray="5 5"
              />
            )}
            {hasFoodOrders && (
              <Line 
                type="monotone" 
                dataKey="foodOrders" 
                stroke="#ec4899" 
                strokeWidth={2} 
                dot={{ fill: "#ec4899", r: 3 }}
                name="Food Orders"
                strokeDasharray="5 5"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
