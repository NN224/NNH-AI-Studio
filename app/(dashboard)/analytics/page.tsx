"use client"

import { MetricsOverview } from "@/components/analytics/metrics-overview"
import { ReviewSentimentChart } from "@/components/analytics/review-sentiment-chart"
import { LocationPerformance } from "@/components/analytics/location-performance"
import { TrafficChart } from "@/components/analytics/traffic-chart"
import { ResponseTimeChart } from "@/components/analytics/response-time-chart"
import { Button } from "@/components/ui/button"
import { Download, Calendar } from "lucide-react"

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your performance and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary/30 text-foreground hover:bg-primary/20 bg-transparent">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <MetricsOverview />

      <div className="grid gap-6 lg:grid-cols-2">
        <ReviewSentimentChart />
        <LocationPerformance />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TrafficChart />
        <ResponseTimeChart />
      </div>
    </div>
  )
}
