"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocations } from '@/hooks/use-locations';
import { Loader2, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationRatingTrendChart } from '@/components/locations/charts/location-rating-trend-chart';
import { LocationReviewsOverTimeChart } from '@/components/locations/charts/location-reviews-over-time-chart';
import { LocationHealthScoreDistributionChart } from '@/components/locations/charts/location-health-score-distribution-chart';
import { LocationCategoryComparisonChart } from '@/components/locations/charts/location-category-comparison-chart';

export function LocationsAnalyticsTab() {
  const { locations, loading } = useLocations({});
  const [dateRange, setDateRange] = useState('30d');

  // Calculate analytics data
  const analytics = useMemo(() => {
    if (locations.length === 0) {
      return {
        totalLocations: 0,
        avgRating: 0,
        totalReviews: 0,
        avgHealthScore: 0,
        topPerformer: null,
        needsAttention: [],
      };
    }

    const avgRating = locations.reduce((sum, loc) => sum + (loc.rating || 0), 0) / locations.length;
    const totalReviews = locations.reduce((sum, loc) => sum + (loc.reviewCount || 0), 0);
    const avgHealthScore = locations.reduce((sum, loc) => sum + (loc.healthScore || 0), 0) / locations.length;

    const topPerformer = [...locations].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    const needsAttention = locations.filter(loc => (loc.healthScore || 0) < 60);

    return {
      totalLocations: locations.length,
      avgRating,
      totalReviews,
      avgHealthScore,
      topPerformer,
      needsAttention,
    };
  }, [locations]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Analytics Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Performance metrics and insights for your locations
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalLocations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">out of 5.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalReviews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.avgHealthScore)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Rating Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationRatingTrendChart locations={locations} dateRange={dateRange} />
          </CardContent>
        </Card>

        {/* Reviews Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Reviews Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationReviewsOverTimeChart locations={locations} dateRange={dateRange} />
          </CardContent>
        </Card>

        {/* Health Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Health Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationHealthScoreDistributionChart locations={locations} />
          </CardContent>
        </Card>

        {/* Category Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Category Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationCategoryComparisonChart locations={locations} />
          </CardContent>
        </Card>
      </div>

      {/* Top Performer */}
      {analytics.topPerformer && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{analytics.topPerformer.name}</p>
                <p className="text-sm text-muted-foreground">
                  Rating: {analytics.topPerformer.rating?.toFixed(1)} / 5.0
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Needs Attention */}
      {analytics.needsAttention.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Needs Attention ({analytics.needsAttention.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.needsAttention.slice(0, 5).map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{location.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Health Score: {location.healthScore}%
                    </p>
                  </div>
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
