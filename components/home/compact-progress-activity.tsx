"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Star,
  MessageSquare,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

interface CompactProgressActivityProps {
  level?: number;
  levelName?: string;
  currentPoints?: number;
  nextLevelPoints?: number;
  unlockedAchievements?: number;
  totalAchievements?: number;
  responseRate?: number;
  totalReviews?: number;
  avgRating?: number;
}

export function CompactProgressActivity({
  level = 1,
  levelName = "Beginner",
  currentPoints = 0,
  nextLevelPoints = 100,
  unlockedAchievements = 0,
  totalAchievements = 9,
  responseRate = 0,
  totalReviews = 0,
  avgRating = 0,
}: CompactProgressActivityProps) {
  const progressPercent = Math.round((currentPoints / nextLevelPoints) * 100);

  const stats = [
    {
      label: "Reviews",
      value: totalReviews,
      icon: MessageSquare,
      color: "text-blue-500",
    },
    {
      label: "Rating",
      value: avgRating.toFixed(1),
      icon: Star,
      color: "text-yellow-500",
    },
    {
      label: "Response",
      value: `${responseRate}%`,
      icon: TrendingUp,
      color: "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Progress Card */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Your Progress
            </CardTitle>
            <Badge variant="outline" className="text-primary border-primary/30">
              Level {level}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Level Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{levelName}</span>
              <span className="text-muted-foreground">
                {currentPoints.toLocaleString()} /{" "}
                {nextLevelPoints.toLocaleString()} pts
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {nextLevelPoints - currentPoints} points to next level
            </p>
          </div>

          {/* Achievements Summary */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Achievements</p>
                <p className="text-xs text-muted-foreground">Keep going!</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {unlockedAchievements}
              </p>
              <p className="text-xs text-muted-foreground">
                of {totalAchievements}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Card */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-3 rounded-lg bg-secondary/50 border border-primary/10"
              >
                <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Recent Activity Preview */}
          <div className="mt-4 pt-4 border-t border-primary/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Recent Activity
              </p>
            </div>
            <div className="space-y-2">
              {totalReviews > 0 ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Active business with {totalReviews} reviews</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span>Maintaining {avgRating.toFixed(1)} star rating</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>{responseRate}% response rate</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Connect your business to see activity
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
