"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Eye, AlertCircle, Star } from 'lucide-react';
import { Location } from '@/components/locations/location-types';

interface LocationMiniDashboardProps {
  location: Location;
  isExpanded: boolean;
  onToggle: () => void;
}

export function LocationMiniDashboard({ location, isExpanded, onToggle }: LocationMiniDashboardProps) {
  // Mock data for demonstration - in production, this would come from an API
  const mockKPIs = {
    viewsThisMonth: 1234,
    viewsTrend: 15.2,
    pendingReviews: 3,
    responseRate: 87,
    lastUpdated: '2 hours ago',
  };

  const mockRatingTrend = [4.2, 4.3, 4.4, 4.3, 4.5, 4.5, 4.6]; // Last 7 data points

  // Simple sparkline chart component
  const Sparkline = ({ data }: { data: number[] }) => {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const width = 100;
    const height = 30;
    const pointSpacing = width / (data.length - 1);

    const points = data.map((value, index) => {
      const x = index * pointSpacing;
      const y = height - ((value - min) / range) * height;
      return { x, y };
    });

    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    return (
      <svg
        width={width}
        height={height}
        className="inline-block"
        viewBox={`0 0 ${width} ${height}`}
      >
        <path
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="2"
            fill="currentColor"
            className="text-primary"
          />
        ))}
      </svg>
    );
  };

  if (!isExpanded) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border/50 animate-in slide-in-from-top-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Rating Trend */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-muted-foreground">Rating Trend (30d)</h4>
              <Star className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="flex items-end gap-3">
              <div>
                <div className="text-2xl font-bold">{location.rating?.toFixed(1) || 'N/A'}</div>
                <div className="flex items-center text-xs text-green-500">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +0.3 vs last month
                </div>
              </div>
              <div className="flex-1 flex items-end justify-end">
                <Sparkline data={mockRatingTrend} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Views & Engagement */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-muted-foreground">Views This Month</h4>
              <Eye className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{mockKPIs.viewsThisMonth.toLocaleString()}</div>
              <div className="flex items-center text-xs text-green-500">
                <TrendingUp className="w-3 h-3 mr-1" />
                +{mockKPIs.viewsTrend}% vs last month
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="text-xs text-muted-foreground">Response Rate</div>
              <div className="text-lg font-semibold">{mockKPIs.responseRate}%</div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Reviews & Alerts */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-muted-foreground">Pending Reviews</h4>
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{mockKPIs.pendingReviews}</div>
              <div className="text-xs text-muted-foreground">Need response</div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500 mt-1 flex-shrink-0" />
                <div className="text-xs text-muted-foreground">
                  Latest: Low rating review needs attention
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Score Bar */}
      <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">Location Health Score</span>
          <span className="text-lg font-bold">{location.healthScore || 0}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              (location.healthScore || 0) >= 80
                ? 'bg-green-500'
                : (location.healthScore || 0) >= 60
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${location.healthScore || 0}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Last updated: {mockKPIs.lastUpdated}
        </div>
      </div>
    </div>
  );
}
