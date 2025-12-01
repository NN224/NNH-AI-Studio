"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import type { ActivityLog } from "@/lib/types/database";
import { sanitizeText } from "@/lib/utils/sanitize";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Edit,
  Eye,
  FileText,
  Link as LinkIcon,
  MapPin,
  MessageSquare,
  Save,
  Star,
  Trash2,
  Upload,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/utils/logger";

// خريطة الأيقونات حسب نوع النشاط
const activityIcons = {
  // GMB
  review: MessageSquare,
  location: MapPin,
  rating: Star,
  post: FileText,
  post_deleted: Trash2,
  post_updated: Edit,
  post_saved: Save,
  question_answered: CheckCircle,
  question_draft: Save,
  question_answer_removed: XCircle,

  // YouTube
  youtube_connected: LinkIcon,
  youtube_disconnected: XCircle,
  youtube_ai_generated: Zap,
  youtube_draft_created: Save,
  youtube_draft_deleted: Trash2,
  youtube_video_uploaded: Upload,
  youtube_analytics_exported: Eye,

  // AI
  ai: Zap,

  // Default
  default: MessageSquare,
};

// دالة لتوليد الروابط بناءً على نوع النشاط والـ metadata
const getActivityLink = (activity: ActivityLog): string | null => {
  const meta = (activity.metadata as Record<string, unknown>) || {};

  // GMB Posts
  if (activity.activity_type.includes("post")) {
    return "/posts";
  }

  // GMB Reviews
  if (activity.activity_type.includes("review")) {
    return "/reviews";
  }

  // GMB Questions
  if (activity.activity_type.includes("question")) {
    return "/questions";
  }

  // GMB Locations
  if (activity.activity_type.includes("location")) {
    return "/locations";
  }

  // YouTube
  if (activity.activity_type.includes("youtube")) {
    if (activity.activity_type === "youtube_video_uploaded" && meta.videoId) {
      return `https://www.youtube.com/watch?v=${meta.videoId}`;
    }
    return "/youtube-dashboard";
  }

  return null;
};

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  if (!supabase) {
    throw new Error("Failed to initialize Supabase client");
  }
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);

  // ✅ FIX: Stabilize state update function to prevent race conditions
  const addActivity = useCallback((newActivity: ActivityLog) => {
    setActivities((prev) => {
      // ✅ Prevent duplicate activities
      if (prev.some((a) => a.id === newActivity.id)) {
        return prev;
      }
      // ✅ Add new activity and keep only last 10
      return [newActivity, ...prev].slice(0, 10);
    });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    let userId: string | null = null;

    const setupActivityFeed = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMountedRef.current) {
            setLoading(false);
          }
          return;
        }

        userId = user.id;

        const { data, error } = await supabase
          .from("activity_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!isMountedRef.current) return;

        if (error) {
          logger.error(
            "Failed to fetch activities",
            error instanceof Error ? error : new Error(String(error)),
            { userId: user.id },
          );
        }

        // If no activity logs, fetch recent reviews as fallback
        if (!data || data.length === 0) {
          const { data: reviews } = await supabase
            .from("gmb_reviews")
            .select(
              "review_id, comment, rating, review_date, location_name, reply_text",
            )
            .eq("user_id", user.id)
            .order("review_date", { ascending: false })
            .limit(10);

          if (reviews && reviews.length > 0) {
            const reviewActivities = reviews.map((review) => ({
              id: review.review_id,
              user_id: user.id,
              activity_type: review.reply_text ? "review_replied" : "review",
              activity_message: review.reply_text
                ? `Replied to ${review.rating}★ review at ${review.location_name || "your location"}`
                : `New ${review.rating}★ review at ${review.location_name || "your location"}`,
              metadata: { rating: review.rating, comment: review.comment },
              created_at: review.review_date,
              actionable: false,
            })) as ActivityLog[];
            setActivities(reviewActivities);
          } else {
            setActivities([]);
          }
        } else {
          setActivities(data);
        }

        // ✅ FIX: Subscribe to real-time updates AFTER getting user ID
        if (userId && isMountedRef.current) {
          const channel = supabase
            .channel(`activity_logs:${userId}:${Date.now()}`) // Unique channel name
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "activity_logs",
                filter: `user_id=eq.${userId}`, // Filter by user ID
              },
              (payload) => {
                // ✅ Use stabilized callback to prevent race conditions
                if (isMountedRef.current) {
                  addActivity(payload.new as ActivityLog);
                }
              },
            )
            .subscribe((status) => {
              if (status === "CHANNEL_ERROR") {
                logger.error("Activity feed subscription error", undefined, {
                  userId,
                });
              }
            });

          channelRef.current = channel;
        }
      } catch (err) {
        logger.error(
          "Activity feed error",
          err instanceof Error ? err : new Error(String(err)),
        );
        if (isMountedRef.current) {
          setActivities([]);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    setupActivityFeed();

    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, addActivity]);

  const getActivityIcon = (type: string) => {
    const IconComponent =
      activityIcons[type as keyof typeof activityIcons] ||
      activityIcons.default;
    return IconComponent;
  };

  // دالة لتحديد لون الأيقونة حسب نوع النشاط
  const getActivityColor = (type: string): string => {
    if (
      type.includes("delete") ||
      type.includes("disconnect") ||
      type.includes("removed")
    ) {
      return "from-red-500 to-red-600";
    }
    if (type.includes("ai") || type.includes("generated")) {
      return "from-purple-500 to-pink-500";
    }
    if (type.includes("youtube")) {
      return "from-red-600 to-red-700";
    }
    if (type.includes("saved") || type.includes("draft")) {
      return "from-blue-500 to-blue-600";
    }
    if (
      type.includes("upload") ||
      type.includes("publish") ||
      type.includes("connected")
    ) {
      return "from-green-500 to-green-600";
    }
    if (type.includes("answered") || type.includes("replied")) {
      return "from-emerald-500 to-emerald-600";
    }
    // Default
    return "from-primary to-accent";
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <Card className="bg-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader>
        <CardTitle className="text-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity</p>
            <p className="text-sm mt-2">Your activity will appear here</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.activity_type);
              const activityLink = getActivityLink(activity);
              const colorClass = getActivityColor(activity.activity_type);
              const isExternal = activityLink?.startsWith("http");

              const content = (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center gap-4 p-4 rounded-lg bg-secondary border border-primary/20 transition-all duration-200 ${
                    activityLink
                      ? "hover:border-primary/40 hover:bg-secondary/80 cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                      : ""
                  }`}
                  role={activityLink ? "button" : "article"}
                  tabIndex={activityLink ? 0 : -1}
                  aria-label={
                    activityLink
                      ? `${activity.activity_message}. Click to view details.`
                      : activity.activity_message
                  }
                >
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-full bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div
                      className={`relative w-10 h-10 rounded-full bg-linear-to-br ${colorClass} flex items-center justify-center shadow-lg`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* ✅ SECURITY: Sanitize user-generated content to prevent XSS */}
                    <p
                      className="text-sm text-foreground font-medium truncate"
                      aria-label={activity.activity_message}
                    >
                      {sanitizeText(activity.activity_message)}
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      aria-label={`Activity occurred ${formatRelativeTime(activity.created_at)}`}
                    >
                      {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>

                  {activityLink && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-primary hover:text-accent"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              );

              // إذا كان هناك رابط، نلف المحتوى بـ Link أو a tag
              if (activityLink) {
                if (isExternal) {
                  return (
                    <a
                      key={activity.id}
                      href={activityLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {content}
                    </a>
                  );
                }
                return (
                  <Link key={activity.id} href={activityLink}>
                    {content}
                  </Link>
                );
              }

              return content;
            })}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
