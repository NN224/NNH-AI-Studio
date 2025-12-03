"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  MessageSquare,
  PenSquare,
  BarChart3,
  Settings,
  HelpCircle,
  MapPin,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface SmartActionsBarProps {
  pendingReplies: number;
  pendingQuestions: number;
}

export function SmartActionsBar({
  pendingReplies,
  pendingQuestions,
}: SmartActionsBarProps) {
  const actions = [
    {
      label: "رد على المراجعات",
      href: "/reviews",
      icon: MessageSquare,
      color: "from-orange-500 to-amber-500",
      bgHover: "hover:bg-orange-500/10",
      badge: pendingReplies > 0 ? pendingReplies : null,
      priority: pendingReplies > 0,
    },
    {
      label: "إنشاء منشور",
      href: "/posts/create",
      icon: PenSquare,
      color: "from-blue-500 to-cyan-500",
      bgHover: "hover:bg-blue-500/10",
    },
    {
      label: "التحليلات",
      href: "/analytics",
      icon: BarChart3,
      color: "from-violet-500 to-purple-500",
      bgHover: "hover:bg-violet-500/10",
    },
    {
      label: "الأسئلة",
      href: "/questions",
      icon: HelpCircle,
      color: "from-green-500 to-emerald-500",
      bgHover: "hover:bg-green-500/10",
      badge: pendingQuestions > 0 ? pendingQuestions : null,
    },
    {
      label: "المواقع",
      href: "/locations",
      icon: MapPin,
      color: "from-pink-500 to-rose-500",
      bgHover: "hover:bg-pink-500/10",
    },
    {
      label: "الإعدادات",
      href: "/settings",
      icon: Settings,
      color: "from-gray-500 to-slate-500",
      bgHover: "hover:bg-gray-500/10",
    },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-4 border border-gray-700/30">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-medium text-gray-300">إجراءات سريعة</h3>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {actions.map((action, index) => (
          <Link key={action.label} href={action.href}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-xl ${action.bgHover} transition-colors cursor-pointer group`}
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}
              >
                <action.icon className="w-5 h-5 text-white" />
              </div>

              {/* Label */}
              <span className="text-xs text-gray-400 text-center group-hover:text-gray-200 transition-colors">
                {action.label}
              </span>

              {/* Badge */}
              {action.badge && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    action.priority
                      ? "bg-red-500 animate-pulse"
                      : "bg-orange-500"
                  }`}
                >
                  {action.badge > 9 ? "9+" : action.badge}
                </motion.div>
              )}
            </motion.div>
          </Link>
        ))}
      </div>

      {/* AI Suggestion */}
      {pendingReplies > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 p-3 bg-orange-500/10 rounded-xl border border-orange-500/20"
        >
          <Link
            href="/reviews?filter=pending"
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-orange-300">
                لديك {pendingReplies} مراجعة بانتظار ردك
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-orange-400" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
