"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, MousePointerClick, Star, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface OverviewStatsProps {
  data?: {
    totalViews?: number;
    totalInteractions?: number;
    averageRating?: number;
    responseRate?: number;
  };
  isLoading: boolean;
}

export function OverviewStats({ data, isLoading }: OverviewStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: "Total Views",
      value: data?.totalViews || 0,
      icon: Eye,
      color: "text-blue-500",
    },
    {
      title: "Interactions",
      value: data?.totalInteractions || 0,
      icon: MousePointerClick,
      color: "text-purple-500",
    },
    {
      title: "Average Rating",
      value: data?.averageRating?.toFixed(1) || "0.0",
      icon: Star,
      color: "text-yellow-500",
    },
    {
      title: "Response Rate",
      value: `${data?.responseRate || 0}%`,
      icon: MessageSquare,
      color: "text-green-500",
    },
  ];

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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
