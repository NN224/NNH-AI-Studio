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

import { safeValue } from "@/lib/utils/data-guards";
import { motion } from "framer-motion";
import { Clock, Star, TrendingUp } from "lucide-react";

// ============================================
// TYPES
// ============================================

export interface CommandCenterStats {
  rating?: number;
  ratingChange?: number;
  totalReviews?: number;
  pendingCount?: number;
  responseRate?: number;
  attentionCount?: number;
}

interface StatsCardProps {
  stats?: CommandCenterStats;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function StatsCard({ stats }: StatsCardProps) {
  // استخدام دوال الحماية للتعامل مع البيانات الغائبة أو غير المحددة
  const safeStats = stats || {};
  const rating = safeValue(safeStats.rating, 0);
  const pendingCount = safeValue(safeStats.pendingCount, 0);
  const responseRate = safeValue(safeStats.responseRate, 0);

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
          <span className="text-lg font-bold">{rating.toFixed(1)}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Rating</p>
      </div>

      {/* Pending Count */}
      <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 text-center">
        <div className="flex items-center justify-center gap-1 text-orange-400">
          <Clock className="h-4 w-4" />
          <span className="text-lg font-bold">{pendingCount}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Pending</p>
      </div>

      {/* Response Rate */}
      <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 text-center">
        <div className="flex items-center justify-center gap-1 text-green-400">
          <TrendingUp className="h-4 w-4" />
          <span className="text-lg font-bold">{responseRate}%</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Response</p>
      </div>
    </motion.div>
  );
}
