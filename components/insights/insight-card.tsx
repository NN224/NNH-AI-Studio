"use client";

/**
 * 💡 INSIGHT CARD COMPONENT
 *
 * Displays a single AI proactive insight with:
 * - Type badge and priority indicator
 * - Title and detailed message
 * - Suggested actions
 * - Mark as read / dismiss actions
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Users,
  Clock,
  CheckCircle,
  Target,
  Info,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProactiveInsight } from "@/lib/services/insights-service";
import { formatDistanceToNow } from "date-fns";

interface InsightCardProps {
  insight: ProactiveInsight;
  onMarkAsRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onActionTaken?: (id: string, action: string) => void;
}

const INSIGHT_TYPE_CONFIG = {
  problem_detected: {
    icon: AlertTriangle,
    label: "Problem Detected",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  opportunity: {
    icon: Target,
    label: "Opportunity",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  competitor_alert: {
    icon: Users,
    label: "Competitor Alert",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  positive_trend: {
    icon: TrendingUp,
    label: "Positive Trend",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  quiet_period: {
    icon: Clock,
    label: "Quiet Period",
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
  },
  welcome_back: {
    icon: CheckCircle,
    label: "Welcome Back",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
  milestone: {
    icon: Target,
    label: "Milestone",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  suggestion: {
    icon: Lightbulb,
    label: "Suggestion",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
  },
  all_good: {
    icon: CheckCircle,
    label: "All Good",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
};

export function InsightCard({
  insight,
  onMarkAsRead,
  onDismiss,
  onActionTaken,
}: InsightCardProps) {
  const config = INSIGHT_TYPE_CONFIG[insight.insightType];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card
        className={cn(
          "border-2 transition-all",
          config.borderColor,
          insight.isRead ? "opacity-60" : "",
          insight.isDismissed ? "opacity-40" : "",
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            {/* Type & Priority */}
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", config.bgColor)}>
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                  <Badge
                    variant={
                      insight.priority === "high"
                        ? "destructive"
                        : insight.priority === "medium"
                          ? "default"
                          : "secondary"
                    }
                    className="text-xs"
                  >
                    {insight.priority.toUpperCase()}
                  </Badge>
                  {!insight.isRead && (
                    <Badge variant="default" className="text-xs bg-blue-500">
                      NEW
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatDistanceToNow(insight.createdAt, { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {!insight.isRead && onMarkAsRead && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onMarkAsRead(insight.id)}
                  className="h-8 w-8 p-0"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
              {!insight.isDismissed && onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(insight.id)}
                  className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Title */}
          <h3 className="text-lg font-semibold text-white">{insight.title}</h3>

          {/* Message */}
          <p className="text-zinc-300 leading-relaxed">{insight.message}</p>

          {/* Detailed Analysis */}
          {insight.detailedAnalysis &&
            Object.keys(insight.detailedAnalysis).length > 0 && (
              <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-zinc-400 space-y-1">
                    {insight.detailedAnalysis.pattern && (
                      <p>
                        <span className="font-medium">Pattern:</span>{" "}
                        {insight.detailedAnalysis.pattern}
                      </p>
                    )}
                    {insight.detailedAnalysis.affectedReviews && (
                      <p>
                        <span className="font-medium">Affected Reviews:</span>{" "}
                        {insight.detailedAnalysis.affectedReviews}
                      </p>
                    )}
                    {insight.detailedAnalysis.timeframe && (
                      <p>
                        <span className="font-medium">Timeframe:</span>{" "}
                        {insight.detailedAnalysis.timeframe}
                      </p>
                    )}
                    {insight.detailedAnalysis.comparison && (
                      <p>
                        <span className="font-medium">Comparison:</span>{" "}
                        {insight.detailedAnalysis.comparison}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* Suggested Actions */}
          {insight.suggestedActions && insight.suggestedActions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-400">
                Suggested Actions:
              </p>
              <div className="flex flex-wrap gap-2">
                {insight.suggestedActions.map((action, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant={action.primary ? "default" : "outline"}
                    onClick={() => onActionTaken?.(insight.id, action.action)}
                    className={cn(
                      "gap-2",
                      action.primary &&
                        "bg-orange-500 hover:bg-orange-600 text-white",
                    )}
                  >
                    {action.label}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Action Taken */}
          {insight.actionTaken && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>Action taken: {insight.actionTaken}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
