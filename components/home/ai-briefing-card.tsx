"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Star,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface AIBriefingCardProps {
  briefing: any;
  isLoading: boolean;
  stats: {
    rating: number;
    totalReviews: number;
    responseRate: number;
    thisWeekReviews: number;
    pendingReplies: number;
    pendingQuestions: number;
  };
  businessDNA: any;
}

export function AIBriefingCard({
  briefing,
  isLoading,
  stats,
  businessDNA,
}: AIBriefingCardProps) {
  // Generate smart message based on data
  const generateSmartMessage = () => {
    const messages: string[] = [];

    if (stats.pendingReplies > 0) {
      messages.push(`لديك ${stats.pendingReplies} مراجعة بانتظار الرد`);
    }

    if (stats.thisWeekReviews > 0) {
      messages.push(`حصلت على ${stats.thisWeekReviews} مراجعة هذا الأسبوع`);
    }

    if (stats.rating >= 4.5) {
      messages.push(`تقييمك ممتاز ${stats.rating}/5 ⭐`);
    } else if (stats.rating < 4) {
      messages.push(`تقييمك ${stats.rating}/5 - يمكن تحسينه`);
    }

    if (stats.responseRate < 80) {
      messages.push(`معدل الرد ${stats.responseRate}% - حاول الوصول لـ 90%`);
    }

    return messages;
  };

  const smartMessages = generateSmartMessage();

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-3xl p-6 border border-gray-700/50 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gray-700 animate-pulse" />
          <div className="h-6 w-48 bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-700/50 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-700/50 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-gray-700/50 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.98 }}
      animate={{ scale: 1 }}
      className="relative overflow-hidden"
    >
      {/* Main Card */}
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-3xl p-6 border border-gray-700/50 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Briefing</h2>
              <p className="text-xs text-gray-400">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Live Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-green-400">Live</span>
          </div>
        </div>

        {/* AI Message */}
        <div className="bg-gray-900/50 rounded-2xl p-4 mb-5 border border-gray-700/30">
          <p className="text-gray-200 leading-relaxed">
            {briefing?.summary ||
              (stats.totalReviews > 0
                ? `لديك ${stats.totalReviews} مراجعة بمعدل ${stats.rating}/5. ${stats.pendingReplies > 0 ? `${stats.pendingReplies} مراجعة تنتظر ردك.` : "أحسنت! كل المراجعات مُجابة."}`
                : "مرحباً! أنا مساعدك الذكي. سأساعدك في إدارة أعمالك بكفاءة أكبر. ابدأ بربط حسابك لأتمكن من تحليل بياناتك.")}
          </p>
        </div>

        {/* Smart Insights */}
        {smartMessages.length > 0 && (
          <div className="space-y-2 mb-5">
            {smartMessages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-2 text-sm"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-gray-300">{msg}</span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Alerts */}
        {(briefing?.alerts?.length > 0 || stats.pendingReplies > 3) && (
          <div className="bg-red-500/10 rounded-xl p-3 mb-5 border border-red-500/20">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {briefing?.alerts?.[0]?.message ||
                  `${stats.pendingReplies} مراجعات تحتاج ردك العاجل`}
              </span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {stats.pendingReplies > 0 && (
            <Link href="/reviews?filter=pending">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl text-sm font-medium transition-colors border border-orange-500/20"
              >
                <MessageSquare className="w-4 h-4" />
                <span>رد على المراجعات ({stats.pendingReplies})</span>
                <ArrowRight className="w-3 h-3" />
              </motion.button>
            </Link>
          )}

          <Link href="/analytics">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium transition-colors border border-blue-500/20"
            >
              <TrendingUp className="w-4 h-4" />
              <span>التحليلات</span>
            </motion.button>
          </Link>
        </div>

        {/* DNA Confidence (if available) */}
        {businessDNA && (
          <div className="mt-4 pt-4 border-t border-gray-700/30">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>معرفة AI بأعمالك</span>
              <span>
                {Math.round(
                  businessDNA.confidence_score ||
                    businessDNA.data_completeness ||
                    0,
                )}
                %
              </span>
            </div>
            <div className="mt-1.5 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${businessDNA.confidence_score || businessDNA.data_completeness || 0}%`,
                }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Decorative Elements */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
    </motion.div>
  );
}
