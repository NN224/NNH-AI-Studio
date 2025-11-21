"use client";

import { StatCard } from "./stat-card";
import { Star, FileText, HelpCircle, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

interface StatsData {
  reviews: {
    total: number;
    pending: number;
    trend: string;
  };
  posts: {
    total: number;
    scheduled: number;
    trend: string;
  };
  questions: {
    total: number;
    unanswered: number;
    trend: string;
  };
  engagement: {
    rate: string;
    trend: string;
  };
}

interface StatsGridProps {
  data?: StatsData;
  isLoading?: boolean;
}

export function StatsGrid({ data, isLoading }: StatsGridProps) {
  const t = useTranslations("aiCommandCenter.stats");

  // Mock data for now
  const stats: StatsData = data || {
    reviews: { total: 150, pending: 5, trend: "+12%" },
    posts: { total: 24, scheduled: 3, trend: "+8%" },
    questions: { total: 18, unanswered: 3, trend: "+5%" },
    engagement: { rate: "85%", trend: "+15%" },
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 bg-zinc-900/50 animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={Star}
        title={t("reviews.title", { defaultValue: "Reviews" })}
        value={stats.reviews.total}
        subtitle={t("reviews.subtitle", { defaultValue: "total reviews" })}
        trend={stats.reviews.trend}
        trendDirection="up"
        urgent={stats.reviews.pending}
        href="/reviews"
        iconColor="text-yellow-500"
      />

      <StatCard
        icon={FileText}
        title={t("posts.title", { defaultValue: "Posts" })}
        value={stats.posts.total}
        subtitle={t("posts.subtitle", {
          count: stats.posts.scheduled,
          defaultValue: `${stats.posts.scheduled} scheduled`,
        })}
        trend={stats.posts.trend}
        trendDirection="up"
        href="/posts"
        iconColor="text-blue-500"
      />

      <StatCard
        icon={HelpCircle}
        title={t("questions.title", { defaultValue: "Questions" })}
        value={stats.questions.total}
        subtitle={t("questions.subtitle", { defaultValue: "total questions" })}
        trend={stats.questions.trend}
        trendDirection="up"
        urgent={stats.questions.unanswered}
        href="/questions"
        iconColor="text-purple-500"
      />

      <StatCard
        icon={TrendingUp}
        title={t("engagement.title", { defaultValue: "Engagement" })}
        value={stats.engagement.rate}
        subtitle={t("engagement.subtitle", { defaultValue: "response rate" })}
        trend={stats.engagement.trend}
        trendDirection="up"
        iconColor="text-green-500"
      />
    </div>
  );
}
