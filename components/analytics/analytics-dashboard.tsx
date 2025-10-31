"use client"

import { MetricsOverview } from "./metrics-overview"
import { ReviewSentimentChart } from "./review-sentiment-chart"
import { LocationPerformance } from "./location-performance"
import { TrafficChart } from "./traffic-chart"
import { ResponseTimeChart } from "./response-time-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, TrendingUp } from "lucide-react"
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
      <MetricsOverview />

      {/* Performance Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Performance Summary</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Engagement Rate</span>
                  <span className="font-medium text-foreground">78%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                    style={{ width: "78%" }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Review Response Rate</span>
                  <span className="font-medium text-foreground">92%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                    style={{ width: "92%" }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Customer Satisfaction</span>
                  <span className="font-medium text-foreground">85%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                    style={{ width: "85%" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Locations */}
        <LocationPerformance />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Traffic Trends */}
        <TrafficChart />
        
        {/* Review Sentiment */}
        <ReviewSentimentChart />
      </div>

      {/* Response Time Chart */}
      <ResponseTimeChart />

      {/* Additional Insights */}
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Strong review response rate</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your 92% response rate is above industry average. Keep maintaining this excellent customer engagement.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Opportunity to improve ratings</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Focus on addressing negative feedback quickly to improve your overall rating from 4.3 to 4.5+
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Peak activity detected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Most reviews come in on weekends. Consider scheduling content updates and responses accordingly.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}