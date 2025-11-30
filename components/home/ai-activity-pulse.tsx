"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bot, Sparkles, Zap } from "lucide-react";

interface AIActivityStats {
  actionsToday: number;
  lastActionAt: string | null;
  reviewsReplied: number;
  questionsAnswered: number;
  postsGenerated: number;
}

/**
 * AI Activity Pulse Component
 * Shows real-time AI activity status and stats
 */
export function AIActivityPulse() {
  // Fetch AI activity stats
  const { data: stats, isLoading } = useQuery<AIActivityStats>({
    queryKey: ["ai-activity-stats"],
    queryFn: async () => {
      const response = await fetch("/api/ai/activity-stats");
      if (!response.ok) {
        // Return default stats if API not available
        return {
          actionsToday: 0,
          lastActionAt: null,
          reviewsReplied: 0,
          questionsAnswered: 0,
          postsGenerated: 0,
        };
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });

  const actionsToday = stats?.actionsToday ?? 0;
  const lastActionAt = stats?.lastActionAt;

  // Determine activity level
  const activityLevel =
    actionsToday === 0
      ? "idle"
      : actionsToday < 5
        ? "low"
        : actionsToday < 20
          ? "medium"
          : "high";

  const activityColors = {
    idle: "text-zinc-400 border-zinc-500/30 bg-zinc-500/5",
    low: "text-blue-400 border-blue-500/30 bg-blue-500/5",
    medium: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
    high: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  };

  const pulseColors = {
    idle: "bg-zinc-400",
    low: "bg-blue-400",
    medium: "bg-emerald-400",
    high: "bg-amber-400",
  };

  if (isLoading) {
    return (
      <div className="h-12 w-32 rounded-lg bg-zinc-800/50 animate-pulse" />
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              flex items-center gap-3 px-4 py-2 rounded-xl border
              transition-all duration-300
              ${activityColors[activityLevel]}
            `}
          >
            {/* Pulse Ring */}
            <div className="relative flex items-center justify-center">
              {activityLevel !== "idle" && (
                <div
                  className={`absolute w-3 h-3 rounded-full ${pulseColors[activityLevel]} animate-ping opacity-75`}
                />
              )}
              <div
                className={`relative w-3 h-3 rounded-full ${pulseColors[activityLevel]}`}
              />
            </div>

            {/* Status */}
            <div className="flex flex-col">
              <span className="text-xs font-medium flex items-center gap-1">
                <Bot className="h-3 w-3" />
                AI {activityLevel === "idle" ? "Idle" : "Active"}
              </span>
              <span className="text-[10px] opacity-70">
                {actionsToday} action{actionsToday !== 1 ? "s" : ""} today
              </span>
            </div>

            {/* Activity Icon */}
            {activityLevel !== "idle" && (
              <Zap className="h-4 w-4 animate-pulse" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 p-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">AI Activity Summary</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Reviews replied:</span>
                <span className="ml-1 font-medium">
                  {stats?.reviewsReplied ?? 0}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Questions answered:
                </span>
                <span className="ml-1 font-medium">
                  {stats?.questionsAnswered ?? 0}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Posts generated:</span>
                <span className="ml-1 font-medium">
                  {stats?.postsGenerated ?? 0}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Last action:</span>
                <span className="ml-1 font-medium">
                  {lastActionAt
                    ? formatDistanceToNow(new Date(lastActionAt), {
                        addSuffix: true,
                      })
                    : "Never"}
                </span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact version for header
 */
export function AIActivityBadge() {
  const { data: stats } = useQuery<AIActivityStats>({
    queryKey: ["ai-activity-stats"],
    queryFn: async () => {
      const response = await fetch("/api/ai/activity-stats");
      if (!response.ok) {
        return {
          actionsToday: 0,
          lastActionAt: null,
          reviewsReplied: 0,
          questionsAnswered: 0,
          postsGenerated: 0,
        };
      }
      return response.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const actionsToday = stats?.actionsToday ?? 0;

  if (actionsToday === 0) return null;

  return (
    <Badge
      variant="outline"
      className="hidden sm:flex items-center gap-1.5 px-2 py-1 border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
    >
      <Bot className="h-3 w-3" />
      <span className="text-xs font-medium">{actionsToday}</span>
    </Badge>
  );
}
