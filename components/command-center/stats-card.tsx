"use client";

/**
 * 📊 STATS CARD COMPONENT
 *
 * Shows quick stats in a compact card format:
 * - Current rating
 * - Pending actions count
 * - Response rate
 *
 * Enhanced with safe data handling to prevent errors
 */

import {
  safeCommandCenterStats,
  type SafeCommandCenterStats,
} from "@/lib/utils/data-guards";
import { motion } from "framer-motion";
import { Clock, Star, TrendingUp } from "lucide-react";

// ============================================
// TYPES
// ============================================

interface StatsCardProps {
  stats?: SafeCommandCenterStats | null;
  loading?: boolean;
  error?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StatsCard({ stats, loading, error }: StatsCardProps) {
  // استخدام دوال الحماية للتعامل مع البيانات الغائبة أو غير المحددة
  const safeStats = safeCommandCenterStats(stats);

  // إذا كان هناك خطأ، نعرض رسالة الخطأ
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  // إذا كانت البيانات قيد التحميل، نعرض حالة التحميل
  if (loading) {
    return (
      <div className="animate-pulse grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700"
          >
            <div className="h-6 bg-zinc-700/50 rounded w-16 mx-auto" />
            <div className="h-4 bg-zinc-700/50 rounded w-12 mx-auto mt-1" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-3 gap-3"
    >
      {/* Rating */}
      <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 text-center">
        <div className="flex items-center justify-center gap-1 text-yellow-400">
          <Star className="h-4 w-4 fill-yellow-400" />
          <span className="text-lg font-bold">
            {safeStats.rating.toFixed(1)}
          </span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Rating</p>
      </div>

      {/* Pending Count */}
      <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 text-center">
        <div className="flex items-center justify-center gap-1 text-orange-400">
          <Clock className="h-4 w-4" />
          <span className="text-lg font-bold">{safeStats.pendingCount}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Pending</p>
      </div>

      {/* Response Rate */}
      <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 text-center">
        <div className="flex items-center justify-center gap-1 text-green-400">
          <TrendingUp className="h-4 w-4" />
          <span className="text-lg font-bold">{safeStats.responseRate}%</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Response</p>
      </div>
    </motion.div>
  );
}
