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
import { AnalyticsFilters, type AnalyticsFilters as AnalyticsFiltersType } from "./analytics-filters"
import { RealtimeMetricsDisplay } from "./realtime-metrics-display"
import { CustomReportBuilder } from "./custom-report-builder"

export function AnalyticsDashboard() {
  const [filters, setFilters] = useState<AnalyticsFiltersType>({
    dateRange: {
      preset: '30',
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    },
    locationIds: [],
    comparison: 'previous_period',
    metric: 'all'
  })

  const handleFiltersChange = (newFilters: AnalyticsFiltersType) => {
    setFilters(newFilters)
  }

  // Extract date range for backward compatibility
  const dateRange = filters.dateRange.preset || '30'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Analytics</h2>
        <p className="text-muted-foreground mb-6">Monitor your Google My Business performance</p>
        
        {/* Advanced Filters */}
        <AnalyticsFilters 
          onFiltersChange={handleFiltersChange}
          defaultDateRange="30"
        />
      </div>

      {/* Realtime Metrics */}
      <RealtimeMetricsDisplay 
        locationIds={filters.locationIds}
        simulateData={true} // Enable demo mode for testing
      />

      {/* Key Metrics */}
      <MetricsOverview 
        dateRange={dateRange} 
        locationIds={filters.locationIds}
        comparison={filters.comparison}
      />

      {/* Performance Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Performing Locations */}
        <LocationPerformance locationIds={filters.locationIds} />
        
        {/* Impressions Breakdown */}
        <ImpressionsBreakdownChart 
          dateRange={dateRange}
          locationIds={filters.locationIds}
        />
      </div>

      {/* Performance Metrics Chart */}
      <PerformanceMetricsChart 
        dateRange={dateRange}
        locationIds={filters.locationIds}
        comparison={filters.comparison}
      />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Impressions Trends */}
        <TrafficChart 
          dateRange={dateRange}
          locationIds={filters.locationIds}
        />
        
        {/* Review Sentiment */}
        <ReviewSentimentChart 
          dateRange={filters.dateRange}
          locationIds={filters.locationIds}
        />
      </div>

      {/* Search Keywords */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SearchKeywords 
          dateRange={filters.dateRange}
          locationIds={filters.locationIds}
        />
      </div>

      {/* Response Time Chart */}
      <ResponseTimeChart 
        dateRange={filters.dateRange}
        locationIds={filters.locationIds}
      />

      {/* Business Insights */}
      <BusinessInsights 
        filters={filters}
      />

      {/* Custom Report Builder */}
      <CustomReportBuilder 
        onReportGenerate={(config) => {
          console.log('Report generated:', config);
          // Handle report generation
        }}
      />
    </div>
  )
}