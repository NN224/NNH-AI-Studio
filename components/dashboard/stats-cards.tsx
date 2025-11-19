'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, MapPin, Star, MessageSquare, Target, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { memo, useMemo } from 'react';
import { getComparisonPeriodLabel, type DateRange } from '@/lib/date-range-utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  suffix?: string;
  loading?: boolean;
  target?: number;
  comparisonLabel?: string;
  comparisonDetails?: { current: string; previous: string };
}

// ✅ FIX: Memoize StatsCard to prevent unnecessary re-renders
const StatsCard = memo(function StatsCard({ 
  title, 
  value, 
  trend, 
  icon, 
  suffix, 
  loading, 
  target,
  comparisonLabel,
  comparisonDetails,
}: StatsCardProps) {
  // ✅ FIX: Memoize trend calculations
  const trendConfig = useMemo(() => {
    const trendColor = trend && trend > 0 ? 'text-success' : trend && trend < 0 ? 'text-destructive' : 'text-muted-foreground';
    const TrendIcon = trend && trend > 0 ? TrendingUp : TrendingDown;
    return { trendColor, TrendIcon };
  }, [trend]);

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

  const { trendColor, TrendIcon } = trendConfig;

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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center text-xs font-medium ${trendColor} cursor-help`}>
                      <TrendIcon className="h-3 w-3 mr-1" />
                      {Math.abs(trend).toFixed(1)}%
                      <Info className="h-3 w-3 ml-1 opacity-50" />
                    </div>
                  </TooltipTrigger>
                  {comparisonDetails && (
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-semibold text-xs">Comparison Period</p>
                        <p className="text-xs">
                          <span className="text-muted-foreground">Current:</span> {comparisonDetails.current}
                        </p>
                        <p className="text-xs">
                          <span className="text-muted-foreground">Previous:</span> {comparisonDetails.previous}
                        </p>
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
            {target !== undefined && (
              <div className="text-xs text-muted-foreground">
                Target: {target}%
              </div>
            )}
            {comparisonLabel && (
              <div className="text-xs text-muted-foreground">{comparisonLabel}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

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
  dateRange?: DateRange;
  comparisonDetails?: { current: string; previous: string };
}

// ✅ FIX: Memoize StatsCards component to prevent unnecessary re-renders
export const StatsCards = memo(function StatsCards({ 
  loading, 
  data, 
  dateRange, 
  comparisonDetails 
}: StatsCardsProps) {
  // ✅ FIX: Memoize stats calculation to prevent recalculation on every render
  const stats = useMemo(() => data || {
    totalLocations: 0,
    locationsTrend: 0,
    averageRating: 0,
    ratingTrend: 0,
    totalReviews: 0,
    reviewsTrend: 0,
    responseRate: 0,
    responseTarget: 100,
  }, [data]);

  const comparisonLabel = useMemo(() => {
    if (!dateRange) return 'vs last period';
    return getComparisonPeriodLabel(dateRange);
  }, [dateRange]);

  // ✅ FIX: Memoize card props to prevent re-renders
  const cardProps = useMemo(() => [
    {
      title: "Total Locations",
      value: stats.totalLocations,
      trend: stats.locationsTrend,
      icon: <MapPin className="h-4 w-4" />,
      loading,
      comparisonLabel,
      comparisonDetails,
    },
    {
      title: "Average Rating",
      value: stats.averageRating.toFixed(1),
      trend: stats.ratingTrend,
      icon: <Star className="h-4 w-4" />,
      suffix: "/ 5.0",
      loading,
      comparisonLabel,
      comparisonDetails,
    },
    {
      title: "Total Reviews",
      value: stats.totalReviews.toLocaleString(),
      trend: stats.reviewsTrend,
      icon: <MessageSquare className="h-4 w-4" />,
      loading,
      comparisonLabel,
      comparisonDetails,
    },
    {
      title: "Response Rate",
      value: `${stats.responseRate.toFixed(1)}%`,
      icon: <Target className="h-4 w-4" />,
      target: stats.responseTarget,
      loading,
    },
  ], [stats, loading, comparisonLabel, comparisonDetails]);

  return (
    <>
      {cardProps.map((props, index) => (
        <StatsCard key={props.title} {...props} />
      ))}
    </>
  );
});

// Default export for dynamic imports
export default StatsCards;
