"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  Plus,
} from "lucide-react";
import { Link } from "@/lib/navigation";
import { motion } from "framer-motion";

interface KeyStatsGridProps {
  totalLocations: number;
  avgRating: number;
  ratingChange: number;
  weeklyReviews: number;
  weeklyReplies: number;
}

export function KeyStatsGrid({
  totalLocations = 0,
  avgRating = 0,
  ratingChange = 0,
  weeklyReviews = 0,
  weeklyReplies = 0,
}: KeyStatsGridProps) {
  const t = useTranslations("dashboard.keyStats");

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getTrendText = (change: number) => {
    if (change > 0) return `+${change.toFixed(1)}`;
    if (change < 0) return change.toFixed(1);
    return "0.0";
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-gray-500";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Locations Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="hover:border-orange-500/50 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("locations.title")}
              </p>
              <p className="text-3xl font-bold">{totalLocations}</p>
              <Link href="/locations">
                <Button variant="ghost" size="sm" className="w-full mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  {t("locations.addMore")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Rating Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="hover:border-orange-500/50 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(ratingChange)}
                <span
                  className={`text-sm font-medium ${getTrendColor(ratingChange)}`}
                >
                  {getTrendText(ratingChange)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("rating.title")}
              </p>
              <p className="text-3xl font-bold">
                {avgRating > 0 ? avgRating.toFixed(1) : "--"}
                <span className="text-lg text-muted-foreground">/5.0</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {t("rating.thisMonth")}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="hover:border-orange-500/50 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("activity.title")}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{weeklyReviews}</p>
                <span className="text-sm text-muted-foreground">
                  {t("activity.reviews")}
                </span>
              </div>
              <p className="text-sm text-green-500">
                +{weeklyReplies} {t("activity.replies")}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
