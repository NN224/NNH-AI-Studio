"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendData {
  date: string;
  reviews: number;
  rating: number;
}

interface TrendsChartProps {
  data?: TrendData[];
  isLoading?: boolean;
}

export function TrendsChart({ data, isLoading }: TrendsChartProps) {
  if (isLoading) {
    return (
      <Card className="col-span-4">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data || [
    { date: "Jan", reviews: 0, rating: 0 },
    { date: "Feb", reviews: 0, rating: 0 },
    { date: "Mar", reviews: 0, rating: 0 },
  ];

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Review Trends</CardTitle>
        <CardDescription>
          Monthly review count and average rating
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey="reviews"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="rating"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
