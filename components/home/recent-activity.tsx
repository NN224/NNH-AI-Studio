"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare, Video, MapPin, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  type: "review" | "youtube" | "location" | "post";
  title: string;
  timestamp: Date;
}

interface RecentActivityProps {
  activities: Activity[];
  limit?: number;
}

export function RecentActivity({ activities, limit = 5 }: RecentActivityProps) {
  const t = useTranslations("home.recentActivity");

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "review":
        return { icon: MessageSquare, color: "text-blue-500" };
      case "youtube":
        return { icon: Video, color: "text-red-500" };
      case "location":
        return { icon: MapPin, color: "text-purple-500" };
      case "post":
        return { icon: TrendingUp, color: "text-green-500" };
      default:
        return { icon: Clock, color: "text-gray-500" };
    }
  };

  const displayedActivities = activities.slice(0, limit);

  if (displayedActivities.length === 0) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              {t("empty")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayedActivities.map((activity) => {
            const { icon: Icon, color } = getActivityIcon(activity.type);

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group cursor-pointer"
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center ${color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(activity.timestamp, {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {activities.length > limit && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Badge variant="secondary" className="w-full justify-center">
              +{activities.length - limit} {t("more")}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
