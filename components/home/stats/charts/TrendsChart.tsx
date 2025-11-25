"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendData {
  date: string;
  reviews: number;
  rating: number;
}

interface TrendsChartProps {
  data?: TrendData[];
  isLoading?: boolean;
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-muted-foreground">Reviews:</span>
            <span className="font-medium">{payload[0]?.value || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-muted-foreground">Rating:</span>
            <span className="font-medium">
              {payload[1]?.value?.toFixed(1) || "0.0"}⭐
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function TrendsChart({ data, isLoading }: TrendsChartProps) {
  if (isLoading) {
    return (
      <Card className="col-span-4 border-primary/20">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data || [];

  // Calculate trend
  const getTrend = () => {
    if (chartData.length < 2) return { direction: "neutral", percent: 0 };
    const lastTwo = chartData.slice(-2);
    const diff = lastTwo[1]?.reviews - lastTwo[0]?.reviews;
    const percent =
      lastTwo[0]?.reviews > 0
        ? Math.round((diff / lastTwo[0].reviews) * 100)
        : 0;
    return {
      direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
      percent: Math.abs(percent),
    };
  };

  const trend = getTrend();
  const totalReviews = chartData.reduce((sum, d) => sum + d.reviews, 0);

  return (
    <Card className="col-span-4 border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Review Trends</CardTitle>
            <CardDescription>
              Monthly review count and average rating
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {trend.direction === "up" && (
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                <TrendingUp className="w-3 h-3 mr-1" />+{trend.percent}%
              </Badge>
            )}
            {trend.direction === "down" && (
              <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
                <TrendingDown className="w-3 h-3 mr-1" />-{trend.percent}%
              </Badge>
            )}
            {trend.direction === "neutral" && (
              <Badge variant="outline">
                <Minus className="w-3 h-3 mr-1" />
                Stable
              </Badge>
            )}
          </div>
        </div>
        {totalReviews > 0 && (
          <p className="text-2xl font-bold text-primary mt-2">
            {totalReviews}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              total reviews
            </span>
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            <p>No review data available yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="reviewsGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground capitalize">
                    {value}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="reviews"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#reviewsGradient)"
                dot={{ fill: "#3b82f6", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: "#3b82f6" }}
              />
              <Area
                type="monotone"
                dataKey="rating"
                stroke="#eab308"
                strokeWidth={2}
                fill="url(#ratingGradient)"
                dot={{ fill: "#eab308", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: "#eab308" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
