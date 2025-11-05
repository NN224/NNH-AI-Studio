"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, MousePointerClick, Phone, Navigation, TrendingUp, Loader2 } from 'lucide-react';

interface LocationMetricsSectionProps {
  locationId: string;
  locationName: string;
}

export function LocationMetricsSection({ locationId, locationName }: LocationMetricsSectionProps) {
  const [dateRange, setDateRange] = useState('30d');
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/locations/${locationId}/metrics?range=${dateRange}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch metrics');
        }

        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching metrics:', error);
        // Set empty metrics on error
        setMetrics({
          views: 0,
          clicks: 0,
          calls: 0,
          directions: 0,
          viewsTrend: 0,
          clicksTrend: 0,
          callsTrend: 0,
          directionsTrend: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [locationId, dateRange]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading metrics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metricCards = [
    {
      label: 'Views',
      value: metrics?.views || 0,
      trend: metrics?.viewsTrend || 0,
      icon: Eye,
      color: 'text-blue-500',
    },
    {
      label: 'Clicks',
      value: metrics?.clicks || 0,
      trend: metrics?.clicksTrend || 0,
      icon: MousePointerClick,
      color: 'text-green-500',
    },
    {
      label: 'Calls',
      value: metrics?.calls || 0,
      trend: metrics?.callsTrend || 0,
      icon: Phone,
      color: 'text-purple-500',
    },
    {
      label: 'Directions',
      value: metrics?.directions || 0,
      trend: metrics?.directionsTrend || 0,
      icon: Navigation,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Performance Metrics</h3>
              <p className="text-sm text-muted-foreground">Track your location's performance</p>
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
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          const isPositive = metric.trend >= 0;
          
          return (
            <Card key={metric.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <Icon className={`w-4 h-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value.toLocaleString()}</div>
                <div className={`flex items-center gap-1 text-xs mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className={`w-3 h-3 ${isPositive ? '' : 'rotate-180'}`} />
                  <span>{Math.abs(metric.trend)}%</span>
                  <span className="text-muted-foreground">vs previous period</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                Charts will be available when metrics API is connected
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
