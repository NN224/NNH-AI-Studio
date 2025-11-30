"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeData } from "@/hooks/use-home-data";
import { Link } from "@/lib/navigation";
import { Calendar, HelpCircle, MessageSquare, TrendingUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  href: string;
  trend?: "up" | "down" | "neutral";
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  href,
  trend = "neutral",
}: StatCardProps) {
  const trendColors = {
    up: "text-emerald-400",
    down: "text-red-400",
    neutral: "text-zinc-400",
  };

  return (
    <Link href={href}>
      <Card className="bg-zinc-900/50 border-zinc-800 hover:border-primary/50 transition-all duration-200 cursor-pointer group">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              {icon}
              {title}
            </span>
            <TrendingUp
              className={`h-3.5 w-3.5 ${trendColors[trend]} opacity-0 group-hover:opacity-100 transition-opacity`}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{value}</div>
          <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Management Quick Stats Component
 * Shows compact stats for Reviews, Posts, and Questions
 */
export function ManagementQuickStats() {
  const { managementStats, isLoading } = useHomeData();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const reviews = managementStats?.reviews || {
    total: 0,
    pending: 0,
    responseRate: "0%",
  };
  const posts = managementStats?.posts || { published: 0, scheduled: 0 };
  const questions = managementStats?.questions || { total: 0, unanswered: 0 };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Reviews Stats */}
      <StatCard
        title="Reviews"
        value={reviews.total}
        subtitle={`${reviews.pending} pending • ${reviews.responseRate} response`}
        icon={<MessageSquare className="h-4 w-4" />}
        href="/reviews"
        trend={reviews.pending > 0 ? "down" : "up"}
      />

      {/* Posts Stats */}
      <StatCard
        title="Posts"
        value={posts.published}
        subtitle={
          posts.scheduled > 0
            ? `${posts.scheduled} scheduled`
            : "No scheduled posts"
        }
        icon={<Calendar className="h-4 w-4" />}
        href="/posts"
        trend="neutral"
      />

      {/* Questions Stats */}
      <StatCard
        title="Questions"
        value={questions.total}
        subtitle={
          questions.unanswered > 0
            ? `${questions.unanswered} unanswered`
            : "All answered"
        }
        icon={<HelpCircle className="h-4 w-4" />}
        href="/questions"
        trend={questions.unanswered > 0 ? "down" : "up"}
      />
    </div>
  );
}
