"use client";

import React, { useEffect, useState } from "react";
import { FloatingCard } from "./floating-card";
import { Loader2 } from "lucide-react";
import { gmbLogger } from "@/lib/utils/logger";

interface Activity {
  id: string;
  type: "review" | "view" | "photo" | "post" | "question";
  title: string;
  description?: string;
  timestamp: string;
}

interface ActivityFeedCardProps {
  locationId: string | undefined;
}

/**
 * ActivityFeedCard Component
 * Shows recent business activity timeline
 */
export function ActivityFeedCard({ locationId }: ActivityFeedCardProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/locations/${locationId}/activity?pageSize=5`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch activities");
        }

        const data = await response.json();
        setActivities(data.activities || []);
      } catch (err) {
        gmbLogger.error(
          "Error fetching activities",
          err instanceof Error ? err : new Error(String(err)),
          { locationId },
        );
        setError("Failed to load activities");
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [locationId]);

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "review":
        return "⭐";
      case "view":
        return "👁️";
      case "photo":
        return "📸";
      case "post":
        return "📝";
      case "question":
        return "❓";
      default:
        return "📌";
    }
  };

  const getActivityColor = (type: Activity["type"]) => {
    switch (type) {
      case "review":
        return "bg-yellow-500/15 text-yellow-500 border-yellow-500/30";
      case "view":
        return "bg-blue-500/15 text-blue-500 border-blue-500/30";
      case "photo":
        return "bg-purple-500/15 text-purple-500 border-purple-500/30";
      case "post":
        return "bg-green-500/15 text-green-500 border-green-500/30";
      case "question":
        return "bg-red-500/15 text-red-500 border-red-500/30";
      default:
        return "bg-gray-500/15 text-gray-500 border-gray-500/30";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  if (!locationId) {
    return null;
  }

  return (
    <FloatingCard
      position="bottom-left"
      delay={0.3}
      mobilePosition="bottom"
      className="w-full md:w-[440px] max-h-[280px] md:max-h-[320px] flex flex-col"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          {error}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          No recent activity
        </div>
      ) : (
        <div
          className="space-y-2 overflow-y-auto pr-2 activity-scrollbar"
          style={{ maxHeight: "240px" }}
        >
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="
                p-3
                rounded-lg
                border-l-2
                border-transparent
                transition-all duration-300
                hover:border-white/20
                hover:bg-white/5
                hover:translate-x-1
                cursor-pointer
              "
              style={{
                borderLeftColor: `var(--${activity.type === "review" ? "yellow" : activity.type === "view" ? "blue" : activity.type === "photo" ? "purple" : activity.type === "post" ? "green" : "red"}-500)`,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center text-sm flex-shrink-0`}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white mb-1">
                    {activity.title}
                  </p>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {activity.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        .activity-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .activity-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
        }
        .activity-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
        .activity-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </FloatingCard>
  );
}
