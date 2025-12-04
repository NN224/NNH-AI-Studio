"use client";

/**
 * 👋 PROACTIVE GREETING COMPONENT
 *
 * Shows AI's proactive greeting with insights
 * at the beginning of the chat session
 */

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export interface ProactiveInsight {
  type: string;
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  suggestedActions: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
}

interface ProactiveGreetingProps {
  userName: string;
  greeting: string;
  insight?: ProactiveInsight;
  businessLogo?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ProactiveGreeting({
  userName,
  greeting,
  insight,
  businessLogo,
}: ProactiveGreetingProps) {
  const getInsightIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case "medium":
        return <TrendingUp className="h-5 w-5 text-yellow-400" />;
      default:
        return <Sparkles className="h-5 w-5 text-blue-400" />;
    }
  };

  const getInsightColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-500/30 bg-red-500/10";
      case "medium":
        return "border-yellow-500/30 bg-yellow-500/10";
      default:
        return "border-blue-500/30 bg-blue-500/10";
    }
  };

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3"
      >
        <Avatar className="h-10 w-10 bg-gradient-to-br from-orange-500/20 to-purple-500/20 ring-2 ring-orange-500/30">
          {businessLogo ? (
            <AvatarImage src={businessLogo} />
          ) : (
            <AvatarFallback>
              <Bot className="h-5 w-5 text-orange-400" />
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 bg-zinc-800/80 rounded-2xl p-4">
          <p className="text-sm text-zinc-100 leading-relaxed">{greeting}</p>
        </div>
      </motion.div>

      {/* Insight (if available) */}
      {insight && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "rounded-xl border p-4 space-y-3",
            getInsightColor(insight.priority),
          )}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {getInsightIcon(insight.priority)}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">
                  {insight.title}
                </h3>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs capitalize",
                    insight.priority === "high" &&
                      "border-red-500/50 text-red-400",
                    insight.priority === "medium" &&
                      "border-yellow-500/50 text-yellow-400",
                    insight.priority === "low" &&
                      "border-blue-500/50 text-blue-400",
                  )}
                >
                  {insight.priority}
                </Badge>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {insight.message}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
