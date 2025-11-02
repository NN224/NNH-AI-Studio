"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDateRange, getImpressionsBreakdown } from "@/lib/utils/performance-calculations"
import { Skeleton } from "@/components/ui/skeleton"

interface ImpressionsBreakdownChartProps {
  dateRange?: string // "7", "30", "90", "365"
}

export function ImpressionsBreakdownChart({ dateRange = "30" }: ImpressionsBreakdownChartProps) {
  const [breakdownData, setBreakdownData] = useState<{
    desktopMaps: number
    desktopSearch: number
    mobileMaps: number
    mobileSearch: number
    mapsTotal: number
    searchTotal: number
    desktopTotal: number
    mobileTotal: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchBreakdownData() {
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

        // Get performance metrics for impressions only
        const { data: metrics } = locationIds.length > 0
          ? await supabase
              .from("gmb_performance_metrics")
              .select("metric_type, metric_value, metric_date")
              .eq("user_id", user.id)
              .in("location_id", locationIds)
              .in("metric_type", [
                'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
                'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
                'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
                'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
              ])
              .gte("metric_date", start.toISOString().split('T')[0])
              .lte("metric_date", end.toISOString().split('T')[0])
          : { data: [] }

        if (metrics && metrics.length > 0) {
          const breakdown = getImpressionsBreakdown(metrics, start, end)
          setBreakdownData({
            desktopMaps: breakdown.desktopMaps,
            desktopSearch: breakdown.desktopSearch,
            mobileMaps: breakdown.mobileMaps,
            mobileSearch: breakdown.mobileSearch,
            mapsTotal: breakdown.mapsTotal,
            searchTotal: breakdown.searchTotal,
            desktopTotal: breakdown.desktopTotal,
            mobileTotal: breakdown.mobileTotal,
          })
        } else {
          setBreakdownData(null)
        }
      } catch (error) {
        console.error("Error fetching breakdown data:", error)
        setBreakdownData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBreakdownData()

    const channel = supabase
      .channel("impressions-breakdown-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "gmb_performance_metrics" }, fetchBreakdownData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, dateRange])

  if (isLoading) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Impressions Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[300px]" />
        </CardContent>
      </Card>
    )
  }

  if (!breakdownData || breakdownData.mapsTotal + breakdownData.searchTotal === 0) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Impressions Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-6">
            <div className="text-muted-foreground mb-2">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-lg font-medium">No impressions data available</p>
              <p className="text-sm mt-2 max-w-md">
                Sync your GMB account to see impressions breakdown by device and source.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare chart data
  const chartData = [
    {
      category: 'Desktop Maps',
      value: breakdownData.desktopMaps,
      fill: '#3b82f6',
    },
    {
      category: 'Desktop Search',
      value: breakdownData.desktopSearch,
      fill: '#60a5fa',
    },
    {
      category: 'Mobile Maps',
      value: breakdownData.mobileMaps,
      fill: '#22c55e',
    },
    {
      category: 'Mobile Search',
      value: breakdownData.mobileSearch,
      fill: '#4ade80',
    },
  ]

  // Summary data
  const summaryData = [
    {
      label: 'Maps',
      value: breakdownData.mapsTotal,
      percent: breakdownData.mapsTotal + breakdownData.searchTotal > 0
        ? ((breakdownData.mapsTotal / (breakdownData.mapsTotal + breakdownData.searchTotal)) * 100).toFixed(1)
        : '0',
    },
    {
      label: 'Search',
      value: breakdownData.searchTotal,
      percent: breakdownData.mapsTotal + breakdownData.searchTotal > 0
        ? ((breakdownData.searchTotal / (breakdownData.mapsTotal + breakdownData.searchTotal)) * 100).toFixed(1)
        : '0',
    },
    {
      label: 'Desktop',
      value: breakdownData.desktopTotal,
      percent: breakdownData.desktopTotal + breakdownData.mobileTotal > 0
        ? ((breakdownData.desktopTotal / (breakdownData.desktopTotal + breakdownData.mobileTotal)) * 100).toFixed(1)
        : '0',
    },
    {
      label: 'Mobile',
      value: breakdownData.mobileTotal,
      percent: breakdownData.desktopTotal + breakdownData.mobileTotal > 0
        ? ((breakdownData.mobileTotal / (breakdownData.desktopTotal + breakdownData.mobileTotal)) * 100).toFixed(1)
        : '0',
    },
  ]

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-foreground">Impressions Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {summaryData.map((item) => (
            <div key={item.label} className="text-center p-3 rounded-lg bg-secondary border border-primary/20">
              <p className="text-2xl font-bold text-foreground">{item.value.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
              <p className="text-xs text-primary mt-1">{item.percent}%</p>
            </div>
          ))}
        </div>

        {/* Bar Chart */}
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 107, 53, 0.1)" />
            <XAxis 
              dataKey="category" 
              stroke="#999999" 
              style={{ fontSize: "12px" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="#999999" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0a0a0a",
                border: "1px solid rgba(255, 107, 53, 0.3)",
                borderRadius: "8px",
                color: "#ffffff",
              }}
              formatter={(value: number) => value.toLocaleString()}
            />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
              label={{ fill: '#ffffff', fontSize: 12 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

