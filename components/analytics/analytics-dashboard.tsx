"use client"

import { MetricsOverview } from "./metrics-overview"
import { ReviewSentimentChart } from "./review-sentiment-chart"
import { LocationPerformance } from "./location-performance"
import { TrafficChart } from "./traffic-chart"
import { ResponseTimeChart } from "./response-time-chart"
import { SearchKeywords } from "./search-keywords"
import { PerformanceMetricsChart } from "./performance-metrics-chart"
import { ImpressionsBreakdownChart } from "./impressions-breakdown-chart"
import { BusinessInsights } from "@/components/insights/business-insights"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays } from "lucide-react"
import { useState } from "react"

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState("30")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
          <p className="text-muted-foreground">Monitor your Google My Business performance</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px] bg-secondary border-primary/30">
            <CalendarDays className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <MetricsOverview dateRange={dateRange} />

      {/* Performance Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Performing Locations */}
        <LocationPerformance />
        
        {/* Impressions Breakdown */}
        <ImpressionsBreakdownChart dateRange={dateRange} />
      </div>

      {/* Performance Metrics Chart */}
      <PerformanceMetricsChart dateRange={dateRange} />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Impressions Trends */}
        <TrafficChart dateRange={dateRange} />
        
        {/* Review Sentiment */}
        <ReviewSentimentChart />
      </div>

      {/* Search Keywords */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SearchKeywords />
      </div>

      {/* Response Time Chart */}
      <ResponseTimeChart />

      {/* Business Insights */}
      <BusinessInsights />
    </div>
  )
}