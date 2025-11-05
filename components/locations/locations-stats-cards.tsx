"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Location } from '@/components/locations/location-types';
import { MapPin, Star, Eye, TrendingUp, Loader2 } from 'lucide-react';
import { formatLargeNumber } from '@/components/locations/location-types';

interface LocationsStatsCardsProps {
  locations: Location[];
  loading: boolean;
}

export function LocationsStatsCards({ locations, loading }: LocationsStatsCardsProps) {
  // Calculate stats
  const totalLocations = locations.length;
  const avgRating = locations.length > 0
    ? locations.reduce((sum, loc) => sum + (loc.rating || 0), 0) / locations.length
    : 0;
  const totalReviews = locations.reduce((sum, loc) => sum + (loc.reviewCount || 0), 0);
  const avgHealthScore = locations.length > 0
    ? locations.reduce((sum, loc) => sum + (loc.healthScore || 0), 0) / locations.length
    : 0;
  const totalViews = locations.reduce((sum, loc) => sum + (loc.insights?.views || 0), 0);

  const stats = [
    {
      label: 'Total Locations',
      value: totalLocations,
      icon: MapPin,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Average Rating',
      value: avgRating.toFixed(1),
      icon: Star,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Total Reviews',
      value: formatLargeNumber(totalReviews),
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Avg Health Score',
      value: `${Math.round(avgHealthScore)}%`,
      icon: Eye,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  if (loading && locations.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-4" />
              <div className="h-8 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
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
