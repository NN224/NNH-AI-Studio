"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  UrgentItemCard,
  UrgentItemType,
  UrgentPriority,
} from "./urgent-item-card";
import { AlertCircle, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export interface UrgentItem {
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
  viewHref: string;
}

interface UrgentItemsFeedProps {
  items?: UrgentItem[];
  isLoading?: boolean;
  onAIAction?: (itemId: string) => void;
}

export function UrgentItemsFeed({
  items,
  isLoading,
  onAIAction,
}: UrgentItemsFeedProps) {
  const t = useTranslations("aiCommandCenter.urgentItems");

  // Mock data for now
  const urgentItems: UrgentItem[] = items || [
    {
      id: "1",
      type: "review",
      priority: "high",
      title: "Negative review needs immediate attention",
      content:
        "Slow service during lunch hour. Had to wait 45 minutes for a simple order. Very disappointed with the experience.",
      timestamp: "2 hours ago",
      metadata: {
        rating: 2,
        author: "John M.",
        locationName: "Downtown Branch",
      },
      viewHref: "/reviews/1",
    },
    {
      id: "2",
      type: "question",
      priority: "high",
      title: "Customer asking about delivery options",
      content:
        "Do you deliver? What's the delivery radius and minimum order amount?",
      timestamp: "5 hours ago",
      metadata: {
        author: "Sarah K.",
        locationName: "Downtown Branch",
      },
      viewHref: "/questions/2",
    },
    {
      id: "3",
      type: "review",
      priority: "medium",
      title: "Review about parking",
      content:
        "Great food but parking is always a problem. Need more parking spaces or valet service.",
      timestamp: "1 day ago",
      metadata: {
        rating: 3,
        author: "Mike R.",
        locationName: "Downtown Branch",
      },
      viewHref: "/reviews/3",
    },
  ];

  if (isLoading) {
    return (
      <Card className="border-orange-500/20 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            {t("title", { defaultValue: "Urgent Items" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-zinc-800/50 animate-pulse rounded-lg"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-500/20 bg-zinc-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            {t("title", { defaultValue: "Urgent Items" })}
          </CardTitle>

          {urgentItems.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/urgent" className="gap-2">
                {t("viewAll", { defaultValue: "View All" })}
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {urgentItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-400">
              {t("empty", {
                defaultValue: "No urgent items at the moment. Great job!",
              })}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {urgentItems.map((item) => (
              <UrgentItemCard
                key={item.id}
                {...item}
                onAIAction={onAIAction ? () => onAIAction(item.id) : undefined}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
