"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Eye, AlertCircle, Star } from 'lucide-react';
import { Location, LocationInsights } from '@/components/locations/location-types';
import { formatDistanceToNow } from 'date-fns';

interface LocationMiniDashboardProps {
  location: Location;
  isExpanded: boolean;
  onToggle: () => void;
  metrics?: {
    ratingTrend?: number;
    viewsThisMonth?: number;
    responseRate?: number;
    pendingReviews?: number;
    healthScore?: number;
  };
}

export function LocationMiniDashboard({ location, isExpanded, onToggle, metrics }: LocationMiniDashboardProps) {
  const metadata = (location.metadata as Record<string, unknown> | undefined) ?? {};
  const insights = (location.insights as Record<string, unknown> | undefined) ?? {};

  const ratingTrendValue = (metrics?.ratingTrend ?? location.ratingTrend ?? 0);
  const viewsThisMonth = Number(metrics?.viewsThisMonth ?? insights.views ?? 0);
  const responseRateValue = Number(metrics?.responseRate ?? location.responseRate ?? insights.responseRate ?? 0);
  const pendingReviewsValue = Number(metrics?.pendingReviews ?? insights.pendingReviews ?? 0);
  const healthScoreValue = Number(metrics?.healthScore ?? location.healthScore ?? 0);

  const coerceNumber = (value: unknown, defaultValue = 0): number =>
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
      ? Number(value) || defaultValue
      : defaultValue;

  const viewsTrend =
    coerceNumber(insights.viewsTrend, 0) ??
    coerceNumber(metadata.viewsTrend, 0);
  const pendingReviews =
    coerceNumber(
      insights.pendingReviews ??
        metadata.pendingReviews ??
        metadata.pending_reviews,
      0
    );
  const responseRate =
    location.responseRate ??
    coerceNumber(
      insights.responseRate ??
        metadata.responseRate ??
        metadata.response_rate,
      0
    );

  const ratingHistoryRaw =
    metadata.ratingHistory ??
    metadata.rating_history ??
    metadata.ratingTrendHistory ??
    metadata.rating_trend_history;

  const ratingHistory =
    Array.isArray(ratingHistoryRaw) && ratingHistoryRaw.length > 0
      ? ratingHistoryRaw
          .map((value: unknown) => {
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
              const parsed = Number(value);
              return Number.isFinite(parsed) ? parsed : null;
            }
            return null;
          })
          .filter((value): value is number => value !== null)
      : null;

  const sparklineData =
    ratingHistory && ratingHistory.length >= 2
      ? ratingHistory
      : (() => {
          const baseline = typeof location.rating === 'number' ? location.rating : 0;
          const trailing = baseline - ratingTrendValue;
          return [Math.max(trailing, 0), baseline];
        })();

  const lastUpdatedRaw =
    location.lastSync ??
    metadata.last_sync ??
    metadata.lastSync ??
    metadata.updatedAt ??
    metadata.updated_at ??
    null;

  const lastUpdatedLabel =
    lastUpdatedRaw != null
      ? (() => {
          try {
            const date =
              lastUpdatedRaw instanceof Date
                ? lastUpdatedRaw
                : new Date(lastUpdatedRaw);
            if (Number.isNaN(date.getTime())) return 'Not synced yet';
            return formatDistanceToNow(date, { addSuffix: true });
          } catch {
            return 'Not synced yet';
          }
        })()
      : 'Not synced yet';

  // Simple sparkline chart component
  const Sparkline = ({ data }: { data: number[] }) => {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const width = 100;
    const height = 30;
    const pointSpacing =
      data.length > 1 ? width / (data.length - 1) : width / 2;

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
        {data.length > 1 ? (
          <>
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
          </>
        ) : (
          <circle
            cx={points[0].x}
            cy={height / 2}
            r="3"
            fill="currentColor"
            className="text-primary"
          />
        )}
      </svg>
    );
  };

  if (!isExpanded) return null;

  return (
    <div className="animate-in slide-in-from-top-2 duration-300">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-muted-foreground">Rating Trend (30d)</h4>
              <Star className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-white">{typeof location.rating === 'number' ? location.rating.toFixed(1) : '—'}</div>
            <div className="flex items-center text-xs text-emerald-400 mt-2">
              {ratingTrendValue.toFixed(1)} vs last month
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-muted-foreground">Views This Month</h4>
              <Eye className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-white">{viewsThisMonth.toLocaleString()}</div>
            <div className="text-xs text-emerald-400 mt-2">Response Rate {Math.round(responseRateValue)}%</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-muted-foreground">Pending Reviews</h4>
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-white">{pendingReviewsValue}</div>
            <div className="text-xs text-orange-300 mt-2">Reviews need response</div>
          </CardContent>
        </Card>
      </div>

      {/* Health Score Bar */}
      <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">Location Health Score</span>
          <span className="text-lg font-bold text-white">{Math.round(healthScoreValue)}%</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              healthScoreValue >= 80
                ? 'bg-green-500'
                : healthScoreValue >= 60
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, healthScoreValue))}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Last updated: {lastUpdatedLabel}
        </div>
      </div>
    </div>
  );
}
