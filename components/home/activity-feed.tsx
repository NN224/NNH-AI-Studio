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
  Activity as ActivityIcon,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

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
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null);

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
        return {
          text: "text-blue-500",
          bg: "bg-blue-500/20",
          border: "border-blue-500/50",
          glow: "from-blue-500/30 to-blue-600/30",
        };
      case "youtube":
        return {
          text: "text-red-500",
          bg: "bg-red-500/20",
          border: "border-red-500/50",
          glow: "from-red-500/30 to-red-600/30",
        };
      case "location":
        return {
          text: "text-purple-500",
          bg: "bg-purple-500/20",
          border: "border-purple-500/50",
          glow: "from-purple-500/30 to-purple-600/30",
        };
      case "post":
        return {
          text: "text-green-500",
          bg: "bg-green-500/20",
          border: "border-green-500/50",
          glow: "from-green-500/30 to-green-600/30",
        };
      default:
        return {
          text: "text-gray-500",
          bg: "bg-gray-500/20",
          border: "border-gray-500/50",
          glow: "from-gray-500/30 to-gray-600/30",
        };
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="border-border/40 bg-gradient-to-br from-zinc-900/50 to-black/50 backdrop-blur-xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            </motion.div>
            <p className="text-muted-foreground text-center">{t("empty")}</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, x: -50, scale: 0.9 },
    show: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <Card className="border-border/40 bg-gradient-to-br from-zinc-900/50 to-black/50 backdrop-blur-xl relative overflow-hidden">
        {/* Animated background pattern */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-purple-500/5"
          animate={{
            x: [0, 50, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        <CardHeader className="flex flex-row items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20"
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <ActivityIcon className="h-5 w-5 text-orange-500" />
            </motion.div>
            <CardTitle className="text-lg bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              {t("title")}
            </CardTitle>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 hover:bg-orange-500/10"
              asChild
            >
              <Link href="/dashboard">
                {t("viewAll")}
                <motion.div
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ExternalLink className="h-4 w-4" />
                </motion.div>
              </Link>
            </Button>
          </motion.div>
        </CardHeader>
        <CardContent className="relative z-10">
          <motion.div
            className="space-y-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence mode="popLayout">
              {activities.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                const colors = getActivityColor(activity.type);
                const badge = getActivityBadge(activity.type);
                const isHovered = hoveredActivity === activity.id;

                return (
                  <motion.div
                    key={activity.id}
                    layout
                    variants={item}
                    onMouseEnter={() => setHoveredActivity(activity.id)}
                    onMouseLeave={() => setHoveredActivity(null)}
                    className="relative"
                  >
                    <motion.div
                      className={`flex gap-4 p-4 rounded-xl border ${colors.border} bg-gradient-to-br from-zinc-900/80 to-black/80 backdrop-blur-sm transition-all duration-300 group cursor-pointer`}
                      animate={{
                        scale: isHovered ? 1.02 : 1,
                        y: isHovered ? -2 : 0,
                      }}
                    >
                      {/* Glow effect */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            className={`absolute -inset-px bg-gradient-to-br ${colors.glow} blur-md rounded-xl`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                      </AnimatePresence>

                      {/* Shimmer effect */}
                      <motion.div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent"
                        animate={
                          isHovered
                            ? { translateX: "200%" }
                            : { translateX: "-100%" }
                        }
                        transition={{ duration: 1, ease: "easeInOut" }}
                      />

                      {/* New indicator for recent activities */}
                      {index === 0 && (
                        <motion.div
                          className="absolute -top-1 -right-1"
                          animate={{ scale: [0.8, 1.2, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Zap className="h-4 w-4 text-yellow-400" />
                        </motion.div>
                      )}

                      {/* Icon with animation */}
                      <motion.div
                        className={`flex-shrink-0 w-12 h-12 rounded-lg ${colors.bg} flex items-center justify-center relative z-10`}
                        whileHover={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.3 }}
                      >
                        <Icon className={`h-5 w-5 ${colors.text}`} />
                        {/* Pulse effect */}
                        {isHovered && (
                          <motion.div
                            className={`absolute inset-0 rounded-lg ${colors.bg}`}
                            animate={{
                              scale: [1, 1.5, 1.5],
                              opacity: [0.5, 0, 0],
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "easeOut",
                            }}
                          />
                        )}
                      </motion.div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 relative z-10">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <motion.h4
                            className="font-semibold text-sm truncate transition-colors"
                            animate={{
                              color: isHovered
                                ? colors.text.replace("text-", "#")
                                : "#ffffff",
                            }}
                          >
                            {activity.title}
                          </motion.h4>
                          <motion.div
                            animate={{ scale: isHovered ? 1.1 : 1 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Badge
                              variant={badge.variant}
                              className="flex-shrink-0 text-xs"
                            >
                              {badge.text}
                            </Badge>
                          </motion.div>
                        </div>

                        <motion.p
                          className="text-sm text-muted-foreground line-clamp-2 mb-2"
                          animate={{
                            opacity: isHovered ? 1 : 0.8,
                          }}
                        >
                          {activity.description}
                        </motion.p>

                        {/* Metadata with animations */}
                        <motion.div
                          className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground"
                          animate={{
                            opacity: isHovered ? 1 : 0.7,
                          }}
                        >
                          <motion.span
                            className="flex items-center gap-1"
                            animate={{ x: isHovered ? 2 : 0 }}
                          >
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(activity.timestamp, {
                              addSuffix: true,
                            })}
                          </motion.span>

                          {activity.metadata?.rating && (
                            <motion.span
                              className="flex items-center gap-1"
                              animate={{ scale: isHovered ? 1.1 : 1 }}
                            >
                              <motion.div
                                animate={{ rotate: isHovered ? 360 : 0 }}
                                transition={{ duration: 0.5 }}
                              >
                                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                              </motion.div>
                              {activity.metadata.rating}/5
                            </motion.span>
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
                        </motion.div>

                        {/* Action Button with animation */}
                        <AnimatePresence>
                          {activity.actionUrl && isHovered && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-7 text-xs hover:bg-orange-500/20"
                                asChild
                              >
                                <Link href={activity.actionUrl}>
                                  {t("takeAction")}
                                  <motion.div
                                    className="ml-1"
                                    animate={{ x: [0, 3, 0] }}
                                    transition={{
                                      duration: 1,
                                      repeat: Infinity,
                                    }}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </motion.div>
                                </Link>
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
