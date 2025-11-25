"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Star,
  MessageSquare,
  MapPin,
  Eye,
} from "lucide-react";

interface OverviewData {
  totalReviews?: number;
  averageRating?: number;
  totalLocations?: number;
  totalViews?: number;
  reviewsChange?: number;
  ratingChange?: number;
}

interface OverviewStatsProps {
  data?: OverviewData;
  isLoading?: boolean;
}

export function OverviewStats({ data, isLoading }: OverviewStatsProps) {
  const stats = [
    {
      title: "Total Reviews",
      value: data?.totalReviews ?? 0,
      change: data?.reviewsChange ?? 0,
      icon: MessageSquare,
      color: "text-blue-500",
    },
    {
      title: "Average Rating",
      value: data?.averageRating?.toFixed(1) ?? "0.0",
      change: data?.ratingChange ?? 0,
      icon: Star,
      color: "text-yellow-500",
    },
    {
      title: "Locations",
      value: data?.totalLocations ?? 0,
      change: 0,
      icon: MapPin,
      color: "text-green-500",
    },
    {
      title: "Total Views",
      value: data?.totalViews ?? 0,
      change: 0,
      icon: Eye,
      color: "text-purple-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.change !== 0 && (
              <p
                className={`text-xs flex items-center gap-1 ${stat.change > 0 ? "text-green-500" : "text-red-500"}`}
              >
                {stat.change > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(stat.change)}% from last period
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
