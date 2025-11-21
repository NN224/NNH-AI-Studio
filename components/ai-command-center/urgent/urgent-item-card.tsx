"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LucideIcon,
  Star,
  HelpCircle,
  FileText,
  ArrowRight,
  Sparkles,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useTranslations } from "next-intl";

export type UrgentItemType = "review" | "question" | "post";
export type UrgentPriority = "high" | "medium" | "low";

interface UrgentItemCardProps {
  id: string;
  type: UrgentItemType;
  priority: UrgentPriority;
  title: string;
  content: string;
  timestamp: string;
  metadata?: {
    rating?: number;
    author?: string;
    locationName?: string;
  };
  onAIAction?: () => void;
  viewHref: string;
}

export function UrgentItemCard({
  id,
  type,
  priority,
  title,
  content,
  timestamp,
  metadata,
  onAIAction,
  viewHref,
}: UrgentItemCardProps) {
  const t = useTranslations("aiCommandCenter.urgentItems");

  // Get icon and color based on type
  const getTypeConfig = () => {
    switch (type) {
      case "review":
        return {
          icon: Star,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",
          label: t("types.review", { defaultValue: "Review" }),
        };
      case "question":
        return {
          icon: HelpCircle,
          color: "text-purple-500",
          bgColor: "bg-purple-500/10",
          borderColor: "border-purple-500/30",
          label: t("types.question", { defaultValue: "Question" }),
        };
      case "post":
        return {
          icon: FileText,
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          label: t("types.post", { defaultValue: "Post" }),
        };
    }
  };

  const typeConfig = getTypeConfig();
  const TypeIcon = typeConfig.icon;

  // Priority badge styling
  const getPriorityConfig = () => {
    switch (priority) {
      case "high":
        return {
          label: t("priority.high", { defaultValue: "High Priority" }),
          className: "bg-red-500/20 text-red-400 border-red-500/30",
        };
      case "medium":
        return {
          label: t("priority.medium", { defaultValue: "Medium" }),
          className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        };
      case "low":
        return {
          label: t("priority.low", { defaultValue: "Low" }),
          className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        };
    }
  };

  const priorityConfig = getPriorityConfig();

  return (
    <Card
      className={cn(
        "border-orange-500/20 bg-zinc-900/50 backdrop-blur-sm",
        "hover:border-orange-500/40 transition-all duration-200",
      )}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Type Icon */}
              <div
                className={cn("p-2 rounded-lg shrink-0", typeConfig.bgColor)}
              >
                <TypeIcon className={cn("h-4 w-4", typeConfig.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="shrink-0">
                    {typeConfig.label}
                  </Badge>
                  <Badge variant="outline" className={priorityConfig.className}>
                    {priorityConfig.label}
                  </Badge>
                </div>

                <h4 className="font-medium text-zinc-200 line-clamp-1">
                  {title}
                </h4>

                {/* Metadata */}
                {metadata && (
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    {metadata.rating !== undefined && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span>{metadata.rating}</span>
                      </div>
                    )}
                    {metadata.author && (
                      <span className="truncate">{metadata.author}</span>
                    )}
                    {metadata.locationName && (
                      <span className="truncate">{metadata.locationName}</span>
                    )}
                  </div>
                )}

                {/* Content Preview */}
                <p className="text-sm text-zinc-400 line-clamp-2">{content}</p>

                {/* Timestamp */}
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Clock className="h-3 w-3" />
                  <span>{timestamp}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {onAIAction && (
              <Button
                size="sm"
                variant="outline"
                onClick={onAIAction}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {t("actions.aiAssist", { defaultValue: "AI Assist" })}
              </Button>
            )}

            <Button size="sm" variant="ghost" asChild className="gap-2 ml-auto">
              <Link href={viewHref}>
                {t("actions.viewFull", { defaultValue: "View Full" })}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
