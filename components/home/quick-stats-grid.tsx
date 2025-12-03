"use client";

import { motion } from "framer-motion";
import {
  Star,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  HelpCircle,
} from "lucide-react";

interface QuickStatsGridProps {
  stats: {
    rating: number;
    totalReviews: number;
    responseRate: number;
    thisWeekReviews: number;
    pendingReplies: number;
    pendingQuestions: number;
  };
}

export function QuickStatsGrid({ stats }: QuickStatsGridProps) {
  const statCards = [
    {
      label: "التقييم",
      value: stats.rating.toFixed(1),
      suffix: "/5",
      icon: Star,
      color: "from-yellow-500 to-amber-500",
      bgColor: "bg-yellow-500/10",
      textColor: "text-yellow-400",
      trend: stats.rating >= 4 ? "up" : stats.rating < 3.5 ? "down" : null,
    },
    {
      label: "المراجعات",
      value: stats.totalReviews.toLocaleString(),
      suffix: "",
      icon: MessageSquare,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-400",
      subtext: `+${stats.thisWeekReviews} هذا الأسبوع`,
    },
    {
      label: "معدل الرد",
      value: stats.responseRate,
      suffix: "%",
      icon: CheckCircle,
      color:
        stats.responseRate >= 80
          ? "from-green-500 to-emerald-500"
          : "from-orange-500 to-red-500",
      bgColor:
        stats.responseRate >= 80 ? "bg-green-500/10" : "bg-orange-500/10",
      textColor:
        stats.responseRate >= 80 ? "text-green-400" : "text-orange-400",
      trend: stats.responseRate >= 80 ? "up" : "down",
    },
    {
      label: "بانتظار الرد",
      value: stats.pendingReplies,
      suffix: "",
      icon: Clock,
      color:
        stats.pendingReplies > 0
          ? "from-red-500 to-pink-500"
          : "from-green-500 to-emerald-500",
      bgColor: stats.pendingReplies > 0 ? "bg-red-500/10" : "bg-green-500/10",
      textColor: stats.pendingReplies > 0 ? "text-red-400" : "text-green-400",
      urgent: stats.pendingReplies > 5,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`relative overflow-hidden ${stat.bgColor} rounded-2xl p-4 border border-gray-700/30`}
        >
          {/* Icon */}
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-lg`}
          >
            <stat.icon className="w-5 h-5 text-white" />
          </div>

          {/* Value */}
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${stat.textColor}`}>
              {stat.value}
            </span>
            {stat.suffix && (
              <span className="text-sm text-gray-400">{stat.suffix}</span>
            )}
          </div>

          {/* Label */}
          <p className="text-sm text-gray-400 mt-1">{stat.label}</p>

          {/* Subtext or Trend */}
          {stat.subtext && (
            <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>
          )}

          {/* Urgent indicator */}
          {stat.urgent && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500"
            />
          )}

          {/* Trend Arrow */}
          {stat.trend && (
            <div
              className={`absolute top-3 right-3 ${
                stat.trend === "up" ? "text-green-400" : "text-red-400"
              }`}
            >
              <TrendingUp
                className={`w-4 h-4 ${stat.trend === "down" ? "rotate-180" : ""}`}
              />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
