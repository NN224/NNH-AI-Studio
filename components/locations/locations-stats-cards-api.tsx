"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Eye, TrendingUp, Loader2 } from 'lucide-react';
import { formatLargeNumber } from '@/components/locations/location-types';
import { useDashboardSnapshot } from '@/hooks/use-dashboard-cache';

interface StatsData {
  totalLocations: number;
  avgRating: number;
  totalReviews: number;
  avgHealthScore: number;
}

export function LocationsStatsCardsAPI({ refreshKey }: { refreshKey?: number } = {}) {
  const { data: snapshot, loading: snapshotLoading } = useDashboardSnapshot();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      if (snapshot) {
        setStats({
          totalLocations: snapshot.locationSummary.totalLocations ?? 0,
          avgRating: snapshot.reviewStats.averageRating ?? 0,
          totalReviews: snapshot.reviewStats.totals.total ?? 0,
          avgHealthScore: snapshot.kpis.healthScore ?? 0,
        });
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/locations/stats', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        setStats({
          totalLocations: data.totalLocations ?? 0,
          avgRating: data.avgRating ?? 0,
          totalReviews: data.totalReviews ?? 0,
          avgHealthScore: data.avgHealthScore ?? 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
        setStats(null);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [refreshKey, snapshot]);

  const loadingState = loading || snapshotLoading;

  const statsConfig = [
    {
      label: 'Total Locations',
      value: stats?.totalLocations ?? 0,
      icon: MapPin,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Average Rating',
      value: stats?.avgRating ? stats.avgRating.toFixed(1) : '—',
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Total Reviews',
      value: formatLargeNumber(stats?.totalReviews ?? 0),
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Avg Health Score',
      value: `${Math.round(stats?.avgHealthScore ?? 0)}%`,
      icon: Eye,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  if (loadingState) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="mb-4 h-4 w-3/4 rounded bg-muted" />
              <div className="h-8 w-1/2 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid.gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-destructive md:col-span-2 lg:col-span-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="mb-1 text-sm font-semibold text-destructive">Failed to load stats</h3>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  window.location.reload();
                }}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsConfig.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

