'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Star, MessageSquare, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface PerformanceData {
  month: string;
  reviews: number;
  rating: number;
  questions: number;
}

interface PerformanceComparisonChartProps {
  currentMonthData: {
    reviews: number;
    rating: number;
    questions: number;
  };
  previousMonthData: {
    reviews: number;
    rating: number;
    questions: number;
  };
  loading?: boolean;
}

export function PerformanceComparisonChart({
  currentMonthData,
  previousMonthData,
  loading = false
}: PerformanceComparisonChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [visibleLines, setVisibleLines] = useState({
    reviews: true,
    rating: true,
    questions: true,
  });
  
  // ✅ FIX: Cleanup on unmount to prevent memory leaks
  // Note: Recharts handles cleanup automatically, and React refs are read-only
  // so we don't need to manually set ref.current to null
  useEffect(() => {
    return () => {
      // Recharts handles cleanup automatically - no manual cleanup needed
      // The ref will be automatically cleaned up when component unmounts
    };
  }, []);

  // Prepare chart data
  const chartData: PerformanceData[] = [
    {
      month: 'Previous Period',
      reviews: previousMonthData.reviews,
      rating: previousMonthData.rating * 20, // normalize 5-star rating to 100-scale for consistency
      questions: previousMonthData.questions,
    },
    {
      month: 'This Period',
      reviews: currentMonthData.reviews,
      rating: currentMonthData.rating * 20,
      questions: currentMonthData.questions,
    },
  ];

  // Calculate relative changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const reviewsChange = calculateChange(currentMonthData.reviews, previousMonthData.reviews);
  const ratingChange = calculateChange(currentMonthData.rating, previousMonthData.rating);
  const questionsChange = calculateChange(currentMonthData.questions, previousMonthData.questions);

  const metrics = [
    {
      label: 'Reviews',
      icon: MessageSquare,
      current: currentMonthData.reviews,
      change: reviewsChange,
      color: 'text-info',
      bgColor: 'bg-info/10',
      dataKey: 'reviews' as keyof typeof visibleLines,
    },
    {
      label: 'Rating',
      icon: Star,
      current: currentMonthData.rating.toFixed(1),
      change: ratingChange,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      dataKey: 'rating' as keyof typeof visibleLines,
    },
    {
      label: 'Questions',
      icon: HelpCircle,
      current: currentMonthData.questions,
      change: questionsChange,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      dataKey: 'questions' as keyof typeof visibleLines,
    },
  ];

  const handleLegendClick = (dataKey: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey],
    }));
  };

  // Custom Tooltip with detailed information
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">
                {entry.name === 'Rating (out of 100)' 
                  ? `${(entry.value / 20).toFixed(1)} ⭐` 
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Legend with click functionality
  const CustomLegend = () => (
    <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
      {metrics.map((metric) => (
        <button
          key={metric.dataKey}
          onClick={() => handleLegendClick(metric.dataKey)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer",
            "border hover:border-primary/50",
            visibleLines[metric.dataKey] 
              ? "border-border bg-background" 
              : "border-border/50 bg-muted/50 opacity-50"
          )}
        >
          <div
            className={cn("w-3 h-3 rounded-full", {
              "bg-blue-500": metric.dataKey === 'reviews',
              "bg-yellow-500": metric.dataKey === 'rating',
              "bg-purple-500": metric.dataKey === 'questions',
            })}
          />
          <span className="text-xs font-medium">{metric.label}</span>
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="mt-6 space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Performance Comparison
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Compare this month vs last month performance (click legend to toggle)
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            const isPositive = metric.change >= 0;
            
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn("p-3 rounded-lg", metric.bgColor)}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={cn("w-4 h-4", metric.color)} />
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div className="text-2xl font-bold">{metric.current}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                  <span className={cn(
                    "text-xs font-medium",
                    isPositive ? "text-success" : "text-destructive"
                  )}>
                    {isPositive ? '+' : ''}{metric.change.toFixed(1)}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Chart visual with animation */}
        <motion.div 
          ref={chartContainerRef} 
          className="h-[250px]"
          role="img"
          aria-label="Performance comparison chart between periods"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                stroke="#4b5563"
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                stroke="#4b5563"
              />
              <Tooltip content={<CustomTooltip />} />
              {visibleLines.reviews && (
                <Area
                  type="monotone"
                  dataKey="reviews"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReviews)"
                  name="Reviews"
                  animationDuration={1000}
                />
              )}
              {visibleLines.rating && (
                <Area
                  type="monotone"
                  dataKey="rating"
                  stroke="#eab308"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRating)"
                  name="Rating (out of 100)"
                  animationDuration={1000}
                />
              )}
              {visibleLines.questions && (
                <Area
                  type="monotone"
                  dataKey="questions"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorQuestions)"
                  name="Questions"
                  animationDuration={1000}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Interactive Custom Legend */}
        <CustomLegend />
      </CardContent>
    </Card>
  );
}

// Default export for dynamic imports
export default PerformanceComparisonChart;
