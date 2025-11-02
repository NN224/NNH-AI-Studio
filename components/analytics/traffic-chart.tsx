"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDateRange } from "@/lib/utils/performance-calculations"
import { Skeleton } from "@/components/ui/skeleton"

interface TrafficChartProps {
  dateRange?: string // "7" | "30" | "90" | "365"
}

export function TrafficChart({ dateRange = "30" }: TrafficChartProps) {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchTrafficData() {
      try {
        setIsLoading(true)
        
        // Get current user first
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        // Get active account IDs
        const { data: accounts, error: accountsError } = await supabase
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
        const { data: locations, error: locationsError } = await supabase
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
        if (locationIds.length === 0) {
          setIsLoading(false)
          return
        }

        // Calculate date range
        const days = parseInt(dateRange) || 30
        const { start, end } = getDateRange(days)

        // Fetch performance metrics for Impressions
        const { data: metrics, error: metricsError } = locationIds.length > 0
          ? await supabase
              .from("gmb_performance_metrics")
              .select("metric_type, metric_value, metric_date")
              .eq("user_id", user.id)
              .in("location_id", locationIds)
              .in("metric_type", [
                'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
                'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
                'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
                'BUSINESS_IMPRESSIONS_MOBILE_SEARCH'
              ])
              .gte("metric_date", start.toISOString().split('T')[0])
              .lte("metric_date", end.toISOString().split('T')[0])
              .order("metric_date", { ascending: true })
          : { data: [], error: null }

        if (metricsError) {
          console.error("Error fetching performance metrics:", metricsError)
          setData([])
          setIsLoading(false)
          return
        }

        if (metrics && metrics.length > 0) {
          // Group by date and sum impressions
          const dailyCounts: Record<string, number> = {}

          metrics.forEach((metric: any) => {
            if (!metric || !metric.metric_date) return
            const date = metric.metric_date
            const value = typeof metric.metric_value === 'string' 
              ? parseInt(metric.metric_value) || 0 
              : (Number(metric.metric_value) || 0)
            
            if (!dailyCounts[date]) {
              dailyCounts[date] = 0
            }
            dailyCounts[date] += value
          })

          // Convert to chart format, sorted by date
          const chartData = Object.entries(dailyCounts)
            .map(([date, impressions]) => ({
              date: new Date(date).toLocaleDateString("en-US", { 
                month: "short", 
                day: "numeric" 
              }),
              fullDate: date,
              impressions,
              sortKey: new Date(date).getTime()
            }))
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(({ date, impressions }) => ({ date, impressions }))

          setData(chartData)
        } else {
          setData([])
        }
      } catch (error) {
        console.error("Error fetching traffic data:", error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrafficData()

    const channel = supabase
      .channel("traffic-updates")
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "gmb_performance_metrics" 
      }, fetchTrafficData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, dateRange])

  if (isLoading) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Impressions Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[300px]" />
        </CardContent>
      </Card>
    )
  }

  const hasData = data.some(d => d.impressions > 0)

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-foreground">Impressions Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
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
              <YAxis stroke="#999999" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid rgba(255, 107, 53, 0.3)",
                  borderRadius: "8px",
                  color: "#ffffff",
                }}
                labelFormatter={(label) => `${label}`}
                formatter={(value: number) => [`${value.toLocaleString()} impressions`, "Impressions"]}
              />
              <Line 
                type="monotone" 
                dataKey="impressions" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={{ fill: "#3b82f6", r: 4 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-6">
            <div className="text-muted-foreground mb-2">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-lg font-medium">No impressions data available</p>
              <p className="text-sm mt-2 max-w-md">
                Sync your GMB account to see impressions trends based on Performance API data.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
