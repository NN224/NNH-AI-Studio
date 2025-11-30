"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHomeData } from "@/hooks/use-home-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Lightbulb,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

interface Insight {
  id: string;
  type: "warning" | "success" | "tip" | "alert";
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  priority: number;
}

export function AISmartInsights() {
  const { managementStats, urgentItems, isLoading } = useHomeData();

  // Generate insights based on data
  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];

    if (!managementStats) return result;

    // Check pending reviews
    const pendingReviews = managementStats.reviews?.pending || 0;
    if (pendingReviews > 0) {
      result.push({
        id: "pending-reviews",
        type: pendingReviews > 5 ? "alert" : "warning",
        title: `${pendingReviews} مراجعات بانتظار الرد`,
        description:
          pendingReviews > 5
            ? "لديك مراجعات كثيرة بدون رد! هذا يؤثر سلباً على ترتيبك في Google."
            : "الرد السريع يحسن تقييمك ويزيد ثقة العملاء.",
        action: { label: "رد الآن", href: "/reviews" },
        priority: pendingReviews > 5 ? 1 : 2,
      });
    }

    // Check response rate
    const responseRate = parseFloat(
      managementStats.reviews?.responseRate || "0",
    );
    if (responseRate < 50 && pendingReviews > 0) {
      result.push({
        id: "low-response-rate",
        type: "warning",
        title: `معدل الرد منخفض: ${responseRate}%`,
        description:
          "الرد على 80% من المراجعات يرفع ترتيبك بنسبة 30% في نتائج البحث.",
        action: { label: "تحسين الآن", href: "/reviews" },
        priority: 3,
      });
    } else if (responseRate >= 80) {
      result.push({
        id: "great-response-rate",
        type: "success",
        title: "معدل رد ممتاز! 🎉",
        description: `أنت ترد على ${responseRate}% من المراجعات. استمر!`,
        priority: 10,
      });
    }

    // Check unanswered questions
    const unansweredQuestions = managementStats.questions?.unanswered || 0;
    if (unansweredQuestions > 0) {
      result.push({
        id: "unanswered-questions",
        type: "warning",
        title: `${unansweredQuestions} أسئلة بدون إجابة`,
        description: "العملاء ينتظرون إجاباتك. الرد السريع يزيد المبيعات.",
        action: { label: "أجب الآن", href: "/questions" },
        priority: 4,
      });
    }

    // Check posting frequency
    const publishedPosts = managementStats.posts?.published || 0;
    if (publishedPosts === 0) {
      result.push({
        id: "no-posts",
        type: "tip",
        title: "لم تنشر أي بوست بعد!",
        description: "النشر المنتظم يزيد ظهورك في البحث بنسبة 50%.",
        action: { label: "انشر الآن", href: "/posts" },
        priority: 5,
      });
    } else if (publishedPosts < 4) {
      result.push({
        id: "low-posts",
        type: "tip",
        title: "انشر المزيد من البوستات",
        description: "الأعمال الناجحة تنشر 4-8 بوستات شهرياً.",
        action: { label: "انشر بوست", href: "/posts" },
        priority: 6,
      });
    }

    // Check urgent items
    if (urgentItems && urgentItems.length > 3) {
      result.push({
        id: "many-urgent",
        type: "alert",
        title: "لديك مهام عاجلة كثيرة!",
        description: `${urgentItems.length} عناصر تحتاج اهتمامك الفوري.`,
        priority: 0,
      });
    }

    // Sort by priority
    return result.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }, [managementStats, urgentItems]);

  if (isLoading) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-6">
          <div className="h-24 bg-zinc-800/50 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="border-green-500/20 bg-zinc-900/50">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <h3 className="font-semibold text-lg text-white">كل شيء ممتاز! 🎉</h3>
          <p className="text-sm text-zinc-400 mt-1">لا توجد مهام عاجلة الآن</p>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: Insight["type"]) => {
    switch (type) {
      case "alert":
        return AlertTriangle;
      case "warning":
        return TrendingDown;
      case "success":
        return TrendingUp;
      case "tip":
        return Lightbulb;
    }
  };

  const getColor = (type: Insight["type"]) => {
    switch (type) {
      case "alert":
        return "border-red-500/30 bg-red-500/10 text-red-400";
      case "warning":
        return "border-orange-500/30 bg-orange-500/10 text-orange-400";
      case "success":
        return "border-green-500/30 bg-green-500/10 text-green-400";
      case "tip":
        return "border-blue-500/30 bg-blue-500/10 text-blue-400";
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-orange-400" />
          اقتراحات AI
          <Badge
            variant="outline"
            className="text-xs border-orange-500/30 text-orange-400"
          >
            ذكية
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => {
          const Icon = getIcon(insight.type);
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn("p-3 rounded-lg border", getColor(insight.type))}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-white">
                    {insight.title}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {insight.description}
                  </p>
                </div>
                {insight.action && (
                  <Link href={insight.action.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs h-7 px-2 hover:bg-white/10"
                    >
                      {insight.action.label}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
