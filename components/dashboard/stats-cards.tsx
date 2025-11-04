'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, MapPin, Star, MessageSquare, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  suffix?: string;
  loading?: boolean;
  target?: number;
}

function StatsCard({ title, value, trend, icon, suffix, loading, target }: StatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-[120px] mb-2" />
          <Skeleton className="h-3 w-[80px]" />
        </CardContent>
      </Card>
    );
  }

  const trendColor = trend && trend > 0 ? 'text-success' : trend && trend < 0 ? 'text-destructive' : 'text-muted-foreground';
  const TrendIcon = trend && trend > 0 ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-lg hover:shadow-primary/20 transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="text-muted-foreground">{icon}</div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-3xl font-bold">
            {value}
            {suffix && <span className="text-lg text-muted-foreground ml-1">{suffix}</span>}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {trend !== undefined && trend !== 0 && (
              <div className={`flex items-center text-xs font-medium ${trendColor}`}>
                <TrendIcon className="h-3 w-3 mr-1" />
                {Math.abs(trend).toFixed(1)}%
              </div>
            )}
            {target !== undefined && (
              <div className="text-xs text-muted-foreground">
                Target: {target}%
              </div>
            )}
            {!trend && !target && (
              <div className="text-xs text-muted-foreground">vs last period</div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface StatsCardsProps {
  loading?: boolean;
  data?: {
    totalLocations: number;
    locationsTrend: number;
    averageRating: number;
    ratingTrend: number;
    totalReviews: number;
    reviewsTrend: number;
    responseRate: number;
    responseTarget: number;
  };
}

export function StatsCards({ loading, data }: StatsCardsProps) {
  const stats = data || {
    totalLocations: 0,
    locationsTrend: 0,
    averageRating: 0,
    ratingTrend: 0,
    totalReviews: 0,
    reviewsTrend: 0,
    responseRate: 0,
    responseTarget: 100,
  };

  return (
    <>
      <StatsCard
        title="Total Locations"
        value={stats.totalLocations}
        trend={stats.locationsTrend}
        icon={<MapPin className="h-4 w-4" />}
        loading={loading}
      />
      <StatsCard
        title="Average Rating"
        value={stats.averageRating.toFixed(1)}
        trend={stats.ratingTrend}
        icon={<Star className="h-4 w-4" />}
        suffix="/ 5.0"
        loading={loading}
      />
      <StatsCard
        title="Total Reviews"
        value={stats.totalReviews.toLocaleString()}
        trend={stats.reviewsTrend}
        icon={<MessageSquare className="h-4 w-4" />}
        loading={loading}
      />
      <StatsCard
        title="Response Rate"
        value={`${stats.responseRate.toFixed(1)}%`}
        icon={<Target className="h-4 w-4" />}
        target={stats.responseTarget}
        loading={loading}
      />
    </>
  );
}

