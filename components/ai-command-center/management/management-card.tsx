"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ManagementCardStats {
  [key: string]: string | number;
}

interface ManagementCardAction {
  label: string;
  href: string;
  variant?: "default" | "outline" | "ghost";
  icon?: LucideIcon;
}

interface ManagementCardProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description?: string;
  stats: ManagementCardStats;
  actions: ManagementCardAction[];
  className?: string;
}

export function ManagementCard({
  icon: Icon,
  iconColor = "text-orange-500",
  title,
  description,
  stats,
  actions,
  className,
}: ManagementCardProps) {
  return (
    <Card
      className={cn(
        "border-orange-500/20 bg-zinc-900/50 backdrop-blur-sm",
        "hover:border-orange-500/40 transition-all duration-200",
        className,
      )}
    >
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg bg-orange-500/10", iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <p className="text-sm text-zinc-400 mt-1">{description}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(stats).map(([key, value]) => (
            <div
              key={key}
              className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
            >
              <div className="text-2xl font-bold text-zinc-100">{value}</div>
              <div className="text-xs text-zinc-400 mt-1 capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {actions.map((action, index) => {
            const ActionIcon = action.icon || ArrowRight;
            return (
              <Button
                key={index}
                variant={action.variant || "default"}
                className="w-full justify-between"
                asChild
              >
                <Link href={action.href}>
                  {action.label}
                  <ActionIcon className="h-4 w-4" />
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
