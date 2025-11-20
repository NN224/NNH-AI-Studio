"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  MessageSquare,
  Star,
  TrendingUp,
  Play,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface Stat {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface StatsOverviewProps {
  stats: {
    locations: number;
    reviews: number;
    avgRating: string;
    accounts: number;
    youtubeSubscribers?: number;
  };
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const t = useTranslations("home.stats");

  const statsData: Stat[] = [
    {
      label: t("locations"),
      value: stats.locations,
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: t("reviews"),
      value: stats.reviews,
      icon: MessageSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: t("avgRating"),
      value: `${stats.avgRating}/5.0`,
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: t("accounts"),
      value: stats.accounts,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  // Add YouTube stats if available
  if (stats.youtubeSubscribers) {
    statsData.push({
      label: t("youtubeSubscribers"),
      value: stats.youtubeSubscribers.toLocaleString(),
      icon: Play,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {statsData.map((stat, index) => (
        <Card
          key={index}
          className="border-border/40 bg-card/50 backdrop-blur hover:shadow-lg hover:scale-105 transition-all duration-300 group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {stat.label}
            </CardTitle>
            <div
              className={`p-2 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform`}
            >
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.change && (
              <div
                className={`flex items-center gap-1 text-xs mt-1 ${stat.change > 0 ? "text-green-500" : "text-red-500"}`}
              >
                {stat.change > 0 ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                <span>{Math.abs(stat.change)}%</span>
                <span className="text-muted-foreground ml-1">vs last week</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
