"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  valueClassName?: string;
}

interface InfoBanner {
  icon: LucideIcon;
  title: string;
  description: string;
  variant?: "info" | "warning" | "success";
}

interface ActionButton {
  label: string;
  href: string;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "ghost";
}

interface TipItem {
  text: string;
}

interface GenericManagementCardProps {
  title: string;
  description?: string;
  titleIcon: LucideIcon;
  titleIconColor?: string;
  stats?: StatItem[];
  infoBanner?: InfoBanner;
  tips?: TipItem[];
  actions: ActionButton[];
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "outline" | "destructive";
  };
}

/**
 * Generic Management Card - Unified component for Reviews, Posts, Q&A, etc.
 * Eliminates code duplication across management cards
 */
export function GenericManagementCard({
  title,
  description,
  titleIcon: TitleIcon,
  titleIconColor = "text-orange-500",
  stats = [],
  infoBanner,
  tips,
  actions,
  badge,
}: GenericManagementCardProps) {
  const getBannerVariantStyles = (variant: InfoBanner["variant"] = "info") => {
    switch (variant) {
      case "warning":
        return {
          bg: "bg-yellow-500/10",
          border: "border-yellow-500/20",
          iconColor: "text-yellow-400",
          titleColor: "text-yellow-300",
        };
      case "success":
        return {
          bg: "bg-green-500/10",
          border: "border-green-500/20",
          iconColor: "text-green-400",
          titleColor: "text-green-300",
        };
      default: // info
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          iconColor: "text-blue-400",
          titleColor: "text-blue-300",
        };
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-orange-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TitleIcon className={cn("h-5 w-5", titleIconColor)} />
            {title}
          </CardTitle>
          {badge && (
            <Badge variant={badge.variant || "default"}>{badge.label}</Badge>
          )}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info Banner */}
        {infoBanner && (
          <div
            className={cn(
              "rounded-lg p-4 border",
              getBannerVariantStyles(infoBanner.variant).bg,
              getBannerVariantStyles(infoBanner.variant).border,
            )}
          >
            <div className="flex items-start gap-3">
              <infoBanner.icon
                className={cn(
                  "h-5 w-5 shrink-0 mt-0.5",
                  getBannerVariantStyles(infoBanner.variant).iconColor,
                )}
              />
              <div className="flex-1">
                <p
                  className={cn(
                    "text-sm font-medium mb-1",
                    getBannerVariantStyles(infoBanner.variant).titleColor,
                  )}
                >
                  {infoBanner.title}
                </p>
                <p className="text-xs text-zinc-400">
                  {infoBanner.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {stats.length > 0 && (
          <div
            className={cn(
              "grid gap-4",
              stats.length === 2 ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="h-4 w-4" />
                  <span className="text-xs text-zinc-400">{stat.label}</span>
                </div>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    stat.valueClassName || "text-zinc-100",
                  )}
                >
                  {stat.value}
                </p>
                {stat.subtext && (
                  <p className="text-xs text-zinc-500">{stat.subtext}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tips Section */}
        {tips && tips.length > 0 && (
          <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/30">
            <p className="text-sm font-medium text-zinc-300 mb-2">
              💡 نصائح مهمة
            </p>
            <ul className="space-y-1 text-xs text-zinc-400">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-400 shrink-0">•</span>
                  <span>{tip.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        {actions.length > 0 && (
          <div className="space-y-2">
            {actions.map((action, index) => (
              <Link key={index} href={action.href} className="block">
                <Button
                  className="w-full"
                  variant={
                    action.variant || (index === 0 ? "default" : "outline")
                  }
                >
                  {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                  {action.label}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

GenericManagementCard.displayName = "GenericManagementCard";
