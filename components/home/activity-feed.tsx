"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Star,
  MapPin,
  TrendingUp,
  Clock,
  ExternalLink,
  Video,
  ThumbsUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface Activity {
  id: string;
  type: "review" | "youtube" | "location" | "post";
  title: string;
  description: string;
  timestamp: Date;
  metadata?: {
    rating?: number;
    location?: string;
    views?: number;
    likes?: number;
  };
  actionUrl?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const t = useTranslations("home.activityFeed");

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "review":
        return MessageSquare;
      case "youtube":
        return Video;
      case "location":
        return MapPin;
      case "post":
        return TrendingUp;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type: Activity["type"]) => {
    switch (type) {
      case "review":
        return "text-blue-500 bg-blue-500/10";
      case "youtube":
        return "text-red-500 bg-red-500/10";
      case "location":
        return "text-purple-500 bg-purple-500/10";
      case "post":
        return "text-green-500 bg-green-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  const getActivityBadge = (type: Activity["type"]) => {
    switch (type) {
      case "review":
        return { text: t("types.review"), variant: "default" as const };
      case "youtube":
        return { text: t("types.youtube"), variant: "destructive" as const };
      case "location":
        return { text: t("types.location"), variant: "secondary" as const };
      case "post":
        return { text: t("types.post"), variant: "outline" as const };
      default:
        return { text: "Activity", variant: "outline" as const };
    }
  };

  if (activities.length === 0) {
    return (
      <Card className="border-border/40">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">{t("empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t("title")}</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              {t("viewAll")}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            const colorClass = getActivityColor(activity.type);
            const badge = getActivityBadge(activity.type);

            return (
              <div
                key={activity.id}
                className="flex gap-4 p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all group"
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {activity.title}
                    </h4>
                    <Badge
                      variant={badge.variant}
                      className="flex-shrink-0 text-xs"
                    >
                      {badge.text}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {activity.description}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(activity.timestamp, {
                        addSuffix: true,
                      })}
                    </span>

                    {activity.metadata?.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {activity.metadata.rating}/5
                      </span>
                    )}

                    {activity.metadata?.views && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {activity.metadata.views.toLocaleString()} views
                      </span>
                    )}

                    {activity.metadata?.likes && (
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {activity.metadata.likes.toLocaleString()}
                      </span>
                    )}

                    {activity.metadata?.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {activity.metadata.location}
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  {activity.actionUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      asChild
                    >
                      <Link href={activity.actionUrl}>
                        {t("takeAction")}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
