"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  urgent?: number;
  href?: string;
  iconColor?: string;
}

export function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  trendDirection = "neutral",
  urgent,
  href,
  iconColor = "text-orange-500",
}: StatCardProps) {
  const TrendIcon = trendDirection === "up" ? TrendingUp : TrendingDown;

  const content = (
    <Card
      className={cn(
        "relative overflow-hidden border-orange-500/20 bg-zinc-900/50 backdrop-blur-sm",
        "hover:border-orange-500/40 transition-all duration-200",
        href && "cursor-pointer hover:bg-zinc-900/70",
      )}
    >
      <CardContent className="p-6">
        {/* Header with Icon and Title */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-orange-500/10", iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">{title}</p>
              {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
            </div>
          </div>

          {/* Urgent Badge */}
          {urgent !== undefined && urgent > 0 && (
            <Badge
              variant="destructive"
              className="bg-red-500/20 text-red-400 border-red-500/30"
            >
              {urgent} urgent
            </Badge>
          )}
        </div>

        {/* Value */}
        <div className="space-y-2">
          <div className="text-3xl font-bold text-zinc-100">{value}</div>

          {/* Trend */}
          {trend && (
            <div className="flex items-center gap-1.5">
              <TrendIcon
                className={cn(
                  "h-4 w-4",
                  trendDirection === "up" && "text-green-400",
                  trendDirection === "down" && "text-red-400",
                  trendDirection === "neutral" && "text-zinc-400",
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  trendDirection === "up" && "text-green-400",
                  trendDirection === "down" && "text-red-400",
                  trendDirection === "neutral" && "text-zinc-400",
                )}
              >
                {trend}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
