"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Target,
  ArrowRight,
  Brain,
  Zap,
  ChevronRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface Insight {
  id: string;
  type: "recommendation" | "alert" | "tip" | "success";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  actionText?: string;
  actionUrl?: string;
  impact?: string;
}

interface AIInsightsProps {
  insights: Insight[];
}

export function AIInsights({ insights }: AIInsightsProps) {
  const t = useTranslations("home.aiInsights");
  const [hoveredInsight, setHoveredInsight] = useState<string | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const getInsightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "recommendation":
        return Lightbulb;
      case "alert":
        return AlertCircle;
      case "tip":
        return Target;
      case "success":
        return CheckCircle2;
      default:
        return Sparkles;
    }
  };

  const getInsightStyle = (
    type: Insight["type"],
    priority: Insight["priority"],
  ) => {
    if (type === "alert" && priority === "high") {
      return {
        border: "border-red-500/50",
        bg: "bg-gradient-to-br from-red-500/10 to-red-600/5",
        icon: "text-red-500",
        iconBg: "bg-red-500/20",
        badge: "bg-red-500/20 text-red-700 dark:text-red-300",
        glow: "from-red-500/30 to-red-600/30",
        pulse: true,
      };
    }

    if (type === "recommendation" && priority === "high") {
      return {
        border: "border-orange-500/50",
        bg: "bg-gradient-to-br from-orange-500/10 to-orange-600/5",
        icon: "text-orange-500",
        iconBg: "bg-orange-500/20",
        badge: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
        glow: "from-orange-500/30 to-orange-600/30",
        pulse: true,
      };
    }

    if (type === "success") {
      return {
        border: "border-green-500/50",
        bg: "bg-gradient-to-br from-green-500/10 to-green-600/5",
        icon: "text-green-500",
        iconBg: "bg-green-500/20",
        badge: "bg-green-500/20 text-green-700 dark:text-green-300",
        glow: "from-green-500/30 to-green-600/30",
        pulse: false,
      };
    }

    return {
      border: "border-border/50",
      bg: "bg-gradient-to-br from-zinc-900/50 to-black/50",
      icon: "text-muted-foreground",
      iconBg: "bg-muted/50",
      badge: "bg-muted text-muted-foreground",
      glow: "from-gray-500/20 to-gray-600/20",
      pulse: false,
    };
  };

  const getPriorityLabel = (priority: Insight["priority"]) => {
    switch (priority) {
      case "high":
        return t("priority.high");
      case "medium":
        return t("priority.medium");
      case "low":
        return t("priority.low");
      default:
        return "";
    }
  };

  if (insights.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-border/40 bg-gradient-to-br from-zinc-900/50 to-black/50 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <motion.div
                className="p-2 rounded-lg bg-primary/10"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Brain className="h-5 w-5 text-primary" />
              </motion.div>
              <CardTitle className="text-lg">{t("title")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
              </motion.div>
              <p className="text-sm text-muted-foreground text-center">
                {t("empty")}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="border-border/40 bg-gradient-to-br from-zinc-900/50 to-black/50 backdrop-blur-xl relative overflow-hidden">
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-orange-500/5 to-yellow-500/5"
          animate={{
            x: [0, 100, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Floating particles */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-20 h-20 bg-orange-500/10 rounded-full blur-xl"
            style={{
              left: `${20 + i * 30}%`,
              top: `${20 + i * 20}%`,
            }}
            animate={{
              x: [0, 30, 0],
              y: [0, -30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 2,
            }}
          />
        ))}

        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20 relative"
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(249, 115, 22, 0)",
                    "0 0 0 10px rgba(249, 115, 22, 0.1)",
                    "0 0 0 0 rgba(249, 115, 22, 0)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Brain className="h-5 w-5 text-orange-500" />
                {/* Sparkle effect */}
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >
                  <Zap className="h-3 w-3 text-yellow-400" />
                </motion.div>
              </motion.div>
              <div>
                <CardTitle className="text-lg bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
                  {t("title")}
                </CardTitle>
                <motion.p
                  className="text-xs text-muted-foreground"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  {t("subtitle")}
                </motion.p>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Badge
                variant="secondary"
                className="gap-1 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-orange-500/30"
              >
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <TrendingUp className="h-3 w-3 text-orange-500" />
                </motion.div>
                <span className="font-semibold">{insights.length}</span>
                <span className="text-muted-foreground">{t("insights")}</span>
              </Badge>
            </motion.div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          <AnimatePresence>
            {insights.map((insight, index) => {
              const Icon = getInsightIcon(insight.type);
              const style = getInsightStyle(insight.type, insight.priority);
              const isHighPriority = insight.priority === "high";
              const isHovered = hoveredInsight === insight.id;
              const isExpanded = expandedInsight === insight.id;

              return (
                <motion.div
                  key={insight.id}
                  layout
                  initial={{ opacity: 0, x: -50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50, scale: 0.9 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                  }}
                  whileHover={{ x: 5 }}
                  onMouseEnter={() => setHoveredInsight(insight.id)}
                  onMouseLeave={() => setHoveredInsight(null)}
                  onClick={() =>
                    setExpandedInsight(isExpanded ? null : insight.id)
                  }
                >
                  <motion.div
                    className={`p-4 rounded-xl border ${style.border} ${style.bg} hover:shadow-2xl transition-all duration-300 group relative overflow-hidden cursor-pointer backdrop-blur-sm`}
                    animate={{
                      scale: isHovered ? 1.02 : 1,
                      y: isHovered ? -2 : 0,
                    }}
                  >
                    {/* Glow effect */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          className={`absolute -inset-px bg-gradient-to-br ${style.glow} blur-md rounded-xl`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.5 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Priority pulse effect */}
                    {style.pulse && (
                      <motion.div
                        className={`absolute inset-0 border-2 ${style.border} rounded-xl`}
                        animate={{
                          opacity: [0, 0.5, 0],
                          scale: [1, 1.05, 1.05],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeOut",
                        }}
                      />
                    )}

                    {/* Shimmer effect */}
                    <motion.div
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent"
                      animate={
                        isHovered
                          ? { translateX: "200%" }
                          : { translateX: "-100%" }
                      }
                      transition={{ duration: 1, ease: "easeInOut" }}
                    />

                    <div className="flex gap-3 relative z-10">
                      {/* Icon with animation */}
                      <motion.div
                        className={`flex-shrink-0 w-12 h-12 rounded-lg ${style.iconBg} flex items-center justify-center relative`}
                        animate={
                          isHighPriority
                            ? { rotate: [0, 5, -5, 0] }
                            : { rotate: 0 }
                        }
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Icon className={`h-5 w-5 ${style.icon}`} />
                        {isHighPriority && (
                          <motion.div
                            className="absolute -top-1 -right-1"
                            animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Zap className="h-3 w-3 text-yellow-400" />
                          </motion.div>
                        )}
                      </motion.div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <motion.h4
                            className="font-semibold text-sm"
                            animate={{
                              color: isHovered
                                ? style.icon.replace("text-", "#")
                                : "#ffffff",
                            }}
                          >
                            {insight.title}
                          </motion.h4>
                          {insight.priority !== "low" && (
                            <motion.div
                              animate={{ scale: isHovered ? 1.1 : 1 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              <Badge
                                className={`${style.badge} text-xs flex-shrink-0`}
                              >
                                {getPriorityLabel(insight.priority)}
                              </Badge>
                            </motion.div>
                          )}
                        </div>

                        <motion.p
                          className="text-sm text-muted-foreground mb-3"
                          animate={{
                            height: isExpanded ? "auto" : "2.5rem",
                          }}
                          style={{ overflow: "hidden" }}
                        >
                          {insight.description}
                        </motion.p>

                        {/* Impact Badge with animation */}
                        <AnimatePresence>
                          {insight.impact && (isExpanded || isHovered) && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2 mb-3"
                            >
                              <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                <TrendingUp className="h-3 w-3 text-green-500" />
                              </motion.div>
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                {t("impact")}: {insight.impact}
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Action Button */}
                        {insight.actionText && insight.actionUrl && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 text-xs mt-2 ${isHovered ? style.bg : ""} group/btn relative overflow-hidden`}
                              asChild
                            >
                              <Link href={insight.actionUrl}>
                                <span className="relative z-10">
                                  {insight.actionText}
                                </span>
                                <motion.div
                                  className="ml-1 h-3 w-3 relative z-10"
                                  animate={{ x: isHovered ? 3 : 0 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 300,
                                  }}
                                >
                                  <ChevronRight />
                                </motion.div>
                                {/* Button hover effect */}
                                <motion.div
                                  className={`absolute inset-0 bg-gradient-to-r ${style.glow}`}
                                  initial={{ x: "-100%" }}
                                  whileHover={{ x: 0 }}
                                  transition={{ duration: 0.3 }}
                                />
                              </Link>
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* View All Button */}
          <div className="pt-4 border-t border-border/50">
            <Button variant="outline" className="w-full gap-2" asChild>
              <Link href="/ai-command-center">
                <Sparkles className="h-4 w-4" />
                {t("viewAll")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
